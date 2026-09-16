"""
src/services/screening_instrument.py — Shared engine for Stage 1 and Stage 2
============================================================================

Stage 1 (brief triage) and Stage 2 (EPDS) differ in three ways and no more:
which content key they read, which safety trigger they record, and which pair
of columns they write their result into. Everything else — session lifecycle,
answer validation, per-item storage, banding, safety handling — is identical,
so it lives here once. `STAGE_CONFIG` is the entire difference.

Contains no questions, no option values, no scoring bands and no safety
thresholds. All of those are content, read from `ScreeningContentVersion`. If
you find yourself adding a number here that a clinician would recognise, it
belongs in the bundle instead.

Two ordering rules carry the weight of this module:

1. ANSWERS ARE SAVED ONE AT A TIME, as she taps them. A session she abandons
   halfway keeps what she did answer. Buffering answers in the browser and
   posting them at the end would lose a safety disclosure if she closes the
   tab, which is the one loss this system may not have.

2. A SAFETY DISCLOSURE IS COMMITTED BEFORE ANYTHING ELSE HAPPENS. The moment a
   safety item comes back at or above its trigger threshold, the SafetyEvent,
   the follow-up row and its opening transition are written and committed in
   their own transaction. Scoring, banding and completion all happen
   afterwards, in separate transactions, so no failure in that later work can
   take the disclosure down with it.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from src.extensions import db
from src.models import (
    SAFETY_TRIGGER_EPDS_ITEM_10,
    SAFETY_TRIGGER_STAGE1,
    FollowUpTransition,
    SafetyEvent,
    ScreeningContentVersion,
    ScreeningFollowUp,
    ScreeningItemResponse,
    ScreeningSession,
)
from src.services.screening_content import (
    EPDS_KEY,
    STAGE1_KEY,
    band_label,
    bundle_of,
    get_active_content,
)

log = logging.getLogger(__name__)

#: The whole difference between the two stages.
STAGE_CONFIG = {
    1: {
        "content_key": STAGE1_KEY,
        "trigger_source": SAFETY_TRIGGER_STAGE1,
        "total_column": "stage1_total_score",
        "band_column": "stage1_tier",
    },
    2: {
        "content_key": EPDS_KEY,
        "trigger_source": SAFETY_TRIGGER_EPDS_ITEM_10,
        "total_column": "epds_total_score",
        "band_column": "epds_status",
    },
}


class InstrumentError(Exception):
    """Raised for a malformed or out-of-order screening request."""

    status_code = 400
    code = "screening_error"

    def __init__(self, message: str, *, code: Optional[str] = None,
                 status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


def config_for(stage: int) -> dict:
    if stage not in STAGE_CONFIG:
        raise InstrumentError(f"Unknown stage {stage!r}.", code="unknown_stage")
    return STAGE_CONFIG[stage]


# ─── Session lifecycle ────────────────────────────────────────────────────────
def get_or_create_session(
    *,
    participant_id: str,
    stage: int,
    language: str,
    preceded_by: Optional[ScreeningSession] = None,
) -> tuple:
    """
    Returns (session, content_row). Resumes an in-progress session if one
    exists, so a reload or a dropped connection does not start her over or
    leave a second half-finished row in the research data.

    A completed session is NOT resumed — re-screening is a new session, which
    is what the pilot wants to measure over time.
    """
    cfg = config_for(stage)
    content = get_active_content(cfg["content_key"], language)

    session = get_open_session(participant_id, stage)
    if session is not None:
        # She switched language mid-session. Move the session to the new
        # bundle rather than silently mixing two languages across her answers.
        if session.content_version_id != content.id:
            session.language = content.language
            session.content_version_id = content.id
            session.screening_version = content.version
            session.content_checksum = content.checksum
            db.session.commit()
        return session, content

    session = ScreeningSession(
        participant_id=participant_id,
        stage=stage,
        language=content.language,
        content_version_id=content.id,
        screening_version=content.version,
        content_checksum=content.checksum,
        status="in_progress",
        preceded_by_session_id=preceded_by.id if preceded_by is not None else None,
    )
    db.session.add(session)
    db.session.commit()
    return session, content


def get_open_session(participant_id: str, stage: int) -> Optional[ScreeningSession]:
    """The participant's in-progress session for this stage, or None."""
    return (
        ScreeningSession.query
        .filter_by(participant_id=participant_id, stage=stage, status="in_progress")
        .order_by(ScreeningSession.started_at.desc())
        .first()
    )


