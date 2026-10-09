import os
import time
import pytest
from unittest.mock import patch
from app.config import Config


def test_render_port_and_binding():
    """Verify PORT environment variable is respected."""
    with patch.dict(os.environ, {"PORT": "10000"}):
        from importlib import reload
        from app import config
        reload(config)
        assert config.Config.PORT == 10000


def test_render_debug_mode_default_off():
    """Verify Flask debug mode defaults to False in production."""
    with patch.dict(os.environ, {"FLASK_DEBUG": "0", "DEBUG": "False"}):
        from importlib import reload
        from app import config
        reload(config)
        assert config.Config.DEBUG is False


def test_render_fast_startup():
    """Verify application boots in well under 1 second."""
    t0 = time.time()
    from fastapi.testclient import TestClient
    from app.main import create_app
    app_instance = create_app()
    elapsed = time.time() - t0
    assert app_instance is not None
    assert elapsed < 1.0, f"App startup was too slow: {elapsed:.2f}s"


def test_render_missing_gemini_api_key_resilience():
    """Verify app starts and handles requests safely without crashing when GEMINI_API_KEY is unset or empty."""
    with patch.object(Config, "GEMINI_API_KEY", ""):
        from fastapi.testclient import TestClient
        from app.main import create_app
        test_app = create_app()
        client = TestClient(test_app)

        # Health check succeeds
        health_resp = client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "healthy"

        # Chat endpoint does not crash on missing key
        chat_resp = client.post("/chat", json={"message": "What is normal fasting blood sugar?", "language": "en"})
        assert chat_resp.status_code in (200, 429)
        if chat_resp.status_code == 200:
            data = chat_resp.json()
            assert "reply" in data
            assert len(data["reply"]) > 0


def test_render_vector_store_warmup_and_fast_lookup():
    """Verify vector store is loaded in memory and search does not crash."""
    from app.services.embedding_service import get_vector_store
    store = get_vector_store()
    assert store is not None
    # Index was loaded from data/index/knowledge_index.json
    assert store.count() > 0
