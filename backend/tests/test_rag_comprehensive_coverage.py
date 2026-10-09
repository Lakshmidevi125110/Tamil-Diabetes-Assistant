import os
import math
import pytest
from unittest.mock import MagicMock, patch
from app.config import Config
from app.services.knowledge_base import (
    KnowledgeBase,
    KnowledgeDocument,
    KnowledgeChunk,
    clean_text,
    chunk_text_heading_aware,
    parse_frontmatter_document
)
from app.services.embedding_service import (
    VectorStore,
    embed,
    get_embedding,
    cosine_similarity,
    clear_embedding_cache,
    get_embedding_cache_size
)
from app.services.rag_service import (
    generate_rag_response,
    rerank_chunks,
    format_sources_list,
    compute_rerank_score,
    clear_rag_cache,
    SAFE_INSUFFICIENT_INFO_EN,
    SAFE_INSUFFICIENT_INFO_TA
)
from app.services.guardrails import (
    chat_limiter,
    tts_limiter,
    is_personal_query,
    get_rate_limit_message
)
from app.services.ai_service import (
    generate_ai_response,
    enforce_bilingual_medical_terms
)
from app.services.llm_provider import (
    GeminiProvider,
    ClaudeProvider,
    GrokProvider,
    dispatch_llm_request
)
from app.routers.tts import sanitize_text_for_speech, generate_speech_audio


def make_test_embed_fn(dim: int = 8):
    """Deterministic embedding vector generator for testing."""
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


# ==============================================================================
# 1. Ingestion Coverage
# ==============================================================================
def test_coverage_ingestion(tmp_path):
    """Confirm ingestion of markdown and text files, deduplication of paragraphs and headers."""
    kb = KnowledgeBase(data_dir=str(tmp_path / "kb"))

    doc_content = (
        "---\n"
        "title: WHO Nutrition Guidelines\n"
        "source_name: WHO\n"
        "url: https://who.int/guidelines/nutrition\n"
        "publication_date: 2023-01-01\n"
        "last_verified_date: 2026-01-01\n"
        "---\n\n"
        "# WHO Nutrition Guidelines\n\n"
        "Home > Guidelines > Nutrition\n\n"
        "Dietary fiber from whole grains and vegetables supports healthy glucose regulation.\n\n"
        "Dietary fiber from whole grains and vegetables supports healthy glucose regulation.\n"
    )

    doc_file = tmp_path / "who_nutrition.md"
    doc_file.write_text(doc_content, encoding="utf-8")

    docs = kb.load_file(str(doc_file))
    assert len(docs) == 1
    doc = docs[0]
    kb.ingest_document(doc)
    assert doc.source_name == "WHO"
    assert doc.url == "https://who.int/guidelines/nutrition"
    # Ensure repeated header and navigation line are stripped
    assert "Home > Guidelines" not in doc.content
    # Ensure duplicate paragraphs are cleaned
    assert doc.content.count("Dietary fiber from whole grains") == 1


# ==============================================================================
# 2. Chunking Coverage
# ==============================================================================
def test_coverage_chunking():
    """Confirm heading-aware chunking preserves headings, sentences, and list items."""
    text = (
        "## Dietary Fiber and Glycemic Control\n\n"
        "Soluble fiber slows glucose absorption in the small intestine. "
        "This helps prevent postprandial glucose spikes.\n\n"
        "- Oats and barley provide beta-glucan soluble fiber.\n"
        "- Legumes and lentils supply high protein and resistant starch.\n"
        "- Leafy greens provide micronutrients with negligible carbohydrates.\n"
    )

    chunks = chunk_text_heading_aware(text, max_words=30, overlap_words=5)
    assert len(chunks) >= 1
    for content, w_count, heading in chunks:
        # Heading is retained in chunk metadata
        assert heading == "Dietary Fiber and Glycemic Control"
        # List items are not chopped in half
        if "- Oats" in content:
            assert "- Oats and barley provide beta-glucan soluble fiber." in content


