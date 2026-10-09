import pytest
from unittest.mock import MagicMock
from app.services.guardrails import chat_limiter, tts_limiter, is_personal_query, get_rate_limit_message
from app.services.embedding_service import (
    embed,
    _EMBEDDING_CACHE,
    clear_embedding_cache,
    get_embedding_cache_size,
    VectorStore
)
from app.services.knowledge_base import KnowledgeChunk
from app.services.rag_service import (
    generate_rag_response,
    _QUERY_CACHE,
    clear_rag_cache,
    get_rag_cache_size
)


def test_rate_limiting_on_chat_blocks_excessive_requests(client):
    """Test that /chat rate limits after 15 requests and returns friendly message."""
    chat_limiter.reset()
    payload = {"message": "What is diabetes?", "language": "en"}

    for _ in range(15):
        # Using a mock or emergency query to avoid external LLM calls
        res = client.post("/chat", json={"message": "Help emergency chest pain", "language": "en"})
        assert res.status_code == 200

    # 16th request from same IP must be 429
    res_blocked = client.post("/chat", json=payload)
    assert res_blocked.status_code == 429
    data = res_blocked.json()
    assert "error" in data
    assert "Too many requests" in data["error"]
    assert "wait a minute" in data["error"]


def test_rate_limiting_on_chat_tamil_friendly_message(client):
    """Test that /chat rate limiting returns friendly Tamil message when language is ta."""
    chat_limiter.reset()
    for _ in range(15):
        client.post("/chat", json={"message": "நோயாளிக்கு மயக்கம்", "language": "ta"})

    res_blocked = client.post("/chat", json={"message": "உணவு முறை", "language": "ta"})
    assert res_blocked.status_code == 429
    data = res_blocked.json()
    assert "கோரிக்கைகள்" in data["error"]
    assert "காத்திருந்து" in data["error"]


def test_rate_limiting_on_rag_route_aliases(client):
    """Test that /rag and /rag/ask aliases are also rate-limited per IP."""
    chat_limiter.reset()
    for _ in range(15):
        res = client.post("/rag", json={"message": "Help emergency chest pain", "language": "en"})
        assert res.status_code == 200

    # 16th request to /rag is blocked
    res_blocked_rag = client.post("/rag", json={"message": "What is diabetes?", "language": "en"})
    assert res_blocked_rag.status_code == 429

    # /rag/ask is also blocked under same IP limiter
    res_blocked_ask = client.post("/rag/ask", json={"message": "What is diabetes?", "language": "en"})
    assert res_blocked_ask.status_code == 429


def test_rate_limiting_on_tts_route(client, monkeypatch):
    """Test that /tts enforces rate limiting with a friendly message."""
    tts_limiter.reset()
    # Mock speech synthesis so it doesn't need network
    monkeypatch.setattr("app.routers.tts.generate_speech_audio", lambda text, lang: b"FAKE_MP3_BYTES")

    for _ in range(25):
        res = client.post("/tts", json={"text": "வணக்கம்", "language": "ta"})
        assert res.status_code == 200

    # 26th request must be rejected with 429 and friendly notice
    res_blocked = client.post("/tts", json={"text": "வணக்கம்", "language": "en"})
    assert res_blocked.status_code == 429
    data = res_blocked.json()
    assert "error" in data
    assert "speech synthesis" in data["error"].lower() or "too many requests" in data["error"].lower()


def test_rate_limiting_isolated_per_ip(client):
    """Test that rate limiting is per-IP and one client does not block another."""
    chat_limiter.reset()

    # Exhaust limit for IP 1.1.1.1
    for _ in range(15):
        client.post("/chat",
                    headers={"X-Forwarded-For": "1.1.1.1"},
                    json={"message": "Help emergency chest pain", "language": "en"})

    blocked_ip1 = client.post("/chat",
                              headers={"X-Forwarded-For": "1.1.1.1"},
                              json={"message": "What is diabetes?", "language": "en"})
    assert blocked_ip1.status_code == 429

    # IP 2.2.2.2 must NOT be blocked
    allowed_ip2 = client.post("/chat",
                              headers={"X-Forwarded-For": "2.2.2.2"},
                              json={"message": "Help emergency chest pain", "language": "en"})
    assert allowed_ip2.status_code == 200


def test_embedding_caching_for_non_personal_educational_texts():
    """Test that embeddings of non-personal educational questions are cached."""
    clear_embedding_cache()
    call_counts = {"count": 0}

    def counting_embed_fn(text: str):
        call_counts["count"] += 1
        return [0.25, 0.5, 0.75, 1.0]

    # First call: computes embedding and caches it
    vec1 = embed("What is HbA1c test?", custom_embed_fn=counting_embed_fn)
    assert vec1 == [0.25, 0.5, 0.75, 1.0]
    assert call_counts["count"] == 1
    assert get_embedding_cache_size() == 1

    # Second call: hits cache, counting_embed_fn is NOT called again
    vec2 = embed("What is HbA1c test?", custom_embed_fn=counting_embed_fn)
    assert vec2 == vec1
    assert call_counts["count"] == 1  # Still 1, didn't recompute

    # Different educational question: computes and increments cache size
    vec3 = embed("Types of diabetes mellitus", custom_embed_fn=counting_embed_fn)
    assert call_counts["count"] == 2
    assert get_embedding_cache_size() == 2


