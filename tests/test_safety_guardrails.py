from services.ai_service import clean_tamil_text, normalize_single_disclaimer
from services.guardrails import chat_limiter


def test_emergency_interceptor_tamil(client):
    """Test that Tamil emergency keywords trigger urgent care protocol immediately."""
    payload = {
        "message": "நோயாளிக்கு திடீரென மயக்கம் வந்துவிட்டது, சர்க்கரை 40",
        "language": "ta"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("status") == "emergency"
    assert "108" in data.get("reply", "")
    assert "அவசர" in data.get("reply", "")


def test_emergency_interceptor_english(client):
    """Test that English emergency keywords trigger urgent care protocol immediately."""
    payload = {
        "message": "Patient has severe chest pain and blood sugar 30",
        "language": "en"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("status") == "emergency"
    assert "108" in data.get("reply", "")
    assert "CRITICAL MEDICAL EMERGENCY" in data.get("reply", "")


def test_clean_tamil_text_strips_foreign_artifacts():
    """Test that stray non-Tamil foreign characters (e.g., Arabic \\u06D5) are cleanly removed."""
    dirty_text = "திட\u06D5ீரென ரத்தத்தில் சர்க்கரை அளவு குறைந்தது."
    clean_text = clean_tamil_text(dirty_text)
    assert "\u06D5" not in clean_text
    assert clean_text == "திடீரென ரத்தத்தில் சர்க்கரை அளவு குறைந்தது."


def test_normalize_single_disclaimer():
    """Test that duplicate disclaimers are removed so disclaimer appears only once at the end."""
    duplicate_text = (
        "ஆப்பிள் சர்க்கரை நோயாளிகளுக்கு பாதுகாப்பானது. "
        "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே. மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும். "
        "இதில் நார்ச்சத்து அதிகம் உள்ளது."
    )
    result = normalize_single_disclaimer(duplicate_text, language="ta")
    disclaimer_str = "⚠️ குறிப்பு: இது விழிப்புணர்வு தகவல் மட்டுமே."
    assert result.count(disclaimer_str) == 1
    assert result.endswith("மருத்துவரை அணுகவும்.")


def test_chat_rate_limiter_blocks_excessive_requests(client):
    """Test that chat endpoint blocks the 16th request within a minute with HTTP 429."""
    emergency_payload = {
        "message": "நோயாளிக்கு மயக்கம்",
        "language": "ta"
    }
    # First 15 requests should be allowed
    for _ in range(15):
        res = client.post("/chat", json=emergency_payload)
        assert res.status_code == 200

    # 16th request must be blocked by rate limiter
    res_blocked = client.post("/chat", json=emergency_payload)
    assert res_blocked.status_code == 429
    data = res_blocked.get_json()
    assert "கோரிக்கைகள்" in data.get("error", "") or "requests" in data.get("error", "").lower()
