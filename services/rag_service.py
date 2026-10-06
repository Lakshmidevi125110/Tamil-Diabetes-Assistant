import re
import logging
from typing import List, Dict, Any, Optional, Tuple, Callable
from config import Config
from services.knowledge_base import KnowledgeChunk
from services.embedding_service import VectorStore, embed, get_embedding, get_gemini_client
from services.guardrails import check_emergency_symptoms, check_crisis_or_self_harm
from services.safety_validator import check_medication_change_query, validate_ai_reply
from services.ai_service import (
    generate_ai_response,
    generate_rag_llm_response,
    clean_tamil_text,
    normalize_single_disclaimer,
    RAG_SYSTEM_PROMPT
)

logger = logging.getLogger(__name__)

# Minimum cosine similarity required before authority boost is applied
RELEVANCE_THRESHOLD = 0.45

# In-memory LRU query cache: {(normalized_query, language): result_dict}
_QUERY_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}
MAX_CACHE_SIZE = 150

SAFE_INSUFFICIENT_INFO_EN = (
    "I don't have enough reliable information to answer that safely. "
    "I can provide general diabetes education on the topic or help you organize "
    "information to discuss with a healthcare professional."
)

SAFE_INSUFFICIENT_INFO_TA = (
    "பாதுகாப்பாக பதிலளிக்க என்னிடம் போதுமான நம்பகமான மருத்துவ தகவல்கள் இல்லை. "
    "இந்த தலைப்பில் பொதுவான நீரிழிவு விழிப்புணர்வை வழங்க முடியும் அல்லது உங்கள் மருத்துவரிடம் "
    "விவாதிக்க தகவல்களை ஒழுங்கமைக்க உதவ முடியும்."
)

# Tone softening dictionary for calm, non-judgmental healthcare communication
TONE_REPLACEMENTS_EN = [
    (r"\byou must\b", "it is generally helpful to"),
    (r"\byou need to\b", "you may consider"),
    (r"\bdangerous\b", "requiring prompt medical attention"),
    (r"\buncontrolled\b", "consistently elevated"),
    (r"\bvery bad\b", "concerning"),
]

TONE_REPLACEMENTS_TA = [
    (r"கண்டிப்பாக செய்ய வேண்டும்", "பரிசீலிக்கலாம்"),
    (r"ஆபத்தானது", "கவனம் தேவைப்படக்கூடியது"),
    (r"கட்டுப்பாடற்ற", "அதிகரித்த"),
    (r"மிக மோசமானது", "கவனிக்கத்தக்கது"),
]


def validate_tone(text: str, language: str = "en") -> str:
    """
    Ensures tone remains calm, educational, non-judgmental, and free of fear/shame.
    Softens words like 'dangerous', 'uncontrolled', 'you must', 'very bad'.
    """
    result = text
    replacements = TONE_REPLACEMENTS_EN if language == "en" else TONE_REPLACEMENTS_TA
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


def compute_rerank_score(candidate: Dict[str, Any]) -> Tuple[float, float, float]:
    """
    Computes re-ranking score:
    - Base relevance (cosine similarity)
    - Authority boost (authority_level 1 = +0.08, level 2 = +0.04)
    - Freshness boost (published 2022+ = +0.03, 2020+ = +0.015)
    Returns (composite_score, authority_boost, freshness_boost).
    """
    base_score = float(candidate.get("score", 0.0))
    meta = candidate.get("chunk", {})

    # 1. Authority boost
    auth_level = int(meta.get("authority_level", 3))
    auth_boost = 0.08 if auth_level == 1 else (0.04 if auth_level == 2 else 0.0)

    # 2. Freshness boost based on publication date
    pub_date = str(meta.get("publication_date", ""))
    freshness_boost = 0.0
    year_match = re.search(r"\b(20\d\d)\b", pub_date)
    if year_match:
        year = int(year_match.group(1))
        if year >= 2023:
            freshness_boost = 0.03
        elif year >= 2020:
            freshness_boost = 0.015

    composite_score = base_score + auth_boost + freshness_boost
    return composite_score, auth_boost, freshness_boost


