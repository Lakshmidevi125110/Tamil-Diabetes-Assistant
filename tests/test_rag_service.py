import math
import pytest
from services.knowledge_base import KnowledgeChunk
from services.embedding_service import VectorStore
from services.rag_service import (
    rerank_chunks,
    format_sources_list,
    generate_rag_response,
    validate_tone,
    clear_rag_cache,
    RELEVANCE_THRESHOLD,
    SAFE_INSUFFICIENT_INFO_EN,
    SAFE_INSUFFICIENT_INFO_TA
)


def make_test_embed_fn(dim: int = 8):
    """Deterministic embedding function for unit tests."""
    keywords = ["glucose", "insulin", "diet", "food", "exercise", "walk", "sleep", "pressure"]

    def _embed(text: str):
        if not text:
            return None
        text_lower = text.lower()
        vec = [1.0 if kw in text_lower else 0.0 for kw in keywords[:dim]]
        norm = math.sqrt(sum(x * x for x in vec))
        if norm == 0.0:
            return [0.0] * dim
        return [x / norm for x in vec]

    return _embed


@pytest.fixture(autouse=True)
def clean_cache_before_each_test():
    """Ensure RAG query cache is clear before every test."""
    clear_rag_cache()
    yield
    clear_rag_cache()


def test_rerank_chunks_relevance_first_and_authority_boost():
    """Verify relevance-first filtering and authority/recency boosts."""
    # Chunk 1: Highly relevant, authority level 3 (score 0.70)
    c1 = {
        "score": 0.70,
        "chunk": {
            "title": "Supplementary Food Notes",
            "source": "Health Blog",
            "authority_level": 3,
            "publication_date": "2018-05-01"
        }
    }
    # Chunk 2: Moderately relevant (0.65), but authority 1 (+0.08) and 2024 recent (+0.03) -> 0.76
    c2 = {
        "score": 0.65,
        "chunk": {
            "title": "Clinical Nutrition Guidelines",
            "source": "World Health Organization",
            "authority_level": 1,
            "publication_date": "2024-01-15"
        }
    }
    # Chunk 3: Irrelevant (0.30), authority 1 -> MUST BE REJECTED because below threshold
    c3 = {
        "score": 0.30,
        "chunk": {
            "title": "Unrelated Pediatric Report",
            "source": "World Health Organization",
            "authority_level": 1,
            "publication_date": "2024-02-01"
        }
    }

    reranked = rerank_chunks([c1, c2, c3], threshold=0.45, top_k=2)

    # c3 must be rejected (never force an irrelevant authoritative source)
    assert len(reranked) == 2
    assert all(item["chunk"]["title"] != "Unrelated Pediatric Report" for item in reranked)

    # c2 must be ranked first due to authority and recency boost
    assert reranked[0]["chunk"]["title"] == "Clinical Nutrition Guidelines"
    assert reranked[0]["composite_score"] > reranked[1]["composite_score"]


def test_rag_response_with_relevant_context_and_sources(tmp_path):
    """Verify full RAG pipeline when relevant sources are retrieved."""
    fake_embed = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "rag_index.json"))

    chunk = KnowledgeChunk(
        chunk_id="who_diet_chunk",
        doc_id="who_diet",
        chunk_index=1,
        total_chunks=1,
        content="Healthy diet for blood glucose management emphasizes dietary fiber from vegetables.",
        content_hash="h_who",
        word_count=10,
        source="World Health Organization",
        source_type="guideline",
        title="WHO Diabetes Dietary Guidance",
        url="https://who.int/diabetes/diet",
        publication_date="2023-06-01",
        retrieved_at="2026-10-05",
        topic="healthy eating",
        language="en",
        authority_level=1
    )
    store.add_chunks([chunk], embed_fn=fake_embed)

    def dummy_llm(prompt: str, language: str) -> str:
        assert "WHO Diabetes Dietary Guidance" in prompt
        return "According to verified guidance, dietary fiber helps support healthy blood glucose."

    result = generate_rag_response(
        user_message="Tell me about diet and food for glucose",
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed,
        custom_llm_fn=dummy_llm
    )

    assert result["status"] == "success"
    assert result["rag_applied"] is True
    assert "dietary fiber" in result["reply"]
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "World Health Organization"
    assert result["sources"][0]["url"] == "https://who.int/diabetes/diet"


