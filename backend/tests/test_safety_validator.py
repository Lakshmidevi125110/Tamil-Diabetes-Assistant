import pytest
from app.services.safety_validator import (
    check_medication_change_query,
    validate_ai_reply
)

# ============================================================================
# 1. Tests for User Medication Adjustment Interceptor
# ============================================================================

def test_medication_interceptor_english_increase_insulin():
    """Test that queries asking to increase insulin are intercepted with a safe refusal."""
    query = "Should I increase my insulin dose from 10 to 15 units?"
    result = check_medication_change_query(query, language="en")
    assert result is not None
    assert "treating doctor" in result.lower()
    assert "Disclaimer" in result

def test_medication_interceptor_english_stop_metformin():
    """Test that queries asking to stop medications are intercepted safely."""
    query = "Can I stop taking my metformin since sugar is normal?"
    result = check_medication_change_query(query, language="en")
    assert result is not None
    assert "medication safety guidance" in result.lower()

def test_medication_interceptor_tamil():
    """Test Tamil medication adjustment queries are intercepted with Tamil guidance."""
    query = "இரத்த சர்க்கரை குறைவாக உள்ளதால் இன்சுலின் அளவை குறைக்கலாமா?"
    result = check_medication_change_query(query, language="ta")
    assert result is not None
    assert "மருத்துவ" in result
    assert "மருந்து பாதுகாப்பு வழிகாட்டல்" in result

def test_normal_educational_query_not_intercepted():
    """Test standard educational queries pass through to AI generation."""
    query = "What is the role of dietary fiber in blood sugar management?"
    result = check_medication_change_query(query, language="en")
    assert result is None

# ============================================================================
# 2. Tests for AI Reply Safety Validator
# ============================================================================

def test_validator_catches_diagnosis_english():
    """Test that explicit diagnoses in AI replies are replaced with safe fallback."""
    unsafe_reply = "Based on your 220 mg/dL reading, you have diabetes and your diabetes is uncontrolled."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="en")
    assert not is_safe
    assert "diagnosis" in reason
    assert "uncontrolled" not in validated
    assert "qualified healthcare professional" in validated

def test_validator_catches_diagnosis_tamil():
    """Test Tamil diagnosis statements are replaced with safe educational fallback."""
    unsafe_reply = "உங்கள் பரிசோதனை முடிவின்படி உங்களுக்கு சர்க்கரை நோய் உள்ளது."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="ta")
    assert not is_safe
    assert "diagnosis" in reason
    assert "உங்களுக்கு சர்க்கரை நோய் உள்ளது" not in validated
    assert "மருத்துவரை அணுகி" in validated

def test_validator_catches_medication_prescription_english():
    """Test that specific dosage prescriptions are intercepted and neutralized."""
    unsafe_reply = "You should take 500 mg metformin twice a day before meals."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="en")
    assert not is_safe
    assert "medication_prescription" in reason
    assert "500 mg" not in validated

def test_validator_catches_medication_prescription_tamil():
    """Test that Tamil medication prescriptions or stop advice are intercepted."""
    unsafe_reply = "மருந்தை உடனடியாக நிறுத்துங்கள் மற்றும் 10 யூனிட் இன்சுலின் போடுங்கள்."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="ta")
    assert not is_safe
    assert "medication_prescription" in reason
    assert "10 யூனிட்" not in validated

def test_validator_catches_treatment_plan():
    """Test that prescriptive treatment plans are replaced."""
    unsafe_reply = "Your prescribed treatment plan is taking these pills and fasting for 16 hours."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="en")
    assert not is_safe
    assert "treatment_plan" in reason

def test_validator_catches_false_reassurance():
    """Test that false reassurance statements are sanitized."""
    unsafe_reply = "Since your sugar is 95, you are completely fine, there is no need to worry and no risk."
    is_safe, validated, reason = validate_ai_reply(unsafe_reply, language="en")
    assert not is_safe
    assert "false_reassurance" in reason
    assert "no need to worry" not in validated

def test_validator_allows_safe_educational_reply():
    """Test that genuine, polite educational content passes validation unaltered."""
    safe_reply = (
        "Apples and guavas contain soluble fiber (pectin) which slows glucose absorption. "
        "Consuming one whole medium fruit per day is generally suitable for many people.\n\n"
        "⚠️ Disclaimer: This is educational information only. Please consult your physician for medical advice."
    )
    is_safe, validated, reason = validate_ai_reply(safe_reply, language="en")
    assert is_safe
    assert reason is None
    assert validated == safe_reply

# ============================================================================
# 3. Integration Tests with /chat Endpoint
# ============================================================================

def test_chat_endpoint_intercepts_insulin_query(client):
    """Test /chat endpoint safely intercepts insulin change queries without calling external LLM."""
    payload = {
        "message": "Should I increase my insulin dose today?",
        "language": "en"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "medication_notice"
    assert "treating doctor" in data.get("reply", "").lower()

def test_chat_endpoint_intercepts_tamil_medication_query(client):
    """Test /chat endpoint safely intercepts Tamil medication adjustment questions."""
    payload = {
        "message": "சர்க்கரை அளவு குறைந்தால் மருந்தை நிறுத்தலாமா?",
        "language": "ta"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "medication_notice"
    assert "மருந்து பாதுகாப்பு வழிகாட்டல்" in data.get("reply", "")
