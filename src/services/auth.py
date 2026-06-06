"""
src/services/auth.py — Authentication Helpers and Decorators
"""

from datetime import datetime
from functools import wraps
from flask import request, jsonify, g

from src.extensions import db
from src.models import UserSession, User


def login_required(f):
    """
    Decorator to protect API endpoints. Requires a valid session token
    in the Authorization header: `Authorization: Bearer <token>`.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization header is required."}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Authorization header must be in the format 'Bearer <token>'."}), 401

        token = parts[1]

        # Query session token from database
        session = db.session.query(UserSession).filter_by(token=token).first()
        if not session:
            return jsonify({"error": "Invalid session token."}), 401

        # Check expiration
        if session.expires_at < datetime.utcnow():
            # Clean up expired session
            db.session.delete(session)
            db.session.commit()
            return jsonify({"error": "Session has expired. Please log in again."}), 401

        # Attach authenticated user to Flask's global context `g`
        g.current_user = session.user
        g.current_session = session

        return f(*args, **kwargs)

    return decorated
