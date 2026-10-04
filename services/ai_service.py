import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError
from config import Config

logger = logging.getLogger(__name__)

# System instructions enforcing strict medical safety rules & bilingual capability
SYSTEM_INSTRUCTION = """
You are "Tamil Voice Diabetes Assistant" (தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி), a compassionate and knowledgeable health educational AI assistant.

YOUR MISSION:
Provide general educational information, dietary guidance, physical activity tips, and lifestyle awareness regarding diabetes to users in Tamil and English.

LANGUAGE RULES:
1. Detect and reply in the same language as the user's query:
   - If the user asks in Tamil or Tanglish, reply in clear, conversational, natural Tamil.
   - If the user asks in English, reply in simple, accessible English.
   - If mixed, reply primarily in Tamil with standard English medical terms in brackets if helpful.
2. Keep replies conversational, concise, and easy to understand aloud (since the reply will be read aloud via Text-to-Speech). Avoid unnecessarily long bullet lists.

RESPONSE LENGTH & COMPLETION RULES (STRICT):
1. Keep the educational explanation concise and voice-friendly: approximately 4 to 6 sentences total.
2. ALWAYS complete your thoughts and sentences. Never stop or cut off mid-sentence.
3. Every response must conclude cleanly with the mandatory disclaimer.

CRITICAL SAFETY & MEDICAL BOUNDARIES (NON-NEGOTIABLE):
1. EDUCATIONAL ONLY: You provide general health and lifestyle awareness ONLY.
2. NEVER DIAGNOSE: Never attempt to diagnose diabetes or any medical condition based on symptoms described.
3. NEVER PRESCRIBE: Never recommend specific medicines (e.g., Metformin, Insulin), never suggest drug dosages, and never advise stopping or changing prescribed medications.
4. DOCTOR CONSULTATION: Always advise the user to consult their licensed doctor or diabetologist for personal diagnosis and treatment decisions.
5. EMERGENCY PROTOCOL: If the user mentions emergency signs (e.g., severe hypoglycemia/hyperglycemia, intense dizziness, confusion, fainting, shortness of breath, loss of consciousness, chest pain):
   - Immediately instruct them in urgent terms to contact local emergency medical services (e.g., 108) or go to the nearest hospital immediately.
   - For suspected severe low sugar where the person is conscious, mention consuming 15-20g of fast-acting glucose while immediately seeking emergency medical help.

MANDATORY CLOSING DISCLAIMER:
End every non-emergency response with this short disclaimer:
- In Tamil: "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும்."
- In English: "⚠️ Disclaimer: This is educational information only. Please consult your physician for medical advice."
"""

def get_gemini_client():
    """Initializes and returns the Gemini client if API key is present."""
    api_key = Config.GEMINI_API_KEY
    if not api_key or api_key == "your_api_key_here":
        return None
    return genai.Client(api_key=api_key)

def generate_ai_response(user_message: str, language: str = "ta") -> str:
    """
    Generates a safe, educational response from Google Gemini.
    Gracefully handles rate limits, connection errors, and missing API keys.
    """
    client = get_gemini_client()

    # Fallback if API key has not been configured in .env yet
    if not client:
        logger.warning("GEMINI_API_KEY is not set or is still the default placeholder.")
        if language == "en":
            return (
                "⚠️ Notice: Gemini API Key is not configured yet. "
                "Please add your free GEMINI_API_KEY in the .env file to enable live AI responses.\n\n"
                "Disclaimer: This assistant provides general educational information only. "
                "Always consult a qualified doctor for medical decisions."
            )
        return (
            "⚠️ குறிப்பு: Gemini API Key இன்னும் அமைக்கப்படவில்லை. "
            "நேரடி AI பதில்களைப் பெற உங்கள் .env கோப்பில் GEMINI_API_KEY-ஐச் சேர்க்கவும்.\n\n"
            "Disclaimer: இந்த தகவல் பொது விழிப்புணர்விற்காக மட்டுமே. "
            "மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும்."
        )

    # Candidate models in priority order for high availability
    primary_model = Config.GEMINI_MODEL or "gemini-3.5-flash"
    candidate_models = [primary_model, "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"]
    # Deduplicate while preserving order
    candidate_models = list(dict.fromkeys(candidate_models))

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.7,
    )

    last_error = None
    for model_name in candidate_models:
        try:
            logger.info("Calling Gemini model [%s] for user query...", model_name)
            response = client.models.generate_content(
                model=model_name,
                contents=user_message,
                config=config
            )

            if response and response.text:
                return response.text.strip()
            else:
                logger.warning("Model %s returned empty response.", model_name)
                continue

        except APIError as api_err:
            last_error = api_err
            logger.warning("Gemini API Error (%s) on model %s: %s", api_err.code, model_name, api_err.message)
            # If 429 rate limit or 503 high demand or 404 deprecated, try next model in fallback list
            if api_err.code in (404, 429, 503):
                continue
            return _fallback_error_message(language)

        except Exception as e:
            last_error = e
            logger.error("Unexpected error with model %s: %s", model_name, str(e))
            continue

    # If all candidate models failed
    logger.error("All Gemini model candidates failed. Last error: %s", str(last_error))
    if isinstance(last_error, APIError) and last_error.code == 429:
        if language == "en":
            return (
                "⏳ The AI service is currently busy (rate limit reached). "
                "Please wait a minute and try again.\n\n"
                "⚠️ Disclaimer: Educational information only. Consult a doctor for medical needs."
            )
        return (
            "⏳ AI சேவை தற்போது மிகவும் பிஸியாக உள்ளது (Rate limit). "
            "தயவுசெய்து ஒரு நிமிடம் கழித்து மீண்டும் முயற்சிக்கவும்.\n\n"
            "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு மருத்துவரை அணுகவும்."
        )

    return _fallback_error_message(language)

def _fallback_error_message(language: str) -> str:
    """Helper to return polite, localized error messages when AI is unreachable."""
    if language == "en":
        return (
            "I am sorry, I am having trouble connecting to the AI service right now. "
            "Please check your internet connection or try again in a moment.\n\n"
            "⚠️ Disclaimer: Educational information only. Always consult a doctor."
        )
    return (
        "மன்னிக்கவும், AI சேவையை தற்போது தொடர்பு கொள்ள முடியவில்லை. "
        "தயவுசெய்து உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும் அல்லது சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.\n\n"
        "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும்."
    )
