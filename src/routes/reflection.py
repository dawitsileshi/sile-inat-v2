"""
src/routes/reflection.py — Weekly + monthly reflection endpoints.
"""

import calendar
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from src.extensions import db
from src.models import DailyLog
from src.services.auth import login_required
from src.services.reflection import build_reflection

reflection_bp = Blueprint("reflection", __name__, url_prefix="/api/reflection")


_VALID_LANGS = {"en", "am"}


def _coerce_lang(raw: str | None) -> str:
    """Defaults to English. Unknown codes fall back rather than erroring."""
    if not raw:
        return "en"
    lang = raw.split("-")[0].lower()
    return lang if lang in _VALID_LANGS else "en"


def _fetch_logs(start: date, end: date) -> list[DailyLog]:
    return (
        db.session.query(DailyLog)
        .filter(
            DailyLog.user_id == g.current_user.id,
            DailyLog.log_date >= start,
            DailyLog.log_date <= end,
        )
        .order_by(DailyLog.log_date.asc(), DailyLog.created_at.asc())
        .all()
    )


@reflection_bp.route("/weekly", methods=["GET"])
@login_required
def weekly():
    """
    GET /api/reflection/weekly?lang=en|am

    Returns a structured reflection for the current Monday–Sunday week.
    """
    lang = _coerce_lang(request.args.get("lang"))
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    logs = _fetch_logs(week_start, week_end)
    reflection = build_reflection(logs, today=today, lang=lang, period="week")
    return jsonify(reflection.to_dict()), 200


def _parse_month_param(raw: str | None) -> tuple[date, date] | None:
    """
    Accepts 'YYYY-MM' and returns (first_of_month, last_of_month) or None
    on missing/invalid input.
    """
    if not raw:
        return None
    try:
        year_s, month_s = raw.split("-")
        year = int(year_s)
        month = int(month_s)
        if not (1 <= month <= 12) or not (1970 <= year <= 9999):
            return None
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, 1), date(year, month, last_day)
    except (ValueError, AttributeError):
        return None


# Hard cap on a custom range so the prose generator doesn't try to summarise
# half a year as "this month". 93 days = three months worth, generous but
# still meaningfully monthly-shaped.
_MAX_RANGE_DAYS = 93


def _parse_range_params(raw_start: str | None, raw_end: str | None) -> tuple[date, date] | None:
    """
    Accepts ISO 'YYYY-MM-DD' for both bounds. Returns (start, end) or None
    when either is missing/invalid. Inverted ranges and ranges longer than
    `_MAX_RANGE_DAYS` are rejected as None so the caller falls back to the
    rolling default rather than rendering a misshapen page.
    """
    if not raw_start or not raw_end:
        return None
    try:
        start = date.fromisoformat(raw_start)
        end = date.fromisoformat(raw_end)
    except ValueError:
        return None
    if end < start:
        return None
    if (end - start).days + 1 > _MAX_RANGE_DAYS:
        return None
    return start, end


@reflection_bp.route("/monthly", methods=["GET"])
@login_required
def monthly():
    """
    GET /api/reflection/monthly?lang=en|am[&month=YYYY-MM | &start=YYYY-MM-DD&end=YYYY-MM-DD]

    Returns a reflection over a date range. Selection rules, in order:

      1. `start` AND `end` together  -> use that exact range (max 93 days).
      2. `month=YYYY-MM`             -> use the first..last day of that month.
      3. neither                     -> rolling 28-day window ending today.

    Calendar months vary in length, but for the UI the "natural" month
    grouping is what the user expects when they navigate to a past month.
    `start`/`end` is the escape hatch for custom date ranges (e.g. the
    week the in-laws stayed, the first month back at work).
    """
    lang = _coerce_lang(request.args.get("lang"))
    today = date.today()

    parsed_range = _parse_range_params(
        request.args.get("start"), request.args.get("end")
    )
    parsed_month = None if parsed_range else _parse_month_param(request.args.get("month"))

    if parsed_range:
        range_start, range_end = parsed_range
    elif parsed_month:
        range_start, range_end = parsed_month
    else:
        range_start = today - timedelta(days=27)
        range_end = today

    # `today` is what the reflection treats as "now" for the summary;
    # use the range-end so prose about "by the end of the month" reads
    # correctly when looking at a past range.
    reflection_today = min(range_end, today) if (parsed_range or parsed_month) else today

    logs = _fetch_logs(range_start, range_end)
    reflection = build_reflection(
        logs,
        today=reflection_today,
        lang=lang,
        period="month",
        range_start=range_start if (parsed_range or parsed_month) else None,
        range_end=range_end if (parsed_range or parsed_month) else None,
    )
    return jsonify(reflection.to_dict()), 200