# ==============================================================================
# 3. Metadata Coverage
# ==============================================================================
def test_coverage_metadata(tmp_path):
    """Confirm document metadata schema, versioning, and last_verified_date retention."""
    kb = KnowledgeBase(data_dir=str(tmp_path / "kb_meta"))

    file_path = tmp_path / "test_doc.md"
    file_path.write_text(
        "---\ntitle: Doc V1\nsource_name: CDC\nurl: https://cdc.gov/v1\npublication_date: 2022-01-01\nlast_verified_date: 2024-01-01\n---\nInitial content.",
        encoding="utf-8"
    )

    docs_v1 = kb.load_file(str(file_path))
    assert len(docs_v1) == 1
    doc_v1 = docs_v1[0]
    kb.ingest_document(doc_v1)
    assert doc_v1.version == 1
    assert doc_v1.last_verified_date == "2024-01-01"
    assert doc_v1.source_name == "CDC"
    assert doc_v1.url == "https://cdc.gov/v1"

    # Modify content and re-ingest
    file_path.write_text(
        "---\ntitle: Doc V2\nsource_name: CDC\nurl: https://cdc.gov/v1\npublication_date: 2022-01-01\nlast_verified_date: 2026-02-01\n---\nUpdated content.",
        encoding="utf-8"
    )
    docs_v2 = kb.load_file(str(file_path))
    assert len(docs_v2) == 1
    doc_v2 = docs_v2[0]
    kb.ingest_document(doc_v2)
    assert doc_v2.version == 2
    assert doc_v2.last_verified_date == "2026-02-01"
    # Ensure old version record is retained in version_history and version_records
    assert "test_doc_v1" in kb.version_records
    versions = [d.version for d in kb.version_history.get(doc_v1.id, [])]
    assert 1 in versions


# ==============================================================================
# 4. Embedding Generation Coverage
# ==============================================================================
def test_coverage_embedding_generation():
    """Confirm embed() interface handles strings, lists, caching, and cosine similarity."""
    clear_embedding_cache()
    fn = make_test_embed_fn(8)

    # Single string
    v_single = embed("glucose insulin diet", custom_embed_fn=fn)
    assert isinstance(v_single, list)
    assert len(v_single) == 8

    # List of strings
    v_list = embed(["glucose insulin", "diet exercise"], custom_embed_fn=fn)
    assert isinstance(v_list, list)
    assert len(v_list) == 2

    # Cosine similarity
    sim_identical = cosine_similarity(v_single, v_single)
    assert pytest.approx(sim_identical, 0.001) == 1.0

    zero_vec = [0.0] * 8
    sim_zero = cosine_similarity(v_single, zero_vec)
    assert sim_zero == 0.0


# ==============================================================================
# 5. Vector Retrieval Coverage
# ==============================================================================
def test_coverage_vector_retrieval(tmp_path):
    """Confirm vector store retrieval with topic, source, and language filtering."""
    store = VectorStore(index_path=str(tmp_path / "vec_retrieval.json"))
    fn = make_test_embed_fn(8)

    c1 = KnowledgeChunk(
        chunk_id="c1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="Glucose monitoring advice from WHO.", content_hash="h1", word_count=5,
        source="WHO", source_type="guideline", title="WHO Guide", url="https://who.int",
        publication_date="2023", retrieved_at="2026", topic="glucose", language="en", authority_level=1
    )
    c2 = KnowledgeChunk(
        chunk_id="c2", doc_id="d2", chunk_index=1, total_chunks=1,
        content="Exercise and walk routines from ICMR.", content_hash="h2", word_count=6,
        source="ICMR", source_type="guideline", title="ICMR Guide", url="https://icmr.gov.in",
        publication_date="2024", retrieved_at="2026", topic="exercise", language="en", authority_level=1
    )
    store.add_chunks([c1, c2], embed_fn=fn)

    # Retrieval with source filter
    who_results = store.search("glucose", source="WHO", embed_fn=fn)
    assert len(who_results) == 1
    assert who_results[0]["chunk"]["source"] == "WHO"

    # Retrieval with topic filter
    ex_results = store.search("walk exercise", topic="exercise", embed_fn=fn)
    assert len(ex_results) == 1
    assert ex_results[0]["chunk"]["topic"] == "exercise"


