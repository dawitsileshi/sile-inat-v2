"""
src/routes/screening.py — Screening consent gate blueprint
==========================================================

The consent gate, Stage 1 and Stage 2.

No question text, option value, scoring band or safety threshold appears in
this file or in the Stage 1 engine. All of it is versioned content, and none
of it is servable until deliberately published.

Route summary (ungated routes are marked, and there are only three):

    POST /api/screening/participants        UNGATED  mint participant + token
    GET  /api/screening/consent/content     UNGATED  versioned consent bundle
    POST /api/screening/consent             UNGATED  record accept / decline
    GET  /api/screening/status                       current consent state
    POST /api/screening/consent/withdraw             record withdrawal
    GET  /api/screening/stage1              GATED    open/resume + questions
    POST /api/screening/stage1/answer       GATED    record one answer
    POST /api/screening/stage1/complete     GATED    score, tier, next step
    GET  /api/screening/stage2              GATED+   open/resume EPDS
    POST /api/screening/stage2/answer       GATED+   record one answer
    POST /api/screening/stage2/complete     GATED+   score, EPDS status

GATED  = requires recorded consent.
GATED+ = requires consent AND a Stage 1 result indicating Stage 2.
"""

from __future__ import annotations

import logging

from flask import Blueprint, g, jsonify, request

from src.extensions import db
from src.services.screening_content import (
    EPDS_KEY,
    STAGE1_KEY,
    ContentError,
    available_languages,
    bundle_of,
)
from src.services.screening_instrument import (
    InstrumentError,
    complete_session,
    content_for_session,
    get_latest_session,
    get_open_session,
    get_or_create_session,
    record_answer,
    result_payload,
    session_progress,
)
from src.services.screening_stage2 import (
    check_stage2_indicated,
    stage2_already_done,
)
from src.services.screening_consent import (
    SUPPORTED_LANGUAGES,
    ConsentError,
    consent_state,
    enrol_participant,
    get_active_consent_content,
    record_consent_decision,
    record_withdrawal,
    require_consent,
    resolve_token,
)

log = logging.getLogger(__name__)

screening_bp = Blueprint("screening", __name__, url_prefix="/api/screening")


@screening_bp.errorhandler(ConsentError)
def _handle_consent_error(exc: ConsentError):
    db.session.rollback()
    return exc.to_response()


def _requested_language(default: str = "en") -> str:
    payload = request.get_json(silent=True) or {}
    raw = (
        request.args.get("language")
        or payload.get("language")
        or default
    )
    return str(raw).split("-")[0].strip().lower()


# ─── UNGATED: enrolment ───────────────────────────────────────────────────────
@screening_bp.route("/participants", methods=["POST"])
def create_participant():
    """
    Mints an anonymous participant and returns the bearer token.

    Ungated by necessity: she needs an identity before she can consent, and
    before she can *decline*, which we are required to record. Creating a
    participant grants nothing on its own — every screening route still
    demands an accepted consent row.
    """
    language = _requested_language()
    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported language {language!r}.",
                        "code": "unsupported_language"}), 400

    participant, raw_token = enrol_participant(language=language)
    return jsonify({
        # The token, not the participant_id. The client has no use for the
        # research join key, so it never goes over the wire.
        "screening_token": raw_token,
        "language": participant.preferred_language,
        "consent": consent_state(participant.participant_id),
    }), 201


# ─── UNGATED: the consent text itself ─────────────────────────────────────────
@screening_bp.route("/consent/content", methods=["GET"])
def consent_content():
    """
    Returns the active consent bundle for one language.

    Ungated because she must be able to read it before deciding anything, and
    because reading consent text is not participation.

    No language fallback. If the requested language has no active bundle this
    returns 409 with the languages that do, and the UI offers those instead of
    silently showing her a language she may not read.
    """
    language = _requested_language()
    try:
        row = get_active_consent_content(language)
    except ConsentError as exc:
        body, status = exc.to_response()
        payload = body.get_json()
        payload["available_languages"] = available_languages("consent")
        return jsonify(payload), status

    return jsonify({
        "consent_version": row.version,
        "language": row.language,
        "content_version_id": row.id,
        "checksum": row.checksum,
        "review_required": bundle_of(row).get("review_required", False),
        "content": bundle_of(row),
    })


# ─── UNGATED: the decision ────────────────────────────────────────────────────
@screening_bp.route("/consent", methods=["POST"])
def submit_consent():
    """
    Records an acceptance or a decline.

    Ungated because this IS the gate's input. It still requires a valid token,
    so a decision always attaches to a real participant.

    The version and language stored come from the bundle the server resolves,
    not from the request body. The client may state which version it believes
    it displayed; if that disagrees with the active version we refuse rather
    than record a consent whose provenance we cannot vouch for.
    """
    # allow_revoked so a withdrawn participant gets the accurate
    # "already withdrawn" answer instead of an opaque invalid-token error.
    token = resolve_token(required=True, allow_revoked=True)
    payload = request.get_json(silent=True) or {}

    decision = str(payload.get("decision", "")).strip().lower()
    language = _requested_language()
    agreed = bool(payload.get("agreed", False))
    claimed_version = payload.get("consent_version")

    content = get_active_consent_content(language)

    if claimed_version and str(claimed_version) != content.version:
        return jsonify({
            "error": "The consent text has been updated. Please read it again.",
            "code": "consent_version_stale",
            "active_version": content.version,
        }), 409

    row = record_consent_decision(
        participant_id=token.participant_id,
        decision=decision,
        content=content,
        agreed_checkbox=agreed,
    )

    return jsonify({
        "consent": consent_state(token.participant_id),
        "recorded_at": row.recorded_at.isoformat() + "Z",
        # Where the client should go next. The server decides this, so the
        # decline path cannot be skipped by a client that ignores it.
        "next": "stage1" if row.status == "accepted" else "declined",
    }), 201


