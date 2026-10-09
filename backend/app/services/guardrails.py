import re
import time
from collections import defaultdict
from typing import Optional, Tuple

class SimpleRateLimiter:
    """
    Lightweight in-memory sliding-window rate limiter per client IP.
    Zero external dependencies, ideal for lightweight deployments.
    """
    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.ip_history = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        # Filter out timestamps outside the current window
        valid_timestamps = [
            t for t in self.ip_history[client_ip] 
            if now - t < self.window_seconds
        ]
        self.ip_history[client_ip] = valid_timestamps

        if len(valid_timestamps) >= self.max_requests:
            return False

        self.ip_history[client_ip].append(now)
        return True

    def reset(self) -> None:
        """Clears IP request history (useful for test isolation)."""
        self.ip_history.clear()

    def get_history(self, client_ip: str) -> list:
        """Returns active timestamps for a given IP."""
        now = time.time()
        return [t for t in self.ip_history.get(client_ip, []) if now - t < self.window_seconds]


# Initialize rate limiters (small, safe per-IP sliding window limits)
chat_limiter = SimpleRateLimiter(max_requests=15, window_seconds=60)
tts_limiter = SimpleRateLimiter(max_requests=25, window_seconds=60)


def get_rate_limit_message(service: str = "chat", language: str = "ta") -> str:
    """Returns a friendly, calm rate-limit notice in the requested language."""
    if language == "en":
        if service == "tts":
            return "Too many requests for speech synthesis. Please wait a moment before trying again."
        return "Too many requests. Please wait a minute before asking another question."
    else:
        if service == "tts":
            return "குரல் சேவைக்கான கோரிக்கைகள் அதிகம். தயவுசெய்து சிறிது நேரம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."
        return "அதிகமான கோரிக்கைகள். தயவுசெய்து ஒரு நிமிடம் காத்திருந்து மீண்டும் முயற்சிக்கவும்."


# Patterns indicating personal information, metrics, personal glucose readings, or dosage logs
PERSONAL_PATTERNS = [
    # English personal pronouns & self references
    r"\b(?:my|i am|i'm|i have|i've|i had|me|mine|myself|patient)\b",
    # Tamil personal pronouns & self references (Unicode-safe boundary)
    r"(?:^|\s|[,\.!?])(?:என்|எனது|என்னுடைய|எனக்கு|என்னை|என்னிடம்|நான்)(?:\s|[,\.!?]|$)",
    # Glucose units and numeric readings (e.g., 120 mg/dL, 6.5 mmol/L)
    r"\b\d{1,3}(?:\.\d+)?\s*(?:mg/dl|mgdl|mmol/l|mmol)\b",
    # Glucose / sugar / test value readings with numbers
    r"(?:fasting|post\s*meal|postprandial|random|sugar|glucose|மதிப்பு|அளவு|சர்க்கரை|இரத்த\s*சர்க்கரை)\s*(?:is|was|level|value|reading)?\s*[:=]?\s*\d{1,3}(?:\.\d+)?\b",
    # Number followed by test context
    r"\b\d{2,3}\s*(?:mg/dl|mgdl|fasting|post\s*meal|random)\b",
    # HbA1c numeric readings
    r"\b(?:hba1c|a1c)\s*(?:is|was|level|value|of)?\s*[:=]?\s*\d{1,2}(?:\.\d+)?%?\b",
    # Medication dosages
    r"\b(?:took|take|taking|injected|inject|dose|units?|dosage)\s*\d+(?:\.\d+)?\b",
    r"\b\d+\s*(?:units?|mg|ml)\s*(?:of\s+)?(?:insulin|metformin)\b",
    r"(?:^|\s|[,\.!?])(?:போட்டேன்|எடுத்தேன்|ஊசி)(?:\s|[,\.!?]|$)"
]


