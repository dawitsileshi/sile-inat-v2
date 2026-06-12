"""
src/routes/reflection.py — Weekly reflection endpoint.
"""

from datetime import date, timedelta

from flask import Blueprint, g, jsonify

from src.extensions import db
from src.models import DailyLog
from src.services.auth import login_required
from src.services.reflection import build_weekly_reflection

reflection_bp = Blueprint("reflection", __name__, url_prefix="/api/reflection")


@reflection_bp.route("/weekly", methods=["GET"])
@login_required
def weekly():
    """
    GET /api/reflection/weekly

    Returns a structured reflection for the current week (Monday–Sunday)
    of the authenticated user. See src/services/reflection.py for the
    payload shape and design intent.
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    logs = (
        db.session.query(DailyLog)
        .filter(
            DailyLog.user_id == g.current_user.id,
            DailyLog.log_date >= week_start,
            DailyLog.log_date <= week_end,
        )
        .order_by(DailyLog.log_date.asc(), DailyLog.created_at.asc())
        .all()
    )

    reflection = build_weekly_reflection(logs, today=today)
    return jsonify(reflection.to_dict()), 200
