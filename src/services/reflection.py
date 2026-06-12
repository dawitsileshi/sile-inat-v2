"""
src/services/reflection.py — Weekly reflection builder
======================================================
Deterministic, rule-based prose generator that reads the last 7 days
of DailyLog rows for a user and returns a structured reflection.

DESIGN INTENT — read before changing:

This is the most voice-fragile feature in the app. The point is to
sound like someone gently reading back what she told us, not a
wellness-app dashboard. So this module has hard rules:

  * No numbers in the output prose. No scores. No percentages.
    Internally we work with numbers; externally only with words.
  * No streak language ("5 days in a row", "you broke your streak").
  * No comparative shame ("you slept less than recommended").
  * Validation precedes anything informational.
  * If the data is sparse, we say less, not more — we never invent
    a pattern from one check-in to fill space.

The patterns/observations are chosen from a small library of pre-written
sentence templates. The rules decide which to surface; the wording is
fixed copy reviewed against the voice rules. Treat the template strings
the way you'd treat user-facing UI copy.

Mood scale gotcha: API mood_score is 1 = calm/best, 5 = anxious/worst.
Higher = harder. Sleep is straightforward — lower = thinner.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from statistics import median
from typing import Optional

from src.models import DailyLog


# ─── Public payload shape ─────────────────────────────────────────────────────


@dataclass
class CalloutAction:
    label: str
    to: str  # frontend route

    def to_dict(self) -> dict:
        return {"label": self.label, "to": self.to}


@dataclass
class Callout:
    prose: str
    action: Optional[CalloutAction] = None

    def to_dict(self) -> dict:
        return {
            "prose": self.prose,
            "action": self.action.to_dict() if self.action else None,
        }


@dataclass
class Quote:
    log_id: int
    log_date: str  # ISO date
    weekday_label: str  # "Tuesday"
    snippet: str  # first ~140 chars of notes
    is_full: bool  # True if snippet == full notes

    def to_dict(self) -> dict:
        return {
            "log_id": self.log_id,
            "log_date": self.log_date,
            "weekday_label": self.weekday_label,
            "snippet": self.snippet,
            "is_full": self.is_full,
        }


@dataclass
class WeeklyReflection:
    week_start: str  # ISO date — the Monday of the week
    week_end: str  # ISO date — the Sunday of the week
    check_in_count: int
    summary: str  # the top paragraph
    quotes: list[Quote] = field(default_factory=list)
    patterns: list[str] = field(default_factory=list)
    callout: Optional[Callout] = None

    def to_dict(self) -> dict:
        return {
            "week_start": self.week_start,
            "week_end": self.week_end,
            "check_in_count": self.check_in_count,
            "summary": self.summary,
            "quotes": [q.to_dict() for q in self.quotes],
            "patterns": list(self.patterns),
            "callout": self.callout.to_dict() if self.callout else None,
        }


# ─── Constants & helpers ──────────────────────────────────────────────────────

# Anything at or below this median is "thin sleep" prose-worthy.
THIN_SLEEP_MEDIAN = 6.0
# Mood score (1-5, higher = worse) above this is "heavier" for that day.
HEAVY_MOOD_THRESHOLD = 3
# Hours considered "late night" for the after-midnight pattern.
LATE_NIGHT_HOURS = {22, 23, 0, 1, 2, 3, 4}
# Snippet length for quote preview.
QUOTE_SNIPPET_LEN = 140
# Max items per section in the response.
MAX_QUOTES = 4
MAX_PATTERNS = 3


WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _start_of_week(d: date) -> date:
    """Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def _short_snippet(text: str, n: int = QUOTE_SNIPPET_LEN) -> tuple[str, bool]:
    text = (text or "").strip()
    if len(text) <= n:
        return text, True
    cut = text[:n].rsplit(" ", 1)[0]
    return cut + "…", False


