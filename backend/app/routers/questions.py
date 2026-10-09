import os
import json
import logging
from fastapi import APIRouter
from app.config import DATA_DIR
from app.routers.utils import json_response

logger = logging.getLogger(__name__)

router = APIRouter()

DATA_PATH = os.path.join(DATA_DIR, "suggested_questions.json")


def load_questions_pool():
    """Loads questions from data/suggested_questions.json."""
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to load suggested_questions.json: %s", str(e))
        return []


@router.get("/questions/suggested")
@router.get("/questions")
def get_suggested_questions(topic: str = "", exclude: str = "", limit: str = ""):
    """
    Returns suggested educational questions pool.
    Query parameters:
    - topic: (optional) filter questions by specific topic name
    - exclude: (optional) comma-separated string of question IDs to exclude
    - limit: (optional) integer to limit the returned questions
    """
    pool = load_questions_pool()
    if not pool:
        return json_response({
            "status": "error",
            "message": "Question pool could not be loaded."
        }, 500)

    topic_filter = topic.strip().lower()
    limit_param = limit.strip()
    exclude_ids = {qid.strip() for qid in exclude.split(",") if qid.strip()}

    filtered = pool

    if exclude_ids:
        filtered = [q for q in filtered if q.get("id") not in exclude_ids]

    if topic_filter:
        topic_matches = [q for q in filtered if q.get("topic", "").lower() == topic_filter]
        if topic_matches:
            filtered = topic_matches

    if limit_param.isdigit():
        filtered = filtered[:int(limit_param)]

    return {
        "status": "success",
        "count": len(filtered),
        "questions": filtered
    }
