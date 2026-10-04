from flask import Blueprint, jsonify

# Create a Blueprint for health-related routes
health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend status."""
    return jsonify({
        "status": "healthy",
        "service": "Tamil Voice Diabetes Assistant Backend",
        "version": "1.0.0"
    }), 200
