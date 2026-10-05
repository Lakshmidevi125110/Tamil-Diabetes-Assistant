import re
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# ============================================================================
# 1. User Input Safety: Refusal for Medication / Dosage Modification Requests
# ============================================================================
MEDICATION_CHANGE_PATTERNS_EN = [
    r"(?:should|can|could|may|how\s+to|do\s+i|must\s+i)\s+(?:i\s+)?(?:increase|decrease|change|stop|adjust|double|skip|reduce|raise|alter|modify)\s+(?:my\s+)?(?:insulin|dosage|dose|medication|medicine|metformin|tablets?|pills?|glimepiride)",
    r"(?:increase|decrease|stop|change|adjust|double|reduce)\s+(?:my\s+)?(?:insulin|dosage|dose|metformin|medicine|medication)",
    r"(?:can|should)\s+i\s+stop\s+(?:taking\s+)?(?:my\s+)?(?:medicine|medication|insulin|metformin|tablets?)",
    r"how\s+many\s+(?:units?|tablets?|pills?|mg)\s+of\s+(?:insulin|metformin|medicine)\s+should\s+i\s+take",
    r"(?:prescribe|recommend)\s+(?:me\s+)?(?:a\s+)?(?:medicine|dosage|drug|insulin)"
]

MEDICATION_CHANGE_PATTERNS_TA = [
    r"இன்சுலின்\s*(?:அளவை\s*)?(?:கூட்டலாமா|அதிகரிக்கலாமா|குறைக்கலாமா|நிறுத்தலாமா|மாற்றலாமா)",
    r"மருந்த(?:ை|ுகளை)\s*(?:நிறுத்தலாமா|மாற்றலாமா|கூட்டலாமா|குறைக்கலாமா)",
    r"மாத்திரைய(?:ை|ுகளை)\s*(?:நிறுத்தலாமா|மாற்றலாமா|கூட்டலாமா|குறைக்கலாமா)",
    r"டோஸ்\s*(?:கூட்டலாமா|குறைக்கலாமா|மாற்றலாமா)",
    r"மெட்ஃபார்மின்\s*(?:நிறுத்தலாமா|அளவை\s*மாற்றலாமா)",
    r"எத்தனை\s*(?:யூனிட்|மாத்திரை|எம்ஜி)\s*(?:இன்சுலின்\s*)?போட\s*வேண்டும்",
    r"மருந்து\s*(?:எழுதி\s*தாருங்கள்|பரிந்துரைக்கவா)"
]

def check_medication_change_query(user_message: str, language: str = "ta") -> Optional[str]:
    """
    Detects if the user is asking to alter, prescribe, start, or stop medication/insulin.
    Returns a calm, supportive refusal explaining that medication changes must be made with a doctor.
    """
    msg_clean = user_message.strip()
    msg_lower = msg_clean.lower()
    lang = "en" if language == "en" else "ta"

    is_med_query = False

    # Check English patterns
    for pat in MEDICATION_CHANGE_PATTERNS_EN:
        if re.search(pat, msg_lower):
            is_med_query = True
            break

    # Check Tamil patterns
    if not is_med_query:
        for pat in MEDICATION_CHANGE_PATTERNS_TA:
            if re.search(pat, msg_clean):
                is_med_query = True
                break

    if is_med_query:
        logger.info("Intercepted medication/dosage modification request: %s", msg_clean[:40])
        if lang == "en":
            return (
                "⚠️ **Medication Safety Guidance:**\n"
                "Decisions regarding starting, stopping, increasing, or decreasing insulin or diabetes medication should only be made in consultation with your treating doctor.\n\n"
                "• **Why this matters:** Medication and insulin dosages are calibrated specifically to your clinical history, kidney health, HbA1c records, and meals. Adjusting dosages independently can cause unexpected and sudden fluctuations in blood sugar.\n"
                "• **Safe next step:** Please contact your prescribing physician or diabetes specialist to review your current readings and discuss dosage adjustments.\n\n"
                "⚠️ Disclaimer: This is educational information only. Please consult your physician for medical advice."
            )
        else:
            return (
                "⚠️ **மருந்து பாதுகாப்பு வழிகாட்டல் (Medication Safety Guidance):**\n"
                "இன்சுலின் அல்லது நீரிழிவு மருந்துகளின் அளவை அதிகரிப்பது, குறைப்பது அல்லது நிறுத்துவது போன்ற மாற்றங்களை உங்கள் மருத்துவரிடம் கலந்தாலோசித்து மட்டுமே செய்ய வேண்டும்.\n\n"
                "• **ஏன் இந்த வழிகாட்டல்:** மருந்து மற்றும் இன்சுலின் அளவுகள் (Dosage) உங்கள் HbA1c பரிசோதனை, சிறுநீரக செயல்பாடு மற்றும் உணவு முறைக்கு ஏற்ப மருத்துவரால் துல்லியமாக நிர்ணயிக்கப்படுகின்றன. சுயமாக அளவை மாற்றுவது இரத்த சர்க்கரையில் திடீர் மாறுதல்களை ஏற்படுத்தக்கூடும்.\n"
                "• **பாதுகாப்பான வழி:** உங்கள் தற்போதைய சர்க்கரை அளவுகளை குறித்து வைத்துக்கொண்டு, மருந்து மாற்றம் குறித்து உங்கள் மருத்துவரிடம் ஆலோசனை பெறவும்.\n\n"
                "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும்."
            )

    return None

