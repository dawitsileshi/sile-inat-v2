"""
src/services/screening_consent.py — Consent gate for the screening pilot
========================================================================

Everything that decides whether a mother may be asked a screening question
lives here. The rule the whole module exists to enforce:

    No screening endpoint may do anything until a `ScreeningConsent` row with
    status 'accepted' is the most recent decision for that participant.

That rule is enforced on the server, in one decorator, against a credential the
client cannot forge. The frontend consent screen is a courtesy — a clear place
to read and decide. It is not the gate, and nothing here trusts it.

Design notes worth knowing before editing:

* The consent TEXT is versioned content, loaded from src/content/consent/ into
  `ScreeningContentVersion`. Nothing in this file contains consent wording.

* There is NO language fallback for consent. If the Amharic bundle is missing,
  the request fails rather than quietly serving English. Consent read in a
  language she did not choose is not consent — see the `language` column
  comment on ScreeningConsent.

* The language recorded on the consent row is the language of the bundle the
  SERVER served, never a language the client claims in the request body.
"""

from __future__ import annotations

import logging
from datetime import datetime
from functools import wraps
from typing import Optional

from flask import g, jsonify, request

from src.extensions import db
from src.models import (
    ScreeningAccessToken,
    ScreeningConsent,
    ScreeningContentVersion,
    ScreeningParticipant,
)
from src.services.screening_content import (
    CONSENT_KEY,
    SUPPORTED_LANGUAGES,
    ContentError,
    get_active_content,
    sync_content,
)

log = logging.getLogger(__name__)

TOKEN_HEADER = "X-Screening-Token"


