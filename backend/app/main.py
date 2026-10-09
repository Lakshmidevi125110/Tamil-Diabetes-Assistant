import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import Config
from app.routers.health import router as health_router
from app.routers.chat import router as chat_router
from app.routers.tts import router as tts_router
from app.routers.glucose import router as glucose_router
from app.routers.questions import router as questions_router

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("TamilDiabetesAssistant")

ERROR_MESSAGES = {
    400: "Bad request. Please verify your input.",
    404: "Endpoint not found. Please check the URL.",
    405: "Method not allowed on this endpoint.",
    413: "Request payload too large. Maximum allowed size is 1MB.",
    500: "An internal server error occurred.",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up vector store index on startup for sub-second responses
    try:
        from app.services.embedding_service import get_vector_store
        get_vector_store()
    except Exception as e:
        logger.warning("Vector store startup warmup notice: %s", str(e))
    yield


def create_app() -> FastAPI:
    """Application factory: initializes and configures the FastAPI app."""
    app = FastAPI(
        title="Tamil Voice Diabetes Assistant API",
        version="1.0.0",
        debug=Config.DEBUG,
        lifespan=lifespan,
    )

    # Cross-Origin Resource Sharing: only the configured frontend origins may call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=Config.CORS_ORIGINS,
        allow_origin_regex=Config.CORS_ORIGIN_REGEX,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    # Register routers
    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(tts_router)
    app.include_router(glucose_router)
    app.include_router(questions_router)

    @app.get("/")
    def home():
        return {
            "message": "Welcome to Tamil Voice Diabetes Assistant API",
            "docs": {
                "health": "GET /health",
                "chat": "POST /chat",
                "openapi": "GET /docs"
            }
        }

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        return Response(status_code=204)

    # Reject oversized payloads before they are read (1MB limit)
    @app.middleware("http")
    async def limit_payload_size(request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and content_length.isdigit() and int(content_length) > Config.MAX_CONTENT_LENGTH:
            return JSONResponse({"error": ERROR_MESSAGES[413]}, status_code=413)
        return await call_next(request)

    # Security Headers Middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # Global Error Handlers: always respond with {"error": "..."}
    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        message = ERROR_MESSAGES.get(exc.status_code, str(exc.detail))
        return JSONResponse({"error": message}, status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception):
        logger.error("Internal Server Error: %s", exc, exc_info=True)
        return JSONResponse({"error": ERROR_MESSAGES[500]}, status_code=500)

    return app


# Instantiate application
app = create_app()

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Tamil Voice Diabetes Assistant on 0.0.0.0:%d (debug=%s)...", Config.PORT, Config.DEBUG)
    uvicorn.run("app.main:app", host="0.0.0.0", port=Config.PORT, reload=Config.DEBUG)
