import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import requests
from config import Config

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base class for all LLM providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier ('gemini', 'claude', 'grok')."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the provider has a valid, non-empty API key configured."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        language: str = "ta"
    ) -> Optional[str]:
        """Generates response text from the LLM provider."""
        pass


class GeminiProvider(LLMProvider):
    """Google Gemini AI Provider wrapping google-genai Client."""

    @property
    def name(self) -> str:
        return "gemini"

    def is_available(self) -> bool:
        key = (getattr(Config, "GEMINI_API_KEY", "") or "").strip()
        return bool(key and key not in ("your_gemini_api_key_here", "your_api_key_here"))

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        language: str = "ta"
    ) -> Optional[str]:
        if not self.is_available():
            logger.warning("GeminiProvider: API key is not configured.")
            return None

        from google import genai
        from google.genai import types

        try:
            client = genai.Client(api_key=Config.GEMINI_API_KEY)
        except Exception as e:
            logger.warning("GeminiProvider: Client initialization failed: %s", e)
            return None
        primary_model = getattr(Config, "GEMINI_MODEL", "gemini-flash-lite-latest") or "gemini-flash-lite-latest"
        candidate_models = [primary_model]
        for candidate in ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash"]:
            if candidate not in candidate_models:
                candidate_models.append(candidate)

        contents = []
        if history:
            for item in history:
                if isinstance(item, dict) and "text" in item and "role" in item:
                    role = "user" if item["role"] == "user" else "model"
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=item["text"])]
                    ))
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        ))

        config = None
        if system_instruction:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )

        for model in candidate_models:
            try:
                kwargs = {"model": model, "contents": contents}
                if config:
                    kwargs["config"] = config
                resp = client.models.generate_content(**kwargs)
                if resp and resp.text:
                    return resp.text.strip()
            except Exception as e:
                logger.warning(
                    f"GeminiProvider: Model '{model}' generation failed: {e}. Trying next candidate model if available."
                )

        logger.error("GeminiProvider: All candidate models failed to generate content.")
        return None


class ClaudeProvider(LLMProvider):
    """Anthropic Claude Provider using Anthropic Messages API."""

    @property
    def name(self) -> str:
        return "claude"

    def is_available(self) -> bool:
        key = getattr(Config, "ANTHROPIC_API_KEY", "")
        return bool(key and key.strip())

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        language: str = "ta"
    ) -> Optional[str]:
        if not self.is_available():
            logger.warning("ClaudeProvider: ANTHROPIC_API_KEY is not configured.")
            return None

        model_name = getattr(Config, "CLAUDE_MODEL", "claude-3-5-sonnet-20241022") or "claude-3-5-sonnet-20241022"

        messages = []
        if history:
            for item in history:
                if isinstance(item, dict) and "text" in item and "role" in item:
                    role = "user" if item["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": item["text"]})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "x-api-key": Config.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model_name,
            "max_tokens": 1024,
            "messages": messages
        }
        if system_instruction:
            payload["system"] = system_instruction

        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=payload,
            timeout=25
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Claude API returned status {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        content_blocks = data.get("content", [])
        text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")
        return text.strip() if text else None


class GrokProvider(LLMProvider):
    """xAI Grok Provider using xAI OpenAI-compatible Chat Completions API."""

    @property
    def name(self) -> str:
        return "grok"

    def is_available(self) -> bool:
        key = getattr(Config, "XAI_API_KEY", "")
        return bool(key and key.strip())

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        language: str = "ta"
    ) -> Optional[str]:
        if not self.is_available():
            logger.warning("GrokProvider: XAI_API_KEY is not configured.")
            return None

        model_name = getattr(Config, "GROK_MODEL", "grok-beta") or "grok-beta"

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        if history:
            for item in history:
                if isinstance(item, dict) and "text" in item and "role" in item:
                    role = "user" if item["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": item["text"]})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {Config.XAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.3
        }

        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=25
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Grok API returned status {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        choices = data.get("choices", [])
        if choices and "message" in choices[0]:
            content = choices[0]["message"].get("content", "")
            return content.strip() if content else None
        return None


# Provider Registry
PROVIDERS: Dict[str, LLMProvider] = {
    "gemini": GeminiProvider(),
    "claude": ClaudeProvider(),
    "grok": GrokProvider(),
}


def get_provider(name: str) -> Optional[LLMProvider]:
    """Retrieves provider instance by name."""
    return PROVIDERS.get(name.lower().strip())


def dispatch_llm_request(
    prompt: str,
    system_instruction: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
    language: str = "ta",
    custom_provider_map: Optional[Dict[str, LLMProvider]] = None
) -> Optional[str]:
    """
    Dispatches LLM generation with fallback:
    - Never calls more than one provider per question unless the primary fails.
    - Resolves primary provider from PRIMARY_LLM (default: gemini).
    - If primary provider fails or has no key, falls back in exact order:
      Gemini -> Claude -> Grok, calling only providers whose API keys exist.
    - If all available providers fail or none is available, returns None.
    """
    registry = custom_provider_map or PROVIDERS

    primary_name = getattr(Config, "PRIMARY_LLM", "gemini").lower().strip() or "gemini"
    secondary_name = getattr(Config, "SECONDARY_LLM", "").lower().strip()

    # Determine execution order: primary first, then remaining standard order (Gemini -> Claude -> Grok)
    ordered_names: List[str] = [primary_name]
    if secondary_name and secondary_name not in ordered_names:
        ordered_names.append(secondary_name)

    standard_order = ["gemini", "claude", "grok"]
    for name in standard_order:
        if name not in ordered_names:
            ordered_names.append(name)

    attempted_providers = []

    for name in ordered_names:
        provider = registry.get(name)
        if not provider or not provider.is_available():
            logger.info("Provider '%s' skipped (not configured or API key missing).", name)
            continue

        attempted_providers.append(name)
        try:
            logger.info("Attempting LLM generation via '%s' provider.", name)
            output = provider.generate(
                prompt=prompt,
                system_instruction=system_instruction,
                history=history,
                language=language
            )
            if output:
                logger.info("LLM generation succeeded via '%s'.", name)
                return output
        except Exception as e:
            logger.warning("Provider '%s' failed: %s. Falling back to next available provider.", name, str(e))
            continue

    logger.error("All available LLM providers failed or none configured. Attempted: %s", attempted_providers)
    return None
