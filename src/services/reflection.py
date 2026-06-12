"""
src/services/reflection.py — Weekly + monthly reflection builder
================================================================
Deterministic, rule-based prose generator that reads the user's recent
DailyLog rows and returns a structured reflection in English or Amharic.

DESIGN INTENT — read before changing:

This is the most voice-fragile feature in the app. The point is to
sound like someone gently reading back what she told us, not a
wellness-app dashboard. So this module has hard rules:

  * No numbers in the output prose. No scores. No percentages.
    Internally we work with numbers; externally only with words.
    (The check-in *count* is the one exception — "twice" / "4 times".)
  * No streak language ("5 days in a row", "you broke your streak").
  * No comparative shame ("you slept less than recommended").
  * Validation precedes anything informational.
  * If the data is sparse, we say less, not more — we never invent
    a pattern from one check-in to fill space.

The COPY dict near the top is the entire body of user-facing prose for
this feature. Treat it the way you'd treat any UI copy — voice rules
apply.

Mood scale gotcha: API mood_score is 1 = calm/best, 5 = anxious/worst.
Higher = harder. Sleep is straightforward — lower = thinner.

Amharic translations are a first pass. TODO: native speaker review.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from statistics import median
from typing import Literal, Optional

from src.models import DailyLog


Lang = Literal["en", "am"]
Period = Literal["week", "month"]


# ─── Copy tables — the entire user-facing prose lives here ────────────────────
#
# Keys are stable; values are localised. When you add a key, add it to EVERY
# language so missing-key warnings can't leak into prod. Use `.format()`
# placeholders for variable bits — keep them named, not positional.

WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAYS_AM = ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሁድ"]


def _weekday_label(d: date, lang: Lang) -> str:
    table = WEEKDAYS_AM if lang == "am" else WEEKDAYS_EN
    return table[d.weekday()]


def _count_phrase(n: int, lang: Lang) -> str:
    """Human-readable count of visits this period. 'twice', '4 times', etc."""
    if lang == "am":
        if n == 1:
            return "አንዴ"
        return f"{n} ጊዜ"
    if n == 1:
        return "once"
    if n == 2:
        return "twice"
    return f"{n} times"


COPY: dict[Lang, dict[str, str]] = {
    "en": {
        # Period words used in summary templates.
        "period_week": "this week",
        "period_month": "this month",
        # Empty / sparse weeks.
        "empty_week": (
            "You haven't checked in this week yet. There's no pressure — "
            "the check-in is here when you're ready."
        ),
        "empty_month": (
            "You haven't checked in this month yet. There's no pressure — "
            "the check-in is here when you're ready."
        ),
        "single_week": (
            "You came here once this week, on {day}. One check-in is "
            "already something — you showed up."
        ),
        "single_month": (
            "You came here once this month, on {day}. One check-in is "
            "already something — you showed up."
        ),
        # Summary clauses (joined with single spaces).
        "summary_open": "{period_capital} you came here {count_phrase}.",
        "summary_heaviest_day": "The heaviest day sounded like {day}.",
        "summary_softer_week": (
            "By the end of the week it sounded a little different — "
            "not lighter, just held."
        ),
        "summary_softer_month": (
            "By the end of the month it sounded a little different — "
            "not lighter, just held."
        ),
        "summary_heavier_week": (
            "The week got heavier as it went, not lighter. That happens."
        ),
        "summary_heavier_month": (
            "The month got heavier as it went, not lighter. That happens."
        ),
        # Patterns.
        "pat_sleep_thin": (
            "Sleep ran thinner {period}. The body remembers, even when the "
            "days feel the same."
        ),
        "pat_weekend_kinder": "The weekend sounded a little kinder than the weekdays.",
        "pat_doubles_late": (
            "Some days you came back here twice — often late, after the "
            "house had gone quiet."
        ),
        "pat_doubles_general": (
            "There were days you came back to check in twice. Some days "
            "ask more than one snapshot."
        ),
        "pat_supported_longer": (
            "The days you said you felt supported, the words you wrote "
            "were longer."
        ),
        "pat_words_short": (
            "The words you wrote were short {period}. Sometimes there "
            "isn't much to say, and that's also a kind of answer."
        ),
        # Callouts.
        "callout_late_night_prose": (
            "Several check-ins {period} were after the rest of the house "
            "went to sleep. If the nights are when the heaviness lands, "
            "you don't have to carry them alone."
        ),
        "callout_late_night_action": "Talk to someone now",
        "callout_unsupported_prose": (
            "More than one day {period}, you said you didn't feel "
            "supported. There are mothers in the same moment who would "
            "understand without you needing to explain."
        ),
        "callout_unsupported_action": "Find mothers like you",
    },
    "am": {
        # NOTE TO TRANSLATOR/OWNER: these are a first pass. Polish freely.
        # The voice rules apply — validation before information, never
        # comparative or shame-tinted, never clinical.
        "period_week": "በዚህ ሳምንት",
        "period_month": "በዚህ ወር",
        "empty_week": (
            "በዚህ ሳምንት ገና አልገባሽም። ጫና የለም — ዝግጅት ስትሆኚ የቀኑ ሁኔታ እዚህ ይጠብቅሻል።"
        ),
        "empty_month": (
            "በዚህ ወር ገና አልገባሽም። ጫና የለም — ዝግጅት ስትሆኚ የቀኑ ሁኔታ እዚህ ይጠብቅሻል።"
        ),
        "single_week": (
            "በዚህ ሳምንት እዚህ አንዴ ብቻ መጥተሻል፣ {day}። አንድ ጊዜ መግባት ራሱ ነገር ነው — መጣሽ።"
        ),
        "single_month": (
            "በዚህ ወር እዚህ አንዴ ብቻ መጥተሻል፣ {day}። አንድ ጊዜ መግባት ራሱ ነገር ነው — መጣሽ።"
        ),
        # In Amharic the period phrase already carries "in this", so the
        # "open" clause just leads with it. The trailing period stays.
        "summary_open": "{period_capital} እዚህ {count_phrase} መጥተሻል።",
        "summary_heaviest_day": "ከሁሉ ይበልጥ የከበደው ቀን {day} ይመስል ነበር።",
        "summary_softer_week": (
            "በሳምንቱ መጨረሻ ጥቂት የተለየ ይመስል ነበር — እንደተቀለለ ሳይሆን፣ እንደተያዘ።"
        ),
        "summary_softer_month": (
            "በወሩ መጨረሻ ጥቂት የተለየ ይመስል ነበር — እንደተቀለለ ሳይሆን፣ እንደተያዘ።"
        ),
        "summary_heavier_week": (
            "ሳምንቱ እያደገ ሄዶ ቀለለ ሳይሆን ከበደ። ይኸውም ይከሰታል።"
        ),
        "summary_heavier_month": (
            "ወሩ እያደገ ሄዶ ቀለለ ሳይሆን ከበደ። ይኸውም ይከሰታል።"
        ),
        "pat_sleep_thin": (
            "{period} እንቅልፍሽ ቀንሷል። ቀኖቹ ተመሳሳይ ቢመስሉም፣ ሰውነት ያስታውሳል።"
        ),
        "pat_weekend_kinder": "ቅዳሜ እና እሁድ ከሌሎቹ ቀኖች ይልቅ ጥቂት የተሻለ ይመስል ነበር።",
        "pat_doubles_late": (
            "በአንዳንድ ቀኖች እዚህ ሁለቴ ተመልሰሻል — ብዙ ጊዜ ቤቱ ጸጥ ካለ በኋላ፣ ምሽት ላይ።"
        ),
        "pat_doubles_general": (
            "ሁለቴ የተመለስሽበት ቀኖች ነበሩ። አንዳንድ ቀኖች ከአንድ ጊዜ በላይ ይጠይቃሉ።"
        ),
        "pat_supported_longer": (
            "ድጋፍ እንደተሰማሽ ባልሽባቸው ቀኖች፣ የጻፍሽው ቃላት የበለጠ ረጅም ነበሩ።"
        ),
        "pat_words_short": (
            "{period} የጻፍሽው ቃላት አጭር ነበሩ። አንዳንዴ ብዙ የሚባል ነገር የለም፣ ይኸውም በራሱ መልስ ነው።"
        ),
        "callout_late_night_prose": (
            "{period} ብዙ ጊዜ የምትገቢው ቤቱ ሁሉ ከተኛ በኋላ ነበር። ምሽት የሚከብድሽ ጊዜ ከሆነ፣ "
            "ብቻሽን መሸከም አያስፈልግሽም።"
        ),
        "callout_late_night_action": "አሁን ለአንድ ሰው ተናገሪ",
        "callout_unsupported_prose": (
            "{period} ከአንድ ቀን በላይ ድጋፍ እንዳልተሰማሽ ተናግረሻል። ሳታብራሪም የሚረዱሽ፣ "
            "በተመሳሳይ ጊዜ ውስጥ ያሉ እናቶች አሉ።"
        ),
        "callout_unsupported_action": "የሚመስሉሽን እናቶች አግኚ",
    },
}


def _c(lang: Lang, key: str) -> str:
    """Lookup with English fallback so a missing key never crashes the page."""
    return COPY.get(lang, {}).get(key) or COPY["en"][key]


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
    weekday_label: str  # "Tuesday" / "ማክሰኞ"
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
class Reflection:
    period: Period
    range_start: str  # ISO date
    range_end: str  # ISO date
    check_in_count: int
    summary: str
    quotes: list[Quote] = field(default_factory=list)
    patterns: list[str] = field(default_factory=list)
    callout: Optional[Callout] = None

    def to_dict(self) -> dict:
        return {
            "period": self.period,
            "range_start": self.range_start,
            "range_end": self.range_end,
            "check_in_count": self.check_in_count,
            "summary": self.summary,
            "quotes": [q.to_dict() for q in self.quotes],
            "patterns": list(self.patterns),
            "callout": self.callout.to_dict() if self.callout else None,
        }


# ─── Tuning constants ─────────────────────────────────────────────────────────

THIN_SLEEP_MEDIAN = 6.0
HEAVY_MOOD_THRESHOLD = 3
LATE_NIGHT_HOURS = {22, 23, 0, 1, 2, 3, 4}
QUOTE_SNIPPET_LEN = 140
MAX_QUOTES = 4
MAX_PATTERNS = 3


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _start_of_week(d: date) -> date:
    """Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def _start_of_month_window(d: date, *, days: int = 28) -> date:
    """28-day window ending at `d` — a calendar-month-shaped lookback."""
    return d - timedelta(days=days - 1)


