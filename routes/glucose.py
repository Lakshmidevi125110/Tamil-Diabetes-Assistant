import logging
from flask import Blueprint, request, jsonify
from services.glucose_service import validate_glucose_input, generate_educational_response
from services.guardrails import chat_limiter, get_client_ip

logger = logging.getLogger(__name__)

glucose_bp = Blueprint("glucose", __name__)

@glucose_bp.route("/glucose/respond", methods=["GET", "POST"])
def glucose_respond():
    """
    Endpoint for polite, educational feedback on blood glucose readings:
    - GET: Returns usage instructions.
    - POST: Receives value, measurement_type, language, optional symptoms,
            and returns structured educational guidance.
    """
    if request.method == "GET":
        return jsonify({
            "message": "The /glucose/respond endpoint expects a POST request with a JSON payload.",
            "usage": {
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {
                    "value": 120,
                    "measurement_type": "fasting | before_meal | post_meal_2h | random",
                    "language": "ta or en",
                    "symptoms": "Optional notes or symptoms"
                }
            }
        }), 200

    # 1. Parse JSON payload
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request. Please send data in JSON format."}), 400

    # 2. Rate limiting (proxy-aware)
    client_ip = get_client_ip(request)
    if not chat_limiter.is_allowed(client_ip):
        lang = data.get("language", "ta").strip().lower()
        limit_msg = (
            "Too many requests. Please wait a moment before trying again."
            if lang == "en" else
            "அதிகமான கோரிக்கைகள். தயவுசெய்து சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."
        )
        return jsonify({"error": limit_msg}), 429

    # 3. Extract parameters
    value = data.get("value")
    measurement_type = data.get("measurement_type", "random")
    language = data.get("language", "ta")
    symptoms = data.get("symptoms", "")

    # 4. Validate input
    is_valid, error_msg, num_val, norm_type = validate_glucose_input(value, measurement_type, language)
    if not is_valid:
        return jsonify({
            "status": "error",
            "error": error_msg
        }), 400

    # 5. Generate structured educational response
    result = generate_educational_response(
        value=num_val,
        norm_type=norm_type,
        language=language,
        symptoms=symptoms
    )

    return jsonify(result), 200
