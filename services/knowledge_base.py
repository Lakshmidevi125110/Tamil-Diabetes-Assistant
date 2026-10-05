import os
import re
import json
import hashlib
import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Set, Tuple

logger = logging.getLogger(__name__)

DEFAULT_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")


@dataclass
class KnowledgeDocument:
    """Represents a validated medical knowledge base document."""
    id: str
    source: str
    source_type: str
    title: str
    url: str
    publication_date: str
    retrieved_at: str
    topic: str
    content: str
    language: str = "en"
    authority_level: int = 1
    content_hash: str = ""

    def __post_init__(self):
        if not self.content_hash and self.content:
            self.content_hash = hashlib.sha256(self.content.encode("utf-8")).hexdigest()
        try:
            self.authority_level = int(self.authority_level)
        except (ValueError, TypeError):
            self.authority_level = 1


@dataclass
class KnowledgeChunk:
    """Represents a discrete text chunk preserving document-level metadata."""
    chunk_id: str
    doc_id: str
    chunk_index: int
    total_chunks: int
    content: str
    content_hash: str
    word_count: int
    source: str
    source_type: str
    title: str
    url: str
    publication_date: str
    retrieved_at: str
    topic: str
    language: str
    authority_level: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def clean_text(raw_text: str) -> str:
    """
    Cleans raw document text:
    - Normalizes unicode whitespace and line endings
    - Strips non-printable control characters
    - Preserves multilingual characters (Tamil, English) and punctuation
    - Collapses excessive empty lines and spaces
    """
    if not raw_text:
        return ""

    # Replace carriage returns and tabs
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")

    # Remove non-printable control characters (except newline)
    text = "".join(ch for ch in text if ch == "\n" or ch >= " ")

    # Collapse multiple spaces per line
    lines = []
    for line in text.split("\n"):
        cleaned_line = re.sub(r" +", " ", line).strip()
        lines.append(cleaned_line)

    # Collapse more than 2 consecutive newlines into 2
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

    return cleaned