def get_latest_session(participant_id: str, stage: int) -> Optional[ScreeningSession]:
    """The participant's most recent session for this stage, any status."""
    return (
        ScreeningSession.query
        .filter_by(participant_id=participant_id, stage=stage)
        .order_by(ScreeningSession.started_at.desc())
        .first()
    )


def content_for_session(session: ScreeningSession) -> ScreeningContentVersion:
    """
    The bundle this session was STARTED with, looked up by id.

    Answers are validated against the session's own bundle, never against
    whatever happens to be active now. If content is republished while she is
    mid-questionnaire, her answers must still be scored against the questions
    she actually read.
    """
    row = db.session.get(ScreeningContentVersion, session.content_version_id)
    if row is None:
        raise InstrumentError(
            "The content version for this session is missing.",
            code="content_unavailable",
            status_code=409,
        )
    return row


def _item_map(bundle: dict) -> dict:
    return {item["code"]: item for item in bundle.get("items", [])}


# ─── Answering ────────────────────────────────────────────────────────────────
def record_answer(
    *,
    session: ScreeningSession,
    content: ScreeningContentVersion,
    item_code: str,
    value: int,
) -> dict:
    """
    Stores one answer and, if it is a safety disclosure, records that first.

    Returns {"safety_triggered": bool, "response": ScreeningItemResponse}.

    The answer is validated against the bundle: an unknown item code, or an
    option value the bundle does not offer, is refused. A client cannot invent
    an item or smuggle in a score of its own choosing.
    """
    if session.status != "in_progress":
        raise InstrumentError(
            "This screening session is already finished.",
            code="session_not_in_progress",
            status_code=409,
        )

    bundle = bundle_of(content)
    items = _item_map(bundle)

    item = items.get(item_code)
    if item is None:
        raise InstrumentError(
            f"Unknown item {item_code!r} for {content.label}.",
            code="unknown_item",
        )

    allowed = {opt["value"] for opt in item["options"]}
    if value not in allowed:
        raise InstrumentError(
            f"Value {value!r} is not an option for {item_code!r}.",
            code="invalid_option",
        )

    label = next(opt["label"] for opt in item["options"] if opt["value"] == value)

    # Upsert: re-answering before completion replaces her previous answer
    # rather than adding a second row that would inflate the total. The unique
    # constraint on (session_id, item_code) is the backstop.
    response = ScreeningItemResponse.query.filter_by(
        session_id=session.id, item_code=item_code
    ).one_or_none()

    if response is None:
        response = ScreeningItemResponse(
            session_id=session.id,
            participant_id=session.participant_id,
            item_code=item_code,
            item_index=item.get("index", len(items)),
            item_version=item.get("version") or content.version,
            content_version_id=content.id,
            is_safety_item=bool(item.get("is_safety_item")),
        )
        db.session.add(response)

    response.response_value = value
    response.response_label = label
    response.answered_at = datetime.utcnow()
    db.session.commit()

    triggered = False
    if item.get("is_safety_item"):
        threshold = item["safety_trigger_min_value"]   # validated at sync time
        if value >= threshold:
            # Committed in its own transaction, before any scoring happens.
            record_safety_event(
                session=session, content=content, item=item, value=value, label=label,
            )
            triggered = True

    return {"safety_triggered": triggered, "response": response}


