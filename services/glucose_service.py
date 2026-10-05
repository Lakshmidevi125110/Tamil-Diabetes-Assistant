import json
import os
import logging
from typing import Dict, Any, Optional, Tuple
from services.guardrails import check_emergency_symptoms

logger = logging.getLogger(__name__)

# Path to educational reference config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "glucose_reference.json")

def load_reference_config() -> Dict[str, Any]:
    """Loads educational reference ranges from JSON config."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Could not read glucose_reference.json (%s), using default reference.", str(e))
        return {
            "source": "American Diabetes Association (ADA) Guidelines",
            "ranges": {
                "fasting": {"min_typical": 70, "max_typical": 130},
                "before_meal": {"min_typical": 70, "max_typical": 130},
                "post_meal_2h": {"min_typical": 70, "max_typical": 180},
                "random": {"min_typical": 70, "max_typical": 180}
            },
            "validation_limits": {"min_valid": 20, "max_valid": 600}
        }

REFERENCE_CONFIG = load_reference_config()

# Standardized measurement types mapping (including aliases)
TYPE_MAP = {
    "fasting": "fasting",
    "before_meal": "before_meal",
    "post_meal_2h": "post_meal_2h",
    "after_meal": "post_meal_2h",
    "2h_post_meal": "post_meal_2h",
    "random": "random"
}

def validate_glucose_input(value: Any, measurement_type: str, language: str) -> Tuple[bool, Optional[str], Optional[float], Optional[str]]:
    """
    Validates numeric range and measurement type.
    Rejects impossible values with a calm, polite message.
    """
    lang = "en" if language == "en" else "ta"
    
    # 1. Validate numeric value
    try:
        num_val = float(value)
    except (ValueError, TypeError):
        msg = (
            "Please provide a numeric blood glucose reading in mg/dL (for example, 110)."
            if lang == "en" else
            "தயவுசெய்து எண்ணில் அமைந்த இரத்த சர்க்கரை அளவை mg/dL அலகில் குறிப்பிடவும் (எடுத்துக்காட்டாக, 110)."
        )
        return False, msg, None, None

    limits = REFERENCE_CONFIG.get("validation_limits", {})
    min_v = limits.get("min_valid", 20)
    max_v = limits.get("max_valid", 600)

    if num_val < min_v or num_val > max_v:
        msg = (
            f"Please enter a blood glucose reading between {min_v} and {max_v} mg/dL for educational review."
            if lang == "en" else
            f"கல்வி வழிகாட்டலுக்கு {min_v} முதல் {max_v} mg/dL-க்குள் உள்ள இரத்த சர்க்கரை அளவைக் குறிப்பிடவும்."
        )
        return False, msg, None, None

    # 2. Validate measurement type
    norm_type = TYPE_MAP.get(str(measurement_type).strip().lower(), "random")
    return True, None, num_val, norm_type

def classify_glucose_reading(value: float, norm_type: str) -> Tuple[str, int, int]:
    """
    Classifies reading relative to general educational reference ranges.
    Returns: classification ('below', 'within', 'above'), min_typical, max_typical
    """
    ranges = REFERENCE_CONFIG.get("ranges", {})
    type_info = ranges.get(norm_type, ranges.get("random", {}))
    min_ref = type_info.get("min_typical", 70)
    max_ref = type_info.get("max_typical", 180)

    if value < min_ref:
        return "below", min_ref, max_ref
    elif value > max_ref:
        return "above", min_ref, max_ref
    else:
        return "within", min_ref, max_ref

def generate_educational_response(
    value: float,
    norm_type: str,
    language: str,
    symptoms: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a calm, non-judgmental, structured educational response.
    Never prescribes, diagnoses, or uses shame or fear.
    """
    lang = "en" if language == "en" else "ta"
    classification, min_ref, max_ref = classify_glucose_reading(value, norm_type)

    # 1. Emergency symptoms check if symptoms text is provided
    if symptoms and symptoms.strip():
        emergency_alert = check_emergency_symptoms(symptoms, language=lang)
        if emergency_alert:
            return {
                "status": "emergency",
                "classification": classification,
                "value": value,
                "measurement_type": norm_type,
                "language": lang,
                "response": emergency_alert
            }

    # Low sugar with concerning symptoms check
    symptoms_lower = (symptoms or "").lower()
    has_severe_low_signs = any(k in symptoms_lower for k in [
        "confusion", "seizure", "unconscious", "passed out", "fainted",
        "மயக்கம்", "வலிப்பு", "சுயநினைவு", "நினைவிழந்த"
    ])
    if classification == "below" and has_severe_low_signs:
        emergency_alert = check_emergency_symptoms("மயக்கம்" if lang == "ta" else "unconscious", language=lang)
        return {
            "status": "emergency",
            "classification": "below",
            "value": value,
            "measurement_type": norm_type,
            "language": lang,
            "response": emergency_alert
        }

    # Friendly type names
    type_labels = {
        "en": {
            "fasting": "fasting",
            "before_meal": "before meal",
            "post_meal_2h": "2 hours post-meal",
            "random": "random"
        },
        "ta": {
            "fasting": "வெறும் வயிற்றில் (Fasting)",
            "before_meal": "உணவுக்கு முன் (Before Meal)",
            "post_meal_2h": "உணவுக்கு 2 மணி நேரம் பின் (2h Post-Meal)",
            "random": "சீரற்ற நேரம் (Random)"
        }
    }
    type_label = type_labels[lang].get(norm_type, norm_type)

    # 2. Build 4-part structured response
    # Structure: Acknowledgement -> Educational Interpretation -> Context -> Safe Next Step
    if lang == "en":
        # English Templates
        ack = f"Thank you for logging your {type_label} reading of {value:g} mg/dL."

        if classification == "within":
            interp = f"From an educational standpoint, this reading sits within the general reference guideline ({min_ref}–{max_ref} mg/dL)."
            context = "Keep in mind that day-to-day blood glucose naturally shifts based on meal composition, hydration, rest, physical activity, and stress."
            next_step = "A single reading offers a helpful momentary snapshot, but consistent logs over several days provide the clearest trend. Please continue your routine self-care and discuss your overall patterns with your healthcare provider."

        elif classification == "above":
            interp = f"For educational context, this reading is above the general reference threshold ({max_ref} mg/dL for {type_label} measurements)."
            context = "Occasional elevations can be influenced by carbohydrate portion sizes, meal timing, physical inactivity, hydration, seasonal illness, emotional stress, or personal medication schedules."
            next_step = "It can be helpful to jot down what you ate or your recent activities in your notes. Stay well hydrated, continue your customary wellness habits, and consider reviewing recurring elevations with your doctor to explore personalized guidance."

        else:  # below
            interp = f"For educational awareness, this reading is below the general reference guideline of {min_ref} mg/dL, which points to a lower glucose level (Hypoglycemia)."
            context = "Lower readings can occur due to delayed meals, smaller food portions than usual, increased activity, or medication timing."
            next_step = "If you feel comfortable and conscious, general educational advice suggests having 15 grams of fast-acting sugar (such as 3 teaspoons of sugar in water or half a cup of fruit juice) and resting. If you experience severe symptoms like dizziness, confusion, or difficulty speaking, having someone assist you or calling local medical care (108) is strongly recommended."

        disclaimer = "⚠️ Note: This is an educational reference only. Individual targets and management choices must be set with your physician."
        full_response = f"{ack}\n\n{interp}\n\n{context}\n\n{next_step}\n\n{disclaimer}"

    else:
        # Tamil Templates
        ack = f"உங்கள் {type_label} சர்க்கரை அளவு {value:g} mg/dL-ஐ பதிவு செய்தமைக்கு நன்றி."

        if classification == "within":
            interp = f"பொதுவான கல்வி விழிப்புணர்வு வழிகாட்டலின்படி, இந்த அளவு பொதுவான குறிப்பு வரம்பிற்குள் ({min_ref}–{max_ref} mg/dL) அமைந்துள்ளது."
            context = "இரத்த சர்க்கரை அளவு என்பது நாம் உண்ணும் உணவு, போதுமான நீர் அருந்துதல், தூக்கம், அன்றாட நடைபயிற்சி மற்றும் மன அமைதி ஆகியவற்றால் இயல்பாகவே மாறக்கூடியது."
            next_step = "ஒரு குறிப்பிட்ட நேரத்தில் எடுக்கப்படும் ஒற்றை அளவு முழுமையான நிலையைக் காட்டாது; தொடர்ந்து சில நாட்கள் அளவுகளை குறித்து வைப்பது தெளிவான போக்கை (Trend) அறிய உதவும். உங்கள் வழக்கமான நல்வாழ்வு பழக்கங்களைத் தொடருங்கள்; உங்கள் மருத்துவரிடம் இதனைப் பகிர்வது நல்லது."

        elif classification == "above":
            interp = f"பொது விழிப்புணர்வு வழிகாட்டலின்படி, இந்த அளவு பொதுவான குறிப்பு வரம்பை விட ({type_label} பரிசோதனைக்கு {max_ref} mg/dL) அதிகமாக உள்ளது."
            context = "உணவில் மாவுச்சத்து (Carbohydrates) அளவு, உணவு உண்ட நேரம், நீர் குறைவாகக் குடிப்பது, உடல் சோர்வு, மன அழுத்தம் அல்லது உடல்நலக் குறைவு போன்ற பல காரணங்களால் சர்க்கரை அளவு தற்காலிகமாக உயரக்கூடும்."
            next_step = "நீங்கள் சாப்பிட்ட உணவு மற்றும் அன்றைய செயல்பாடுகளை உங்கள் குறிப்பில் பதிவு செய்து கொள்வது உதவியாக இருக்கும். போதுமான தண்ணீர் குடித்து, உங்கள் வழக்கமான சுயபராமரிப்பைத் தொடருங்கள்; தொடர்ச்சியாக அளவுகள் கூடுதலாக இருந்தால், உங்கள் மருத்துவரிடம் ஆலோசனை பெறுவது நல்லது."

        else:  # below
            interp = f"பொது விழிப்புணர்வு தகவலின்படி, இந்த அளவு பொதுவான குறிப்பு வரம்பான {min_ref} mg/dL-ஐ விட குறைவாக உள்ளது (குறைந்த சர்க்கரை அளவு / Hypoglycemia)."
            context = "உணவு உண்பதில் தாமதம், வழக்கத்தை விட குறைவான உணவு, அதிக உடற்பயிற்சி அல்லது மருந்து நேர மாற்றங்களால் இது ஏற்படலாம்."
            next_step = "சுயநினைவு இருக்கும் நிலையில், பொதுவான வழிகாட்டலின்படி 15 கிராம் சர்க்கரை அல்லது குளுக்கோஸ் (எ.கா. 3 தேக்கரண்டி சர்க்கரை கலந்த தண்ணீர் அல்லது அரை டம்ளர் பழச்சாறு) அருந்தி ஓய்வெடுக்கலாம். தலைசுற்றல், குழப்பம் அல்லது கடுமையான நடுக்கம் போன்ற அறிகுறிகள் தொடர்ந்தால், உடனடியாக மற்றவர்களின் உதவியைப் பெறவும் அல்லது மருத்துவ அவசர உதவியை (108) நாடவும்."

        disclaimer = "⚠️ குறிப்பு: இது பொதுவான கல்வி விழிப்புணர்வு தகவல் மட்டுமே. தனிப்பட்ட மருத்துவ இலக்குகள் மற்றும் சிகிச்சைக்கு உங்கள் மருத்துவரை அணுகவும்."
        full_response = f"{ack}\n\n{interp}\n\n{context}\n\n{next_step}\n\n{disclaimer}"

    return {
        "status": "success",
        "classification": classification,
        "value": value,
        "measurement_type": norm_type,
        "language": lang,
        "reference_range": {"min": min_ref, "max": max_ref, "unit": "mg/dL"},
        "response": full_response
    }
