import os
import math
import json
import logging
from typing import List, Dict, Any, Optional, Callable, Tuple
from config import Config
from services.knowledge_base import KnowledgeChunk

logger = logging.getLogger(__name__)

DEFAULT_INDEX_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "index")
DEFAULT_INDEX_FILE = os.path.join(DEFAULT_INDEX_DIR, "knowledge_index.json")

# Candidate Gemini embedding models
PRIMARY_EMBED_MODEL = "gemini-embedding-001"
FALLBACK_EMBED_MODELS = ["gemini-embedding-001", "gemini-embedding-2", "gemini-embedding-2-preview"]


def get_gemini_client():
    """Initializes and returns the Gemini client if API key is present."""
    api_key = Config.GEMINI_API_KEY
    if not api_key or api_key == "your_api_key_here":
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning("Could not initialize Gemini Client: %s", str(e))
        return None


def _embed_gemini(text: str, client: Optional[Any] = None) -> Optional[List[float]]:
    """Helper to embed text using Google Gemini Embedding API."""
    active_client = client or get_gemini_client()
    if not active_client:
        logger.warning("Gemini API key is not configured. Cannot generate live embedding.")
        return None

    for model_name in FALLBACK_EMBED_MODELS:
        try:
            response = active_client.models.embed_content(
                model=model_name,
                contents=text
            )
            if response and response.embeddings and len(response.embeddings) > 0:
                values = response.embeddings[0].values
                if values:
                    return list(values)
        except Exception as e:
            logger.warning("Embedding attempt on %s failed: %s", model_name, str(e))
            continue

    logger.error("All Gemini embedding models failed.")
    return None


def embed(
    texts: Any,
    provider: Optional[str] = None,
    custom_embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None
) -> Any:
    """
    Unified lightweight embedding interface:
    - Accepts a single string or a list of strings.
    - Reads EMBEDDING_PROVIDER from Config (default: 'gemini').
    - Allows switching embedding providers without changing RAG retrieval code.
    - If custom_embed_fn is provided (e.g., in unit tests), uses it.
    - Returns single vector for str, or list of vectors for List[str].
    """
    if isinstance(texts, str):
        is_single = True
        text_list = [texts]
    elif isinstance(texts, (list, tuple)):
        is_single = False
        text_list = list(texts)
    else:
        return None

    active_provider = (provider or getattr(Config, "EMBEDDING_PROVIDER", "gemini")).lower()
    results: List[Optional[List[float]]] = []

    for item in text_list:
        if not item or not str(item).strip():
            results.append(None)
            continue

        item_str = str(item)

        if custom_embed_fn:
            try:
                results.append(custom_embed_fn(item_str))
            except Exception as e:
                logger.error("Custom embedding function error: %s", str(e))
                results.append(None)
            continue

        if active_provider == "gemini":
            results.append(_embed_gemini(item_str))
        else:
            logger.warning("Unknown embedding provider '%s', defaulting to Gemini.", active_provider)
            results.append(_embed_gemini(item_str))

    return results[0] if is_single else results


def get_embedding(
    text: str,
    client: Optional[Any] = None,
    custom_embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None
) -> Optional[List[float]]:
    """
    Computes text embedding vector. Backwards compatibility wrapper for embed(text).
    """
    return embed(text, custom_embed_fn=custom_embed_fn)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Computes cosine similarity between two numeric vectors.
    Returns value between -1.0 and 1.0 (or 0.0 on zero vectors / dimension mismatch).
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot / (norm_a * norm_b)


