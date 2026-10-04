import logging
from flask import Blueprint, request, jsonify

# Configure logger for this route
logger = logging.getLogger(__name__)

# Create a Blueprint for chat-related routes
chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    """Chat endpoint to receive questions and return responses."""
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

    # Optional language preference (default: auto or ta)
    language = data.get("language", "ta").strip()

    logger.info("Received chat query [lang=%s]: %s", language, user_message[:50])

    # 3. Temporary mock reply (replaced by Gemini in Module 2)
    mock_reply = (
        f"வணக்கம்! உங்கள் கேள்வி கிடைத்தது: \"{user_message}\". "
        "இது ஒரு மாதிரி பதில் (Mock response). "
        "சர்க்கரை நோய் குறித்த பொதுவான விழிப்புணர்வு தகவல்களை விரைவில் வழங்க உள்ளேன்.\n\n"
        "⚠️ Disclaimer: இந்த தகவல் பொது விழிப்புணர்விற்காக மட்டுமே. "
        "மருத்துவ ஆலோசனை அல்லது சிகிச்சைக்கு எப்போதும் உங்கள் மருத்துவரை அணுகவும்."
    )

    return jsonify({
        "status": "success",
        "received_message": user_message,
        "language": language,
        "reply": mock_reply
    }), 200