def _short_snippet(text: str, n: int = QUOTE_SNIPPET_LEN) -> tuple[str, bool]:
    text = (text or "").strip()
    if len(text) <= n:
        return text, True
    cut = text[:n].rsplit(" ", 1)[0]
    return cut + "…", False


def _hour_local(dt: datetime) -> int:
    # created_at is stored as UTC; we don't know the user's tz. Ethiopia is
    # UTC+3, so "after midnight Addis" appears as ~03:00 UTC. The rule
    # tolerates this with the wider LATE_NIGHT_HOURS window above.
    # TODO: respect user timezone for after-midnight rule.
    return dt.hour


def _period_phrase(period: Period, lang: Lang) -> str:
    """The temporal phrase: 'this week' / 'በዚህ ሳምንት'."""
    return _c(lang, f"period_{period}")


# ─── Pattern rules ────────────────────────────────────────────────────────────


def _patterns(logs: list[DailyLog], *, lang: Lang, period: Period) -> list[str]:
    patterns: list[str] = []
    period_phrase = _period_phrase(period, lang)

    # Sleep ran thin.
    sleep_values = [l.sleep_hours for l in logs if l.sleep_hours is not None]
    if len(sleep_values) >= 3 and median(sleep_values) <= THIN_SLEEP_MEDIAN:
        patterns.append(_c(lang, "pat_sleep_thin").format(period=period_phrase))

    # Weekend vs weekday mood.
    weekday_moods = [l.mood_score for l in logs if l.log_date.weekday() < 5]
    weekend_moods = [l.mood_score for l in logs if l.log_date.weekday() >= 5]
    if len(weekday_moods) >= 2 and len(weekend_moods) >= 1:
        if median(weekend_moods) < median(weekday_moods):
            patterns.append(_c(lang, "pat_weekend_kinder"))

    # Multiple check-ins on the same day, especially late.
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
            patterns.append(_c(lang, "pat_doubles_late"))
        elif len(double_days) >= 2:
            patterns.append(_c(lang, "pat_doubles_general"))

    # Felt supported → wrote more.
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
            patterns.append(_c(lang, "pat_supported_longer"))

    # Words were short overall.
    notes_lens = [len((l.notes or "").strip()) for l in logs if (l.notes or "").strip()]
    if len(notes_lens) >= 3 and median(notes_lens) < 40:
        patterns.append(_c(lang, "pat_words_short").format(period=period_phrase))

    return patterns[:MAX_PATTERNS]


