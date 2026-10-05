import logging
from flask import Flask, jsonify, render_template
from flask_cors import CORS
from config import Config
from routes.health import health_bp
from routes.chat import chat_bp
from routes.tts import tts_bp
from routes.glucose import glucose_bp
from routes.questions import questions_bp

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("TamilDiabetesAssistant")

def create_app():
    """Application factory: initializes and configures the Flask app."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable Cross-Origin Resource Sharing (CORS)
    CORS(app)

    # Register blueprints (routes)
    app.register_blueprint(health_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(tts_bp)
    app.register_blueprint(glucose_bp)
    app.register_blueprint(questions_bp)

    # Default Home route
    @app.route("/", methods=["GET"])
    def home():
        try:
            return render_template("index.html")
        except Exception:
            return jsonify({
                "message": "Welcome to Tamil Voice Diabetes Assistant API",
                "docs": {
                    "health": "GET /health",
                    "chat": "POST /chat"
                }
            }), 200

    # Favicon route
    @app.route("/favicon.ico", methods=["GET"])
    def favicon():
        return "", 204

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request. Please verify your input."}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found. Please check the URL."}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed on this endpoint."}), 405

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"error": "Request payload too large. Maximum allowed size is 1MB."}), 413

    @app.errorhandler(500)
    def internal_error(error):
        logger.error("Internal Server Error: %s", error)
        return jsonify({"error": "An internal server error occurred."}), 500

    # Security Headers Middleware
    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    return app

# Instantiate application
app = create_app()

if __name__ == "__main__":
    logger.info("Starting Tamil Voice Diabetes Assistant on port %d...", Config.PORT)
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
