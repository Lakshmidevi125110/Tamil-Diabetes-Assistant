import pytest

BANNED_PHRASES = ["you must", "you need to", "dangerous", "uncontrolled", "very bad"]

def test_get_glucose_respond_returns_instructions(client):
    """Test that GET /glucose/respond returns usage documentation."""
    response = client.get("/glucose/respond")
    assert response.status_code == 200
    data = response.json()
    assert "POST" in data.get("message", "")
    assert "usage" in data

def test_post_glucose_missing_json(client):
    """Test that POST /glucose/respond without JSON returns 400."""
    response = client.post("/glucose/respond", content="not json", headers={"Content-Type": "text/plain"})
    assert response.status_code == 400
    data = response.json()
    assert "JSON" in data.get("error", "")

def test_post_glucose_invalid_values(client):
    """Test out-of-range or non-numeric values are rejected politely."""
    # Out of range low (<20)
    res_low = client.post("/glucose/respond", json={"value": 15, "language": "en"})
    assert res_low.status_code == 400
    assert "between 20 and 600" in res_low.json().get("error", "")

    # Out of range high (>600)
    res_high = client.post("/glucose/respond", json={"value": 750, "language": "ta"})
    assert res_high.status_code == 400
    assert "20 முதல் 600" in res_high.json().get("error", "")

    # Non-numeric
    res_non_num = client.post("/glucose/respond", json={"value": "invalid", "language": "en"})
    assert res_non_num.status_code == 400
    assert "numeric" in res_non_num.json().get("error", "").lower()

def test_post_glucose_within_range_english(client):
    """Test within-range reading in English."""
    payload = {
        "value": 110,
        "measurement_type": "fasting",
        "language": "en"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "success"
    assert data.get("classification") == "within"
    text = data.get("response", "")
    
    # Verify no false reassurance and presence of context
    assert "single reading" in text.lower()
    assert "educational" in text.lower()
    
    # Check banned words
    for banned in BANNED_PHRASES:
        assert banned not in text.lower(), f"Found banned phrase '{banned}' in response"

def test_post_glucose_within_range_tamil(client):
    """Test within-range reading in Tamil."""
    payload = {
        "value": 140,
        "measurement_type": "post_meal_2h",
        "language": "ta"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("classification") == "within"
    text = data.get("response", "")
    assert "ஒற்றை அளவு" in text
    assert "(2h Post-Meal)" in text

def test_post_glucose_above_range_no_prescriptions(client):
    """Test above-range reading is educational and never prescribes."""
    payload = {
        "value": 240,
        "measurement_type": "fasting",
        "language": "en"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("classification") == "above"
    text = data.get("response", "")
    
    # No diagnosis or blaming
    assert "you have high blood sugar" not in text.lower()
    assert "insulin" not in text.lower()
    for banned in BANNED_PHRASES:
        assert banned not in text.lower()

def test_post_glucose_below_range_safety(client):
    """Test below-range reading provides calm safety guidance."""
    payload = {
        "value": 55,
        "measurement_type": "random",
        "language": "en"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("classification") == "below"
    text = data.get("response", "")
    assert "15" in text  # Rule of 15 fast acting sugar
    assert "hypoglycemia" in text.lower()

def test_post_glucose_emergency_symptoms_escalation(client):
    """Test that severe symptoms (unconscious / seizure) trigger emergency alert."""
    payload = {
        "value": 45,
        "measurement_type": "fasting",
        "language": "ta",
        "symptoms": "நோயாளிக்கு மயக்கம் மற்றும் வலிப்பு"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "emergency"
    assert "108" in data.get("response", "")