class VectorStore:
    """
    Lightweight, disk-persisted vector store.
    Stores pre-computed chunk vectors and metadata under data/index/.
    Runs top-k similarity search using pure Python cosine similarity
    with zero external database or C-extension dependencies.
    """

    def __init__(self, index_path: Optional[str] = None):
        self.index_path = index_path or DEFAULT_INDEX_FILE
        self.entries: List[Dict[str, Any]] = []  # List of {"chunk_id": str, "vector": List[float], "metadata": Dict}
        self.load()

    def load(self) -> bool:
        """Loads index entries from disk if available."""
        if not os.path.exists(self.index_path):
            self.entries = []
            return False

        try:
            with open(self.index_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    self.entries = data
                    logger.info("Loaded %d indexed vectors from %s", len(self.entries), self.index_path)
                    return True
        except Exception as e:
            logger.error("Failed to load vector index from %s: %s", self.index_path, str(e))
            self.entries = []

        return False

    def save(self) -> bool:
        """Saves current index entries to disk."""
        target_dir = os.path.dirname(self.index_path)
        os.makedirs(target_dir, exist_ok=True)

        try:
            with open(self.index_path, "w", encoding="utf-8") as f:
                json.dump(self.entries, f, ensure_ascii=False)
            logger.info("Saved %d indexed vectors to %s", len(self.entries), self.index_path)
            return True
        except Exception as e:
            logger.error("Failed to save vector index to %s: %s", self.index_path, str(e))
            return False

    def add_chunks(
        self,
        chunks: List[KnowledgeChunk],
        embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None
    ) -> int:
        """
        Embeds and stores chunks in the index.
        Returns number of successfully embedded and stored chunks.
        """
        added_count = 0
        existing_chunk_ids = {e["chunk_id"] for e in self.entries}

        for chunk in chunks:
            if chunk.chunk_id in existing_chunk_ids:
                continue

            vector = get_embedding(chunk.content, custom_embed_fn=embed_fn)
            if vector is None:
                logger.warning("Skipping chunk %s due to embedding failure.", chunk.chunk_id)
                continue

            entry = {
                "chunk_id": chunk.chunk_id,
                "vector": vector,
                "metadata": chunk.to_dict()
            }
            self.entries.append(entry)
            existing_chunk_ids.add(chunk.chunk_id)
            added_count += 1

        return added_count

    def search(
        self,
        query: str,
        k: Optional[int] = None,
        min_score: Optional[float] = None,
        embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None,
        topic_filter: Optional[str] = None,
        source_filter: Optional[str] = None,
        language_filter: Optional[str] = None,
        source: Optional[str] = None,
        topic: Optional[str] = None,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs top-k cosine similarity search.
        Filters by topic, source, and language (accepts source/source_filter, topic/topic_filter, language/language_filter).
        Applies top-k (from Config.RAG_TOP_K) and cutoff (from Config.RAG_MIN_SCORE, defaulting to 0.45).
        Returns a list of match dicts: {"chunk": metadata_dict, "score": float}
        """
        if not self.entries or not query or not query.strip():
            return []

        effective_k = k if k is not None else getattr(Config, "RAG_TOP_K", 3)
        effective_min_score = min_score if min_score is not None else (getattr(Config, "RAG_MIN_SCORE", 0.45) if k is None else 0.0)
        effective_source = source or source_filter
        effective_topic = topic or topic_filter
        effective_lang = language or language_filter

        query_vec = embed(query, custom_embed_fn=embed_fn)
        if query_vec is None:
            logger.warning("Could not generate query embedding. Returning empty search results.")
            return []

        scored_results: List[Tuple[float, Dict[str, Any]]] = []

        for entry in self.entries:
            meta = entry.get("metadata", {})

            # Topic filtering
            if effective_topic:
                entry_topic = meta.get("topic", "").strip().lower()
                if entry_topic != effective_topic.strip().lower():
                    continue

            # Source filtering
            if effective_source:
                entry_source = meta.get("source", "").strip().lower()
                s_filter = effective_source.strip().lower()
                if s_filter != entry_source and s_filter not in entry_source:
                    continue

            # Language filtering
            if effective_lang:
                entry_lang = meta.get("language", "").strip().lower()
                if entry_lang != effective_lang.strip().lower():
                    continue

            vec = entry.get("vector", [])
            score = cosine_similarity(query_vec, vec)

            # Score cutoff
            if score < effective_min_score:
                continue

            scored_results.append((score, meta))

        # Sort descending by cosine similarity score
        scored_results.sort(key=lambda x: x[0], reverse=True)

        top_k = scored_results[:effective_k]
        return [{"chunk": meta, "score": round(score, 4)} for score, meta in top_k]

    def count(self) -> int:
        """Returns the number of indexed vectors."""
        return len(self.entries)

    def is_empty(self) -> bool:
        """Checks if the vector store is empty."""
        return len(self.entries) == 0

    def clear(self) -> None:
        """Clears all vectors in memory and on disk."""
        self.entries = []
        if os.path.exists(self.index_path):
            try:
                os.remove(self.index_path)
            except OSError:
                pass
