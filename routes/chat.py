import logging
from flask import Blueprint, request, jsonify
from services.ai_service import generate_ai_response

# Configure logger for this route
logger = logging.getLogger(__name__)

# Create a Blueprint for chat-related routes
chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    """
    Chat endpoint to receive questions and return AI-generated educational responses.
    Expects JSON: { "message": "...", "language": "ta" | "en" }
    """
    # 1. Parse JSON payload
    data = request.get_json(silent=True)
    if not data:
        logger.warning("Rejected request: payload is not valid JSON.")
        return jsonify({
            "error": "Invalid request. Please send data in JSON format."
        }), 400

    # 2. Extract and validate user message
    user_message = data.get("message", "").strip()
    if not user_message:
        logger.warning("Rejected request: message field is empty.")
        return jsonify({
            "error": "The message field cannot be empty."
        }), 400

    # Extract language preference (default: "ta")
    language = data.get("language", "ta").strip()
    if language not in ("ta", "en"):
        language = "ta"

    logger.info("Processing chat query [lang=%s]: %s", language, user_message[:50])

    # 3. Call AI Service with medical safety guardrails
    ai_reply = generate_ai_response(user_message=user_message, language=language)

    # 4. Return formatted response
    return jsonify({
        "status": "success",
        "received_message": user_message,
        "language": language,
        "reply": ai_reply
    }), 200
