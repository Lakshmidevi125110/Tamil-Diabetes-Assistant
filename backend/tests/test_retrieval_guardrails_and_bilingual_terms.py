import math
import pytest
from unittest.mock import MagicMock
from app.config import Config
from app.services.knowledge_base import KnowledgeChunk
from app.services.embedding_service import VectorStore
from app.services.safety_validator import validate_ai_reply
from app.services.ai_service import enforce_bilingual_medical_terms, RAG_SYSTEM_PROMPT
from app.services.rag_service import (
    generate_rag_response,
    clear_rag_cache,
    SAFE_INSUFFICIENT_INFO_EN,
    SAFE_INSUFFICIENT_INFO_TA,
    is_greeting_or_conversational
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
def clean_cache():
    clear_rag_cache()
    yield
    clear_rag_cache()


# -------------------------------------------------------------------------
# 1. Emergency Check Runs BEFORE Retrieval and the LLM (Item 5)
# -------------------------------------------------------------------------

def test_emergency_check_runs_before_retrieval_and_llm(tmp_path):
    """Verify emergency interceptor fires before vector search or LLM can be called."""
    mock_search = MagicMock()
    mock_llm = MagicMock()

    store = VectorStore(index_path=str(tmp_path / "emergency_test_index.json"))
    store.search = mock_search

    emergency_query = "I have sudden severe chest pain and trouble breathing"
    result = generate_rag_response(
        user_message=emergency_query,
        language="en",
        vector_store=store,
        custom_llm_fn=mock_llm
    )

    # 1. Emergency status returned immediately
    assert result["status"] == "emergency"
    assert result["rag_applied"] is False
    assert result["sources"] == []
    assert "108" in result["reply"] or "emergency" in result["reply"].lower()

    # 2. Vector search and LLM must NEVER be called
    assert mock_search.call_count == 0
    assert mock_llm.call_count == 0


def test_emergency_check_runs_before_retrieval_tamil(tmp_path):
    """Verify emergency check intercepts urgent Tamil symptoms before retrieval."""
    mock_search = MagicMock()
    mock_llm = MagicMock()

    store = VectorStore(index_path=str(tmp_path / "emergency_ta_index.json"))
    store.search = mock_search

    result = generate_rag_response(
        user_message="கடுமையான நெஞ்சு வலி மற்றும் மூச்சுத் திணறல் உள்ளது",
        language="ta",
        vector_store=store,
        custom_llm_fn=mock_llm
    )

    assert result["status"] == "emergency"
    assert result["rag_applied"] is False
    assert result["sources"] == []
    assert mock_search.call_count == 0
    assert mock_llm.call_count == 0


# -------------------------------------------------------------------------
# 2. Low Retrieval Scores (< RAG_MIN_SCORE) Do Not Call LLM (Item 6)
# -------------------------------------------------------------------------

def test_weak_retrieval_below_min_score_does_not_call_llm(tmp_path):
    """Verify that when top retrieval scores are below RAG_MIN_SCORE, LLM is not called and exact fallback is returned."""
    mock_llm = MagicMock()
    fake_embed = make_test_embed_fn(8)

    store = VectorStore(index_path=str(tmp_path / "weak_score_index.json"))

    # Add a chunk about sleep that scores very low for a diet/med query
    c = KnowledgeChunk(
        chunk_id="sleep_chunk", doc_id="doc_sleep", chunk_index=1, total_chunks=1,
        content="Sleep habits and circadian rhythms.", content_hash="h_sleep",
        word_count=5, source="Sleep Foundation", source_type="sheet",
        title="Sleep Habits", url="https://example.org/sleep",
        publication_date="2022-01-01", retrieved_at="2026-10-07",
        topic="sleep", language="en", authority_level=2
    )
    store.add_chunks([c], embed_fn=fake_embed)

    result = generate_rag_response(
        user_message="Explain retinal laser surgery for proliferative diabetic retinopathy",
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed,
        custom_llm_fn=mock_llm
    )

    # 1. LLM must NOT be called for a medical answer when retrieval is weak
    assert mock_llm.call_count == 0

    # 2. Exact fallback message returned
    expected_en = "I don't have enough trusted information in my knowledge base to answer that safely. Please consult a qualified healthcare professional."
    assert result["status"] == "insufficient_info"
    assert result["rag_applied"] is False
    assert expected_en in result["reply"]
    assert result["sources"] == []


def test_empty_vector_store_does_not_call_llm_for_medical_answers(tmp_path):
    """Verify that an empty vector store returns insufficient info fallback without calling LLM."""
    mock_llm = MagicMock()
    empty_store = VectorStore(index_path=str(tmp_path / "empty_index.json"))

    result = generate_rag_response(
        user_message="What are the symptoms of ketoacidosis?",
        language="en",
        vector_store=empty_store,
        custom_llm_fn=mock_llm
    )

    assert mock_llm.call_count == 0
    assert result["status"] == "insufficient_info"
    assert result["sources"] == []
    assert "I don't have enough trusted information in my knowledge base to answer that safely. Please consult a qualified healthcare professional." in result["reply"]


def test_weak_retrieval_tamil_fallback(tmp_path):
    """Verify Tamil exact fallback when retrieval score is insufficient."""
    mock_llm = MagicMock()
    empty_store = VectorStore(index_path=str(tmp_path / "empty_ta_index.json"))

    result = generate_rag_response(
        user_message="சர்க்கரை நோய்க்கான புதிய லேசர் சிகிச்சை முறைகள் என்ன?",
        language="ta",
        vector_store=empty_store,
        custom_llm_fn=mock_llm
    )

    assert mock_llm.call_count == 0
    assert result["status"] == "insufficient_info"
    assert result["sources"] == []
    expected_ta = "பாதுகாப்பாக பதிலளிக்க எனது அறிவுத் தளத்தில் போதுமான நம்பகமான தகவல்கள் இல்லை. தயவுசெய்து தகுதிவாய்ந்த மருத்துவ நிபுணரை அணுகவும்."
    assert expected_ta in result["reply"]


# -------------------------------------------------------------------------
# 3. "Trusted Sources" Only for Chunks Passed to LLM, Never for Greetings (Item 7)
# -------------------------------------------------------------------------

def test_greetings_never_show_sources(tmp_path):
    """Verify greetings do not invoke vector retrieval or return sources."""
    fake_embed = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "greeting_test_index.json"))

    # Add chunks to vector store
    c = KnowledgeChunk(
        chunk_id="chunk1", doc_id="d1", chunk_index=1, total_chunks=1,
        content="General health info.", content_hash="h1", word_count=3,
        source="WHO", source_type="guideline", title="WHO Guide", url="https://who.int",
        publication_date="2023", retrieved_at="2026", topic="basics",
        language="en", authority_level=1
    )
    store.add_chunks([c], embed_fn=fake_embed)

    # Greeting in English
    res_en = generate_rag_response("Hello, how are you?", language="en", vector_store=store, custom_embed_fn=fake_embed)
    assert res_en["status"] == "success"
    assert res_en["sources"] == []
    assert res_en["rag_applied"] is False

    # Greeting in Tamil
    res_ta = generate_rag_response("வணக்கம், நீங்கள் யார்?", language="ta", vector_store=store, custom_embed_fn=fake_embed)
    assert res_ta["status"] == "success"
    assert res_ta["sources"] == []
    assert res_ta["rag_applied"] is False