def rerank_chunks(
    candidates: List[Dict[str, Any]],
    threshold: float = RELEVANCE_THRESHOLD,
    top_k: int = 2
) -> List[Dict[str, Any]]:
    """
    Re-ranks retrieved candidates:
    - Relevance first: strictly rejects candidates below threshold. Never forces an irrelevant authoritative source.
    - Boosts authority level 1 and fresher documents.
    - Returns top_k highest ranked candidates.
    """
    qualified: List[Dict[str, Any]] = []

    for item in candidates:
        base_score = float(item.get("score", 0.0))
        # Reject irrelevant chunks below threshold regardless of authority
        if base_score < threshold:
            continue

        comp_score, a_boost, f_boost = compute_rerank_score(item)
        enriched = dict(item)
        enriched["composite_score"] = round(comp_score, 4)
        enriched["authority_boost"] = a_boost
        enriched["freshness_boost"] = f_boost
        qualified.append(enriched)

    qualified.sort(key=lambda x: x["composite_score"], reverse=True)
    return qualified[:top_k]


def build_rag_prompt(user_message: str, chunks: List[Dict[str, Any]], language: str) -> str:
    """Builds a compact prompt containing retrieved context excerpts and clinical rules."""
    context_blocks = []
    for idx, c in enumerate(chunks, 1):
        meta = c.get("chunk", {})
        title = meta.get("title", f"Document {idx}")
        source = meta.get("source", "Health Organization")
        content = meta.get("content", "")
        # Keep context concise
        excerpt = content[:800].strip()
        context_blocks.append(f"--- Context Excerpt {idx} [{title} | {source}] ---\n{excerpt}")

    context_str = "\n\n".join(context_blocks)

    if language == "ta":
        instruction = (
            "நீங்கள் ஒரு அன்பான, நம்பகமான நீரிழிவு கல்வி உதவியாளர். "
            "கீழே வழங்கப்பட்டுள்ள சரிபார்க்கப்பட்ட மருத்துவ ஆதாரங்களிலிருந்து மட்டுமே உங்கள் பதிலை அமையுங்கள்.\n"
            "விதிகள்:\n"
            "1. வழங்கப்பட்ட ஆதாரங்களின் அடிப்படையில் மட்டுமே பதிலளிக்கவும்.\n"
            "2. கற்பனையாக எந்த தகவலையோ அல்லது இணைய முகவரியையோ (URL) உருவாக்க வேண்டாம்.\n"
            "3. ஆதாரங்களில் முரண்பாடு இருந்தால், வெவ்வேறு அமைப்புகளின் வழிகாட்டுதல்கள் மாறுபடலாம் என்று கூறி மருத்துவரிடம் ஆலோசிக்க பரிந்துரைக்கவும்.\n"
            "4. மருந்தளவு மாற்றங்களையோ அல்லது நோய் கண்டறிதலையோ ஒருபோதும் கூற வேண்டாம்.\n"
            "5. எளிய, கனிவான தமிழில் பதில் அளிக்கவும்."
        )
    else:
        instruction = (
            "You are a supportive, trusted diabetes health educational assistant. "
            "Formulate your response strictly using the verified context excerpts below.\n"
            "Rules:\n"
            "1. Answer from the retrieved context excerpts provided.\n"
            "2. Never invent facts, sources, or URLs.\n"
            "3. If retrieved sources disagree, do not merge silently: state that clinical recommendations may differ across health bodies and advise consulting a healthcare professional.\n"
            "4. Never prescribe drugs, dosages, or make definitive medical diagnoses.\n"
            "5. Respond in a calm, clear, empathetic educational tone."
        )

    prompt = (
        f"{instruction}\n\n"
        f"[VERIFIED CONTEXT EXCERPTS]\n{context_str}\n\n"
        f"User Question: {user_message}\n\n"
        f"Answer:"
    )
    return prompt


