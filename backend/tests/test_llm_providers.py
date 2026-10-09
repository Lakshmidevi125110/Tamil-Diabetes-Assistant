import os
import pytest
from unittest.mock import patch, MagicMock
from app.config import Config
from app.services.llm_provider import (
    LLMProvider,
    GeminiProvider,
    ClaudeProvider,
    GrokProvider,
    dispatch_llm_request,
    PROVIDERS
)
from app.services.ai_service import generate_ai_response, _fallback_error_message


class FakeTestProvider(LLMProvider):
    def __init__(self, name: str, available: bool = True, output: str = "ok", should_fail: bool = False):
        self._name = name
        self._available = available
        self._output = output
        self._should_fail = should_fail
        self.call_count = 0

    @property
    def name(self) -> str:
        return self._name

    def is_available(self) -> bool:
        return self._available

    def generate(self, prompt: str, system_instruction=None, history=None, language="ta"):
        self.call_count += 1
        if self._should_fail:
            raise RuntimeError(f"{self._name} simulated failure")
        return self._output


# -------------------------------------------------------------------------
# 1. Provider availability and isolation
# -------------------------------------------------------------------------

def test_gemini_provider_availability(monkeypatch):
    """Verify GeminiProvider availability tracks GEMINI_API_KEY."""
    provider = GeminiProvider()
    monkeypatch.setattr(Config, "GEMINI_API_KEY", "")
    assert provider.is_available() is False

    monkeypatch.setattr(Config, "GEMINI_API_KEY", "valid_key_123")
    assert provider.is_available() is True


def test_claude_provider_availability(monkeypatch):
    """Verify ClaudeProvider availability tracks ANTHROPIC_API_KEY."""
    provider = ClaudeProvider()
    monkeypatch.setattr(Config, "ANTHROPIC_API_KEY", "")
    assert provider.is_available() is False

    monkeypatch.setattr(Config, "ANTHROPIC_API_KEY", "sk-ant-testkey")
    assert provider.is_available() is True


def test_grok_provider_availability(monkeypatch):
    """Verify GrokProvider availability tracks XAI_API_KEY."""
    provider = GrokProvider()
    monkeypatch.setattr(Config, "XAI_API_KEY", "")
    assert provider.is_available() is False

    monkeypatch.setattr(Config, "XAI_API_KEY", "xai-testkey")
    assert provider.is_available() is True


# -------------------------------------------------------------------------
# 2. Mocked Claude & Grok API generation
# -------------------------------------------------------------------------

def test_claude_provider_generate_with_mocked_requests(monkeypatch):
    """Verify ClaudeProvider formats Anthropic request and parses message response."""
    monkeypatch.setattr(Config, "ANTHROPIC_API_KEY", "sk-ant-test")
    provider = ClaudeProvider()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "content": [{"type": "text", "text": "Claude diabetes guidance."}]
    }

    with patch("requests.post", return_value=mock_resp) as mock_post:
        result = provider.generate("What is insulin?", language="en")
        assert result == "Claude diabetes guidance."
        assert mock_post.called
        kwargs = mock_post.call_args[1]
        assert kwargs["headers"]["x-api-key"] == "sk-ant-test"
        assert kwargs["json"]["messages"][-1]["content"] == "What is insulin?"


def test_grok_provider_generate_with_mocked_requests(monkeypatch):
    """Verify GrokProvider formats OpenAI-compatible request and parses response."""
    monkeypatch.setattr(Config, "XAI_API_KEY", "xai-test-key")
    provider = GrokProvider()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Grok diabetes awareness."}}]
    }

    with patch("requests.post", return_value=mock_resp) as mock_post:
        result = provider.generate("Explain glucose.", language="en")
        assert result == "Grok diabetes awareness."
        assert mock_post.called
        kwargs = mock_post.call_args[1]
        assert "Bearer xai-test-key" in kwargs["headers"]["Authorization"]


# -------------------------------------------------------------------------
# 3. Only ONE provider is called when primary succeeds
# -------------------------------------------------------------------------

def test_only_primary_provider_called_when_successful(monkeypatch):
    """Verify that when primary succeeds, no other providers are ever called."""
    monkeypatch.setattr(Config, "PRIMARY_LLM", "gemini")

    fake_gemini = FakeTestProvider("gemini", available=True, output="Gemini reply")
    fake_claude = FakeTestProvider("claude", available=True, output="Claude reply")
    fake_grok = FakeTestProvider("grok", available=True, output="Grok reply")

    custom_map = {
        "gemini": fake_gemini,
        "claude": fake_claude,
        "grok": fake_grok
    }

    result = dispatch_llm_request(
        prompt="Test question",
        custom_provider_map=custom_map
    )

    assert result == "Gemini reply"
    assert fake_gemini.call_count == 1
    assert fake_claude.call_count == 0  # Must never call secondary
    assert fake_grok.call_count == 0    # Must never call tertiary


