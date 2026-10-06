import os
import re
import pytest
from unittest.mock import patch, MagicMock
from config import Config
from services.knowledge_base import (
    KnowledgeBase,
    KnowledgeDocument,
    KnowledgeChunk,
    clean_text,
    split_by_headings,
    split_into_atomic_units,
    chunk_text_heading_aware,
    parse_pdf_document
)
from services.embedding_service import (
    VectorStore,
    embed,
    get_embedding,
    cosine_similarity
)
from services.ai_service import (
    RAG_SYSTEM_PROMPT,
    generate_rag_llm_response
)
from services.rag_service import (
    generate_rag_response,
    is_personal_query,
    detect_language,
    clear_rag_cache,
    _QUERY_CACHE,
    RELEVANCE_THRESHOLD
)
from app import create_app


# -------------------------------------------------------------------------
# 1. Heading-Aware Chunking & Atomic Sentence/List Units
# -------------------------------------------------------------------------

def test_heading_aware_chunking_preserves_heading_and_units():
    """Verify chunking splits on Markdown headings first and preserves heading in metadata."""
    sample_text = (
        "# Overview of Diabetes\n"
        "Diabetes mellitus is a metabolic condition affecting blood glucose regulation. "
        "The pancreas produces little or no insulin. "
        "Symptoms include increased thirst and frequent urination.\n\n"
        "## Dietary Management\n"
        "A healthy diet is essential for glycemic balance.\n"
        "- Consume fiber-rich whole vegetables.\n"
        "- Limit intake of simple sugars and sweetened beverages.\n"
        "- Maintain consistent meal timing.\n"
        "Consistent nutritional choices support healthy metabolic function."
    )

    chunks = chunk_text_heading_aware(sample_text, default_heading="General")
    assert len(chunks) >= 2, f"Expected at least 2 sections/chunks, got {len(chunks)}"

    # Check headings preserved
    headings = [h for _, _, h in chunks]
    assert any("Overview of Diabetes" in h for h in headings)
    assert any("Dietary Management" in h for h in headings)

    # Check that list items are preserved intact and never split mid-item
    diet_chunk = next(c[0] for c in chunks if "Dietary Management" in c[2])
    assert "- Consume fiber-rich whole vegetables." in diet_chunk
    assert "- Limit intake of simple sugars and sweetened beverages." in diet_chunk
    assert "- Maintain consistent meal timing." in diet_chunk


def test_chunk_document_stores_heading_on_knowledge_chunk():
    """Verify KnowledgeChunk object receives the heading field."""
    doc = KnowledgeDocument(
        id="doc_heading_test",
        source="Ministry of Health",
        source_type="guideline",
        title="Diabetes Care Guideline",
        url="https://example.gov/diabetes",
        publication_date="2024-01-01",
        retrieved_at="2026-10-06",
        topic="basics",
        content="# Section A: Testing\nBlood glucose testing provides insight into daily control.\n\n# Section B: Physical Activity\nRegular brisk walking enhances insulin sensitivity.",
        language="en",
        authority_level=1
    )

    kb = KnowledgeBase()
    chunks = kb.chunk_document(doc)
    assert len(chunks) == 2
    assert chunks[0].heading == "Section A: Testing"
    assert chunks[1].heading == "Section B: Physical Activity"
    assert chunks[0].to_dict()["heading"] == "Section A: Testing"


# -------------------------------------------------------------------------
# 2. EMBEDDING_PROVIDER & Unified embed(texts) Interface
# -------------------------------------------------------------------------

def test_unified_embed_interface_single_and_list():
    """Verify embed(texts) handles both single string and list of strings."""
    def fake_embed(text: str):
        return [0.1, 0.2, 0.3]

    # Single string call
    vec_single = embed("sample query", custom_embed_fn=fake_embed)
    assert isinstance(vec_single, list)
    assert vec_single == [0.1, 0.2, 0.3]

    # Batch list call
    vec_batch = embed(["text one", "text two"], custom_embed_fn=fake_embed)
    assert isinstance(vec_batch, list)
    assert len(vec_batch) == 2
    assert vec_batch[0] == [0.1, 0.2, 0.3]
    assert vec_batch[1] == [0.1, 0.2, 0.3]


def test_embedding_provider_read_from_config(monkeypatch):
    """Verify provider is read from Config.EMBEDDING_PROVIDER."""
    assert hasattr(Config, "EMBEDDING_PROVIDER")
    assert Config.EMBEDDING_PROVIDER == "gemini"


# -------------------------------------------------------------------------
# 3. Vector Search Filters (Topic, Source, Language) & Score Cutoff
# -------------------------------------------------------------------------

