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


@reflection_bp.route("/monthly", methods=["GET"])
@login_required
def monthly():
    """
    GET /api/reflection/monthly?lang=en|am&month=YYYY-MM

    Returns a reflection over a calendar month. When `month` is given,
    uses the first..last day of that calendar month. Otherwise defaults
    to a rolling 28-day window ending today (the original behaviour).

    Calendar months vary in length, but for the UI the "natural" month
    grouping is what the user expects when they navigate to a past month.
    """
    lang = _coerce_lang(request.args.get("lang"))
    today = date.today()

    parsed = _parse_month_param(request.args.get("month"))
    if parsed:
        range_start, range_end = parsed
        # `today` is what the reflection treats as "now" for the summary;
        # use the month-end so prose about "by the end of the month" reads
        # correctly when looking at a past month.
        reflection_today = min(range_end, today)
    else:
        range_start = today - timedelta(days=27)
        range_end = today
        reflection_today = today

    logs = _fetch_logs(range_start, range_end)
    reflection = build_reflection(
        logs,
        today=reflection_today,
        lang=lang,
        period="month",
        range_start=range_start if parsed else None,
        range_end=range_end if parsed else None,
    )
    return jsonify(reflection.to_dict()), 200
