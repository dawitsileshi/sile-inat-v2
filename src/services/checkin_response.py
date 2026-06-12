"""
src/services/checkin_response.py — Check-in prose response builder.

Single source of truth for the warm post-submit messages. Called by
`POST /api/logs` at submit time so the rendered text is stored on the
DailyLog row and the journal page can replay exactly what she saw.

NOTE: The frontend still renders the interactive bits — support links
(Circles / AI / Comfort) and the crisis-keyword card — because those
are affordances, not text. This module only produces the prose.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

# Friendly 1–5 display scale used for the messages, where 5 = best day,
# 1 = worst. The API's mood_score is INVERTED (1 = calm, 5 = anxious),
# so we map: display = 6 - api.
_MOOD_MESSAGES: dict[int, str] = {
    1: (
        "Thank you for checking in today. Even doing this — pausing for one "
        "minute to notice how you feel — is something. You don’t have to be "
        "okay. You just have to keep going."
    ),
    2: (
        "Holding on is enough. You showed up for your baby today and you "
        "showed up here. That’s real. Rest when you can."
    ),
    3: (
        "Okay-ish is a real place. Not good, not bad — just getting through. "
        "Many mothers are right here with you tonight."
    ),
    4: (
        "Some good moments is worth holding onto. They don’t erase the hard "
        "parts, but they’re real too."
    ),
    5: (
        "That’s a good day. Remember this one. On the harder days, it helps "
        "to know they exist."
    ),
}


def _display_from_api(api_mood_score: int) -> int:
    """Map API mood_score (1=calm..5=anxious) to display (1=worst..5=best)."""
    return max(1, min(5, 6 - int(api_mood_score)))


def _stage_message(weeks_postpartum: Optional[int]) -> Optional[str]:
    if weeks_postpartum is None or weeks_postpartum < 0:
        return None
    if weeks_postpartum <= 2:
        return (
            "You are in the very first days. Sleep, nourishment, and being "
            "held are the whole job right now."
        )
    if weeks_postpartum <= 6:
        return (
            "The first weeks are their own season. Whatever today looked "
            "like, it counted."
        )
    if weeks_postpartum <= 12:
        return (
            "You’re past the earliest stretch. The body is still healing — "
            "go gently with yourself."
        )
    if weeks_postpartum <= 26:
        return (
            "Months three to six are quietly hard. The newness fades but the "
            "tiredness can stay. You’re still in it."
        )
    if weeks_postpartum <= 52:
        return (
            "You’ve carried this for over half a year. That is a long time. "
            "Be proud of the small steady things."
        )
    return (
        "A year in, and still figuring it out. That is allowed. Motherhood "
        "doesn’t arrive all at once."
    )


def _weeks_postpartum_for(user) -> Optional[int]:
    """Returns weeks since baby_birth_date, or None when not applicable."""
    if user is None:
        return None
    if getattr(user, "baby_status", None) != "born":
        return None
    birth = getattr(user, "baby_birth_date", None)
    if birth is None:
        return None
    days = (date.today() - birth).days
    if days < 0:
        return None
    return days // 7


def build_response_message(user, api_mood_score: int) -> str:
    """Compose the mood line, optionally followed by the postpartum-stage line."""
    mood_msg = _MOOD_MESSAGES[_display_from_api(api_mood_score)]
    stage_msg = _stage_message(_weeks_postpartum_for(user))
    if stage_msg:
        return f"{mood_msg}\n\n{stage_msg}"
    return mood_msg
