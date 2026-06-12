"""
src/routes/chatbot.py — AI Assistant Chatbot Blueprint
"""

from flask import Blueprint, current_app, jsonify, request

from src.services.anonymous import get_client_id_from_request
from src.services.chatbot_service import get_chat_response

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api")


@chatbot_bp.route("/chatbot", methods=["POST"])
def chat():
    """
    POST /api/chatbot
    Body: { message: str, history?: [{role, content}] }
    Header: X-Anonymous-Client-Id (optional but recommended)
    """
    client_id = get_client_id_from_request(required=False)
    payload = request.get_json(silent=True) or {}

    message = (payload.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required."}), 400
    if len(message) > 4000:
        return jsonify({"error": "message must be 4000 characters or fewer."}), 400

    history = payload.get("history")
    if history is not None and not isinstance(history, list):
        return jsonify({"error": "history must be an array."}), 400

    reply = get_chat_response(
        message,
        history=history,
        api_key=current_app.config.get("LLM_API_KEY"),
        provider=current_app.config.get("LLM_PROVIDER", "groq"),
        model=current_app.config.get("LLM_MODEL"),
        # Keep under gunicorn's 30s default worker timeout so a slow LLM
        # surfaces a clean JSON error instead of an empty proxy response.
        timeout=current_app.config.get("LLM_TIMEOUT", 22),
        debug=bool(current_app.debug),
    )

    return jsonify({
        "reply": reply,
        "client_id": client_id,
    }), 200