def test_glucose_readings_and_personal_texts_never_cached_in_embeddings():
    """Test that personal queries and glucose readings are never cached in embedding cache."""
    clear_embedding_cache()
    call_counts = {"count": 0}

    def counting_embed_fn(text: str):
        call_counts["count"] += 1
        return [0.1, 0.2, 0.3, 0.4]

    personal_queries = [
        "My fasting sugar is 185 mg/dL today",
        "150 mg/dl",
        "glucose is 220",
        "என் சர்க்கரை அளவு 190",
        "என் சர்க்கரை 140",
        "I take 20 units of insulin",
        "Took 10 units of insulin"
    ]

    for q in personal_queries:
        assert is_personal_query(q) is True, f"Failed personal query check: {q}"

        # 1st embed call
        embed(q, custom_embed_fn=counting_embed_fn)
        # Must NEVER be in embedding cache
        assert get_embedding_cache_size() == 0, f"Personal query leaked into embedding cache: {q}"

        # 2nd embed call must invoke the embedder again because it was never cached
        prev_count = call_counts["count"]
        embed(q, custom_embed_fn=counting_embed_fn)
        assert call_counts["count"] == prev_count + 1, f"Personal query was unexpectedly cached: {q}"
        assert get_embedding_cache_size() == 0


def test_answers_cached_for_repeated_non_personal_educational_questions(tmp_path):
    """Test that repeated non-personal educational questions cache their answers."""
    clear_rag_cache()
    store = VectorStore(index_path=str(tmp_path / "cache_test_index.json"))

    chunk = KnowledgeChunk(
        chunk_id="chunk1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="HbA1c reflects average blood glucose over past 2 to 3 months.",
        content_hash="hash1", word_count=12, source="WHO", source_type="guideline",
        title="WHO Diabetes Guide", url="https://who.int/diabetes", publication_date="2023",
        retrieved_at="2026-01-01", topic="diagnosis", language="en", authority_level=1
    )
    fake_embed = lambda t: [0.1] * 8
    store.add_chunks([chunk], embed_fn=fake_embed)

    llm_calls = {"count": 0}

    def test_llm_fn(query, context, history, lang):
        llm_calls["count"] += 1
        return f"Educational answer for {query}: HbA1c measures 3-month sugar."

    question = "What is HbA1c test?"
    assert is_personal_query(question) is False

    # First call: executes RAG and invokes LLM
    res1 = generate_rag_response(
        user_message=question,
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed,
        custom_llm_fn=test_llm_fn
    )
    assert res1["status"] == "success"
    assert llm_calls["count"] == 1
    assert get_rag_cache_size() == 1

    # Second call: returns cached response without calling LLM
    res2 = generate_rag_response(
        user_message=question,
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed,
        custom_llm_fn=test_llm_fn
    )
    assert res2["status"] == "success"
    assert res2["reply"] == res1["reply"]
    assert llm_calls["count"] == 1  # Unchanged! LLM not invoked again


def test_glucose_readings_never_cached_in_rag_answers(tmp_path):
    """Test that glucose readings and personal metrics are never cached in RAG answers."""
    clear_rag_cache()
    store = VectorStore(index_path=str(tmp_path / "cache_test_index2.json"))

    chunk = KnowledgeChunk(
        chunk_id="chunk1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="Normal fasting glucose is typically 70 to 99 mg/dL.",
        content_hash="hash2", word_count=10, source="CDC", source_type="guideline",
        title="CDC Blood Sugar Guidelines", url="https://cdc.gov/diabetes", publication_date="2023",
        retrieved_at="2026-01-01", topic="glucose_management", language="en", authority_level=1
    )
    fake_embed = lambda t: [0.1] * 8
    store.add_chunks([chunk], embed_fn=fake_embed)

    llm_calls = {"count": 0}

    def test_llm_fn(query, context, history, lang):
        llm_calls["count"] += 1
        return f"Educational context for {query}."

    personal_queries = [
        "My fasting sugar is 185 mg/dL today",
        "150 mg/dl",
        "என் சர்க்கரை அளவு 190",
        "My glucose level is 210"
    ]

    for q in personal_queries:
        assert is_personal_query(q) is True
        res = generate_rag_response(
            user_message=q,
            language="en",
            vector_store=store,
            custom_embed_fn=fake_embed,
            custom_llm_fn=test_llm_fn
        )
        # Ensure nothing was stored in _QUERY_CACHE
        assert get_rag_cache_size() == 0, f"Query '{q}' leaked into RAG answer cache!"
        for cached_key in _QUERY_CACHE.keys():
            assert q.lower() not in cached_key[0]
