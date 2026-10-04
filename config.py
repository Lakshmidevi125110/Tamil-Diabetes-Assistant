import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Config:
    """Application configuration settings."""
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    # Gemini AI configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Text-to-Speech voices
    TAMIL_VOICE = "ta-IN-PallaviNeural"
    ENGLISH_VOICE = "en-IN-NeerjaNeural"