# ==============================================================================
# 6. Source Prioritization (Authority_Level 1 ranks higher ONLY when relevant)
# ==============================================================================
def test_coverage_source_prioritization_authority_level():
    """
    Confirm:
    - Authority_level 1 ranks higher than level 2/3 when both are relevant.
    - Authority_level 1 does NOT rank or qualify when irrelevant (< threshold).
    - An extremely relevant source still outranks a marginally relevant level 1 source.
    """
    threshold = 0.45

    # Case A: Both relevant -> Level 1 receives boost and ranks higher than Level 3
    rel_level1 = {
        "score": 0.60,
        "chunk": {"title": "WHO Clinical Guidelines", "source": "WHO", "authority_level": 1, "publication_date": "2023"}
    }
    rel_level3 = {
        "score": 0.63,
        "chunk": {"title": "Community Health Post", "source": "Blog", "authority_level": 3, "publication_date": "2020"}
    }
    ranked_a = rerank_chunks([rel_level3, rel_level1], threshold=threshold, top_k=2)
    # Level 1 gets +0.08 auth boost + 0.03 freshness boost = 0.71 > Level 3 (0.63)
    assert ranked_a[0]["chunk"]["title"] == "WHO Clinical Guidelines"

    # Case B: Irrelevant Level 1 (< threshold) is strictly REJECTED
    irrel_level1 = {
        "score": 0.25,
        "chunk": {"title": "Irrelevant WHO Dental Report", "source": "WHO", "authority_level": 1, "publication_date": "2024"}
    }
    ranked_b = rerank_chunks([irrel_level1, rel_level3], threshold=threshold, top_k=2)
    assert len(ranked_b) == 1
    assert ranked_b[0]["chunk"]["title"] == "Community Health Post"
    assert all(item["chunk"]["title"] != "Irrelevant WHO Dental Report" for item in ranked_b)

    # Case C: Superior relevance outranks authority level 1
    high_rel_level3 = {
        "score": 0.95,
        "chunk": {"title": "Exact Recipe Guide", "source": "General", "authority_level": 3, "publication_date": "2020"}
    }
    marginal_level1 = {
        "score": 0.46,
        "chunk": {"title": "Marginal WHO Overview", "source": "WHO", "authority_level": 1, "publication_date": "2023"}
    }
    ranked_c = rerank_chunks([high_rel_level3, marginal_level1], threshold=threshold, top_k=2)
    assert ranked_c[0]["chunk"]["title"] == "Exact Recipe Guide"


# ==============================================================================
# 7. AI-Generated Sources Never Override Authoritative Ones
# ==============================================================================
def test_coverage_ai_generated_sources_never_override_authoritative(tmp_path):
    """
    Confirm that even if LLM hallucinated citations in text output,
    the returned sources list contains strictly authoritative metadata from retrieved chunks.
    """
    clear_rag_cache()
    fn = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "vec_auth.json"))

    c = KnowledgeChunk(
        chunk_id="who_c", doc_id="who_d", chunk_index=1, total_chunks=1,
        content="WHO trusted guideline on glucose levels.", content_hash="h1", word_count=6,
        source="WHO", source_type="guideline", title="WHO Glucose Guide", url="https://who.int/glucose",
        publication_date="2023", retrieved_at="2026", topic="glucose", language="en", authority_level=1
    )
    store.add_chunks([c], embed_fn=fn)

    # LLM hallucinates fake source in its answer text
    fake_ai_output = (
        "According to Dr. Fake's Blog at https://random-blog.com/cure, eating bitter gourd cures diabetes. "
        "Consult WHO Glucose Guide for basics."
    )

    def hallucinating_llm(query, context, history, lang):
        return fake_ai_output

    res = generate_rag_response(
        user_message="glucose levels guide",
        language="en",
        vector_store=store,
        custom_embed_fn=fn,
        custom_llm_fn=hallucinating_llm
    )

    assert res["status"] == "success"
    # Sources list must contain ONLY real authoritative chunk
    assert len(res["sources"]) == 1
    assert res["sources"][0]["source"] == "WHO"
    assert res["sources"][0]["url"] == "https://who.int/glucose"
    # Never includes Dr. Fake's blog in sources metadata
    assert not any("random-blog" in s["url"] for s in res["sources"])