def record_safety_event(*, session, content, item, value, label) -> SafetyEvent:
    """
    Writes the SafetyEvent, opens a follow-up, and logs the opening transition.

    Idempotent on (session_id, item_code): if she changes her answer and
    re-triggers, or the client retries, we do not create a second event for the
    same disclosure. The original event is never edited — it is write-once at
    both the ORM and database level.

    No alert is dispatched here because no notification channel exists yet.
    `alert_status` stays 'pending' and the follow-up sits in 'new', which is
    the honest representation: recorded, queued, not yet acted on. Wiring a
    channel means calling SafetyEvent.record_alert_attempt().
    """
    existing = SafetyEvent.query.filter_by(
        session_id=session.id, item_code=item["code"]
    ).one_or_none()
    if existing is not None:
        return existing

    cfg = config_for(session.stage)
    event = SafetyEvent(
        participant_id=session.participant_id,
        session_id=session.id,
        session_uid=session.session_uid,
        trigger_source=cfg["trigger_source"],
        item_code=item["code"],
        item_response_value=value,
        item_response_label=label,
        stage=session.stage,
        language=session.language,
        screening_version=session.screening_version,
        content_version_id=content.id,
        occurred_at=datetime.utcnow(),
    )
    db.session.add(event)
    db.session.flush()

    follow_up = ScreeningFollowUp(
        participant_id=session.participant_id,
        safety_event_id=event.id,
        session_id=session.id,
        status="new",
    )
    db.session.add(follow_up)
    db.session.flush()

    db.session.add(FollowUpTransition(
        follow_up_id=follow_up.id,
        from_status=None,
        to_status="new",
        changed_by=None,          # system-opened
        note=f"Opened automatically by a stage {session.stage} safety disclosure.",
    ))
    db.session.flush()

    # Tell the on-call clinician. Recorded as an attempt either way, and never
    # allowed to raise: the disclosure and the follow-up are already written,
    # and a notification problem must not cost her the session. Committed
    # together with them so the attempt cannot survive a rolled-back event.
    from src.services.screening_alert import dispatch_safely
    outcome = dispatch_safely(event)
    db.session.commit()

    log.warning(
        "SAFETY EVENT recorded (stage %s, trigger %s, item %s, event %s). "
        "Follow-up %s is open; alert %s.",
        session.stage, cfg["trigger_source"], item["code"],
        event.event_uid, follow_up.id,
        outcome or "NOT SENT (no channel configured)",
    )
    return event


# ─── Scoring + completion ─────────────────────────────────────────────────────
def resolve_outcome(bundle: dict, total: int, *, safety_triggered: bool) -> dict:
    """
    Maps a total onto a band using the bundle's own boundaries. Never a
    hardcoded number, and never a cut-off invented in Python.

    A safety disclosure applies the bundle's `safety_override`, so a mother who
    discloses self-harm is never sorted into a reassuring band by arithmetic
    alone. The override is content too — the bundle decides what it means.
    """
    scoring = bundle.get("scoring", {})

    if safety_triggered and scoring.get("safety_override"):
        override = scoring["safety_override"]
        return {
            "band": band_label(override),
            "next": override.get("next", "end"),
            "by_safety_override": True,
        }

    for band in scoring.get("tiers", scoring.get("bands", [])):
        if band["min"] <= total <= band["max"]:
            return {
                "band": band_label(band),
                "next": band.get("next", "end"),
                "by_safety_override": False,
            }

    # sync-time validation makes this unreachable; if it ever fires, the
    # content is broken and guessing a band would be worse than failing.
    raise InstrumentError(
        f"Total {total} matches no band in {bundle.get('version')}.",
        code="unscoreable",
        status_code=500,
    )


