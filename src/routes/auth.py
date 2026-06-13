"""
src/routes/auth.py — Authentication Blueprint
"""

from datetime import datetime, date, timedelta
import re
import secrets
import uuid
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError

from src.extensions import db
from src.models import User, UserSession, DailyLog
from src.services.auth import login_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    -----------------------
    Registers a new user account and starts a session.

    Request body (JSON):
        email      (str, required) : User's email address.
        password   (str, required) : Secure password (min 6 characters).
        due_date   (str, optional) : Estimated due date in YYYY-MM-DD format.

    Responses:
        201 Created      — Account created, returns session token.
        400 Bad Request  — Missing or invalid input.
        409 Conflict     — Email already registered.
    """
    payload = request.get_json(silent=True) or {}

    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    raw_due = payload.get("due_date")
    raw_baby_status = payload.get("baby_status")
    raw_baby_birth = payload.get("baby_birth_date")

    # Validation
    if not email:
        return jsonify({"error": "Email is required."}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email address format."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password is required and must be at least 6 characters."}), 400

    due_date = None
    if raw_due:
        try:
            due_date = datetime.strptime(raw_due, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "due_date must be in YYYY-MM-DD format."}), 400

    baby_status = None
    if raw_baby_status is not None:
        baby_status = str(raw_baby_status).strip().lower()
        if baby_status not in {"pregnant", "born", "skip"}:
            return jsonify({"error": "baby_status must be one of: pregnant, born, skip."}), 400

    baby_birth_date = None
    if raw_baby_birth:
        try:
            baby_birth_date = datetime.strptime(raw_baby_birth, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "baby_birth_date must be in YYYY-MM-DD format."}), 400
    # Only meaningful when baby is already born
    if baby_status != "born":
        baby_birth_date = None

    # Check if user already exists
    existing_user = db.session.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered."}), 409

    # Create user
    user = User(
        email=email,
        due_date=due_date,
        baby_status=baby_status,
        baby_birth_date=baby_birth_date,
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already registered."}), 409

    # Create session token (expires in 30 days)
    token = UserSession.generate_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    session = UserSession(user_id=user.id, token=token, expires_at=expires_at)

    db.session.add(session)
    db.session.commit()

    return jsonify({
        "message": "User registered successfully.",
        "token": token,
        "expires_at": expires_at.isoformat() + "Z",
        "user": user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    --------------------
    Logs in a user and returns a session token.

    Request body (JSON):
        email    (str, required) : User's email.
        password (str, required) : User's password.

    Responses:
        200 OK           — Authentication successful, returns session token.
        400 Bad Request  — Missing credentials.
        401 Unauthorized — Invalid email or password.
    """
    payload = request.get_json(silent=True) or {}

    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = db.session.query(User).filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    # Create new session token (expires in 30 days)
    token = UserSession.generate_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    session = UserSession(user_id=user.id, token=token, expires_at=expires_at)

    db.session.add(session)
    db.session.commit()

    return jsonify({
        "message": "Login successful.",
        "token": token,
        "expires_at": expires_at.isoformat() + "Z",
        "user": user.to_dict()
    }), 200


# ─── Demo accounts ────────────────────────────────────────────────────────────
#
# Each click of "Continue as demo user" in the JoinModal creates a brand-new
# user named "demo-<8hex>@sile-inat.app" so every evaluator has their own
# isolated data (Journal, Reflection, Dashboard) without seeing each other's
# notes. Wipe the lot after the review round with:
#
#     DELETE FROM users WHERE email LIKE 'demo-%@sile-inat.app';
#
# Each demo user is pre-seeded with a small, varied week of check-ins so the
# Reflection and Journal pages have meaningful content on first load.

DEMO_EMAIL_DOMAIN = "sile-inat.app"


def _seed_demo_check_ins(user: User) -> None:
    """Insert a small, varied week of check-ins so Reflection has signal."""
    today = date.today()
    # (days_ago, hour_utc, mood_score (1=best, 5=worst), sleep, water, symptom, supported, note)
    spec = [
        (6, 22, 4, 5.5, 1.8, 3, "no",       "couldn't sleep, baby up again at 2"),
        (5,  2, 5, 4.0, 1.5, 4, "no",       "2am, baby finally asleep, can't stop crying"),
        (4, 23, 4, 5.0, 2.0, 3, "somewhat", "mother-in-law visited, helpful but tiring"),
        (2, 11, 3, 6.5, 2.4, 2, "somewhat", "ok-ish today, walked outside for the first time in a week"),
        (0, 15, 2, 7.0, 2.5, 2, "yes",      "husband home, we walked together, feels lighter today"),
    ]
    for days_ago, hour, mood, sleep, water, symptom, supported, note in spec:
        log_date = today - timedelta(days=days_ago)
        created_at = datetime.combine(log_date, datetime.min.time()).replace(hour=hour)
        db.session.add(DailyLog(
            user_id=user.id,
            log_date=log_date,
            created_at=created_at,
            gestational_week=20,
            sleep_hours=sleep,
            water_liters=water,
            symptom_score=symptom,
            mood_score=mood,
            feels_supported=supported,
            notes=note,
        ))


@auth_bp.route("/demo", methods=["POST"])
def demo():
    """
    POST /api/auth/demo
    -------------------
    Creates a fresh demo user with isolated data, a 30-day session, and a
    small pre-seeded week of check-ins. Same response shape as /register.

    No request body required. Each call mints a new account; the frontend
    "Continue as demo user" button surfaces this without ever displaying
    credentials to the visitor.
    """
    # Tiny 8-char suffix is plenty — collision odds at demo scale are nil,
    # and a unique-email constraint catches the impossible.
    suffix = uuid.uuid4().hex[:8]
    email = f"demo-{suffix}@{DEMO_EMAIL_DOMAIN}"
    password = secrets.token_urlsafe(24)

    # Baby "born" three months ago so the postpartum-stage line in the
    # check-in response lights up — a richer demo than "skip".
    baby_birth_date = date.today() - timedelta(weeks=12)

    user = User(
        email=email,
        baby_status="born",
        baby_birth_date=baby_birth_date,
    )
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.flush()  # populate user.id for the seeded logs
        _seed_demo_check_ins(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Could not create demo account, please try again."}), 500

    token = UserSession.generate_token()
    expires_at = datetime.utcnow() + timedelta(days=30)
    db.session.add(UserSession(user_id=user.id, token=token, expires_at=expires_at))
    db.session.commit()

    return jsonify({
        "message": "Demo session started.",
        "token": token,
        "expires_at": expires_at.isoformat() + "Z",
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """
    POST /api/auth/logout
    ---------------------
    Revokes the current session token.
    """
    from flask import g
    db.session.delete(g.current_session)
    db.session.commit()
    return jsonify({"message": "Logged out successfully."}), 200
