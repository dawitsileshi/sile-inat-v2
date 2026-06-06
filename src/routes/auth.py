"""
src/routes/auth.py — Authentication Blueprint
"""

from datetime import datetime, timedelta
import re
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError

from src.extensions import db
from src.models import User, UserSession
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

    # Check if user already exists
    existing_user = db.session.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "Email already registered."}), 409

    # Create user
    user = User(email=email, due_date=due_date)
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
