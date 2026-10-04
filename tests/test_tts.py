from routes.tts import sanitize_text_for_speech, TTS_CACHE


def test_get_tts_returns_instructions(client):
    """Test that GET /tts returns 200 with usage instructions."""
    response = client.get("/tts")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "POST" in data.get("message", "")
    assert "usage" in data


def test_post_tts_missing_json(client):
    """Test that POST /tts without valid JSON returns 400."""
    response = client.post("/tts", data="not json", content_type="text/plain")
    assert response.status_code == 400
    data = response.get_json()
    assert "JSON" in data.get("error", "")


def test_post_tts_empty_text(client):
    """Test that POST /tts with empty text returns 400."""
    response = client.post("/tts", json={"text": "   ", "language": "ta"})
    assert response.status_code == 400
    data = response.get_json()
    assert "empty" in data.get("error", "")


def test_post_tts_unspeakable_text_after_sanitization(client):
    """Test that text consisting solely of emojis/warnings is rejected cleanly."""
    response = client.post("/tts", json={"text": "⚠️ 🚨 🔊", "language": "ta"})
    assert response.status_code == 400
    data = response.get_json()
    assert "speakable" in data.get("error", "").lower()


def test_sanitize_text_for_speech():
    """Test that markdown and emojis are stripped for smooth audio synthesis."""
    raw = "**வணக்கம்** ⚠️ [Website](https://example.com) *நன்றி*!"
    clean = sanitize_text_for_speech(raw)
    assert "**" not in clean
    assert "⚠️" not in clean
    assert "https://" not in clean
    assert "வணக்கம்" in clean
    assert "நன்றி!" in clean


def test_post_tts_generates_mp3_audio_and_caches(client):
    """Test that valid text produces an MP3 stream and caches the result."""
    payload = {"text": "வணக்கம்", "language": "ta"}
    response = client.post("/tts", json=payload)
    assert response.status_code == 200
    assert response.mimetype == "audio/mpeg"
    assert len(response.data) > 0

    # Ensure sentence is cached for instant future playback
    cache_key = ("ta", "வணக்கம்")
    assert cache_key in TTS_CACHE


def test_post_tts_exceeds_max_length(client):
    """Test that text exceeding 1000 characters is rejected with HTTP 400."""
    oversized_text = "வணக்கம் " * 200  # >1000 characters
    response = client.post("/tts", json={"text": oversized_text, "language": "ta"})
    assert response.status_code == 400
    data = response.get_json()
    assert "exceeds maximum allowed length" in data.get("error", "").lower()