def format_sources_list(chunks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Extracts a deduplicated list of real retrieved sources (title, source, url)."""
    sources: List[Dict[str, str]] = []
    seen: set = set()

    for item in chunks:
        meta = item.get("chunk", {})
        title = meta.get("title", "").strip() or "Clinical Reference"
        source = meta.get("source", "").strip() or "Verified Health Organization"
        url = meta.get("url", "").strip()

        key = (title.lower(), source.lower())
        if key not in seen:
            seen.add(key)
            sources.append({
                "title": title,
                "source": source,
                "url": url
            })

    return sources


def is_personal_query(text: str) -> bool:
    """
    Detects if a query contains personal medical readings, metrics, or personal statements
    that must never be stored in the shared query cache or indexed.
    """
    patterns = [
        r"\b(?:my|i am|i have|me|mine|என்|என்னுடைய|எனக்கு)\b",
        r"\b(?:fasting|post\s*meal|random|sugar|glucose|மதிப்பு|அளவு)\s*(?:is|level)?\s*\d{2,3}\b",
        r"\b\d{2,3}\s*(?:mg/dl|mgdl)\b",
        r"\b(?:took|take|injected|dose|units?)\s*\d+\b"
    ]
    t = text.lower()
    return any(re.search(p, t) for p in patterns)


def detect_language(text: str, fallback_lang: str = "ta") -> str:
    """Detects if text contains Tamil Unicode script or English characters."""
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"
    if re.search(r"[a-zA-Z]", text):
        return "en"
    return fallback_lang


def generate_rag_response(
    user_message: str,
    language: str = "ta",
    history: Optional[List[Dict[str, str]]] = None,
    vector_store: Optional[VectorStore] = None,
    custom_embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None,
    custom_llm_fn: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Full RAG pipeline in strict retrieval order:
    1. Emergency check (urgent symptoms, self-harm crisis, medication adjustment)
    2. Language detection (Tamil script detection vs English)
    3. Query normalization (clean spacing, casing, non-personal cache lookup)
    4. Embedding (embed interface)
    5. Search (vector store search with topic/source/language filters & cutoff)
    6. Remove duplicate or irrelevant chunks (deduplication & relevance filter)
    7. Pass only relevant chunks to LLM (grounded with RAG_SYSTEM_PROMPT and compact history)
    """
    # 1. Emergency check
    emergency_reply = check_emergency_symptoms(user_message, language=language)
    if emergency_reply:
        logger.warning("Emergency detected in retrieval flow.")
        return {
            "status": "emergency",
            "reply": emergency_reply,
            "sources": [],
            "rag_applied": False
        }

    crisis_reply = check_crisis_or_self_harm(user_message, language=language)
    if crisis_reply:
        logger.warning("Crisis/self-harm detected in retrieval flow.")
        return {
            "status": "crisis_support",
            "reply": crisis_reply,
            "sources": [],
            "rag_applied": False
        }

    med_reply = check_medication_change_query(user_message, language=language)
    if med_reply:
        logger.info("Medication change query intercepted in retrieval flow.")
        return {
            "status": "medication_notice",
            "reply": med_reply,
            "sources": [],
            "rag_applied": False
        }

    # 2. Language detection
    active_lang = language or detect_language(user_message, fallback_lang="ta")

    # 3. Query normalization
    clean_query = re.sub(r"\s+", " ", user_message).strip()
    normalized_query = clean_query.lower()
    cache_key = (normalized_query, active_lang)

    is_personal = is_personal_query(user_message)
    if not is_personal and cache_key in _QUERY_CACHE:
        logger.info("Serving query from RAG cache: %s", clean_query[:40])
        return _QUERY_CACHE[cache_key]

    store = vector_store or VectorStore()

    # Fallback to standard AI response if store is empty
    if store.is_empty():
        logger.info("Vector index is empty. Falling back to standard AI generation.")
        fallback_reply = generate_ai_response(clean_query, language=active_lang, history=history)
        _, safe_fallback, _ = validate_ai_reply(fallback_reply, language=active_lang)
        result = {
            "status": "success",
            "reply": validate_tone(safe_fallback, language=active_lang),
            "sources": [],
            "rag_applied": False
        }
        return result

    try:
        # 4. Embedding
        query_vec = embed(clean_query, custom_embed_fn=custom_embed_fn)

        # 5. Search
        top_k_val = getattr(Config, "RAG_TOP_K", 3)
        min_score_val = getattr(Config, "RAG_MIN_SCORE", RELEVANCE_THRESHOLD)
        candidates = store.search(
            query=clean_query,
            k=max(top_k_val * 2, 6),
            min_score=min_score_val,
            embed_fn=custom_embed_fn
        )

        # 6. Remove duplicate or irrelevant chunks
        seen_hashes: Set[str] = set()
        unique_candidates: List[Dict[str, Any]] = []
        for c in candidates:
            meta = c.get("chunk", {})
            h = meta.get("content_hash") or meta.get("chunk_id")
            if h and h in seen_hashes:
                continue
            seen_hashes.add(h)
            if c.get("score", 0.0) >= min_score_val:
                unique_candidates.append(c)

        # Re-rank (relevance first, then authority/recency boost)
        top_chunks = rerank_chunks(unique_candidates, threshold=min_score_val, top_k=top_k_val)

        # 7. Pass only relevant chunks to LLM
        if not top_chunks:
            logger.info("No relevant chunks passed threshold for query: %s", clean_query[:40])
            refusal_text = SAFE_INSUFFICIENT_INFO_TA if active_lang == "ta" else SAFE_INSUFFICIENT_INFO_EN
            disclaimer = normalize_single_disclaimer(refusal_text, language=active_lang)
            result = {
                "status": "insufficient_info",
                "reply": disclaimer,
                "sources": [],
                "rag_applied": False
            }
            if not is_personal:
                _QUERY_CACHE[cache_key] = result
            return result

        # Format context excerpts
        context_blocks = []
        for idx, c in enumerate(top_chunks, 1):
            meta = c.get("chunk", {})
            title = meta.get("title", f"Document {idx}")
            source = meta.get("source", "Health Organization")
            content = meta.get("content", "")
            context_blocks.append(f"--- Context Excerpt {idx} [{title} | {source}] ---\n{content[:800].strip()}")
        retrieved_context_str = "\n\n".join(context_blocks)

        # Call LLM function accepting (query, retrieved_context, conversation_history, language)
        raw_reply = generate_rag_llm_response(
            query=clean_query,
            retrieved_context=retrieved_context_str,
            conversation_history=history,
            language=active_lang,
            custom_llm_fn=custom_llm_fn
        )

        if active_lang == "ta":
            raw_reply = clean_tamil_text(raw_reply)

        # Safety Validator & Tone Validator audits
        _, safe_reply, violation = validate_ai_reply(raw_reply, language=active_lang)
        if violation:
            logger.warning("RAG reply sanitized by safety validator: %s", violation)

        calm_reply = validate_tone(safe_reply, language=active_lang)
        final_reply = normalize_single_disclaimer(calm_reply, language=active_lang)

        sources_list = format_sources_list(top_chunks)
        result = {
            "status": "success",
            "reply": final_reply,
            "sources": sources_list,
            "rag_applied": True
        }

        # Cache only non-personal queries
        if not is_personal:
            if len(_QUERY_CACHE) >= MAX_CACHE_SIZE:
                first_key = next(iter(_QUERY_CACHE))
                del _QUERY_CACHE[first_key]
            _QUERY_CACHE[cache_key] = result

        return result

    except Exception as e:
        logger.error("RAG pipeline failed with error: %s. Falling back to base generation.", str(e))
        base_reply = generate_ai_response(clean_query, language=language, history=history)
        _, safe_base, _ = validate_ai_reply(base_reply, language=language)
        return {
            "status": "success",
            "reply": validate_tone(safe_base, language=language),
            "sources": [],
            "rag_applied": False
        }


def clear_rag_cache() -> None:
    """Clears query cache (useful in tests and reindexing)."""
    _QUERY_CACHE.clear()
