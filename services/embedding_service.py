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


def get_embedding(
    text: str,
    client: Optional[Any] = None,
    custom_embed_fn: Optional[Callable[[str], List[float]]] = None
) -> Optional[List[float]]:
    """
    Computes text embedding vector.
    - If custom_embed_fn is provided (e.g., in unit tests), uses it.
    - Otherwise calls Gemini Embedding API.
    - If API key is missing or call fails, returns None without crashing.
    """
    if not text or not text.strip():
        return None

    if custom_embed_fn:
        try:
            return custom_embed_fn(text)
        except Exception as e:
            logger.error("Custom embedding function error: %s", str(e))
            return None

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
        k: int = 3,
        embed_fn: Optional[Callable[[str], Optional[List[float]]]] = None,
        topic_filter: Optional[str] = None,
        language_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs top-k cosine similarity search.
        Returns a list of match dicts: {"chunk": metadata_dict, "score": float}
        """
        if not self.entries or not query or not query.strip():
            return []

        query_vec = get_embedding(query, custom_embed_fn=embed_fn)
        if query_vec is None:
            logger.warning("Could not generate query embedding. Returning empty search results.")
            return []

        scored_results: List[Tuple[float, Dict[str, Any]]] = []

        for entry in self.entries:
            meta = entry.get("metadata", {})

            # Optional topic and language filtering
            if topic_filter:
                entry_topic = meta.get("topic", "").strip().lower()
                if entry_topic != topic_filter.strip().lower():
                    continue

            if language_filter:
                entry_lang = meta.get("language", "").strip().lower()
                if entry_lang != language_filter.strip().lower():
                    continue

            vec = entry.get("vector", [])
            score = cosine_similarity(query_vec, vec)
            scored_results.append((score, meta))

        # Sort descending by cosine similarity score
        scored_results.sort(key=lambda x: x[0], reverse=True)

        top_k = scored_results[:k]
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