def chunk_text(
    text: str,
    target_words: int = 400,
    min_words: int = 300,
    max_words: int = 500,
    overlap_words: int = 50
) -> List[Tuple[str, int]]:
    """
    Chunks cleaned text into overlapping segments targeting 300 to 500 words.
    Returns a list of (chunk_content, word_count) tuples.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    words = cleaned.split()
    total_words = len(words)

    if total_words <= max_words:
        return [(cleaned, total_words)]

    chunks: List[Tuple[str, int]] = []
    start = 0
    step = max(target_words - overlap_words, 1)

    while start < total_words:
        end = min(start + target_words, total_words)

        chunk_words = words[start:end]
        chunk_str = " ".join(chunk_words)
        chunks.append((chunk_str, len(chunk_words)))

        if end >= total_words:
            break

        # If next chunk's remainder would be below min_words, anchor start from the end
        if (total_words - (start + step)) < min_words:
            start = max(start + 1, total_words - target_words)
        else:
            start = start + step

    return chunks


def parse_frontmatter_document(file_content: str, fallback_id: str) -> Optional[KnowledgeDocument]:
    """
    Parses a markdown or plain text document with YAML-style frontmatter headers.
    Headers are enclosed between opening and closing '---' lines.
    """
    content = file_content.strip()
    metadata: Dict[str, Any] = {}
    body_text = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            raw_meta = parts[1].strip()
            body_text = parts[2].strip()

            for line in raw_meta.split("\n"):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip().lower()
                    val = val.strip().strip("\"'")
                    metadata[key] = val

    if not body_text:
        return None

    cleaned_content = clean_text(body_text)
    doc_id = metadata.get("id") or fallback_id

    return KnowledgeDocument(
        id=doc_id,
        source=metadata.get("source", "Unknown Source"),
        source_type=metadata.get("source_type", "reference"),
        title=metadata.get("title", doc_id),
        url=metadata.get("url", ""),
        publication_date=metadata.get("publication_date", "Unknown"),
        retrieved_at=metadata.get("retrieved_at", "Unknown"),
        topic=metadata.get("topic", "general"),
        content=cleaned_content,
        language=metadata.get("language", "en"),
        authority_level=int(metadata.get("authority_level", 1)),
        content_hash=hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()
    )


def parse_json_document(file_content: str, fallback_id: str) -> List[KnowledgeDocument]:
    """Parses a JSON file containing either a single document object or a list of documents."""
    try:
        data = json.loads(file_content)
    except json.JSONDecodeError as e:
        logger.error("JSON decode error in document: %s", str(e))
        return []

    items = data if isinstance(data, list) else [data]
    docs: List[KnowledgeDocument] = []

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        content = item.get("content", "")
        if not content:
            continue

        cleaned_content = clean_text(content)
        item_id = item.get("id") or f"{fallback_id}_{idx}"

        doc = KnowledgeDocument(
            id=item_id,
            source=item.get("source", "Unknown Source"),
            source_type=item.get("source_type", "reference"),
            title=item.get("title", item_id),
            url=item.get("url", ""),
            publication_date=item.get("publication_date", "Unknown"),
            retrieved_at=item.get("retrieved_at", "Unknown"),
            topic=item.get("topic", "general"),
            content=cleaned_content,
            language=item.get("language", "en"),
            authority_level=int(item.get("authority_level", 1)),
            content_hash=hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()
        )
        docs.append(doc)

    return docs


class KnowledgeBase:
    """
    Manages knowledge base ingestion, chunking, deduplication, and file-change reindexing.
    Does not use vectors yet (prepared for Module C2+ vector embeddings).
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or DEFAULT_KNOWLEDGE_DIR
        self.documents: Dict[str, KnowledgeDocument] = {}
        self.chunks: List[KnowledgeChunk] = []
        self._doc_content_hashes: Set[str] = set()
        self._chunk_content_hashes: Set[str] = set()
        # Track file state for change detection: {filepath: {"mtime": float, "hash": str, "doc_ids": List[str]}}
        self._file_registry: Dict[str, Dict[str, Any]] = {}

    def _compute_file_hash(self, filepath: str) -> str:
        """Computes SHA-256 hash of raw file bytes."""
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def load_file(self, filepath: str) -> List[KnowledgeDocument]:
        """Loads and parses documents from a single .md, .txt, or .json file."""
        if not os.path.exists(filepath):
            return []

        base_name = os.path.splitext(os.path.basename(filepath))[0]
        ext = os.path.splitext(filepath)[1].lower()

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.error("Failed to read knowledge file %s: %s", filepath, str(e))
            return []

        if ext == ".json":
            return parse_json_document(content, fallback_id=base_name)
        elif ext in (".md", ".txt"):
            doc = parse_frontmatter_document(content, fallback_id=base_name)
            return [doc] if doc else []

        return []

    def chunk_document(self, doc: KnowledgeDocument) -> List[KnowledgeChunk]:
        """Splits a document into chunks preserving all document metadata."""
        raw_chunks = chunk_text(doc.content, target_words=400, min_words=300, max_words=500, overlap_words=50)
        total_chunks = len(raw_chunks)
        doc_chunks: List[KnowledgeChunk] = []

        for idx, (chunk_str, w_count) in enumerate(raw_chunks):
            chunk_hash = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()
            chunk_obj = KnowledgeChunk(
                chunk_id=f"{doc.id}_chunk_{idx + 1}",
                doc_id=doc.id,
                chunk_index=idx + 1,
                total_chunks=total_chunks,
                content=chunk_str,
                content_hash=chunk_hash,
                word_count=w_count,
                source=doc.source,
                source_type=doc.source_type,
                title=doc.title,
                url=doc.url,
                publication_date=doc.publication_date,
                retrieved_at=doc.retrieved_at,
                topic=doc.topic,
                language=doc.language,
                authority_level=doc.authority_level
            )
            doc_chunks.append(chunk_obj)

        return doc_chunks

    def ingest_document(self, doc: KnowledgeDocument) -> bool:
        """
        Ingests a document with duplicate detection by content hash.
        Returns True if ingested, False if duplicate.
        """
        if doc.content_hash in self._doc_content_hashes:
            logger.info("Skipping duplicate document content: %s (hash: %s)", doc.id, doc.content_hash[:8])
            return False

        self.documents[doc.id] = doc
        self._doc_content_hashes.add(doc.content_hash)

        doc_chunks = self.chunk_document(doc)
        for chunk in doc_chunks:
            if chunk.content_hash not in self._chunk_content_hashes:
                self.chunks.append(chunk)
                self._chunk_content_hashes.add(chunk.content_hash)

        return True

    def remove_document(self, doc_id: str) -> None:
        """Removes a document and all its chunks from the in-memory index."""
        if doc_id in self.documents:
            doc = self.documents.pop(doc_id)
            self._doc_content_hashes.discard(doc.content_hash)

        # Remove chunks
        chunks_to_remove = [c for c in self.chunks if c.doc_id == doc_id]
        for c in chunks_to_remove:
            self._chunk_content_hashes.discard(c.content_hash)
        self.chunks = [c for c in self.chunks if c.doc_id != doc_id]

    def sync(self) -> Dict[str, Any]:
        """
        Scans data_dir, detects new, modified, and deleted files,
        and incrementally re-indexes documents and chunks.
        """
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0, "total_chunks": 0}

        report = {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0}
        current_files: Set[str] = set()

        # Find all .md, .txt, .json files (excluding README.md)
        for root, _, files in os.walk(self.data_dir):
            for file in files:
                if file.lower() == "readme.md":
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in (".md", ".txt", ".json"):
                    full_path = os.path.abspath(os.path.join(root, file))
                    current_files.add(full_path)

        # 1. Detect deleted files
        registered_files = list(self._file_registry.keys())
        for reg_file in registered_files:
            if reg_file not in current_files:
                for doc_id in self._file_registry[reg_file].get("doc_ids", []):
                    self.remove_document(doc_id)
                del self._file_registry[reg_file]
                report["deleted"] += 1

        # 2. Check for added or modified files
        for fpath in current_files:
            try:
                mtime = os.path.getmtime(fpath)
            except OSError:
                continue

            prev_info = self._file_registry.get(fpath)
            if prev_info and prev_info.get("mtime") == mtime:
                report["unchanged"] += 1
                continue

            # File is either new or modified; compute hash to verify actual content change
            current_hash = self._compute_file_hash(fpath)
            if prev_info and prev_info.get("hash") == current_hash:
                # mtime touched but content identical
                self._file_registry[fpath]["mtime"] = mtime
                report["unchanged"] += 1
                continue

            # If previously registered, remove old docs first
            if prev_info:
                for old_doc_id in prev_info.get("doc_ids", []):
                    self.remove_document(old_doc_id)
                report["updated"] += 1
            else:
                report["added"] += 1

            # Ingest docs from file
            docs = self.load_file(fpath)
            ingested_ids: List[str] = []
            for doc in docs:
                if self.ingest_document(doc):
                    ingested_ids.append(doc.id)

            self._file_registry[fpath] = {
                "mtime": mtime,
                "hash": current_hash,
                "doc_ids": ingested_ids
            }

        report["total_documents"] = len(self.documents)
        report["total_chunks"] = len(self.chunks)
        return report

    def get_all_chunks(self) -> List[KnowledgeChunk]:
        """Returns all indexed knowledge chunks."""
        return list(self.chunks)

    def get_chunks_by_topic(self, topic: str) -> List[KnowledgeChunk]:
        """Returns chunks filtered by topic (case-insensitive)."""
        t_lower = topic.strip().lower()
        return [c for c in self.chunks if c.topic.lower() == t_lower]

    def get_document(self, doc_id: str) -> Optional[KnowledgeDocument]:
        """Retrieves a document by ID."""
        return self.documents.get(doc_id)

    def clear(self) -> None:
        """Clears all in-memory index structures and file registries."""
        self.documents.clear()
        self.chunks.clear()
        self._doc_content_hashes.clear()
        self._chunk_content_hashes.clear()
        self._file_registry.clear()
