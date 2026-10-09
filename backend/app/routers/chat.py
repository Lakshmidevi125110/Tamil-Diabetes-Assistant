import logging
from typing import Tuple
from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from app.routers.utils import read_json_body, json_response
from app.services.ai_service import generate_ai_response
from app.services.guardrails import (
    chat_limiter,
    validate_input_length,
    check_emergency_symptoms,
    check_crisis_or_self_harm,
    get_client_ip,
    get_rate_limit_message
)
from app.services.safety_validator import (
    check_medication_change_query,
    validate_ai_reply
)
from app.services.rag_service import generate_rag_response, validate_tone
from app.services.embedding_service import VectorStore

# Configure logger for this route
logger = logging.getLogger(__name__)

# Router for chat-related routes
router = APIRouter()

CHAT_USAGE = {
    "message": "The /chat endpoint expects a POST request with a JSON payload.",
    "usage": {
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": {
            "message": "உங்கள் கேள்வி / Your question here",
            "language": "ta or en"
        }
    }
}


@router.get("/chat")
@router.get("/rag")
@router.get("/rag/ask")
def chat_usage():
    """Returns usage instructions for the chat endpoint."""
    return CHAT_USAGE


@router.post("/chat")
@router.post("/rag")
@router.post("/rag/ask")
async def chat(request: Request):
    """Receives questions and returns AI-generated educational responses."""
    data = await read_json_body(request)
    client_ip = get_client_ip(request)
    payload, status_code = await run_in_threadpool(_process_chat, data, client_ip)
    return json_response(payload, status_code)


def _process_chat(data, client_ip: str) -> Tuple[dict, int]:
    # 1. Parse JSON payload
    if not data:
        logger.warning("Rejected request: payload is not valid JSON.")
        return {"error": "Invalid request. Please send data in JSON format."}, 400

    # 2. Extract and validate user message existence
    user_message = str(data.get("message", "")).strip()
    if not user_message:
        logger.warning("Rejected request: message field is empty.")
        return {"error": "The message field cannot be empty."}, 400

    # Extract language preference (default: "ta")
    language = str(data.get("language", "ta")).strip()
    if language not in ("ta", "en"):
        language = "ta"

    # 3. Security Guardrail: IP Rate Limiting (respects reverse proxy IP headers)
    if not chat_limiter.is_allowed(client_ip):
        logger.warning("Rate limit exceeded for IP: %s", client_ip)
        return {"error": get_rate_limit_message("chat", language=language)}, 429

    # 4. Security Guardrail: Input Length Limit (max 500 characters)
    is_valid_len, len_error = validate_input_length(user_message, language=language)
    if not is_valid_len:
        logger.warning("Input length exceeded (%d chars): %s", len(user_message), len_error)
        return {"error": len_error}, 400

    logger.info("Processing chat query [lang=%s]: %s", language, user_message[:50])

    # 5. Medical Guardrail: Deterministic Emergency Interceptor
    emergency_response = check_emergency_symptoms(user_message, language=language)
    if emergency_response:
        logger.warning("🚨 EMERGENCY symptoms intercepted! Returning urgent care protocol.")
        return {
            "status": "emergency",
            "received_message": user_message,
            "language": language,
            "reply": emergency_response
        }, 200

    # 5b. Crisis & Self-harm Interceptor
    crisis_response = check_crisis_or_self_harm(user_message, language=language)
    if crisis_response:
        logger.warning("💙 Crisis/self-harm expression intercepted with supportive helpline response.")
        return {
            "status": "crisis_support",
            "received_message": user_message,
            "language": language,
            "reply": crisis_response
        }, 200

    # 5c. Safety Validator: Medication / Dosage Adjustment Interceptor
    med_response = check_medication_change_query(user_message, language=language)
    if med_response:
        logger.info("Medication adjustment query intercepted with educational refusal.")
        return {
            "status": "medication_notice",
            "received_message": user_message,
            "language": language,
            "reply": med_response
        }, 200

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

    # 7. RAG Pipeline: Vector Search -> Re-rank -> Prompt -> Safety Validator -> Tone Validator
    rag_result = generate_rag_response(
        user_message=user_message,
        language=language,
        history=valid_history
    )

    # 7b. When local knowledge base is empty (no clinical documents placed/ingested in data/knowledge yet),
    # fall back to the comprehensive clinical AI service so users receive varied, high-quality,
    # medically grounded answers to their questions rather than a repetitive refusal message.
    if rag_result.get("status") == "insufficient_info" and VectorStore().is_empty():
        logger.info("Vector knowledge base is empty; falling back to clinical AI service.")
        try:
            base_reply = generate_ai_response(
                user_message=user_message,
                language=language,
                history=valid_history
            )
            _, safe_reply, _ = validate_ai_reply(base_reply, language=language)
            calm_reply = validate_tone(safe_reply, language=language)
            return {
                "status": "success",
                "received_message": user_message,
                "language": language,
                "reply": calm_reply,
                "sources": [],
                "rag_applied": False
            }, 200
        except Exception as fallback_err:
            logger.error("Error during clinical AI fallback: %s", fallback_err)

    # 8. Return formatted response with real retrieved sources
    return {
        "status": rag_result.get("status", "success"),
        "received_message": user_message,
        "language": language,
        "reply": rag_result.get("reply", ""),
        "sources": rag_result.get("sources", []),
        "rag_applied": rag_result.get("rag_applied", False)
    }, 200
