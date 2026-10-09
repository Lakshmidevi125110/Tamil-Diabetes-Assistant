import logging
from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from app.routers.utils import read_json_body, json_response
from app.services.glucose_service import validate_glucose_input, generate_educational_response
from app.services.guardrails import chat_limiter, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/glucose/respond")
def glucose_usage():
    """Returns usage instructions for the glucose feedback endpoint."""
    return {
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
    }


@router.post("/glucose/respond")
async def glucose_respond(request: Request):
    """
    Receives value, measurement_type, language, optional symptoms,
    and returns structured educational guidance.
    """
    # 1. Parse JSON payload
    data = await read_json_body(request)
    if not data:
        return json_response({"error": "Invalid request. Please send data in JSON format."}, 400)

    # 2. Rate limiting (proxy-aware)
    client_ip = get_client_ip(request)
    if not chat_limiter.is_allowed(client_ip):
        lang = str(data.get("language", "ta")).strip().lower()
        limit_msg = (
            "Too many requests. Please wait a moment before trying again."
            if lang == "en" else
            "அதிகமான கோரிக்கைகள். தயவுசெய்து சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."
        )
        return json_response({"error": limit_msg}, 429)

    # 3. Extract parameters
    value = data.get("value")
    measurement_type = data.get("measurement_type", "random")
    language = data.get("language", "ta")
    symptoms = data.get("symptoms", "")

    # 4. Validate input
    is_valid, error_msg, num_val, norm_type = validate_glucose_input(value, measurement_type, language)
    if not is_valid:
        return json_response({"status": "error", "error": error_msg}, 400)

    # 5. Generate structured educational response
    result = await run_in_threadpool(
        generate_educational_response,
        value=num_val,
        norm_type=norm_type,
        language=language,
        symptoms=symptoms
    )
    return json_response(result, 200)
