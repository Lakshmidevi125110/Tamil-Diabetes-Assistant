import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.services.guardrails import chat_limiter, tts_limiter

@pytest.fixture
def app():
    """Create a testing instance of the FastAPI application."""
    return create_app()

@pytest.fixture
def client(app):
    """A test client for making simulated HTTP requests."""
    # Reset in-memory rate limiters so tests are completely isolated
    chat_limiter.ip_history.clear()
    tts_limiter.ip_history.clear()
    return TestClient(app)
