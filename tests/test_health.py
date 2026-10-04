def test_health_check_returns_200(client):
    """Test that the /health endpoint responds with status 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.get_json()
    assert data is not None
    assert data.get("status") == "healthy"
    assert "Tamil Voice Diabetes Assistant" in data.get("service", "")