# ─── Token-bound: state + withdrawal ──────────────────────────────────────────
@screening_bp.route("/status", methods=["GET"])
def status():
    """Current consent state for this browser. Safe to poll on page load."""
    token = resolve_token(required=True, allow_revoked=True)
    db.session.commit()          # persist last_seen_at
    return jsonify({"consent": consent_state(token.participant_id)})


@screening_bp.route("/consent/withdraw", methods=["POST"])
def withdraw():
    """
    Records a withdrawal and revokes this browser's tokens.

    Deliberately NOT behind @require_consent. The gate refuses withdrawn
    participants, so gating withdrawal would make it impossible to withdraw
    twice, and a mother hitting "stop" a second time because she is not sure
    it worked should get reassurance, not an error. `record_withdrawal` is
    idempotent for exactly that reason.
    """
    token = resolve_token(required=True, allow_revoked=True)
    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason") or None

    row = record_withdrawal(participant_id=token.participant_id, reason=reason)
    return jsonify({
        "consent": consent_state(token.participant_id),
        "withdrawn_at": row.withdrawn_at.isoformat() + "Z" if row.withdrawn_at else None,
    })


# ─── GATED: Stage 1 ───────────────────────────────────────────────────────────
@screening_bp.route("/stage1", methods=["GET"])
@require_consent
def stage1_start():
    """
    Opens or resumes a Stage 1 session and returns the question bundle.

    Reaching this body means a valid token was presented AND the most recent
    consent decision for that participant is 'accepted'.

    Returns 409 `content_unavailable` when no Stage 1 bundle is published in
    her language. That is the correct failure: unpublished or unreviewed
    clinical questions must never be served, and there is no fallback language.
    """
    language = _requested_language(default=g.consent_state.get("language") or "en")
    try:
        session, content = get_or_create_session(
            participant_id=g.participant_id, stage=1, language=language
        )
    except ContentError as exc:
        return jsonify({
            "error": str(exc),
            "code": "content_unavailable",
            "available_languages": available_languages(STAGE1_KEY),
        }), 409

    bundle = bundle_of(content)
    return jsonify({
        "session_uid": session.session_uid,
        "screening_version": content.version,
        "language": content.language,
        "checksum": content.checksum,
        "review_required": bundle.get("review_required", False),
        # Option values are sent because the UI renders them, but the server
        # re-validates every submitted value against the bundle regardless.
        "content": {
            "title": bundle.get("title"),
            "intro": bundle.get("intro"),
            "instruction": bundle.get("instruction"),
            "continue_label": bundle.get("continue_label"),
            "back_label": bundle.get("back_label"),
            # The PHQ items are reproduced with their source cited.
            "attribution": bundle.get("attribution"),
            "items": bundle.get("items", []),
        },
        "progress": session_progress(session=session, content=content),
    })


@screening_bp.route("/stage1/answer", methods=["POST"])
@require_consent
def stage1_answer():
    """
    Records one answer.

    One at a time, on purpose. A session she abandons keeps what she answered,
    and a safety disclosure is committed the instant it is made rather than
    waiting for a final submit that may never come.
    """
    payload = request.get_json(silent=True) or {}
    item_code = str(payload.get("item_code", "")).strip()
    raw_value = payload.get("value")

    if not item_code:
        return jsonify({"error": "item_code is required.", "code": "item_code_required"}), 400
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return jsonify({"error": "value must be an integer.", "code": "invalid_value"}), 400

    # Bind to the session already open. Never create one here: an /answer that
    # could open a session would silently fork a second Stage 1 row whenever a
    # client posted a late answer after completion.
    session = get_open_session(g.participant_id, 1)
    if session is None:
        return jsonify({
            "error": "No Stage 1 session is open. Start one first.",
            "code": "no_open_session",
        }), 409

    try:
        content = content_for_session(session)
        result = record_answer(
            session=session, content=content, item_code=item_code, value=value
        )
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    body = {
        "recorded": True,
        "item_code": item_code,
        "safety_triggered": result["safety_triggered"],
        "progress": session_progress(session=session, content=content),
    }
    if result["safety_triggered"]:
        # She sees this immediately, without waiting for the end of the
        # questionnaire. Text comes from the bundle, never from this file.
        body["safety_response"] = bundle_of(content).get("safety_response")
    return jsonify(body), 201