# ─── Errors ───────────────────────────────────────────────────────────────────
class ConsentError(Exception):
    """Base for consent failures that map onto an HTTP response."""

    status_code = 400
    code = "consent_error"

    def __init__(self, message: str, *, code: Optional[str] = None,
                 status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code

    def to_response(self):
        return jsonify({"error": self.message, "code": self.code}), self.status_code


class ContentUnavailable(ConsentError):
    status_code = 409
    code = "consent_content_unavailable"


class NotAuthenticated(ConsentError):
    status_code = 401
    code = "screening_token_missing"


class ConsentRequired(ConsentError):
    status_code = 403
    code = "consent_required"


# ─── Content loading (delegates to the shared registry) ───────────────────────
# Consent text is versioned content like any other instrument, so the loading,
# checksumming and publication rules live in screening_content.py. These
# wrappers keep the consent-specific error types the routes already handle.

def sync_consent_content() -> int:
    """Syncs all content bundles. Returns the number of consent rows written."""
    written = sync_content()
    return written.get(CONSENT_KEY, 0)


def get_active_consent_content(language: str) -> ScreeningContentVersion:
    """
    The consent bundle to serve, for this language only.

    Raises ContentUnavailable rather than falling back to another language.
    The caller should offer the language she *can* read, not substitute one.
    """
    if language not in SUPPORTED_LANGUAGES:
        raise ConsentError(
            f"Unsupported language {language!r}.",
            code="unsupported_language",
            status_code=400,
        )
    try:
        return get_active_content(CONSENT_KEY, language)
    except ContentError as exc:
        raise ContentUnavailable(str(exc)) from exc


# ─── Participant enrolment + credential ───────────────────────────────────────
def enrol_participant(*, language: str, cohort: Optional[str] = None) -> tuple:
    """
    Mints a participant and a bearer token. Returns (participant, raw_token).

    Called before consent is given, because she needs an identity to attach the
    consent decision to — including a DECLINE, which we are required to record.
    A participant with a declined consent and nothing else is a valid, expected
    end state.
    """
    if language not in SUPPORTED_LANGUAGES:
        raise ConsentError(
            f"Unsupported language {language!r}.",
            code="unsupported_language",
            status_code=400,
        )

    participant = ScreeningParticipant(preferred_language=language, cohort=cohort)
    db.session.add(participant)
    db.session.flush()          # participant_id needed for the token FK

    raw_token = ScreeningAccessToken.generate_token()
    db.session.add(ScreeningAccessToken(token=raw_token,
                                        participant_id=participant.participant_id))
    db.session.commit()
    return participant, raw_token


def resolve_token(
    *, required: bool = True, allow_revoked: bool = False
) -> Optional[ScreeningAccessToken]:
    """
    Reads X-Screening-Token and returns the token row, or None.

    `allow_revoked` exists because withdrawal revokes the token, and a mother
    who taps "stop" twice — or simply reloads the page afterwards — must see a
    calm confirmation that she has withdrawn, not an error telling her the
    session is invalid. Reading your own withdrawn state is not participation,
    so the read paths (/status, /consent, /consent/withdraw) accept a revoked
    token. `require_consent` never does, so this widens nothing that matters:
    a revoked token still cannot reach a screening question.
    """
    raw = request.headers.get(TOKEN_HEADER)
    if not raw:
        if required:
            raise NotAuthenticated("A screening session token is required.")
        return None

    row = ScreeningAccessToken.query.filter_by(token=raw.strip()).one_or_none()
    if row is None or (not row.is_active and not allow_revoked):
        if required:
            # Same message either way: a caller probing tokens learns nothing
            # about which ones exist.
            raise NotAuthenticated(
                "This screening session is no longer valid.",
                code="screening_token_invalid",
            )
        return None

    row.last_seen_at = datetime.utcnow()
    return row


# ─── Recording decisions ──────────────────────────────────────────────────────
def record_consent_decision(
    *,
    participant_id: str,
    decision: str,
    content: ScreeningContentVersion,
    agreed_checkbox: bool,
) -> ScreeningConsent:
    """
    Writes one consent decision. `decision` is 'accepted' or 'declined'.

    The version and language written are taken from `content` — the bundle the
    server actually resolved — so a client cannot claim to have read a version
    or language it was never served.
    """
    if decision not in ("accepted", "declined"):
        raise ConsentError(
            "decision must be 'accepted' or 'declined'.",
            code="invalid_decision",
        )
    if decision == "accepted" and not agreed_checkbox:
        raise ConsentError(
            "The confirmation box must be ticked to accept.",
            code="confirmation_required",
        )

    previous = ScreeningConsent.current_for(participant_id)
    if previous is not None and previous.status == "withdrawn":
        # Re-consenting after withdrawal is a protocol decision, not a bug to
        # paper over silently. Refuse until someone decides what it means.
        raise ConsentError(
            "This participant has withdrawn from the study.",
            code="already_withdrawn",
            status_code=409,
        )

    row = ScreeningConsent(
        participant_id=participant_id,
        status=decision,
        consent_version=content.version,
        content_version_id=content.id,
        language=content.language,
        supersedes_id=previous.id if previous else None,
    )
    db.session.add(row)
    db.session.commit()
    log.info("Consent %s recorded for participant (version %s, lang %s)",
             decision, content.version, content.language)
    return row


def record_withdrawal(*, participant_id: str, reason: Optional[str] = None) -> ScreeningConsent:
    """
    Appends a withdrawal row. Never edits the original acceptance.

    Also revokes the browser's tokens: withdrawing should close the door this
    browser came through, not merely set a flag it could ignore.
    """
    previous = ScreeningConsent.current_for(participant_id)
    if previous is None:
        raise ConsentError(
            "There is no consent record to withdraw.",
            code="nothing_to_withdraw",
            status_code=409,
        )
    if previous.status == "withdrawn":
        return previous          # idempotent: withdrawing twice is not an error

    active_consent = previous.status == "accepted"
    if not active_consent:
        raise ConsentError(
            "Consent was not accepted, so there is nothing to withdraw.",
            code="nothing_to_withdraw",
            status_code=409,
        )

    now = datetime.utcnow()
    row = ScreeningConsent(
        participant_id=participant_id,
        status="withdrawn",
        consent_version=previous.consent_version,
        content_version_id=previous.content_version_id,
        language=previous.language,
        withdrawn_at=now,
        withdrawal_reason=reason,
        supersedes_id=previous.id,
    )
    db.session.add(row)

    for token in ScreeningAccessToken.query.filter_by(
        participant_id=participant_id, revoked_at=None
    ).all():
        token.revoked_at = now

    participant = db.session.get(ScreeningParticipant, participant_id)
    if participant is not None:
        participant.is_active = False

    db.session.commit()
    log.info("Withdrawal recorded; tokens revoked for participant.")
    return row


# ─── The gate ─────────────────────────────────────────────────────────────────
def consent_state(participant_id: str) -> dict:
    """Current consent state, shaped for the client."""
    current = ScreeningConsent.current_for(participant_id)
    if current is None:
        return {"status": "none", "can_screen": False,
                "consent_version": None, "language": None}
    return {
        "status": current.status,
        "can_screen": current.status == "accepted",
        "consent_version": current.consent_version,
        "language": current.language,
        "recorded_at": current.recorded_at.isoformat() + "Z",
        "withdrawn_at": current.withdrawn_at.isoformat() + "Z" if current.withdrawn_at else None,
    }


def require_consent(fn):
    """
    Decorator for every screening endpoint that asks or stores a question.

    Resolves the token, checks that the latest consent decision is 'accepted',
    and puts the participant on `g`. A request that fails either check never
    reaches the handler body.

    Endpoints that deliberately sit OUTSIDE this gate:
      * GET  /api/screening/consent/content   — she must read before deciding
      * POST /api/screening/participants      — she needs an identity to decide
      * POST /api/screening/consent           — the decision itself
    Everything else must carry this decorator. There is no opt-out flag,
    because a flag is a thing someone eventually sets to True.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            token = resolve_token(required=True)
            state = consent_state(token.participant_id)
            if not state["can_screen"]:
                raise ConsentRequired(
                    "Screening requires recorded consent.",
                    code="consent_required" if state["status"] != "withdrawn"
                    else "consent_withdrawn",
                )
            g.screening_token = token
            g.participant_id = token.participant_id
            g.consent_state = state
            db.session.commit()      # persist last_seen_at
        except ConsentError as exc:
            db.session.rollback()
            return exc.to_response()
        return fn(*args, **kwargs)

    return wrapper
