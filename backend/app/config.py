import os
from dotenv import load_dotenv

# Backend root (the directory containing app/, data/, scripts/, tests/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Load variables from backend/.env regardless of the current working directory
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _split_csv(value: str) -> list:
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    """Application configuration settings."""
    PORT = int(os.getenv("PORT", 8000))
    # Debug mode is OFF by default (supports DEBUG or legacy FLASK_DEBUG)
    DEBUG = os.getenv("DEBUG", os.getenv("FLASK_DEBUG", "False")).strip().lower() in ("true", "1", "yes")

    # Frontend origins allowed to call this API (comma-separated).
    # Add the Vercel deployment URL here in production.
    CORS_ORIGINS = _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
    # Optional regex for origins with changing URLs (Vercel preview deployments),
    # e.g. ^https://tamil-diabetes-assistant(-[a-z0-9-]+)?\.vercel\.app$
    CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None

    # PostgreSQL (Neon) connection string — not used yet, reserved for persistence
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # Gemini AI configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

    # Security & Request limits (1MB maximum payload)
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024

    # Text-to-Speech voices
    TAMIL_VOICE = "ta-IN-PallaviNeural"
    ENGLISH_VOICE = "en-IN-NeerjaNeural"

    # Vector RAG & Knowledge Base configurations
    VECTOR_STORE = os.getenv("VECTOR_STORE", "local_file").lower()
    EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "gemini").lower()
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", 3))
    RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", 0.45))

    # Multi-Provider LLM configuration
    PRIMARY_LLM = os.getenv("PRIMARY_LLM", "gemini").lower()
    SECONDARY_LLM = os.getenv("SECONDARY_LLM", "").lower()

    # Optional Third-Party Provider Keys
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
    XAI_API_KEY = os.getenv("XAI_API_KEY", "")
    GROK_MODEL = os.getenv("GROK_MODEL", "grok-beta")

    # Allowed medical knowledge sources (WHO, ICMR, MoHFW, CDC, or custom additions)
    ALLOWED_KNOWLEDGE_SOURCES = _split_csv(os.getenv("ALLOWED_KNOWLEDGE_SOURCES", "WHO,ICMR,MoHFW,CDC"))
    ALLOWED_SOURCES = ALLOWED_KNOWLEDGE_SOURCES