def test_trusted_sources_only_for_chunks_actually_passed_to_llm(tmp_path):
    """Verify only chunks actually passed to the LLM are included in sources list."""
    fake_embed = make_test_embed_fn(8)
    store = VectorStore(index_path=str(tmp_path / "trusted_sources_index.json"))

    # Chunk 1: Matches diet
    c1 = KnowledgeChunk(
        chunk_id="diet_chunk", doc_id="d_diet", chunk_index=1, total_chunks=1,
        content="Dietary fiber from green vegetables supports blood glucose balance.",
        content_hash="h_diet", word_count=9, source="WHO", source_type="guideline",
        title="WHO Dietary Guidelines", url="https://who.int/diet",
        publication_date="2023", retrieved_at="2026", topic="healthy eating",
        language="en", authority_level=1
    )
    # Chunk 2: Matches exercise (not query)
    c2 = KnowledgeChunk(
        chunk_id="walk_chunk", doc_id="d_walk", chunk_index=1, total_chunks=1,
        content="Brisk walking helps increase cardiovascular endurance.",
        content_hash="h_walk", word_count=7, source="CDC", source_type="guideline",
        title="CDC Physical Activity", url="https://cdc.gov/walk",
        publication_date="2023", retrieved_at="2026", topic="activity",
        language="en", authority_level=1
    )
    store.add_chunks([c1, c2], embed_fn=fake_embed)

    passed_context = []

    def capturing_llm(query, context, history, lang):
        passed_context.append(context)
        return "Dietary fiber helps maintain glycemic stability."

    result = generate_rag_response(
        user_message="Tell me about diet and food fiber",
        language="en",
        vector_store=store,
        custom_embed_fn=fake_embed,
        custom_llm_fn=capturing_llm
    )

    assert result["status"] == "success"
    assert result["rag_applied"] is True

    # Only WHO Dietary Guidelines was passed to LLM
    assert "WHO Dietary Guidelines" in passed_context[0]
    assert "CDC Physical Activity" not in passed_context[0]

    # Exactly 1 source shown, matching the chunk passed to LLM
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "WHO"
    assert result["sources"][0]["title"] == "WHO Dietary Guidelines"