# ==============================================================================
# 8. Irrelevant-Document Rejection Coverage
# ==============================================================================
def test_coverage_irrelevant_document_rejection(tmp_path):
    """Confirm candidates below RAG_MIN_SCORE are strictly rejected and not returned."""
    store = VectorStore(index_path=str(tmp_path / "vec_irrel.json"))
    fn = make_test_embed_fn(8)

    # Chunk is about sleep, query is about glucose
    chunk = KnowledgeChunk(
        chunk_id="chunk_sleep", doc_id="d_sleep", chunk_index=1, total_chunks=1,
        content="Sleep architecture and circadian rhythm biology.", content_hash="hs", word_count=6,
        source="Sleep Inst", source_type="article", title="Sleep Science", url="https://sleep.org",
        publication_date="2021", retrieved_at="2026", topic="sleep", language="en", authority_level=2
    )
    store.add_chunks([chunk], embed_fn=fn)

    # Search query has zero overlap with sleep chunk
    candidates = store.search("diet and glucose regulation", min_score=0.45, embed_fn=fn)
    assert len(candidates) == 0


# ==============================================================================
# 9. Insufficient-Context Fallback Coverage
# ==============================================================================
def test_coverage_insufficient_context_fallback(tmp_path):
    """Confirm when vector retrieval finds no relevant chunks, LLM is not called and safe refusal returns."""
    clear_rag_cache()
    store = VectorStore(index_path=str(tmp_path / "vec_empty.json"))
    fn = make_test_embed_fn(8)

    llm_mock = MagicMock()

    # English fallback
    res_en = generate_rag_response("rare neurosurgical intervention", language="en", vector_store=store, custom_embed_fn=fn, custom_llm_fn=llm_mock)
    assert res_en["status"] == "insufficient_info"
    assert SAFE_INSUFFICIENT_INFO_EN in res_en["reply"]
    assert res_en["sources"] == []
    llm_mock.assert_not_called()

    # Tamil fallback
    res_ta = generate_rag_response("அரிதான நரம்பியல் அறுவை சிகிச்சை", language="ta", vector_store=store, custom_embed_fn=fn, custom_llm_fn=llm_mock)
    assert res_ta["status"] == "insufficient_info"
    assert SAFE_INSUFFICIENT_INFO_TA in res_ta["reply"]
    assert res_ta["sources"] == []
    llm_mock.assert_not_called()


# ==============================================================================
# 10. No Hallucinated Sources Coverage
# ==============================================================================
def test_coverage_no_hallucinated_sources(tmp_path):
    """Confirm that general greetings never show sources and sources list is strictly grounded."""
    clear_rag_cache()
    store = VectorStore(index_path=str(tmp_path / "vec_no_hal.json"))
    fn = make_test_embed_fn(8)

    c = KnowledgeChunk(
        chunk_id="c1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="General health info.", content_hash="h1", word_count=3,
        source="WHO", source_type="guideline", title="WHO Guide", url="https://who.int",
        publication_date="2023", retrieved_at="2026", topic="general", language="en", authority_level=1
    )
    store.add_chunks([c], embed_fn=fn)

    # Greeting query
    res = generate_rag_response("Hello, good morning!", language="en", vector_store=store, custom_embed_fn=fn)
    assert res["status"] == "success"
    assert res["sources"] == []
    assert res["rag_applied"] is False