def _hour_local(dt: datetime) -> int:
    # created_at is stored as UTC; we don't know the user's tz. For now we
    # use UTC hour — Ethiopia is UTC+3, so "after-midnight" in their wall
    # clock will appear ~3 hours later in UTC. Worth fixing once we collect
    # user timezone; flagging here so it isn't forgotten.
    # TODO: respect user timezone for after-midnight rule.
    return dt.hour


# ─── Pattern rules ────────────────────────────────────────────────────────────


def _patterns(logs: list[DailyLog]) -> list[str]:
    """Returns up to MAX_PATTERNS italic observations, in priority order."""
    patterns: list[str] = []

    # Rule: sleep was thin this week
    sleep_values = [l.sleep_hours for l in logs if l.sleep_hours is not None]
    if len(sleep_values) >= 3 and median(sleep_values) <= THIN_SLEEP_MEDIAN:
        patterns.append(
            "Sleep ran thinner this week. The body remembers, even when "
            "the days feel the same."
        )

    # Rule: weekend was kinder (Mon-Fri vs Sat-Sun mood comparison)
    weekday_moods = [l.mood_score for l in logs if l.log_date.weekday() < 5]
    weekend_moods = [l.mood_score for l in logs if l.log_date.weekday() >= 5]
    if len(weekday_moods) >= 2 and len(weekend_moods) >= 1:
        if median(weekend_moods) < median(weekday_moods):
            patterns.append("The weekend sounded a little kinder than the weekdays.")

    # Rule: multiple check-ins on the same day, often late at night
    by_date: dict[date, list[DailyLog]] = {}
    for l in logs:
        by_date.setdefault(l.log_date, []).append(l)
    double_days = [d for d, rows in by_date.items() if len(rows) >= 2]
    if double_days:
        late_doubles = sum(
            1 for d in double_days
            if any(_hour_local(r.created_at) in LATE_NIGHT_HOURS for r in by_date[d])
        )
        if late_doubles >= 2:
            patterns.append(
                "Some days you came back here twice — often late, after the "
                "house had gone quiet."
            )
        elif len(double_days) >= 2:
            patterns.append(
                "There were days you came back to check in twice. Some days "
                "ask more than one snapshot."
            )

    # Rule: when she said she felt supported, she wrote more
    notes_supported = [
        len(l.notes or "") for l in logs if l.feels_supported == "yes" and l.notes
    ]
    notes_other = [
        len(l.notes or "")
        for l in logs
        if l.feels_supported in {"somewhat", "no"} and l.notes
    ]
    if notes_supported and notes_other:
        if median(notes_supported) > median(notes_other) * 1.4:
            patterns.append(
                "The days you said you felt supported, the words you wrote "
                "were longer."
            )

    # Rule: notes were short this week (proxy for "didn't have words")
    notes_lens = [len((l.notes or "").strip()) for l in logs if (l.notes or "").strip()]
    if len(notes_lens) >= 3 and median(notes_lens) < 40:
        patterns.append(
            "The words you wrote were short this week. Sometimes there isn't "
            "much to say, and that's also a kind of answer."
        )

    return patterns[:MAX_PATTERNS]


# ─── Summary paragraph ────────────────────────────────────────────────────────


