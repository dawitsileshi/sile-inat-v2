"""
src/routes/reflection.py — Weekly + monthly reflection endpoints.
"""

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


@reflection_bp.route("/monthly", methods=["GET"])
@login_required
def monthly():
    """
    GET /api/reflection/monthly?lang=en|am

    Returns a reflection over the rolling 28-day window ending today.
    Calendar months vary in length (28-31 days) — a fixed 28-day window
    keeps the comparison fair and the prose ("This month...") still reads
    naturally.
    """
    lang = _coerce_lang(request.args.get("lang"))
    today = date.today()
    range_start = today - timedelta(days=27)

    logs = _fetch_logs(range_start, today)
    reflection = build_reflection(logs, today=today, lang=lang, period="month")
    return jsonify(reflection.to_dict()), 200