@screening_bp.route("/stage1/complete", methods=["POST"])
@require_consent
def stage1_complete():
    """
    Scores the session, assigns the tier, and says what comes next.

    The tier and the routing decision are computed server-side from the
    bundle's bands. The client is told the outcome; it does not compute it.
    """
    # The latest session, whatever its status: completing an already-completed
    # session is idempotent and returns the same result, so a retried request
    # does not error.
    session = get_latest_session(g.participant_id, 1)
    if session is None:
        return jsonify({
            "error": "No Stage 1 session to complete.",
            "code": "no_open_session",
        }), 409

    try:
        content = content_for_session(session)
        result = complete_session(session=session, content=content)
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    return jsonify(result)


# ─── GATED: Stage 2 (EPDS) ────────────────────────────────────────────────────
# Stage 2 sits behind two gates: recorded consent, and a completed Stage 1 whose
# banding says `next: stage2`. The second is enforced on every one of these
# routes, not just on the first, so a client cannot open the questionnaire by
# skipping straight to /answer.

@screening_bp.route("/stage2", methods=["GET"])
@require_consent
def stage2_start():
    """
    Opens or resumes a Stage 2 session, once Stage 1 has indicated it.

    Returns 409 `stage1_required` when Stage 1 is unfinished, and 409
    `stage2_not_indicated` when it finished without indicating Stage 2. They
    are different situations and the UI should say different things.

    If she already completed Stage 2 for this Stage 1, her result is returned
    rather than a fresh run of the same ten questions.
    """
    try:
        stage1 = check_stage2_indicated(g.participant_id)
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    done = stage2_already_done(g.participant_id, stage1)
    if done is not None:
        content = content_for_session(done)
        return jsonify({
            "completed": True,
            "result": result_payload(done, bundle_of(content)),
        })

    language = _requested_language(default=g.consent_state.get("language") or "en")
    try:
        session, content = get_or_create_session(
            participant_id=g.participant_id, stage=2, language=language,
            preceded_by=stage1,
        )
    except ContentError as exc:
        return jsonify({
            "error": str(exc),
            "code": "content_unavailable",
            "available_languages": available_languages(EPDS_KEY),
        }), 409

    bundle = bundle_of(content)
    return jsonify({
        "completed": False,
        "session_uid": session.session_uid,
        "preceded_by": stage1.session_uid,
        "screening_version": content.version,
        "language": content.language,
        "checksum": content.checksum,
        "review_required": bundle.get("review_required", False),
        "content": {
            "title": bundle.get("title"),
            "intro": bundle.get("intro"),
            "instruction": bundle.get("instruction"),
            "continue_label": bundle.get("continue_label"),
            "back_label": bundle.get("back_label"),
            # The EPDS may be reproduced only with its source cited on every
            # copy, so the citation travels with the questions.
            "attribution": bundle.get("attribution"),
            "items": bundle.get("items", []),
        },
        "progress": session_progress(session=session, content=content),
    })


@screening_bp.route("/stage2/answer", methods=["POST"])
@require_consent
def stage2_answer():
    """
    Records one EPDS answer.

    Item 10 is the safety item in this instrument; the engine reads that from
    the bundle's `is_safety_item` flag rather than from the item number, so
    renumbering cannot silently disarm it.
    """
    payload = request.get_json(silent=True) or {}
    item_code = str(payload.get("item_code", "")).strip()
    raw_value = payload.get("value")

    if not item_code:
        return jsonify({"error": "item_code is required.", "code": "item_code_required"}), 400
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return jsonify({"error": "value must be an integer.", "code": "invalid_value"}), 400

    # Re-checked here, not just on GET: the gate must hold on every route.
    try:
        check_stage2_indicated(g.participant_id)
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    session = get_open_session(g.participant_id, 2)
    if session is None:
        return jsonify({
            "error": "No Stage 2 session is open. Start one first.",
            "code": "no_open_session",
        }), 409

    try:
        content = content_for_session(session)
        result = record_answer(
            session=session, content=content, item_code=item_code, value=value
        )
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    body = {
        "recorded": True,
        "item_code": item_code,
        "safety_triggered": result["safety_triggered"],
        "progress": session_progress(session=session, content=content),
    }
    if result["safety_triggered"]:
        body["safety_response"] = bundle_of(content).get("safety_response")
    return jsonify(body), 201


@screening_bp.route("/stage2/complete", methods=["POST"])
@require_consent
def stage2_complete():
    """
    Scores the EPDS and assigns its status band.

    The total and the band are computed server-side from the bundle. This file
    does not know what an EPDS cut-off is, and must not learn.
    """
    try:
        check_stage2_indicated(g.participant_id)
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    session = get_latest_session(g.participant_id, 2)
    if session is None:
        return jsonify({
            "error": "No Stage 2 session to complete.",
            "code": "no_open_session",
        }), 409

    try:
        content = content_for_session(session)
        result = complete_session(session=session, content=content)
    except InstrumentError as exc:
        return jsonify({"error": exc.message, "code": exc.code}), exc.status_code

    return jsonify(result)
