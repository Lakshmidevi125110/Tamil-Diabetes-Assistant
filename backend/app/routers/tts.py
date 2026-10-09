import io
import re
import asyncio
import logging
from collections import OrderedDict
from fastapi import APIRouter, Request
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
import edge_tts
from gtts import gTTS
from app.config import Config
from app.routers.utils import read_json_body, json_response
from app.services.guardrails import tts_limiter, get_client_ip, MAX_TTS_INPUT_LENGTH, get_rate_limit_message

logger = logging.getLogger(__name__)

# Router for Text-to-Speech route
router = APIRouter()

# In-memory LRU cache to return repeated sentences instantly (0.001s)
# Stores up to 250 sentences in memory (~5-10 MB total RAM)
MAX_CACHE_SIZE = 250
TTS_CACHE = OrderedDict()

def sanitize_text_for_speech(text: str) -> str:
    """
    Strips markdown formatting, URLs, emojis, and symbols like ⚠️
    so the speech synthesizer sounds clean and natural.
    """
    # Remove markdown bold/italic/headers/links/code
    clean = re.sub(r'[*_#`~]', '', text)
    clean = re.sub(r'\[.*?\]', '', clean)
    clean = re.sub(r'https?://\S+', '', clean)
    # Remove emojis and special warning symbols
    clean = re.sub(r'[⚠️🚨ℹ️👉🩺👤🎙️🔊⏹️]', '', clean)
    clean = re.sub(r'[\U0001F300-\U0001FAFF]', '', clean)
    # Remove bullet markers
    clean = re.sub(r'^\s*[-•]\s*', '', clean, flags=re.MULTILINE)
    # Normalize spaces
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

async def _synthesize_edge_tts(text: str, voice: str) -> bytes:
    """Asynchronously generates MP3 audio bytes using Microsoft Edge TTS."""
    communicator = edge_tts.Communicate(text, voice)
    audio_chunks = []
    async for chunk in communicator.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
    return b"".join(audio_chunks)

def generate_speech_audio(text: str, lang_code: str) -> bytes:
    """
    Generates audio bytes:
    1. Checks in-memory cache first (instant response).
    2. Primary: edge-tts (ta-IN-PallaviNeural / en-IN-NeerjaNeural).
    3. Fallback: gTTS if edge-tts encounters network or websocket failure.
    """
    cache_key = (lang_code, text)

    # 1. Cache hit check
    if cache_key in TTS_CACHE:
        logger.info("⚡ TTS Cache hit for sentence [%s]: %s...", lang_code, text[:30])
        TTS_CACHE.move_to_end(cache_key)
        return TTS_CACHE[cache_key]

    audio_bytes = None

    # 2. Primary Engine: edge-tts
    voice_name = getattr(Config, "TAMIL_VOICE", "ta-IN-PallaviNeural") if lang_code == "ta" else getattr(Config, "ENGLISH_VOICE", "en-IN-NeerjaNeural")
    try:
        logger.info("Generating audio with edge-tts [%s] for: %s...", voice_name, text[:30])
        audio_bytes = asyncio.run(_synthesize_edge_tts(text, voice_name))
        if not audio_bytes:
            raise ValueError("Edge-TTS returned empty audio.")
    except Exception as edge_err:
        logger.warning("edge-tts failed (%s), falling back to gTTS...", str(edge_err))
        # 3. Fallback Engine: gTTS
        try:
            mp3_buf = io.BytesIO()
            tts = gTTS(text=text, lang=lang_code, slow=False)
            tts.write_to_fp(mp3_buf)
            audio_bytes = mp3_buf.getvalue()
        except Exception as gtts_err:
            logger.error("Both edge-tts and gTTS failed: %s", str(gtts_err))
            raise gtts_err

    # Store in memory cache
    if audio_bytes:
        if len(TTS_CACHE) >= MAX_CACHE_SIZE:
            TTS_CACHE.popitem(last=False)  # Evict oldest entry
        TTS_CACHE[cache_key] = audio_bytes

    return audio_bytes

@router.get("/tts")
def tts_usage():
    """Returns usage instructions for the text-to-speech endpoint."""
    return {
        "message": "The /tts endpoint expects a POST request.",
        "usage": {
            "method": "POST",
            "headers": {"Content-Type": "application/json"},
            "body": {
                "text": "Sentence to convert to speech",
                "language": "ta or en"
            }
        }
    }


@router.post("/tts")
async def text_to_speech(request: Request):
    """
    Server-side Text-to-Speech endpoint:
    Converts input text to an in-memory MP3 stream using edge-tts (fallback: gTTS).
    """
    try:
        data = await read_json_body(request)

        # Rate limit check for TTS requests (respects reverse proxy IP headers)
        client_ip = get_client_ip(request)
        if not tts_limiter.is_allowed(client_ip):
            logger.warning("TTS Rate limit exceeded for IP: %s", client_ip)
            lang = (data.get("language") if data else None) or request.query_params.get("language", "ta")
            return json_response({"error": get_rate_limit_message("tts", language=lang)}, 429)

        if not data:
            return json_response({"error": "Invalid request. Please send data in JSON format."}, 400)

        raw_text = str(data.get("text", "")).strip()
        if not raw_text:
            return json_response({"error": "The text field cannot be empty."}, 400)

        if len(raw_text) > MAX_TTS_INPUT_LENGTH:
            return json_response({
                "error": f"Text exceeds maximum allowed length for speech synthesis ({MAX_TTS_INPUT_LENGTH} characters)."
            }, 400)

        language = str(data.get("language", "ta")).strip().lower()
        lang_code = "en" if language == "en" else "ta"

        # Sanitize text
        clean_text = sanitize_text_for_speech(raw_text)
        if not clean_text:
            return json_response({"error": "No speakable text found after sanitization."}, 400)

        # Generate audio using edge-tts (cached / with gTTS fallback) off the event loop
        audio_bytes = await run_in_threadpool(generate_speech_audio, clean_text, lang_code)

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'inline; filename="speech.mp3"'}
        )

    except Exception as e:
        logger.error("Error generating text-to-speech audio: %s", str(e), exc_info=True)
        return json_response({
            "error": "Failed to synthesize speech audio. Please try again later."
        }, 500)
