import io
import re
import asyncio
import logging
from collections import OrderedDict
from flask import Blueprint, request, jsonify, send_file
import edge_tts
from gtts import gTTS
from config import Config

logger = logging.getLogger(__name__)

# Create Blueprint for Text-to-Speech route
tts_bp = Blueprint("tts", __name__)

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

@tts_bp.route("/tts", methods=["GET", "POST"])
def text_to_speech():
    """
    Server-side Text-to-Speech endpoint:
    - POST: Converts input text to in-memory MP3 stream using edge-tts (fallback: gTTS).
    - GET: Returns usage instructions.
    """
    if request.method == "GET":
        return jsonify({
            "message": "The /tts endpoint expects a POST request.",
            "usage": {
                "method": "POST",
                "headers": {"Content-Type": "application/json"},
                "body": {
                    "text": "Sentence to convert to speech",
                    "language": "ta or en"
                }
            }
        }), 200

    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Invalid request. Please send data in JSON format."}), 400

        raw_text = data.get("text", "").strip()
        if not raw_text:
            return jsonify({"error": "The text field cannot be empty."}), 400

        language = data.get("language", "ta").strip().lower()
        lang_code = "en" if language == "en" else "ta"

        # Sanitize text
        clean_text = sanitize_text_for_speech(raw_text)
        if not clean_text:
            return jsonify({"error": "No speakable text found after sanitization."}), 400

        # Generate audio using edge-tts (cached / with gTTS fallback)
        audio_bytes = generate_speech_audio(clean_text, lang_code)

        # Stream audio back to client from in-memory BytesIO
        return send_file(
            io.BytesIO(audio_bytes),
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )

    except Exception as e:
        logger.error("Error generating text-to-speech audio: %s", str(e), exc_info=True)
        return jsonify({
            "error": "Failed to synthesize speech audio.",
            "details": str(e)
        }), 500
