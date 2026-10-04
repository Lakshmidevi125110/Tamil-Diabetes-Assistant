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

# Initialize rate limiters
chat_limiter = SimpleRateLimiter(max_requests=15, window_seconds=60)
tts_limiter = SimpleRateLimiter(max_requests=40, window_seconds=60)

# Maximum allowed input length for queries
MAX_INPUT_LENGTH = 500

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

# Emergency keyword dictionary
EMERGENCY_KEYWORDS_EN = [
    r"\bunconscious\b", r"\bfainted\b", r"\bfainting\b", r"\bpassed out\b",
    r"\bchest pain\b", r"\bheart attack\b", r"\bsevere shortness of breath\b",
    r"\bcannot breathe\b", r"\bseizure\b", r"\bconvulsion\b",
    r"\bsugar (?:is |below |under )?[234]\d\b", # sugar below 50
    r"\bblood sugar (?:below |under |is )?[234]\d\b"
]

EMERGENCY_KEYWORDS_TA = [
    "மயக்கம்", "மயங்கி", "நினைவிழந்த", "சுயநினைவு", "நெஞ்சு வலி",
    "மூச்சுத்திணறல்", "மூச்சு திணறல்", "வலிப்பு", "கை கால் நடுக்கம்",
    "சர்க்கரை 30", "சர்க்கரை 40", "சர்க்கரை 45", "சர்க்கரை 50"
]

def check_emergency_symptoms(message: str, language: str = "ta") -> Optional[str]:
    """
    Deterministic rule-based medical emergency interceptor.
    If life-threatening symptoms are detected, returns an immediate urgent protocol.
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
                "🚨 CRITICAL MEDICAL EMERGENCY ALERT:\n"
                "The symptoms you described (such as fainting, severe hypoglycemia, chest pain, or breathing difficulty) "
                "require IMMEDIATE emergency medical attention!\n\n"
                "1. Call 108 or your local emergency medical service IMMEDIATELY.\n"
                "2. If the person is conscious with severe low blood sugar (<50 mg/dL), provide 15–20g of fast-acting sugar (fruit juice, glucose candy) right away.\n"
                "3. If the person is unconscious, DO NOT force anything into their mouth; place them on their side in the recovery position and wait for emergency responders.\n\n"
                "⚠️ Disclaimer: This is an emergency guidance alert. Do not wait for AI responses—seek emergency medical help immediately."
            )
        else:
            return (
                "🚨 அவசர மருத்துவ எச்சரிக்கை (EMERGENCY):\n"
                "நீங்கள் குறிப்பிட்ட அறிகுறிகள் (மயக்கம், தீவிர சர்க்கரை குறைவு, நெஞ்சு வலி, அல்லது மூச்சுத்திணறல்) "
                "உடனடி அவசர மருத்துவ சிகிச்சையைக் கோருகின்றன!\n\n"
                "1. உடனடியாக 108 அல்லது அருகிலுள்ள அவசர சிகிச்சைப் பிரிவை (Hospital Emergency) அழைக்கவும்.\n"
                "2. நோயாளிக்கு சுயநினைவு இருந்து, சர்க்கரை மிகவும் குறைவாக இருந்தால் (<50 mg/dL), உடனடியாக 15-20 கிராம் குளுக்கோஸ் அல்லது பழச்சாறு கொடுக்கவும்.\n"
                "3. நோயாளிக்கு சுயநினைவு இல்லை (மயக்கம்) என்றால், வாயில் எதையும் திணிக்க வேண்டாம்; அவரை ஒரு பக்கமாக சாய்த்து படுக்க வைத்து ஆம்புலன்ஸுக்கு காத்திருக்கவும்.\n\n"
                "⚠️ எச்சரிக்கை: இது அவசர கால பாதுகாப்பு எச்சரிக்கை. தாமதிக்காமல் மருத்துவ உதவியை உடனே நாடவும்."
            )

    return None