# -------------------------------------------------------------------------
# 4. Fallback order when primary fails: Gemini -> Claude -> Grok
# -------------------------------------------------------------------------

def test_fallback_to_claude_when_gemini_fails(monkeypatch):
    """Verify fallback executes in order (Gemini fails -> Claude succeeds)."""
    monkeypatch.setattr(Config, "PRIMARY_LLM", "gemini")

    fake_gemini = FakeTestProvider("gemini", available=True, should_fail=True)
    fake_claude = FakeTestProvider("claude", available=True, output="Claude fallback reply")
    fake_grok = FakeTestProvider("grok", available=True, output="Grok reply")

    custom_map = {
        "gemini": fake_gemini,
        "claude": fake_claude,
        "grok": fake_grok
    }

    result = dispatch_llm_request(
        prompt="Test question",
        custom_provider_map=custom_map
    )

    assert result == "Claude fallback reply"
    assert fake_gemini.call_count == 1
    assert fake_claude.call_count == 1
    assert fake_grok.call_count == 0  # Claude succeeded, so Grok not called


def test_fallback_to_grok_when_gemini_and_claude_fail(monkeypatch):
    """Verify fallback cascades to Grok when both Gemini and Claude fail."""
    monkeypatch.setattr(Config, "PRIMARY_LLM", "gemini")

    fake_gemini = FakeTestProvider("gemini", available=True, should_fail=True)
    fake_claude = FakeTestProvider("claude", available=True, should_fail=True)
    fake_grok = FakeTestProvider("grok", available=True, output="Grok final fallback")

    custom_map = {
        "gemini": fake_gemini,
        "claude": fake_claude,
        "grok": fake_grok
    }

    result = dispatch_llm_request(
        prompt="Test question",
        custom_provider_map=custom_map
    )

    assert result == "Grok final fallback"
    assert fake_gemini.call_count == 1
    assert fake_claude.call_count == 1
    assert fake_grok.call_count == 1


def test_provider_without_key_is_skipped(monkeypatch):
    """Verify providers without configured API keys are skipped without calling."""
    monkeypatch.setattr(Config, "PRIMARY_LLM", "gemini")

    fake_gemini = FakeTestProvider("gemini", available=True, should_fail=True)
    # Claude key missing
    fake_claude = FakeTestProvider("claude", available=False, output="Claude")
    # Grok key present
    fake_grok = FakeTestProvider("grok", available=True, output="Grok fallback")

    custom_map = {
        "gemini": fake_gemini,
        "claude": fake_claude,
        "grok": fake_grok
    }

    result = dispatch_llm_request(
        prompt="Test question",
        custom_provider_map=custom_map
    )

    assert result == "Grok fallback"
    assert fake_gemini.call_count == 1
    assert fake_claude.call_count == 0  # Skipped because is_available() is False
    assert fake_grok.call_count == 1


def test_safe_friendly_error_when_all_providers_unavailable(monkeypatch):
    """Verify safe friendly error returned if none of the providers are available."""
    fake_gemini = FakeTestProvider("gemini", available=False)
    fake_claude = FakeTestProvider("claude", available=False)
    fake_grok = FakeTestProvider("grok", available=False)

    custom_map = {
        "gemini": fake_gemini,
        "claude": fake_claude,
        "grok": fake_grok
    }

    result = dispatch_llm_request(
        prompt="Test question",
        custom_provider_map=custom_map
    )
    assert result is None


# -------------------------------------------------------------------------
# 5. Security & Configuration Checks (.env.example & .gitignore)
# -------------------------------------------------------------------------

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

def test_env_is_in_gitignore():
    """Verify .env is tracked in .gitignore to prevent secret leakage."""
    with open(os.path.join(REPO_ROOT, ".gitignore"), "r", encoding="utf-8") as f:
        gitignore_content = f.read()

    lines = [line.strip() for line in gitignore_content.splitlines()]
    assert ".env" in lines or any(line == ".env" for line in lines)


def test_env_example_has_empty_values_and_no_secrets():
    """Verify .env.example contains empty values for API keys and zero real secrets."""
    with open(os.path.join(BACKEND_DIR, ".env.example"), "r", encoding="utf-8") as f:
        content = f.read()

    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "API_KEY" in line:
            key, val = line.split("=", 1)
            # Must be empty or non-secret placeholder
            assert val.strip() == "", f"Secret API key value found in .env.example: {line}"
