import logging
from flask import Blueprint, request, jsonify
from services.ai_service import generate_ai_response
from services.guardrails import (
    chat_limiter,
    validate_input_length,
    check_emergency_symptoms
)

# Configure logger for this route
logger = logging.getLogger(__name__)

# Create a Blueprint for chat-related routes
chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/chat", methods=["GET", "POST"])
def chat():
    """
    Chat endpoint:
    - GET: Returns usage instructions and guides users to the web UI.
    - POST: Receives questions and returns AI-generated educational responses.
    """
    if request.method == "GET":
        return jsonify({
            "message": "The /chat endpoint expects a POST request with a JSON payload.",
            "usage": {
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {
                    "message": "உங்கள் கேள்வி / Your question here",
                    "language": "ta or en"
                }
            },
            "web_ui": "To use the interactive voice web interface, open http://localhost:5000 in your browser."
        }), 200

    # 1. Parse JSON payload
    data = request.get_json(silent=True)
    if not data:
        logger.warning("Rejected request: payload is not valid JSON.")
        return jsonify({
            "error": "Invalid request. Please send data in JSON format."
        }), 400

    # 2. Extract and validate user message existence
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

    # 3. Security Guardrail: IP Rate Limiting
    client_ip = request.remote_addr or "127.0.0.1"
    if not chat_limiter.is_allowed(client_ip):
        logger.warning("Rate limit exceeded for IP: %s", client_ip)
        limit_msg = (
            "Too many requests. Please wait a minute before asking another question."
            if language == "en" else
            "அதிகமான கோரிக்கைகள். தயவுசெய்து ஒரு நிமிடம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."
        )
        return jsonify({"error": limit_msg}), 429

    # 4. Security Guardrail: Input Length Limit (max 500 characters)
    is_valid_len, len_error = validate_input_length(user_message, language=language)
    if not is_valid_len:
        logger.warning("Input length exceeded (%d chars): %s", len(user_message), len_error)
        return jsonify({"error": len_error}), 400

    logger.info("Processing chat query [lang=%s]: %s", language, user_message[:50])

    # 5. Medical Guardrail: Deterministic Emergency Interceptor
    emergency_response = check_emergency_symptoms(user_message, language=language)
    if emergency_response:
        logger.warning("🚨 EMERGENCY symptoms intercepted! Returning urgent care protocol.")
        return jsonify({
            "status": "emergency",
            "received_message": user_message,
            "language": language,
            "reply": emergency_response
        }), 200

    # 6. AI Generation with Safety Guardrails
    ai_reply = generate_ai_response(user_message=user_message, language=language)

    # 7. Return formatted response
    return jsonify({
        "status": "success",
        "received_message": user_message,
        "language": language,
        "reply": ai_reply
    }), 200