def is_personal_query(text: str) -> bool:
    """
    Detects if a query contains personal medical readings, metrics, personal pronouns,
    or dosage logs that must NEVER be stored in the shared query cache or embedding cache.
    """
    if not text:
        return False
    t = text.lower()
    return any(re.search(p, t) for p in PERSONAL_PATTERNS)


# Maximum allowed input length for queries and speech
MAX_INPUT_LENGTH = 500
MAX_TTS_INPUT_LENGTH = 1000

def get_client_ip(req) -> str:
    """
    Extracts the client IP address. Respects X-Forwarded-For header
    when running behind a reverse proxy (such as Render or Gunicorn).
    """
    forwarded_for = req.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    client = getattr(req, "client", None)
    return (client.host if client else None) or "127.0.0.1"

def validate_input_length(message: str, language: str = "ta") -> Tuple[bool, Optional[str]]:
    """
    Validates message length to prevent spam and prompt-injection buffer overflows.
    """
    if len(message) > MAX_INPUT_LENGTH:
        if language == "en":
            err = f"Your question is too long ({len(message)} characters). Maximum allowed length is {MAX_INPUT_LENGTH} characters."
        else:
            err = f"உங்கள் கேள்வி மிக நீளமாக உள்ளது ({len(message)} எழுத்துகள்). அதிகபட்ச அனுமதி {MAX_INPUT_LENGTH} எழுத்துகள் மட்டுமே."
        return False, err
    return True, None

# Emergency keyword dictionary (Expanded for Module A6)
EMERGENCY_KEYWORDS_EN = [
    r"\bunconscious\b", r"\bunconsciousness\b", r"\bfainted\b", r"\bfainting\b", r"\bpassed out\b",
    r"\bchest pain\b", r"\bheart attack\b", r"\bsevere shortness of breath\b",
    r"\bcannot breathe\b", r"\bcan't breathe\b", r"\bcant breathe\b", r"\bdifficulty breathing\b", r"\btrouble breathing\b",
    r"\bseizure\b", r"\bseizures\b", r"\bconvulsion\b", r"\bconvulsions\b",
    r"\bcannot swallow\b", r"\bunable to swallow\b", r"\bcan't swallow\b", r"\bcant swallow\b",
    r"\binability to swallow\b", r"\bchoking\b",
    r"\bsevere confusion\b", r"\bvery confused\b", r"\bextremely confused\b",
    r"\bcannot stay awake\b", r"\bunable to stay awake\b", r"\bcan't stay awake\b", r"\bcant stay awake\b",
    r"\bsugar (?:is |below |under )?[234]\d\b", # sugar below 50
    r"\bblood sugar (?:below |under |is )?[234]\d\b"
]

EMERGENCY_KEYWORDS_TA = [
    "மயக்கம்", "மயங்கி", "நினைவிழந்த", "சுயநினைவு", "சுயநினைவிழந்த", "சுயநினைவு இல்லை", "எழுப்ப முடியவில்லை",
    "நெஞ்சு வலி", "மாரடைப்பு", "மூச்சுத்திணறல்", "மூச்சு திணறல்", "மூச்சு விட முடியவில்லை",
    "சுவாசிக்க முடியவில்லை", "வலிப்பு", "கை கால் நடுக்கம்", "விழுங்க முடியவில்லை",
    "விழுங்க இயலவில்லை", "குழப்பமாக", "குழப்பம்", "விழிக்க முடியவில்லை", "விழித்திருக்க முடியவில்லை", "விழித்திருக்க இயலவில்லை",
    "சர்க்கரை 30", "சர்க்கரை 40", "சர்க்கரை 45", "சர்க்கரை 50"
]

# Crisis & Self-harm indicators
CRISIS_KEYWORDS_EN = [
    r"\bsuicide\b", r"\bkill myself\b", r"\bend my life\b", r"\bwant to die\b",
    r"\bself-harm\b", r"\bharm myself\b", r"\bdon't want to live\b", r"\bdont want to live\b",
    r"\bhurt myself\b"
]

