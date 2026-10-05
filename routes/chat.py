import logging
from flask import Blueprint, request, jsonify
from services.ai_service import generate_ai_response
from services.guardrails import (
    chat_limiter,
    validate_input_length,
    check_emergency_symptoms,
    check_crisis_or_self_harm,
    get_client_ip
)
from services.safety_validator import (
    check_medication_change_query,
    validate_ai_reply
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

    # 3. Security Guardrail: IP Rate Limiting (respects reverse proxy IP headers)
    client_ip = get_client_ip(request)
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

    # 5b. Crisis & Self-harm Interceptor
    crisis_response = check_crisis_or_self_harm(user_message, language=language)
    if crisis_response:
        logger.warning("💙 Crisis/self-harm expression intercepted with supportive helpline response.")
        return jsonify({
            "status": "crisis_support",
            "received_message": user_message,
            "language": language,
            "reply": crisis_response
        }), 200

    # 5c. Safety Validator: Medication / Dosage Adjustment Interceptor
    med_response = check_medication_change_query(user_message, language=language)
    if med_response:
        logger.info("Medication adjustment query intercepted with educational refusal.")
        return jsonify({
            "status": "medication_notice",
            "received_message": user_message,
            "language": language,
            "reply": med_response
        }), 200

    # 6. Extract conversation history for multi-turn context (optional)
    raw_history = data.get("history", [])
    valid_history = []
    if isinstance(raw_history, list):
        for item in raw_history[-6:]:
            if isinstance(item, dict) and "role" in item and "text" in item:
                role = str(item["role"]).strip().lower()
                text = str(item["text"]).strip()
                if role in ("user", "assistant") and text:
                    valid_history.append({"role": role, "text": text[:500]})

    # 7. AI Generation with Safety Guardrails & Context
    ai_reply = generate_ai_response(user_message=user_message, language=language, history=valid_history)

    # 7b. Safety Validator: Audit reply for diagnosis, prescription, plan, or false reassurance
    _, validated_reply, violation = validate_ai_reply(ai_reply, language=language)
    if violation:
        logger.warning("AI reply sanitized by safety validator. Reason: %s", violation)

    # 8. Return formatted response
    return jsonify({
        "status": "success",
        "received_message": user_message,
        "language": language,
        "reply": validated_reply
    }), 200