def _summary(logs: list[DailyLog], check_in_count: int) -> str:
    """The top paragraph. Pick 2-3 signal-bearing facts; stitch into prose."""

    if check_in_count == 0:
        return (
            "You haven't checked in this week yet. There's no pressure — "
            "the check-in is here when you're ready."
        )

    if check_in_count == 1:
        l = logs[0]
        day = WEEKDAYS[l.log_date.weekday()]
        return (
            f"You came here once this week, on {day}. One check-in is "
            f"already something — you showed up."
        )

    pieces: list[str] = []

    # Opening: count of check-ins
    times_word = "twice" if check_in_count == 2 else f"{check_in_count} times"
    pieces.append(f"This week you came here {times_word}.")

    # Hardest day, by max mood_score (worst). Tie-breaker: earliest in week.
    hardest = max(logs, key=lambda l: (l.mood_score, -l.log_date.toordinal()))
    if hardest.mood_score >= HEAVY_MOOD_THRESHOLD:
        hardest_day = WEEKDAYS[hardest.log_date.weekday()]
        pieces.append(f"The heaviest day sounded like {hardest_day}.")

    # Did the tone shift between the first half and second half of the week?
    sorted_logs = sorted(logs, key=lambda l: l.created_at)
    mid = len(sorted_logs) // 2
    if mid >= 1:
        first_half_mood = median([l.mood_score for l in sorted_logs[:mid]])
        second_half_mood = median([l.mood_score for l in sorted_logs[mid:]])
        if second_half_mood < first_half_mood:
            pieces.append("By the end of the week it sounded a little different — not lighter, just held.")
        elif second_half_mood > first_half_mood:
            pieces.append("The week got heavier as it went, not lighter. That happens.")
        # If equal, say nothing — don't invent a shift that wasn't there.

    return " ".join(pieces)


# ─── Callout (optional, only when signal supports) ────────────────────────────


def _callout(logs: list[DailyLog]) -> Optional[Callout]:
    """At most one soft action callout. Returns None when there's no strong signal."""

    # Multiple late-night check-ins → suggest AI companion as a 24/7 listener.
    late_night_count = sum(
        1 for l in logs if _hour_local(l.created_at) in LATE_NIGHT_HOURS
    )
    if late_night_count >= 3:
        return Callout(
            prose=(
                "Several check-ins this week were after the rest of the house "
                "went to sleep. If the nights are when the heaviness lands, "
                "you don't have to carry them alone."
            ),
            action=CalloutAction(label="Talk to someone now", to="/ai-assistant"),
        )

    # Felt unsupported on multiple days → suggest finding a circle.
    unsupported = sum(1 for l in logs if l.feels_supported == "no")
    if unsupported >= 2:
        return Callout(
            prose=(
                "More than one day this week, you said you didn't feel "
                "supported. There are mothers in the same moment who would "
                "understand without you needing to explain."
            ),
            action=CalloutAction(label="Find mothers like you", to="/circles"),
        )

    return None


# ─── Quotes ───────────────────────────────────────────────────────────────────


def _quotes(logs: list[DailyLog]) -> list[Quote]:
    """Oldest -> newest, up to MAX_QUOTES, only entries with notes."""
    with_notes = [l for l in logs if (l.notes or "").strip()]
    with_notes.sort(key=lambda l: l.created_at)
    chosen = with_notes[-MAX_QUOTES:]  # Most recent if there are more than MAX
    chosen.sort(key=lambda l: l.created_at)  # display oldest -> newest

    out: list[Quote] = []
    for l in chosen:
        snippet, is_full = _short_snippet(l.notes or "")
        out.append(
            Quote(
                log_id=l.id,
                log_date=l.log_date.isoformat(),
                weekday_label=WEEKDAYS[l.log_date.weekday()],
                snippet=snippet,
                is_full=is_full,
            )
        )
    return out


# ─── Public entry point ───────────────────────────────────────────────────────


def build_weekly_reflection(logs: list[DailyLog], *, today: Optional[date] = None) -> WeeklyReflection:
    """
    Returns a WeeklyReflection for the week containing `today` (defaults to
    real today). `logs` should be the user's DailyLog rows for that week.
    """
    today = today or date.today()
    week_start = _start_of_week(today)
    week_end = week_start + timedelta(days=6)

    in_week = [
        l for l in logs if week_start <= l.log_date <= week_end
    ]
    in_week.sort(key=lambda l: (l.log_date, l.created_at))

    return WeeklyReflection(
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
        check_in_count=len(in_week),
        summary=_summary(in_week, len(in_week)),
        quotes=_quotes(in_week),
        patterns=_patterns(in_week),
        callout=_callout(in_week),
    )
