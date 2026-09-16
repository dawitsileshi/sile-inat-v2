"""
src/routes/logs.py — Daily Log Blueprint
"""

from datetime import date, datetime
from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy.exc import IntegrityError

from src.extensions import db
from src.models import DailyLog
from src.services.auth import login_required
from src.services.checkin_response import build_response_message

logs_bp = Blueprint("logs", __name__, url_prefix="/api/logs")


# ─── Input Validation Helper ─────────────────────────────────────────────────
def _validate_log_payload(payload: dict) -> tuple[dict | None, str | None]:
    """
    Validates and coerces raw JSON payload into typed fields.
    Returns (data_dict, None) on success or (None, error_message) on failure.
    """
    errors = []

    def require_int(key, lo, hi):
        val = payload.get(key)
        if val is None:
            errors.append(f"'{key}' is required.")
            return None
        try:
            v = int(val)
        except (TypeError, ValueError):
            errors.append(f"'{key}' must be an integer.")
            return None
        if not (lo <= v <= hi):
            errors.append(f"'{key}' must be between {lo} and {hi}.")
            return None
        return v

    def require_float(key, lo, hi):
        val = payload.get(key)
        if val is None:
            errors.append(f"'{key}' is required.")
            return None
        try:
            v = float(val)
        except (TypeError, ValueError):
            errors.append(f"'{key}' must be a number.")
            return None
        if not (lo <= v <= hi):
            errors.append(f"'{key}' must be between {lo} and {hi}.")
            return None
        return v

    sleep_hours      = require_float("sleep_hours", 0.0, 24.0)
    water_liters     = require_float("water_liters", 0.0, 10.0)
    symptom_score    = require_int("symptom_score", 1, 5)
    mood_score       = require_int("mood_score", 1, 5)

    # Optional HRV delta — any float or null accepted

    # Optional support indicator
    feels_supported = None
    raw_support = payload.get("feels_supported")
    if raw_support is not None:
        val = str(raw_support).strip().lower()
        if val not in {"yes", "somewhat", "no"}:
            errors.append("'feels_supported' must be one of: yes, somewhat, no.")
        else:
            feels_supported = val

    # Optional free-text notes — no length cap from API side; trimmed
    notes = None
    raw_notes = payload.get("notes")
    if raw_notes is not None:
        notes = str(raw_notes).strip() or None

    # Optional log_date — defaults to today
    log_date = date.today()
    if "log_date" in payload and payload["log_date"]:
        try:
            log_date = datetime.strptime(payload["log_date"], "%Y-%m-%d").date()
        except ValueError:
            errors.append("'log_date' must be YYYY-MM-DD format.")

    if errors:
        return None, " | ".join(errors)

    return {
        "sleep_hours":      sleep_hours,
        "water_liters":     water_liters,
        "symptom_score":    symptom_score,
        "mood_score":       mood_score,
        "feels_supported":  feels_supported,
        "notes":            notes,
        "log_date":         log_date,
    }, None


# ─── POST /api/logs ───────────────────────────────────────────────────────────
@logs_bp.route("", methods=["POST"])
@login_required
def create_log():
    """
    POST /api/logs
    --------------
    Accepts daily tracking data, persists to DB, runs ML inference,
    and returns the prediction along with an interpretive label.

    Request body (JSON):
        sleep_hours      (float, 0–24, required)
        water_liters     (float, 0–10, required)
        symptom_score    (int, 1–5,   required)
        mood_score       (int, 1–5,   required)
        log_date         (str YYYY-MM-DD, optional, defaults to today)

    Response 201:
        log : full log object
    """
    payload = request.get_json(silent=True) or {}

    data, err = _validate_log_payload(payload)
    if err:
        return jsonify({"error": err}), 400

    # Build the warm response message at submit time and freeze it onto the
    # row. Storing rather than regenerating means the journal replays the
    # exact wording she saw — even if we soften the templates later.
    response_message = build_response_message(g.current_user, data["mood_score"])

    # ── Persist Log ───────────────────────────────────────────────────────────
    log_entry = DailyLog(
        user_id                 = g.current_user.id,
        log_date                = data["log_date"],
        sleep_hours             = data["sleep_hours"],
        water_liters            = data["water_liters"],
        symptom_score           = data["symptom_score"],
        mood_score              = data["mood_score"],
        feels_supported         = data["feels_supported"],
        notes                   = data["notes"],
        response_message        = response_message,
    )

    try:
        db.session.add(log_entry)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": "Could not save this check-in. Please try again."
        }), 409

    return jsonify({"log": log_entry.to_dict()}), 201


# ─── GET /api/logs/history ────────────────────────────────────────────────────
@logs_bp.route("/history", methods=["GET"])
@login_required
def get_history():
    """
    GET /api/logs/history
    ---------------------
    Returns all historical logs for the authenticated user, ordered by date ascending.

    Query params:
        limit  (int, default 90)  : max records to return
        offset (int, default 0)   : pagination offset

    Response 200:
        user_id   : int
        count     : int
        logs      : list[LogObject]
    """
    try:
        limit  = min(int(request.args.get("limit",  90)),  365)
        offset = max(int(request.args.get("offset", 0)),   0)
    except ValueError:
        return jsonify({"error": "limit and offset must be integers."}), 400

    # Sort by log_date then created_at so multiple check-ins on the same
    # day come back in the order they were submitted.
    logs = (
        db.session.query(DailyLog)
        .filter(DailyLog.user_id == g.current_user.id)
        .order_by(DailyLog.log_date.asc(), DailyLog.created_at.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "user_id": g.current_user.id,
        "count":   len(logs),
        "logs":    [l.to_dict() for l in logs],
    }), 200
