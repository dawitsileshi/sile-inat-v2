"""
src/routes/forum.py — Anonymous Community Forum Blueprint
"""

from flask import Blueprint, jsonify, request

from src.extensions import db
from src.models import ForumPost, ForumReply, ForumReaction
from src.services.anonymous import get_client_id_from_request

forum_bp = Blueprint("forum", __name__, url_prefix="/api/forum")

VALID_CATEGORIES = {
    "Childbirth",
    "Recovery",
    "Breastfeeding",
    "Newborn Care",
    "Mental Health",
    "Sleep",
    "Parenting",
    "General",
}


def _require_client_id():
    client_id = get_client_id_from_request(required=True)
    if not client_id:
        return None, (jsonify({"error": "anonymous_client_id is required (header or body)."}), 400)
    return client_id, None


@forum_bp.route("/posts", methods=["GET"])
def list_posts():
    """
    GET /api/forum/posts?category=All
    Returns posts newest-first, optionally filtered by category.
    """
    viewer_id = get_client_id_from_request(required=False)
    category = request.args.get("category", "All")

    query = db.session.query(ForumPost).order_by(ForumPost.created_at.desc())

    if category and category != "All":
        query = query.filter(ForumPost.category == category)

    posts = query.limit(100).all()

    return jsonify({
        "posts": [p.to_dict(viewer_client_id=viewer_id) for p in posts],
        "count": len(posts),
        "category": category,
    }), 200


@forum_bp.route("/posts", methods=["POST"])
def create_post():
    """
    POST /api/forum/posts
    Body: { title, content, category, anonymous_client_id? }
    """
    client_id, err = _require_client_id()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    category = (payload.get("category") or "General").strip()

    if not title:
        return jsonify({"error": "title is required."}), 400
    if not content:
        return jsonify({"error": "content is required."}), 400
    if len(title) > 200:
        return jsonify({"error": "title must be 200 characters or fewer."}), 400
    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"}), 400

    post = ForumPost(
        client_id=client_id,
        category=category,
        title=title,
        content=content,
    )
    db.session.add(post)
    db.session.commit()

    return jsonify({"post": post.to_dict(viewer_client_id=client_id)}), 201


@forum_bp.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id: int):
    """
    GET /api/forum/posts/<id>
    Returns a single post with nested replies.
    """
    viewer_id = get_client_id_from_request(required=False)
    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    return jsonify({
        "post": post.to_dict(viewer_client_id=viewer_id, include_replies=True),
    }), 200


@forum_bp.route("/posts/<int:post_id>/replies", methods=["POST"])
def create_reply(post_id: int):
    """
    POST /api/forum/posts/<id>/replies
    Body: { content, anonymous_client_id? }
    """
    client_id, err = _require_client_id()
    if err:
        return err

    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    payload = request.get_json(silent=True) or {}
    content = (payload.get("content") or "").strip()
    if not content:
        return jsonify({"error": "content is required."}), 400

    reply = ForumReply(
        post_id=post.id,
        client_id=client_id,
        content=content,
    )
    db.session.add(reply)
    db.session.commit()

    return jsonify({
        "reply": reply.to_dict(viewer_client_id=client_id),
        "post": post.to_dict(viewer_client_id=client_id, include_replies=True),
    }), 201


@forum_bp.route("/posts/<int:post_id>/react", methods=["POST"])
def toggle_reaction(post_id: int):
    """
    POST /api/forum/posts/<id>/react
    Toggles the "I've been there" reaction for the calling client.

    Header: X-Anonymous-Client-Id: <uuid-v4>
    Response: { "count": <total>, "reacted": <bool>, "post_id": <id> }
    """
    client_id, err = _require_client_id()
    if err:
        return err

    post = db.session.get(ForumPost, post_id)
    if not post:
        return jsonify({"error": "Post not found."}), 404

    existing = (
        db.session.query(ForumReaction)
        .filter_by(post_id=post_id, client_id=client_id)
        .first()
    )

    if existing:
        db.session.delete(existing)
        reacted = False
    else:
        db.session.add(ForumReaction(post_id=post_id, client_id=client_id))
        reacted = True

    db.session.commit()

    count = db.session.query(ForumReaction).filter_by(post_id=post_id).count()

    return jsonify({
        "post_id": post_id,
        "count": count,
        "reacted": reacted,
    }), 200