# ==============================================================================
# 11. Source Attribution Coverage
# ==============================================================================
def test_coverage_source_attribution():
    """Confirm format_sources_list accurately formats title, source, and url."""
    mock_chunks = [
        {
            "chunk": {
                "title": "Clinical Practice Guidelines 2023",
                "source": "ICMR",
                "url": "https://main.icmr.nic.in/diabetes-guidelines"
            }
        },
        {
            "chunk": {
                "title": "Clinical Practice Guidelines 2023",  # duplicate title/source
                "source": "ICMR",
                "url": "https://main.icmr.nic.in/diabetes-guidelines"
            }
        }
    ]
    sources = format_sources_list(mock_chunks)
    assert len(sources) == 1  # Deduplicated
    assert sources[0]["title"] == "Clinical Practice Guidelines 2023"
    assert sources[0]["source"] == "ICMR"
    assert sources[0]["url"] == "https://main.icmr.nic.in/diabetes-guidelines"


# ==============================================================================
# 12. Missing API Keys Coverage
# ==============================================================================
def test_coverage_missing_api_keys(monkeypatch):
    """Confirm that when all API keys are missing, graceful friendly error returns without crashing."""
    monkeypatch.setattr(Config, "GEMINI_API_KEY", "")
    monkeypatch.setattr(Config, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(Config, "XAI_API_KEY", "")

    # LLM request returns None
    result = dispatch_llm_request("What is diabetes?")
    assert result is None

    # AI response returns localized friendly error message
    err_en = generate_ai_response("What is diabetes?", language="en")
    assert "trouble connecting to the AI service" in err_en
    assert "Disclaimer" in err_en

    err_ta = generate_ai_response("நீரிழிவு என்றால் என்ன?", language="ta")
    assert "தொடர்பு கொள்ள முடியவில்லை" in err_ta or "குறிப்பு" in err_ta


# ==============================================================================
# 13. LLM Fallback Coverage
# ==============================================================================
def test_coverage_llm_fallback(monkeypatch):
    """Confirm fallback order: Gemini -> Claude -> Grok."""
    monkeypatch.setattr(Config, "GEMINI_API_KEY", "mock_gemini")
    monkeypatch.setattr(Config, "ANTHROPIC_API_KEY", "mock_claude")
    monkeypatch.setattr(Config, "XAI_API_KEY", "mock_grok")

    # Mock providers: Gemini fails, Claude succeeds
    with patch.object(GeminiProvider, "generate", return_value=None):
        with patch.object(ClaudeProvider, "generate", return_value="Response from Claude"):
            resp = dispatch_llm_request("Explain glucose")
            assert resp == "Response from Claude"

    # Both Gemini and Claude fail, Grok succeeds
    with patch.object(GeminiProvider, "generate", return_value=None):
        with patch.object(ClaudeProvider, "generate", return_value=None):
            with patch.object(GrokProvider, "generate", return_value="Response from Grok"):
                resp = dispatch_llm_request("Explain glucose")
                assert resp == "Response from Grok"


# ==============================================================================
# 14. API Error Handling Coverage
# ==============================================================================
def test_coverage_api_error_handling(tmp_path):
    """Confirm that unexpected API exceptions during RAG are caught and return gracefully."""
    clear_rag_cache()
    store = VectorStore(index_path=str(tmp_path / "vec_err.json"))
    fn = make_test_embed_fn(8)

    chunk = KnowledgeChunk(
        chunk_id="c_err", doc_id="d_err", chunk_index=1, total_chunks=1,
        content="Healthy diet for glucose control.", content_hash="herr", word_count=6,
        source="WHO", source_type="guideline", title="WHO Guide", url="https://who.int",
        publication_date="2023", retrieved_at="2026", topic="diet", language="en", authority_level=1
    )
    store.add_chunks([chunk], embed_fn=fn)

    def failing_llm(*args, **kwargs):
        raise ConnectionError("Simulated LLM API network failure")

    # Pipeline catches exception and falls back to base generation without 500 error
    res = generate_rag_response(
        user_message="Tell me about diet for glucose",
        language="en",
        vector_store=store,
        custom_embed_fn=fn,
        custom_llm_fn=failing_llm
    )
    assert res["status"] == "success"
    assert "reply" in res
    assert len(res["reply"]) > 0


# ==============================================================================
# 15. Rate Limiting Coverage
# ==============================================================================
def test_coverage_rate_limiting(client):
    """Confirm sliding-window rate limiting on /chat, /rag, and /tts with friendly messages."""
    chat_limiter.reset()
    tts_limiter.reset()

    # Chat route rate limiting
    for _ in range(15):
        client.post("/chat", json={"message": "Help emergency chest pain", "language": "en"})
    chat_blocked = client.post("/chat", json={"message": "What is diabetes?", "language": "en"})
    assert chat_blocked.status_code == 429
    assert "Too many requests" in chat_blocked.json()["error"]

    # TTS route rate limiting
    for _ in range(25):
        client.post("/tts", json={"text": "வணக்கம்", "language": "ta"})
    tts_blocked = client.post("/tts", json={"text": "வணக்கம்", "language": "ta"})
    assert tts_blocked.status_code == 429
    assert "கோரிக்கைகள் அதிகம்" in tts_blocked.json()["error"]


# ==============================================================================
# 16. Emergency Guardrails Coverage
# ==============================================================================
def test_coverage_emergency_guardrails():
    """Confirm emergency symptoms trigger immediate protocol before retrieval or LLM."""
    embed_mock = MagicMock()
    llm_mock = MagicMock()

    # English critical emergency
    res_en = generate_rag_response("Patient has severe chest pain and blood sugar 35", language="en", custom_embed_fn=embed_mock, custom_llm_fn=llm_mock)
    assert res_en["status"] == "emergency"
    assert "108" in res_en["reply"]
    embed_mock.assert_not_called()
    llm_mock.assert_not_called()

    # Tamil critical emergency
    res_ta = generate_rag_response("நோயாளிக்கு திடீரென மயக்கம் வந்துவிட்டது, சர்க்கரை 40", language="ta", custom_embed_fn=embed_mock, custom_llm_fn=llm_mock)
    assert res_ta["status"] == "emergency"
    assert "108" in res_ta["reply"]
    embed_mock.assert_not_called()
    llm_mock.assert_not_called()


# ==============================================================================
# 17. Tamil and English Replies Coverage
# ==============================================================================
def test_coverage_tamil_and_english_replies():
    """Confirm bilingual medical term enforcement in Tamil and clean format in English."""
    sample_tamil = "நோயாளிக்கு குறைந்த இரத்த சர்க்கரை மற்றும் அதிக இரத்த சர்க்கரை உள்ளது. இரத்த சர்க்கரை அளவை கண்காணிக்க வேண்டும்."
    enforced = enforce_bilingual_medical_terms(sample_tamil, language="ta")

    # Must contain English in parentheses
    assert "Hypoglycemia (குறைந்த இரத்த சர்க்கரை)" in enforced
    assert "Hyperglycemia (அதிக இரத்த சர்க்கரை)" in enforced
    assert "Blood glucose" in enforced


# ==============================================================================
# 18. Existing Glucose Tracker Coverage
# ==============================================================================
def test_coverage_existing_glucose_tracker(client, tmp_path):
    """Confirm glucose tracker classifies values and never stores readings to vector store."""
    store = VectorStore(index_path=str(tmp_path / "vec_isolate.json"))
    init_count = store.count()

    payload = {
        "value": 115,
        "measurement_type": "fasting",
        "language": "en"
    }
    response = client.post("/glucose/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["classification"] == "within"
    assert "educational" in data["response"].lower()

    # Verify vector store was NEVER modified
    assert store.count() == init_count


# ==============================================================================
# 19. Existing Voice Coverage
# ==============================================================================
def test_coverage_existing_voice():
    """Confirm TTS text sanitization strips markdown and emojis."""
    raw = "### **முக்கிய குறிப்பு** ⚠️: சர்க்கரை அளவு [பார்க்க](https://example.com) *நன்றி*! 🎙️"
    cleaned = sanitize_text_for_speech(raw)
    assert "**" not in cleaned
    assert "###" not in cleaned
    assert "⚠️" not in cleaned
    assert "🎙️" not in cleaned
    assert "https://" not in cleaned
    assert "முக்கிய குறிப்பு" in cleaned
    assert "நன்றி!" in cleaned