CRISIS_KEYWORDS_TA = [
    "தற்கொலை", "வாழ பிடிக்கவில்லை", "சாக வேண்டும்", "உயிரை மாய்த்து", "தன்னை காயப்படுத்த", "வாழ விருப்பமில்லை"
]

def check_emergency_symptoms(message: str, language: str = "ta") -> Optional[str]:
    """
    Deterministic rule-based medical emergency interceptor.
    Returns a short, calm urgent-care message (including 108 for India)
    before and instead of any long educational text.
    """
    msg_lower = message.lower()
    is_emergency = False

    # Check English patterns
    for pattern in EMERGENCY_KEYWORDS_EN:
        if re.search(pattern, msg_lower):
            is_emergency = True
            break

    # Check Tamil patterns
    if not is_emergency:
        for keyword in EMERGENCY_KEYWORDS_TA:
            if keyword in msg_lower:
                is_emergency = True
                break

    if is_emergency:
        if language == "en":
            return (
                "🚨 CRITICAL MEDICAL EMERGENCY:\n"
                "Please seek urgent emergency medical help right now. "
                "Call 108 immediately (or your local emergency medical service), "
                "or have someone take you to the nearest hospital emergency room.\n\n"
                "⚠️ This requires immediate medical attention. Do not wait for AI responses."
            )
        else:
            return (
                "🚨 அவசர மருத்துவ எச்சரிக்கை (EMERGENCY):\n"
                "தயவுசெய்து உடனடியாக அவசர மருத்துவ உதவியை நாடுங்கள். "
                "உடனே 108 ஆம்புலன்ஸ் அவசர சேவையை அழைக்கவும், அல்லது அருகிலுள்ள மருத்துவமனை அவசர சிகிச்சைப் பிரிவிற்கு செல்லவும்.\n\n"
                "⚠️ இதற்கு உடனடி அவசர சிகிச்சை தேவை. AI பதில்களுக்காக காத்திருக்க வேண்டாம்."
            )

    return None

def check_crisis_or_self_harm(message: str, language: str = "ta") -> Optional[str]:
    """
    Detects expressions of self-harm and responds with a short, compassionate
    message encouraging immediate contact with a trusted person or crisis service.
    """
    msg_lower = message.lower()
    is_crisis = False

    for pat in CRISIS_KEYWORDS_EN:
        if re.search(pat, msg_lower):
            is_crisis = True
            break

    if not is_crisis:
        for kw in CRISIS_KEYWORDS_TA:
            if kw in msg_lower:
                is_crisis = True
                break

    if is_crisis:
        if language == "en":
            return (
                "💙 You are not alone, and supportive help is available right now. "
                "Please reach out to someone you trust, or connect with a compassionate, confidential crisis service:\n\n"
                "• Tele-MANAS (India National Mental Health Helpline): Call 14416 or 1800-891-4416 (Toll-free, 24/7)\n"
                "• Kiran Mental Health Helpline: 1800-599-0019\n"
                "• Or speak to a trusted family member, friend, or healthcare professional right away."
            )
        else:
            return (
                "💙 நீங்கள் தனியாக இல்லை, உங்களுக்கு ஆதரவளிக்க பலர் தயாராக இருக்கிறார்கள். "
                "தயவுசெய்து உங்களுக்கு பிடித்தவர்கள், குடும்பத்தினர் அல்லது உடனடி உதவி எண்களைத் தொடர்பு கொள்ளவும்:\n\n"
                "• டெலி-மானாஸ் (Tele-MANAS தேசிய உதவி எண்): 14416 அல்லது 1800-891-4416 (இலவசம், 24/7)\n"
                "• சினேகா உதவி மையம் (Sneha Helpline): 044-24640050\n"
                "• அல்லது உங்கள் குடும்பத்தினர், நண்பர்கள் அல்லது மருத்துவரை உடனடியாக அணுகவும்."
            )

    return None
