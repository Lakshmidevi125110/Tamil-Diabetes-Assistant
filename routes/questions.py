import os
import json
import logging
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

questions_bp = Blueprint("questions", __name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "suggested_questions.json")

def load_questions_pool():
    """Loads questions from data/suggested_questions.json."""
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to load suggested_questions.json: %s", str(e))
        return []

@questions_bp.route("/questions/suggested", methods=["GET"])
@questions_bp.route("/questions", methods=["GET"])
def get_suggested_questions():
    """
    Returns suggested educational questions pool.
    Query parameters:
    - topic: (optional) filter questions by specific topic name
    - exclude: (optional) comma-separated string of question IDs to exclude
    - limit: (optional) integer to limit the returned questions
    """
    pool = load_questions_pool()
    if not pool:
        return jsonify({
            "status": "error",
            "message": "Question pool could not be loaded."
        }), 500

    topic_filter = request.args.get("topic", "").strip().lower()
    exclude_param = request.args.get("exclude", "").strip()
    limit_param = request.args.get("limit", "").strip()

    exclude_ids = {qid.strip() for qid in exclude_param.split(",") if qid.strip()}

    filtered = pool

    if exclude_ids:
        filtered = [q for q in filtered if q.get("id") not in exclude_ids]

    if topic_filter:
        topic_matches = [q for q in filtered if q.get("topic", "").lower() == topic_filter]
        if topic_matches:
            filtered = topic_matches

    if limit_param.isdigit():
        limit_val = int(limit_param)
        filtered = filtered[:limit_val]

    return jsonify({
        "status": "success",
        "count": len(filtered),
        "questions": filtered
    }), 200