# ─── Summary paragraph ────────────────────────────────────────────────────────


def _summary(
    logs: list[DailyLog],
    check_in_count: int,
    *,
    lang: Lang,
    period: Period,
) -> str:
    if check_in_count == 0:
        return _c(lang, f"empty_{period}")

    if check_in_count == 1:
        day = _weekday_label(logs[0].log_date, lang)
        return _c(lang, f"single_{period}").format(day=day)

    pieces: list[str] = []
    period_phrase = _period_phrase(period, lang)
    period_phrase_capital = period_phrase[0].upper() + period_phrase[1:] if lang == "en" else period_phrase
    count_phrase = _count_phrase(check_in_count, lang)

    pieces.append(_c(lang, "summary_open").format(
        period_capital=period_phrase_capital,
        count_phrase=count_phrase,
    ))

    # Heaviest day (worst mood_score; tie-breaker: earliest).
    hardest = max(logs, key=lambda l: (l.mood_score, -l.log_date.toordinal()))
    if hardest.mood_score >= HEAVY_MOOD_THRESHOLD:
        pieces.append(_c(lang, "summary_heaviest_day").format(
            day=_weekday_label(hardest.log_date, lang),
        ))

    # Tone shift across the period.
    sorted_logs = sorted(logs, key=lambda l: l.created_at)
    mid = len(sorted_logs) // 2
    if mid >= 1:
        first_half_mood = median([l.mood_score for l in sorted_logs[:mid]])
        second_half_mood = median([l.mood_score for l in sorted_logs[mid:]])
        if second_half_mood < first_half_mood:
            pieces.append(_c(lang, f"summary_softer_{period}"))
        elif second_half_mood > first_half_mood:
            pieces.append(_c(lang, f"summary_heavier_{period}"))

    return " ".join(pieces)


