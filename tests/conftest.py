import pytest
from app import create_app
from services.guardrails import chat_limiter, tts_limiter

@pytest.fixture
def app():
    """Create and configure a testing instance of the Flask application."""
    test_app = create_app()
    test_app.config.update({
        "TESTING": True,
    })
    return test_app

@pytest.fixture
def client(app):
    """A test client for making simulated HTTP requests."""
    # Reset in-memory rate limiters so tests are completely isolated
    chat_limiter.ip_history.clear()
    tts_limiter.ip_history.clear()
    return app.test_client()