# ============================================================================
# 2. AI Reply Safety Validator: Content Review & Fallback Replacement
# ============================================================================
DIAGNOSIS_PATTERNS_EN = [
    r"\byou have (?:diabetes|type\s*[12]\s*diabetes|hypoglycemia|hyperglycemia)\b",
    r"\byour diabetes is uncontrolled\b",
    r"\buncontrolled diabetes\b",
    r"\byou are diagnosed with\b",
    r"\bi diagnose you with\b"
]

DIAGNOSIS_PATTERNS_TA = [
    r"உங்களுக்கு\s*(?:சர்க்கரை|நீரிழிவு)\s*நோய்\s*(?:உள்ளது|வந்துவிட்டது)",
    r"கட்டுப்பாடற்ற\s*சர்க்கரை\s*நோய்",
    r"நீங்கள்\s*நீரிழிவு\s*நோயாளி\s*என\s*உறுதி"
]

MEDICATION_PRESCRIPTION_PATTERNS_EN = [
    r"\b(?:take|inject|start|prescribe)\s+\d+\s*(?:mg|units?|ml|tablets?|pills?)\b",
    r"\b(?:stop taking|discontinue)\s+(?:your\s+)?(?:insulin|metformin|glimepiride|medication|medicine)\b",
    r"\b(?:increase|decrease)\s+(?:your\s+)?(?:dose|dosage)\s+to\s+\d+\b"
]

MEDICATION_PRESCRIPTION_PATTERNS_TA = [
    r"\d+\s*(?:எம்ஜி|யூனிட்|மாத்திரை|mg|units?)\s*.*?(?:எடுத்துக்\s*கொள்ளுங்கள்|சாப்பிடுங்கள்|போடுங்கள்|உட்கொள்ளுங்கள்)",
    r"மருந்த(?:ை|ுகளை|ின்\s*அளவை).*?(?:நிறுத்துங்கள்|நிறுத்திவிடுங்கள்|மாற்றுங்கள்)",
    r"இன்சுலின்.*?(?:நிறுத்துங்கள்|போடுங்கள்|அதிகரியுங்கள்|குறையுங்கள்)"
]

TREATMENT_PLAN_PATTERNS_EN = [
    r"\byour (?:prescribed|individual|custom|personal) treatment plan is\b",
    r"\byou must follow this medical protocol\b",
    r"\bi prescribe the following regimen\b"
]

TREATMENT_PLAN_PATTERNS_TA = [
    r"இதுவே\s*உங்களுக்கான\s*சிகிச்சை\s*திட்டம்",
    r"இந்த\s*மருத்துவ\s*சிகிச்சையை\s*கட்டாயம்\s*பின்பற்றவும்"
]

FALSE_REASSURANCE_PATTERNS_EN = [
    r"\byou are completely (?:fine|safe|cured)\b",
    r"\bno need to worry\b",
    r"\bno risk(?:s)? whatsoever\b",
    r"\bthere is nothing to worry about\b",
    r"\byou don't have to worry\b",
    r"\byou are totally out of danger\b"
]