# -------------------------------------------------------------------------
# 4. Bilingual Terms in Tamil Answers
# -------------------------------------------------------------------------

def test_bilingual_medical_terms_enforced_in_tamil():
    """Verify Tamil answers keep Tamil and English together for key clinical terms."""
    raw_tamil = (
        "குறைந்த இரத்த சர்க்கரை ஏற்பட்டால் சர்க்கரை சாப்பிடவும். "
        "அதிக இரத்த சர்க்கரை வராமல் தடுக்க நடைபயிற்சி செய்யவும். "
        "எச்பிஏ1சி பரிசோதனை செய்ய வேண்டும். "
        "இரத்த சர்க்கரை அளவு 110 mg/dL இருக்க வேண்டும். "
        "இன்சுலின் மருத்துவர் பரிந்துரைப்படி எடுக்கவும்."
    )

    bilingual_output = enforce_bilingual_medical_terms(raw_tamil, language="ta")

    # Verify all 5 terms are present with Tamil and English together
    assert "Hypoglycemia (குறைந்த இரத்த சர்க்கரை)" in bilingual_output
    assert "Hyperglycemia (அதிக இரத்த சர்க்கரை)" in bilingual_output
    assert "HbA1c" in bilingual_output
    assert "Blood glucose" in bilingual_output
    assert "Insulin" in bilingual_output


def test_bilingual_medical_terms_idempotent():
    """Verify that text already containing bilingual terms is not duplicated."""
    already_bilingual = (
        "Hypoglycemia (குறைந்த இரத்த சர்க்கரை) மற்றும் Hyperglycemia (அதிக இரத்த சர்க்கரை). "
        "HbA1c அளவு 6.5%. இரத்த சர்க்கரை (Blood glucose) மற்றும் இன்சுலின் (Insulin)."
    )
    output = enforce_bilingual_medical_terms(already_bilingual, language="ta")
    assert output.count("Hypoglycemia") == 1
    assert output.count("Hyperglycemia") == 1
    assert output.count("Insulin") == 1


# -------------------------------------------------------------------------
# 5. Never Claim Any Food, Herb or Remedy Cures Diabetes
# -------------------------------------------------------------------------

def test_never_claim_food_or_herb_cures_diabetes_en():
    """Verify validator blocks and sanitizes claims that food, herb, or home remedy cures diabetes in English."""
    cure_claim_1 = "Bitter gourd cures diabetes completely within two weeks."
    is_safe, validated, violation = validate_ai_reply(cure_claim_1, language="en")
    assert is_safe is False
    assert violation == "cure_claim_en"
    assert "No food, herb, or home remedy can cure diabetes" in validated

    cure_claim_2 = "Fenugreek seeds will eliminate type 2 diabetes and heal the pancreas."
    is_safe2, validated2, violation2 = validate_ai_reply(cure_claim_2, language="en")
    assert is_safe2 is False
    assert violation2 == "cure_claim_en"
    assert "No food, herb, or home remedy can cure diabetes" in validated2


def test_never_claim_food_or_herb_cures_diabetes_ta():
    """Verify validator blocks and sanitizes claims that food or herb cures diabetes in Tamil."""
    cure_claim_ta = "பாகற்காய் சாறு சர்க்கரை நோயை முழுமையாக குணப்படுத்தும்."
    is_safe, validated, violation = validate_ai_reply(cure_claim_ta, language="ta")
    assert is_safe is False
    assert violation == "cure_claim_ta"
    assert "எந்தவொரு உணவோ, மூலிகையோ அல்லது வீட்டு வைத்தியமோ சர்க்கரை நோயை முழுமையாகக் குணப்படுத்த முடியாது" in validated


def test_rag_system_prompt_prohibits_cure_claims_and_mandates_bilingual():
    """Verify RAG_SYSTEM_PROMPT text explicitly mandates the rules."""
    assert "Never claim or suggest that any food, herb, diet, or home remedy cures" in RAG_SYSTEM_PROMPT
    assert "Hypoglycemia (குறைந்த இரத்த சர்க்கரை)" in RAG_SYSTEM_PROMPT
    assert "Hyperglycemia (அதிக இரத்த சர்க்கரை)" in RAG_SYSTEM_PROMPT
    assert "HbA1c" in RAG_SYSTEM_PROMPT
    assert "Blood glucose" in RAG_SYSTEM_PROMPT
    assert "Insulin" in RAG_SYSTEM_PROMPT
