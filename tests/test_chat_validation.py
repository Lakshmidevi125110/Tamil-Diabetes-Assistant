def test_get_chat_returns_instructions(client):
    """Test that GET /chat returns 200 with usage instructions."""
    response = client.get("/chat")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "POST" in data.get("message", "")
    assert "usage" in data


def test_post_chat_missing_json(client):
    """Test that POST /chat without JSON payload returns 400."""
    response = client.post("/chat", data="not json", content_type="text/plain")
    assert response.status_code == 400
    data = response.get_json()
    assert "JSON" in data.get("error", "")


def test_post_chat_empty_message(client):
    """Test that POST /chat with an empty message field returns 400."""
    response = client.post("/chat", json={"message": "   ", "language": "en"})
    assert response.status_code == 400
    data = response.get_json()
    assert "empty" in data.get("error", "")


def test_post_chat_exceeds_max_length(client):
    """Test that POST /chat exceeding 500 characters returns 400."""
    long_msg = "A" * 501
    response = client.post("/chat", json={"message": long_msg, "language": "en"})
    assert response.status_code == 400
    data = response.get_json()
    assert "too long" in data.get("error", "").lower()


def test_security_headers_present(client):
    """Test that defensive HTTP security headers are attached to responses."""
    response = client.get("/")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert "strict-origin" in response.headers.get("Referrer-Policy", "")