# ─── Callout ──────────────────────────────────────────────────────────────────


def _callout(logs: list[DailyLog], *, lang: Lang, period: Period) -> Optional[Callout]:
    period_phrase = _period_phrase(period, lang)

    late_night_count = sum(
        1 for l in logs if _hour_local(l.created_at) in LATE_NIGHT_HOURS
    )
    # Scale the threshold with the period — 3 late nights is signal for a
    # week, but for a month we want at least 6.
    late_threshold = 3 if period == "week" else 6
    if late_night_count >= late_threshold:
        return Callout(
            prose=_c(lang, "callout_late_night_prose").format(period=period_phrase),
            action=CalloutAction(
                label=_c(lang, "callout_late_night_action"),
                to="/ai-assistant",
            ),
        )

    unsupported = sum(1 for l in logs if l.feels_supported == "no")
    unsupported_threshold = 2 if period == "week" else 4
    if unsupported >= unsupported_threshold:
        return Callout(
            prose=_c(lang, "callout_unsupported_prose").format(period=period_phrase),
            action=CalloutAction(
                label=_c(lang, "callout_unsupported_action"),
                to="/circles",
            ),
        )

    return None


# ─── Quotes ───────────────────────────────────────────────────────────────────


def _quotes(logs: list[DailyLog], *, lang: Lang) -> list[Quote]:
    with_notes = [l for l in logs if (l.notes or "").strip()]
    with_notes.sort(key=lambda l: l.created_at)
    chosen = with_notes[-MAX_QUOTES:]
    chosen.sort(key=lambda l: l.created_at)

    out: list[Quote] = []
    for l in chosen:
        snippet, is_full = _short_snippet(l.notes or "")
        out.append(
            Quote(
                log_id=l.id,
                log_date=l.log_date.isoformat(),
                weekday_label=_weekday_label(l.log_date, lang),
                snippet=snippet,
                is_full=is_full,
            )
        )
    return out


# ─── Public entry point ───────────────────────────────────────────────────────


def build_reflection(
    logs: list[DailyLog],
    *,
    today: Optional[date] = None,
    lang: Lang = "en",
    period: Period = "week",
) -> Reflection:
    """
    Build a structured Reflection for the requested `period` ending at `today`.

    week:  Monday-of-this-week through Sunday-of-this-week
    month: rolling 28-day window ending at `today`
    """
    today = today or date.today()
    if period == "week":
        range_start = _start_of_week(today)
        range_end = range_start + timedelta(days=6)
    else:
        range_start = _start_of_month_window(today, days=28)
        range_end = today

    in_range = [l for l in logs if range_start <= l.log_date <= range_end]
    in_range.sort(key=lambda l: (l.log_date, l.created_at))

    return Reflection(
        period=period,
        range_start=range_start.isoformat(),
        range_end=range_end.isoformat(),
        check_in_count=len(in_range),
        summary=_summary(in_range, len(in_range), lang=lang, period=period),
        quotes=_quotes(in_range, lang=lang),
        patterns=_patterns(in_range, lang=lang, period=period),
        callout=_callout(in_range, lang=lang, period=period),
    )


# Back-compat alias for the original entry point.
def build_weekly_reflection(
    logs: list[DailyLog],
    *,
    today: Optional[date] = None,
    lang: Lang = "en",
) -> Reflection:
    return build_reflection(logs, today=today, lang=lang, period="week")
