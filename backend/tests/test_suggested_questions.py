import json
import os
import pytest

QUESTIONS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "suggested_questions.json")

REQUIRED_TOPICS = [
    "basics", "type 1", "type 2", "gestational", "glucose", "fasting",
    "post-meal", "HbA1c", "hypoglycemia awareness", "hyperglycemia awareness",
    "healthy eating", "carbohydrates", "fiber", "hydration", "activity",
    "sleep", "stress", "foot care", "eye health", "kidney health",
    "blood pressure", "cholesterol", "doctor visits", "glucose tracking",
    "myths", "when to seek help"
]


def test_suggested_questions_json_file_exists_and_loads():
    """Verify that data/suggested_questions.json exists and contains valid JSON."""
    assert os.path.exists(QUESTIONS_PATH), "data/suggested_questions.json file does not exist."
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list), "suggested_questions.json root must be a list."
    assert len(data) >= 60, f"Expected at least 60 questions, found {len(data)}."


def test_suggested_questions_have_unique_ids():
    """Verify that every question has a unique, non-empty ID."""
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    ids = [q.get("id") for q in data]
    assert all(isinstance(qid, str) and qid.strip() for qid in ids), "All questions must have a non-empty string ID."
    assert len(ids) == len(set(ids)), f"Duplicate IDs detected in question pool! Unique: {len(set(ids))}, Total: {len(ids)}"


def test_suggested_questions_have_both_languages_and_valid_structure():
    """Verify that every question contains topic, English text, and Tamil text."""
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        qid = item.get("id", "UNKNOWN")
        assert "topic" in item and isinstance(item["topic"], str) and item["topic"].strip(), f"{qid} missing topic"
        assert "en" in item and isinstance(item["en"], str) and item["en"].strip(), f"{qid} missing English text"
        assert "ta" in item and isinstance(item["ta"], str) and item["ta"].strip(), f"{qid} missing Tamil text"


def test_all_required_topics_covered():
    """Verify that every requested educational topic is covered in the pool."""
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    present_topics = {q.get("topic") for q in data}
    for topic in REQUIRED_TOPICS:
        assert topic in present_topics, f"Required topic '{topic}' is missing from suggested_questions.json."


def test_no_diagnostic_or_medication_dosage_questions():
    """Verify that no questions contain medical prescriptions, dosages, or diagnostic claims."""
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    forbidden_keywords = [
        "prescribe", "units of insulin", "increase insulin", "decrease insulin",
        "stop taking", "stop medication", "diagnose me", "am i diagnosed"
    ]

    for item in data:
        en_text = item.get("en", "").lower()
        for kw in forbidden_keywords:
            assert kw not in en_text, f"Question {item.get('id')} contains forbidden phrase '{kw}'"


def test_get_suggested_questions_endpoint(client):
    """Verify GET /questions/suggested returns questions array with count."""
    response = client.get("/questions/suggested")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["count"] >= 60
    assert isinstance(data["questions"], list)


def test_get_suggested_questions_filtering(client):
    """Verify GET /questions/suggested filtering by topic and exclude."""
    response = client.get("/questions/suggested?topic=basics&exclude=basics_01")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert all(q["topic"] == "basics" for q in data["questions"])
    assert all(q["id"] != "basics_01" for q in data["questions"])

