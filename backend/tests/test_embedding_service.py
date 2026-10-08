import os
import math
import json
import pytest
from app.services.knowledge_base import KnowledgeChunk
from app.services.embedding_service import (
    VectorStore,
    cosine_similarity,
    get_embedding
)
from scripts.build_index import build_knowledge_index
from app.config import Config


def make_fake_embed_fn(dim: int = 8):
    """
    Returns a deterministic fake embedding function for unit tests.
    Encodes presence of specific keywords into vector dimensions.
    """
    keywords = ["glucose", "insulin", "diet", "food", "exercise", "walk", "sleep", "pressure"]

    def _fake_embed(text: str):
        if not text:
            return None
        text_lower = text.lower()
        vec = []
        for kw in keywords[:dim]:
            vec.append(1.0 if kw in text_lower else 0.05)
        # Normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec]

    return _fake_embed


def test_cosine_similarity_math():
    """Verify cosine similarity mathematical properties."""
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    v4 = [-1.0, 0.0, 0.0]

    assert pytest.approx(cosine_similarity(v1, v2), 0.001) == 1.0
    assert pytest.approx(cosine_similarity(v1, v3), 0.001) == 0.0
    assert pytest.approx(cosine_similarity(v1, v4), 0.001) == -1.0
    assert cosine_similarity([], [1.0]) == 0.0
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_vector_store_add_chunks_and_search_top_k(tmp_path):
    """Verify adding chunks, fake embedding, and top-k search with ranking."""
    fake_embed = make_fake_embed_fn(8)
    index_file = str(tmp_path / "test_index.json")
    store = VectorStore(index_path=index_file)

    chunk_diet = KnowledgeChunk(
        chunk_id="chunk_diet_01",
        doc_id="doc_diet",
        chunk_index=1,
        total_chunks=1,
        content="Healthy eating and diet involves fiber-rich food vegetables.",
        content_hash="hash_diet",
        word_count=8,
        source="Test Source",
        source_type="guideline",
        title="Diet Overview",
        url="https://example.org/diet",
        publication_date="2024-01-01",
        retrieved_at="2026-10-05",
        topic="healthy eating",
        language="en",
        authority_level=1
    )

    chunk_exercise = KnowledgeChunk(
        chunk_id="chunk_exercise_01",
        doc_id="doc_exercise",
        chunk_index=1,
        total_chunks=1,
        content="Daily walk and physical exercise helps reduce blood glucose.",
        content_hash="hash_exercise",
        word_count=9,
        source="Test Source",
        source_type="guideline",
        title="Exercise Overview",
        url="https://example.org/exercise",
        publication_date="2024-01-01",
        retrieved_at="2026-10-05",
        topic="activity",
        language="en",
        authority_level=1
    )

    store.add_chunks([chunk_diet, chunk_exercise], embed_fn=fake_embed)
    assert store.count() == 2

    # Query matching diet/food
    results = store.search("Tell me about diet and food", k=2, embed_fn=fake_embed)
    assert len(results) == 2
    assert results[0]["chunk"]["chunk_id"] == "chunk_diet_01"
    assert results[0]["score"] > results[1]["score"]

    # Query matching exercise/walk
    results_ex = store.search("How much walk and exercise should I do?", k=1, embed_fn=fake_embed)
    assert len(results_ex) == 1
    assert results_ex[0]["chunk"]["chunk_id"] == "chunk_exercise_01"


def test_vector_store_persistence_save_and_load(tmp_path):
    """Verify vector index saves to disk and reloads accurately."""
    fake_embed = make_fake_embed_fn(8)
    index_file = str(tmp_path / "persist_index.json")

    store1 = VectorStore(index_path=index_file)
    chunk = KnowledgeChunk(
        chunk_id="chunk_persist_01",
        doc_id="doc_p",
        chunk_index=1,
        total_chunks=1,
        content="Insulin and glucose regulation guidelines.",
        content_hash="hash_p",
        word_count=5,
        source="Source P",
        source_type="sheet",
        title="Persist Title",
        url="https://example.org/p",
        publication_date="2024-01-01",
        retrieved_at="2026-10-05",
        topic="basics",
        language="en",
        authority_level=1
    )
    store1.add_chunks([chunk], embed_fn=fake_embed)
    assert store1.save() is True
    assert os.path.exists(index_file)

    # Load in new VectorStore instance
    store2 = VectorStore(index_path=index_file)
    assert store2.count() == 1
    assert store2.entries[0]["chunk_id"] == "chunk_persist_01"
    assert len(store2.entries[0]["vector"]) == 8


def test_vector_store_topic_and_language_filtering(tmp_path):
    """Verify search filtering by topic and language."""
    fake_embed = make_fake_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "filter_index.json"))

    chunk_en = KnowledgeChunk(
        chunk_id="c_en",
        doc_id="d1",
        chunk_index=1,
        total_chunks=1,
        content="Glucose diet guide in English.",
        content_hash="h1",
        word_count=5,
        source="S1",
        source_type="t",
        title="T1",
        url="",
        publication_date="",
        retrieved_at="",
        topic="basics",
        language="en",
        authority_level=1
    )

    chunk_ta = KnowledgeChunk(
        chunk_id="c_ta",
        doc_id="d2",
        chunk_index=1,
        total_chunks=1,
        content="சர்க்கரை உணவு வழிகாட்டி தமிழ்.",
        content_hash="h2",
        word_count=4,
        source="S2",
        source_type="t",
        title="T2",
        url="",
        publication_date="",
        retrieved_at="",
        topic="basics",
        language="ta",
        authority_level=1
    )

    store.add_chunks([chunk_en, chunk_ta], embed_fn=fake_embed)

    # Filter language = ta
    res_ta = store.search("glucose diet", k=5, embed_fn=fake_embed, language_filter="ta")
    assert len(res_ta) == 1
    assert res_ta[0]["chunk"]["language"] == "ta"

    # Filter topic = other
    res_other = store.search("glucose diet", k=5, embed_fn=fake_embed, topic_filter="non_existent")
    assert len(res_other) == 0

    # Filter source = S1 (using source parameter)
    res_s1 = store.search("glucose diet", k=5, embed_fn=fake_embed, source="S1")
    assert len(res_s1) == 1
    assert res_s1[0]["chunk"]["source"] == "S1"

    # Filter source_filter = S2 (using source_filter parameter)
    res_s2 = store.search("glucose diet", k=5, embed_fn=fake_embed, source_filter="S2")
    assert len(res_s2) == 1
    assert res_s2[0]["chunk"]["source"] == "S2"


def test_missing_api_key_handled_without_crashing(monkeypatch, tmp_path):
    """Verify that a missing or unconfigured API key returns None / empty results without raising unhandled exceptions."""
    monkeypatch.setattr(Config, "GEMINI_API_KEY", "")

    # get_embedding should return None without crashing
    vec = get_embedding("test message without api key")
    assert vec is None

    store = VectorStore(index_path=str(tmp_path / "empty_key_index.json"))
    # Searching without an embed_fn should return empty list gracefully
    res = store.search("query text")
    assert res == []

    # Manual build script handles missing key gracefully
    success = build_knowledge_index()
    assert success is False