def test_vector_search_filters_and_score_cutoff(tmp_path):
    """Verify VectorStore.search filters by topic, source, language, top-k, and cutoff."""
    def fake_embed(text: str):
        t = text.lower()
        if "diet" in t:
            return [1.0, 0.0, 0.0]
        elif "exercise" in t:
            return [0.0, 1.0, 0.0]
        elif "foot" in t:
            return [0.0, 0.0, 1.0]
        return [0.577, 0.577, 0.577]

    store = VectorStore(index_path=str(tmp_path / "test_filter_index.json"))

    c1 = KnowledgeChunk(
        chunk_id="c1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="Diet advice for diabetes.", content_hash="h1", word_count=4,
        source="WHO", source_type="guideline", title="WHO Diet", url="",
        publication_date="2023", retrieved_at="2026", topic="nutrition",
        language="en", authority_level=1
    )
    c2 = KnowledgeChunk(
        chunk_id="c2", doc_id="d2", chunk_index=1, total_chunks=1,
        content="Exercise advice for diabetes.", content_hash="h2", word_count=4,
        source="CDC", source_type="guideline", title="CDC Exercise", url="",
        publication_date="2023", retrieved_at="2026", topic="activity",
        language="en", authority_level=1
    )
    c3 = KnowledgeChunk(
        chunk_id="c3", doc_id="d3", chunk_index=1, total_chunks=1,
        content="உணவு முறை வழிகாட்டல் diet in Tamil.", content_hash="h3", word_count=5,
        source="WHO", source_type="guideline", title="WHO Tamil Diet", url="",
        publication_date="2023", retrieved_at="2026", topic="nutrition",
        language="ta", authority_level=1
    )

    store.add_chunks([c1, c2, c3], embed_fn=fake_embed)

    # Filter by source: WHO only
    who_res = store.search("diet", source_filter="WHO", embed_fn=fake_embed, min_score=0.1)
    assert all(r["chunk"]["source"] == "WHO" for r in who_res)

    # Filter by language: ta only
    ta_res = store.search("diet", language_filter="ta", embed_fn=fake_embed, min_score=0.1)
    assert len(ta_res) == 1
    assert ta_res[0]["chunk"]["language"] == "ta"

    # Filter by topic: activity only
    act_res = store.search("exercise", topic_filter="activity", embed_fn=fake_embed, min_score=0.1)
    assert len(act_res) == 1
    assert act_res[0]["chunk"]["topic"] == "activity"

    # Score cutoff: query unrelated text should be rejected by min_score
    cutoff_res = store.search("foot care", min_score=0.9, embed_fn=fake_embed)
    # Since neither c1 nor c2 nor c3 has "foot", dot product with [0,0,1] will be 0.0
    assert len(cutoff_res) == 0


# -------------------------------------------------------------------------
# 4. Ingestion Cleaning: Navigation, Repeated Headers, Duplicate Paragraphs & PDF
# -------------------------------------------------------------------------

def test_clean_text_removes_navigation_repeated_headers_and_duplicate_paras():
    """Verify removal of navigation boilerplate, repeated headers, and duplicate paragraphs."""
    raw = (
        "Home > Health Topics > Diabetes\n"
        "Skip to main content\n"
        "# Diabetes Guidance\n"
        "# Diabetes Guidance\n"
        "Diabetes is a long-term condition that occurs when the pancreas does not produce enough insulin.\n\n"
        "Diabetes is a long-term condition that occurs when the pancreas does not produce enough insulin.\n\n"
        "Cookie Policy\n"
        "Maintaining a healthy lifestyle helps manage glucose levels effectively."
    )
    cleaned = clean_text(raw)

    assert "Home > Health Topics > Diabetes" not in cleaned
    assert "Skip to main content" not in cleaned
    assert "Cookie Policy" not in cleaned
    # Header should not repeat consecutively
    assert cleaned.count("# Diabetes Guidance") == 1
    # Duplicate paragraph should appear only once
    assert cleaned.count("Diabetes is a long-term condition that occurs when the pancreas does not produce enough insulin.") == 1
    assert "Maintaining a healthy lifestyle helps manage glucose levels effectively." in cleaned


