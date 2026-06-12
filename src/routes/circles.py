"""
src/routes/circles.py — Mother Circles Blueprint

Anonymous, topic-anchored small groups. Joining is idempotent per
client UUID — backed by a unique constraint in circle_memberships.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from src.extensions import db
from src.models import Circle, CirclePost, CircleMembership
from src.services.anonymous import get_client_id_from_request

circles_bp = Blueprint("circles", __name__, url_prefix="/api/circles")

# Keep circle posts short — same limit enforced in the DB.
MAX_POST_LEN = 280


def _require_client_id():
    client_id = get_client_id_from_request(required=True)
    if not client_id:
        return None, (jsonify({"error": "anonymous_client_id is required (header or body)."}), 400)
    return client_id, None


@circles_bp.route("", methods=["GET"])
def list_circles():
    """
    GET /api/circles
    Returns all circles with current member counts.
    Optional ?phase=<phase_tag> filter.
    """
    viewer_id = get_client_id_from_request(required=False)
    phase = request.args.get("phase")

    query = db.session.query(Circle).order_by(Circle.member_count.desc(), Circle.id.asc())
    if phase and phase.lower() != "all":
        query = query.filter(Circle.phase_tag == phase)

    circles = query.all()

    # Which circles has the viewer joined? Single query, used to set is_joined.
    joined_ids: set[int] = set()
    if viewer_id:
        rows = db.session.query(CircleMembership.circle_id).filter(
            CircleMembership.client_id == viewer_id
        ).all()
        joined_ids = {r[0] for r in rows}

    return jsonify({
        "circles": [
            {**c.to_dict(), "is_joined": c.id in joined_ids}
            for c in circles
        ],
        "count": len(circles),
    }), 200


@circles_bp.route("/<int:circle_id>", methods=["GET"])
def get_circle(circle_id: int):
    """
    GET /api/circles/<id>
    Returns the circle + its most recent posts (newest first, max 50).
    """
    viewer_id = get_client_id_from_request(required=False)

    circle = db.session.get(Circle, circle_id)
    if not circle:
        return jsonify({"error": "Circle not found."}), 404

    is_joined = False
    if viewer_id:
        is_joined = db.session.query(CircleMembership.id).filter_by(
            circle_id=circle_id, client_id=viewer_id
        ).first() is not None

    posts = (
        db.session.query(CirclePost)
        .filter(CirclePost.circle_id == circle_id)
        .order_by(CirclePost.created_at.desc())
        .limit(50)
        .all()
    )

    return jsonify({
        "circle": {**circle.to_dict(), "is_joined": is_joined},
        "posts": [p.to_dict(viewer_client_id=viewer_id) for p in posts],
        "count": len(posts),
    }), 200


@circles_bp.route("/<int:circle_id>/join", methods=["POST"])
def join_circle(circle_id: int):
    """
    POST /api/circles/<id>/join
    Idempotent per (circle_id, client_id) — same UUID joining twice
    is a no-op, returns the existing membership state.
    """
    client_id, err = _require_client_id()
    if err:
        return err

    circle = db.session.get(Circle, circle_id)
    if not circle:
        return jsonify({"error": "Circle not found."}), 404

    if circle.member_count >= circle.capacity:
        # Check whether this client is already in — if so, allow the no-op.
        already = db.session.query(CircleMembership.id).filter_by(
            circle_id=circle_id, client_id=client_id
        ).first()
        if not already:
            return jsonify({
                "error": "This circle is full.",
                "circle_id": circle_id,
                "member_count": circle.member_count,
                "capacity": circle.capacity,
            }), 409

    # Try to insert membership. Unique constraint catches duplicates.
    membership = CircleMembership(circle_id=circle_id, client_id=client_id)
    db.session.add(membership)
    try:
        db.session.commit()
        # Only count up on a real insert.
        circle.member_count = (circle.member_count or 0) + 1
        db.session.commit()
        created = True
    except IntegrityError:
        db.session.rollback()
        created = False  # Already joined — idempotent success.

    return jsonify({
        "circle_id": circle_id,
        "joined": True,
        "newly_joined": created,
        "member_count": circle.member_count,
    }), 200


@circles_bp.route("/<int:circle_id>/posts", methods=["POST"])
def create_circle_post(circle_id: int):
    """
    POST /api/circles/<id>/posts
    Body: { content }
    Content max 280 characters. The caller MUST already be a member of
    this circle — posting without joining is rejected with 403 so the
    circle stays a small, intentional space.
    """
    client_id, err = _require_client_id()
    if err:
        return err

    circle = db.session.get(Circle, circle_id)
    if not circle:
        return jsonify({"error": "Circle not found."}), 404

    is_member = db.session.query(CircleMembership.id).filter_by(
        circle_id=circle_id, client_id=client_id
    ).first() is not None
    if not is_member:
        return jsonify({
            "error": "Join this circle before posting.",
            "circle_id": circle_id,
        }), 403

    payload = request.get_json(silent=True) or {}
    content = (payload.get("content") or "").strip()
    if not content:
        return jsonify({"error": "content is required."}), 400
    if len(content) > MAX_POST_LEN:
        return jsonify({"error": f"content must be {MAX_POST_LEN} characters or fewer."}), 400

    post = CirclePost(
        circle_id=circle_id,
        client_id=client_id,
        content=content,
    )
    db.session.add(post)
    db.session.commit()

    return jsonify({"post": post.to_dict(viewer_client_id=client_id)}), 201
