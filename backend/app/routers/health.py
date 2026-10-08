from fastapi import APIRouter

# Router for health-related routes
router = APIRouter()


@router.get("/health")
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": "Tamil Voice Diabetes Assistant Backend",
        "version": "1.0.0"
    }