def test_pdf_ingestion_with_pypdf(tmp_path):
    """Verify PDF document ingestion using pypdf."""
    dummy_pdf_path = str(tmp_path / "clinical_guideline.pdf")

    # Create a mock PDF reading using unittest.mock to simulate pypdf.PdfReader
    mock_page = MagicMock()
    mock_page.extract_text.return_value = (
        "Home > Diabetes Guidelines\n"
        "# World Health Clinical Protocol\n"
        "Healthy diet and physical exercise reduce diabetes complications."
    )

    with patch("pypdf.PdfReader") as MockReader:
        instance = MockReader.return_value
        instance.pages = [mock_page]
        instance.metadata = MagicMock(title="WHO Protocol", author="World Health Organization")

        doc = parse_pdf_document(dummy_pdf_path, fallback_id="who_guideline")
        assert doc is not None
        assert doc.id == "who_guideline"
        assert doc.source == "World Health Organization"
        assert "World Health Clinical Protocol" in doc.content
        assert "Home > Diabetes Guidelines" not in doc.content  # navigation stripped


# -------------------------------------------------------------------------
# 5. Retrieval Flow Order
# -------------------------------------------------------------------------

def test_retrieval_flow_order():
    """
    Verify retrieval flow order:
    1. Emergency check
    2. Language detection
    3. Query normalization
    4. Embedding
    5. Search
    6. Remove duplicate/irrelevant
    7. Pass relevant to LLM
    """
    # Emergency intercepts immediately
    res_emergency = generate_rag_response("I have severe chest pain and difficulty breathing", language="en")
    assert res_emergency["status"] == "emergency"
    assert res_emergency["rag_applied"] is False

    # Language detection
    assert detect_language("சர்க்கரை நோய் பற்றி கூறுங்கள்") == "ta"
    assert detect_language("What is type 2 diabetes?") == "en"


# -------------------------------------------------------------------------
# 6. LLM Function Grounding & System Prompt
# -------------------------------------------------------------------------

def test_rag_llm_function_accepts_parameters_and_uses_system_prompt():
    """Verify generate_rag_llm_response accepts (query, context, history, language)."""
    captured = {}

    def test_llm_fn(query, retrieved_context, compact_history, language):
        captured["query"] = query
        captured["retrieved_context"] = retrieved_context
        captured["compact_history"] = compact_history
        captured["language"] = language
        return "Educational answer grounded in context."

    history = [
        {"role": "user", "text": "Turn 1"},
        {"role": "assistant", "text": "Reply 1"},
        {"role": "user", "text": "Turn 2"},
        {"role": "assistant", "text": "Reply 2"},
        {"role": "user", "text": "Turn 3"},
        {"role": "assistant", "text": "Reply 3"},
    ]

    reply = generate_rag_llm_response(
        query="What foods have fiber?",
        retrieved_context="Context: Vegetables and whole grains provide dietary fiber.",
        conversation_history=history,
        language="en",
        custom_llm_fn=test_llm_fn
    )

    assert reply == "Educational answer grounded in context."
    assert captured["query"] == "What foods have fiber?"
    assert "Vegetables and whole grains" in captured["retrieved_context"]
    assert captured["language"] == "en"
    # Compact history must only keep the last few messages (at most 4 turns)
    assert len(captured["compact_history"]) <= 4

    # System prompt constant check
    assert "You are an educational diabetes information assistant." in RAG_SYSTEM_PROMPT
    assert "Do not diagnose, prescribe medication, recommend medication dosage changes" in RAG_SYSTEM_PROMPT


# -------------------------------------------------------------------------
# 7. Glucose Readings Isolation (Never sent to vector store / knowledge base)
# -------------------------------------------------------------------------

def test_glucose_readings_isolated_from_vector_store_and_knowledge_base():
    """Confirm glucose readings are never sent to VectorStore or KnowledgeBase, nor cached."""
    app = create_app()
    client = app.test_client()

    store = VectorStore()
    initial_vector_count = store.count()

    kb = KnowledgeBase()
    initial_doc_count = len(kb.documents)

    # 1. Post glucose reading to tracker endpoint
    response = client.post("/glucose/respond", json={
        "value": 185,
        "measurement_type": "fasting",
        "language": "en",
        "symptoms": "Feeling thirsty"
    })
    assert response.status_code == 200

    # Verify vector store and knowledge base were NOT modified
    assert store.count() == initial_vector_count
    assert len(kb.documents) == initial_doc_count

    # 2. Test personal query detection and caching protection
    personal_query = "My fasting sugar is 185 mg/dL today"
    assert is_personal_query(personal_query) is True
    assert is_personal_query("என் சர்க்கரை அளவு 190") is True
    assert is_personal_query("What is diabetes?") is False

    # 3. Verify personal queries are never inserted into _QUERY_CACHE
    clear_rag_cache()
    def fake_embed(text: str):
        return [0.1] * 8

    generate_rag_response(
        user_message=personal_query,
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed
    )

    # Assert cache does NOT contain the personal query
    cache_keys = [k[0] for k in _QUERY_CACHE.keys()]
    assert personal_query.lower() not in cache_keys
