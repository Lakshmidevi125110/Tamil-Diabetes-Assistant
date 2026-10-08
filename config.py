import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Config:
    """Application configuration settings."""
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    
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
    ALLOWED_KNOWLEDGE_SOURCES = [
        s.strip()
        for s in os.getenv("ALLOWED_KNOWLEDGE_SOURCES", "WHO,ICMR,MoHFW,CDC").split(",")
        if s.strip()
    ]
    ALLOWED_SOURCES = ALLOWED_KNOWLEDGE_SOURCES