def test_rag_insufficient_info_safe_refusal(tmp_path):
    """Verify that when no chunks meet the relevance threshold, a safe refusal is returned."""
    fake_embed = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "low_sim_index.json"))

    # Add chunk completely unrelated to query
    chunk = KnowledgeChunk(
        chunk_id="chunk_unrelated",
        doc_id="doc_u",
        chunk_index=1,
        total_chunks=1,
        content="Sleep and insomnia patterns throughout night cycles.",
        content_hash="h_u",
        word_count=7,
        source="Sleep Society",
        source_type="article",
        title="Sleep Habits",
        url="",
        publication_date="2021-01-01",
        retrieved_at="2026-10-05",
        topic="sleep",
        language="en",
        authority_level=3
    )
    store.add_chunks([chunk], embed_fn=fake_embed)

    # Query with low similarity
    result = generate_rag_response(
        user_message="Tell me about complicated cardiac surgical stent bypass",
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed
    )

    assert result["status"] == "insufficient_info"
    assert result["rag_applied"] is False
    assert SAFE_INSUFFICIENT_INFO_EN in result["reply"]
    assert result["sources"] == []


def test_rag_query_caching(tmp_path):
    """Verify that repeated queries hit the cache without re-invoking search or LLM."""
    fake_embed = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "cache_index.json"))
    chunk = KnowledgeChunk(
        chunk_id="c_c",
        doc_id="d_c",
        chunk_index=1,
        total_chunks=1,
        content="Exercise and walk helps lower glucose.",
        content_hash="h_c",
        word_count=6,
        source="ADA",
        source_type="report",
        title="Activity Guidelines",
        url="",
        publication_date="2023-01-01",
        retrieved_at="2026-10-05",
        topic="activity",
        language="en",
        authority_level=2
    )
    store.add_chunks([chunk], embed_fn=fake_embed)

    call_count = 0

    def counting_llm(prompt: str, lang: str) -> str:
        nonlocal call_count
        call_count += 1
        return "Regular physical activity supports glucose control."

    # First call -> hits LLM
    res1 = generate_rag_response("daily exercise walk", language="en", vector_store=store, custom_embed_fn=fake_embed, custom_llm_fn=counting_llm)
    assert call_count == 1
    assert res1["rag_applied"] is True

    # Second call -> must return from cache without calling LLM again
    res2 = generate_rag_response("daily exercise walk", language="en", vector_store=store, custom_embed_fn=fake_embed, custom_llm_fn=counting_llm)
    assert call_count == 1
    assert res1["reply"] == res2["reply"]


def test_tone_validator_softens_judgmental_words():
    """Verify that validate_tone removes 'dangerous', 'uncontrolled', 'you must', 'very bad'."""
    harsh_en = "Your sugar is dangerous and uncontrolled. You must stop eating and you need to exercise. This is very bad."
    softened_en = validate_tone(harsh_en, language="en")
    assert "dangerous" not in softened_en.lower()
    assert "uncontrolled" not in softened_en.lower()
    assert "you must" not in softened_en.lower()
    assert "you need to" not in softened_en.lower()
    assert "very bad" not in softened_en.lower()

    harsh_ta = "இது மிகவும் ஆபத்தானது. நீங்கள் கண்டிப்பாக செய்ய வேண்டும்."
    softened_ta = validate_tone(harsh_ta, language="ta")
    assert "ஆபத்தானது" not in softened_ta
    assert "கண்டிப்பாக செய்ய வேண்டும்" not in softened_ta


def test_chat_route_integration_returns_sources(client, monkeypatch):
    """Verify that POST /chat endpoint returns sources and rag_applied metadata."""
    import routes.chat as chat_module

    def mock_rag_response(*args, **kwargs):
        return {
            "status": "success",
            "reply": "Normal fasting blood sugar is typically 70 to 99 mg/dL.",
            "sources": [{"title": "WHO Diabetes Guidelines", "source": "WHO", "url": "https://who.int"}],
            "rag_applied": True
        }

    monkeypatch.setattr(chat_module, "generate_rag_response", mock_rag_response)

    payload = {
        "message": "What is normal fasting blood sugar?",
        "language": "en"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert "reply" in data
    assert "sources" in data
    assert len(data["sources"]) == 1
    assert data["sources"][0]["source"] == "WHO"
    assert data.get("rag_applied") is True