def complete_session(*, session: ScreeningSession, content) -> dict:
    """
    Scores the session, assigns the band, and closes it.

    Requires every item answered: a partial total is not comparable with a
    complete one, and quietly scoring a half-finished set would put a
    meaningless number in the research data.
    """
    cfg = config_for(session.stage)
    bundle = bundle_of(content)
    items = _item_map(bundle)

    if session.status == "completed":
        return result_payload(session, bundle)           # idempotent

    if session.status != "in_progress":
        raise InstrumentError(
            "This screening session is no longer open.",
            code="session_not_in_progress",
            status_code=409,
        )

    responses = ScreeningItemResponse.query.filter_by(session_id=session.id).all()
    answered = {r.item_code: r for r in responses}

    missing = [code for code in items
               if code not in answered or answered[code].response_value is None]
    if missing:
        raise InstrumentError(
            "Some questions have not been answered yet.",
            code="incomplete",
            status_code=409,
        )

    total = sum(answered[code].response_value for code in items)
    safety_triggered = bool(db.session.query(
        SafetyEvent.query.filter_by(session_id=session.id).exists()
    ).scalar())

    outcome = resolve_outcome(bundle, total, safety_triggered=safety_triggered)

    setattr(session, cfg["total_column"], total)
    setattr(session, cfg["band_column"], outcome["band"])
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.session.commit()

    # Her result is saved and about to be returned. Telling the team is a
    # courtesy on top of that, never a condition of it, so this runs after the
    # commit and cannot raise.
    from src.services.screening_alert import notify_completion_safely
    notify_completion_safely(
        session_uid=session.session_uid,
        stage=session.stage,
        band=outcome["band"],
        total=total,
        max_score=(bundle.get("scoring") or {}).get("max_score"),
        safety_triggered=safety_triggered,
        language=session.language,
        completed_at=session.completed_at,
    )

    log.info("Stage %s complete: total=%s band=%s next=%s (override=%s)",
             session.stage, total, outcome["band"], outcome["next"],
             outcome["by_safety_override"])

    return result_payload(session, bundle, outcome=outcome,
                          safety_triggered=safety_triggered)


def result_payload(session, bundle, *, outcome=None, safety_triggered=None) -> dict:
    """Shapes the result for the client. All display text comes from the bundle."""
    cfg = config_for(session.stage)
    total = getattr(session, cfg["total_column"])

    if outcome is None:
        safety_triggered = bool(db.session.query(
            SafetyEvent.query.filter_by(session_id=session.id).exists()
        ).scalar())
        outcome = resolve_outcome(bundle, total or 0, safety_triggered=safety_triggered)

    band = getattr(session, cfg["band_column"]) or outcome["band"]
    return {
        "session_uid": session.session_uid,
        "stage": session.stage,
        "status": session.status,
        "total_score": total,
        "band": band,
        # Stage-specific aliases, so the client does not have to know which
        # column a stage writes into.
        "tier": band if session.stage == 1 else None,
        "epds_status": band if session.stage == 2 else None,
        "next": outcome["next"],
        "by_safety_override": outcome["by_safety_override"],
        "safety_triggered": bool(safety_triggered),
        "result": (bundle.get("results") or {}).get(band),
        "safety_response": bundle.get("safety_response") if safety_triggered else None,
        "screening_version": session.screening_version,
        "language": session.language,
    }


def session_progress(*, session: ScreeningSession, content) -> dict:
    """Answers so far, so a resumed session can pick up where she left off."""
    bundle = bundle_of(content)
    responses = ScreeningItemResponse.query.filter_by(session_id=session.id).all()
    return {
        "session_uid": session.session_uid,
        "status": session.status,
        "answers": {r.item_code: r.response_value for r in responses
                    if r.response_value is not None},
        "item_count": len(bundle.get("items", [])),
    }


def outcome_for_completed(session: ScreeningSession) -> Optional[dict]:
    """
    Recomputes the banding of a completed session from its OWN bundle.

    Used by the Stage 2 gate to ask "did her Stage 1 indicate Stage 2?".
    Deterministic because the bundle is fetched by id, so republishing content
    later cannot retroactively change what her Stage 1 decided.
    """
    if session is None or session.status != "completed":
        return None
    content = content_for_session(session)
    return result_payload(session, bundle_of(content))