FALSE_REASSURANCE_PATTERNS_TA = [
    r"நீங்கள்\s*முற்றிலும்\s*(?:குணமாகிவிட்டீர்கள்|பாதுகாப்பாக\s*இருக்கிறீர்கள்)",
    r"எந்த\s*ஆபத்தும்\s*இல்லை",
    r"கவலைப்பட\s*தேவையில்லை",
    r"பயப்பட\s*எதுவுமே\s*இல்லை"
]

def validate_ai_reply(reply_text: str, language: str = "ta") -> Tuple[bool, str, Optional[str]]:
    """
    Audits the generated reply against clinical safety boundaries:
    1. No diagnosis
    2. No medication/dosage prescription or recommendation to alter/stop
    3. No individualized treatment plan
    4. No false reassurance

    Returns: (is_safe: bool, validated_text: str, violation_reason: Optional[str])
    If unsafe, returns a safe, helpful educational fallback.
    """
    if not reply_text:
        return True, "", None

    text_lower = reply_text.lower()
    lang = "en" if language == "en" else "ta"
    violation = None

    # 1. Diagnosis Check
    for pat in DIAGNOSIS_PATTERNS_EN:
        if re.search(pat, text_lower):
            violation = "diagnosis_en"
            break
    if not violation:
        for pat in DIAGNOSIS_PATTERNS_TA:
            if re.search(pat, reply_text):
                violation = "diagnosis_ta"
                break

    # 2. Medication / Prescription Check
    if not violation:
        for pat in MEDICATION_PRESCRIPTION_PATTERNS_EN:
            if re.search(pat, text_lower):
                violation = "medication_prescription_en"
                break
    if not violation:
        for pat in MEDICATION_PRESCRIPTION_PATTERNS_TA:
            if re.search(pat, reply_text):
                violation = "medication_prescription_ta"
                break

    # 3. Individual Treatment Plan Check
    if not violation:
        for pat in TREATMENT_PLAN_PATTERNS_EN:
            if re.search(pat, text_lower):
                violation = "treatment_plan_en"
                break
    if not violation:
        for pat in TREATMENT_PLAN_PATTERNS_TA:
            if re.search(pat, reply_text):
                violation = "treatment_plan_ta"
                break

    # 4. False Reassurance Check
    if not violation:
        for pat in FALSE_REASSURANCE_PATTERNS_EN:
            if re.search(pat, text_lower):
                violation = "false_reassurance_en"
                break
    if not violation:
        for pat in FALSE_REASSURANCE_PATTERNS_TA:
            if re.search(pat, reply_text):
                violation = "false_reassurance_ta"
                break

    if violation:
        logger.warning("Safety Validator triggered on AI response! Reason: %s", violation)
        if lang == "en":
            safe_fallback = (
                "Blood sugar and metabolic health vary individually based on daily lifestyle, nutrition, and medical history. "
                "While general educational guidance highlights the value of balanced nutrition, consistent physical activity, and regular monitoring, "
                "an individual diagnosis, medication management, and personalized targets should always be evaluated with a qualified healthcare professional.\n\n"
                "⚠️ Disclaimer: This is educational information only. Please consult your physician for medical advice."
            )
        else:
            safe_fallback = (
                "இரத்த சர்க்கரை மற்றும் உடல்நலம் என்பது ஒவ்வொரு நபரின் உணவு முறை, உடற்பயிற்சி மற்றும் மருத்துவ பின்னணியைப் பொறுத்து மாறுபடக்கூடியது. "
                "சமச்சீரான உணவு, வழக்கமான நடைபயிற்சி மற்றும் சர்க்கரை அளவை கண்காணிப்பது பொதுவான நல்வாழ்விற்கு உதவும் என்றாலும்; "
                "தனிப்பட்ட நோய் கண்டறிதல், மருந்துகள் மற்றும் சிகிச்சை திட்டங்களுக்கு உங்கள் மருத்துவரை அணுகி முறையான வழிகாட்டல் பெறுவதே பாதுகாப்பானது.\n\n"
                "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும்."
            )
        return False, safe_fallback, violation

    return True, reply_text, None
