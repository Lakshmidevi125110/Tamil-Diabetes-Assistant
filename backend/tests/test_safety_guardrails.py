from app.services.ai_service import clean_tamil_text, normalize_single_disclaimer
from app.services.guardrails import chat_limiter


def test_emergency_interceptor_tamil(client):
    """Test that Tamil emergency keywords trigger urgent care protocol immediately."""
    payload = {
        "message": "நோயாளிக்கு திடீரென மயக்கம் வந்துவிட்டது, சர்க்கரை 40",
        "language": "ta"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
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
    data = response.json()
    assert data.get("status") == "emergency"
    assert "108" in data.get("reply", "")
    assert "CRITICAL MEDICAL EMERGENCY" in data.get("reply", "")


def test_emergency_severe_confusion_cannot_stay_awake_english(client):
    """Test required scenario: 'I feel very confused and I cannot stay awake' in English."""
    payload = {
        "message": "I feel very confused and I cannot stay awake",
        "language": "en"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "emergency"
    reply = data.get("reply", "")
    assert "108" in reply
    assert "emergency" in reply.lower()
    # Ensure it is a short, calm urgent-care message without treatment steps
    assert len(reply) < 350
    assert "insulin" not in reply.lower()
    assert "dose" not in reply.lower()


def test_emergency_severe_confusion_cannot_stay_awake_tamil(client):
    """Test required scenario: 'I feel very confused and I cannot stay awake' in Tamil."""
    payload = {
        "message": "எனக்கு மிகவும் குழப்பமாக இருக்கிறது என்னால் விழித்திருக்க முடியவில்லை",
        "language": "ta"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "emergency"
    reply = data.get("reply", "")
    assert "108" in reply
    assert "அவசர" in reply
    assert len(reply) < 350


def test_crisis_self_harm_interceptor_english(client):
    """Test that self-harm or suicidal expression in English returns crisis support with helpline."""
    payload = {
        "message": "I don't want to live anymore, feeling suicidal",
        "language": "en"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "crisis_support"
    reply = data.get("reply", "")
    assert "14416" in reply or "Tele-MANAS" in reply


def test_crisis_self_harm_interceptor_tamil(client):
    """Test that self-harm or suicidal expression in Tamil returns compassionate crisis support."""
    payload = {
        "message": "எனக்கு வாழ பிடிக்கவில்லை, தற்கொலை எண்ணம் வருகிறது",
        "language": "ta"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "crisis_support"
    reply = data.get("reply", "")
    assert "14416" in reply or "சினேகா" in reply



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
    data = res_blocked.json()
    assert "கோரிக்கைகள்" in data.get("error", "") or "requests" in data.get("error", "").lower()
