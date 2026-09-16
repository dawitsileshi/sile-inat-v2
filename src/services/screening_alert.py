"""
src/services/screening_alert.py — telling the team what happened

When a mother discloses thoughts of self-harm, the consent she agreed to says
"a trained person from our team may try to reach you". This module is the part
that tells that person. Everything it does is recorded: every attempt, including
the ones that fail, because a silently broken notification channel and a working
one look identical from the outside.

Two rules govern everything here.

1. NEVER RAISE INTO THE REQUEST. A notification problem must not break her
   screening or lose her answers. Failures are logged, recorded as a failed
   attempt, and swallowed.

2. THE MESSAGE CARRIES NO ANSWERS. It lands in a consumer chat app, on a
   personal phone, rendered on a lock screen and synced to someone else's
   cloud. Her consent promises her answers are kept under a random code, and
   that promise does not stop being true because the reader is a clinician.
   The alert carries an event id and enough context to go and look — nothing
   that means anything to a stranger glancing at the screen.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Optional

from flask import current_app

from src.extensions import db
from src.models import SafetyEvent

log = logging.getLogger(__name__)

TELEGRAM_CHANNEL = "telegram"
TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"

#: Who the alert is addressed to. Free text today because the rota does not
#: exist yet; when it does, this is the column that says which shift was on.
DEFAULT_RECIPIENT_ROLE = "clinical_lead"


def _config(key: str) -> str:
    try:
        return (current_app.config.get(key) or "").strip()
    except RuntimeError:          # no application context (scripts, shell)
        return ""


def is_configured() -> bool:
    """True when a channel has somewhere to send to."""
    return bool(_config("TELEGRAM_BOT_TOKEN") and _config("TELEGRAM_ALERT_CHAT_ID"))


def build_message(event: SafetyEvent) -> str:
    """
    The whole text of the alert. Deliberately thin.

    Item code and the stage are included because they say which question was
    answered, not what the answer said — the responder needs to know whether
    this came from Stage 1 or the EPDS. The response value is NOT included:
    on a four-point scale it is close enough to her actual words.
    """
    occurred = event.occurred_at.strftime("%d %b %Y %H:%M UTC") if event.occurred_at else "unknown time"
    return "\n".join([
        "⚠️ Safety disclosure",
        "",
        f"Event:    {event.event_uid}",
        f"Stage:    {event.stage} ({event.trigger_source})",
        f"Item:     {event.item_code}",
        f"Language: {event.language or 'unknown'}",
        f"Time:     {occurred}",
        "",
        "No answers are included in this message.",
        "Open the screening records to review it.",
    ])


def _send_telegram(text: str) -> None:
    """Posts to Telegram. Raises on any failure; the caller records it."""
    token = _config("TELEGRAM_BOT_TOKEN")
    payload = json.dumps({
        "chat_id": _config("TELEGRAM_ALERT_CHAT_ID"),
        "text": text,
        "disable_web_page_preview": True,
    }).encode("utf-8")

    request = urllib.request.Request(
        TELEGRAM_API.format(token=token),
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = 10
    try:
        timeout = int(current_app.config.get("SAFETY_ALERT_TIMEOUT", 10))
    except RuntimeError:
        pass

    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = json.loads(response.read().decode("utf-8") or "{}")
    if not body.get("ok"):
        raise RuntimeError(f"Telegram refused the message: {body.get('description')!r}")


def dispatch_safety_alert(event: SafetyEvent, *, recipient_role: Optional[str] = None) -> Optional[str]:
    """
    Tells the on-call clinician that a disclosure has been recorded.

    Returns the outcome written to the attempts log, or None when no channel
    is configured — in which case nothing is recorded and `alert_status` stays
    'pending', which is the honest state: nobody has been told.

    Does not commit. The caller owns the transaction, so the attempt, the
    status advance and the safety event itself land together or not at all.
    """
    role = recipient_role or DEFAULT_RECIPIENT_ROLE

    if not is_configured():
        log.warning(
            "SAFETY EVENT %s recorded but NO ALERT CHANNEL is configured. "
            "Nobody has been told. Set TELEGRAM_BOT_TOKEN and "
            "TELEGRAM_ALERT_CHAT_ID to enable alerts.", event.event_uid,
        )
        return None

    try:
        _send_telegram(build_message(event))
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError,
            TimeoutError, OSError, ValueError) as exc:
        # The detail is for us, not for her, and it must never be lost: an
        # alert that failed silently is the thing this table exists to catch.
        detail = f"{type(exc).__name__}: {exc}"[:500]
        event.record_alert_attempt(
            channel=TELEGRAM_CHANNEL,
            outcome="failed",
            recipient_role=role,
            error_detail=detail,
        )
        log.error("SAFETY ALERT FAILED for %s — %s", event.event_uid, detail)
        return "failed"

    event.record_alert_attempt(
        channel=TELEGRAM_CHANNEL,
        outcome="sent",
        recipient_role=role,
    )
    log.warning("Safety alert sent for %s to %s.", event.event_uid, role)
    return "sent"


# ─── Completion notices ───────────────────────────────────────────────────────
#
# A different thing from a safety alert, and it must never be mistaken for one.
# This says "a screening finished, here is the band"; the safety alert says
# "someone disclosed thoughts of self-harm". They carry different urgency, so
# they are deliberately shaped differently — a distinct marker, a distinct
# opening line, and no siren.
#
# The band and the total are the instrument's output, not her words. No item
# answer, label or note appears here either.


def build_completion_message(
    *, session_uid: str, stage: int, band: str, total: int,
    max_score: Optional[int], safety_triggered: bool,
    language: Optional[str], completed_at,
) -> str:
    when = completed_at.strftime("%d %b %Y %H:%M UTC") if completed_at else "unknown time"
    out_of = f" of {max_score}" if max_score is not None else ""
    return "\n".join([
        "📋 Screening completed",
        "",
        f"Session:  {session_uid}",
        f"Stage:    {stage}",
        f"Result:   {band} (total {total}{out_of})",
        f"Safety:   {'yes - see the separate alert' if safety_triggered else 'no'}",
        f"Language: {language or 'unknown'}",
        f"Time:     {when}",
    ])


def notify_screening_completed(
    *, session_uid: str, stage: int, band: str, total: int,
    max_score: Optional[int] = None, safety_triggered: bool = False,
    language: Optional[str] = None, completed_at=None,
) -> Optional[str]:
    """
    Tells the team a screening finished. Returns "sent", "failed", or None
    when no channel is configured.

    Nothing is written to the database. safety_alert_attempts is evidence
    behind a SafetyEvent's alert_status, and a completion is not a safety
    event — borrowing that table would make the safety log mean less, which
    is the opposite of why it exists.
    """
    if not is_configured():
        return None

    text = build_completion_message(
        session_uid=session_uid, stage=stage, band=band, total=total,
        max_score=max_score, safety_triggered=safety_triggered,
        language=language, completed_at=completed_at,
    )
    try:
        _send_telegram(text)
    except Exception as exc:      # noqa: BLE001 — a notice must never cost her the result
        log.error("Completion notice failed for session %s: %s: %s",
                  session_uid, type(exc).__name__, exc)
        return "failed"
    log.info("Completion notice sent for session %s (stage %s, band %s).",
             session_uid, stage, band)
    return "sent"


def notify_completion_safely(**kwargs) -> Optional[str]:
    """notify_screening_completed with a total guard. Her result is already
    saved and returned; a notification must not be able to disturb it."""
    try:
        return notify_screening_completed(**kwargs)
    except Exception:             # noqa: BLE001 — deliberately total
        log.exception("Completion notice raised for session %s",
                      kwargs.get("session_uid"))
        return None


def dispatch_safely(event: SafetyEvent, *, recipient_role: Optional[str] = None) -> Optional[str]:
    """
    dispatch_safety_alert with a belt-and-braces guard.

    Rule 1 of this module: a notification problem must never break her
    screening. dispatch_safety_alert already handles the failures it can
    foresee; this catches the ones it cannot, so an unexpected error still
    leaves her answers saved and her session intact.
    """
    try:
        return dispatch_safety_alert(event, recipient_role=recipient_role)
    except Exception:             # noqa: BLE001 — deliberately total
        log.exception("Safety alert dispatch raised for %s", event.event_uid)
        try:
            db.session.rollback()
        except Exception:         # noqa: BLE001
            pass
        return None
