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
    version: int = 1
    version_id: str = ""
    last_verified_date: str = ""
    ingestion_date: str = ""
    source_name: str = ""
    source_url: str = ""
    document_type: str = ""

    def __post_init__(self):
        if not self.content_hash and self.content:
            self.content_hash = hashlib.sha256(self.content.encode("utf-8")).hexdigest()
        try:
            self.authority_level = int(self.authority_level)
        except (ValueError, TypeError):
            self.authority_level = 1
        try:
            self.version = int(self.version)
        except (ValueError, TypeError):
            self.version = 1
        if not self.version_id:
            self.version_id = f"{self.id}_v{self.version}"
        # Normalize and synchronize alias fields
        if not self.source_name:
            self.source_name = self.source
        if not self.source:
            self.source = self.source_name
        if not self.source_url:
            self.source_url = self.url
        if not self.url:
            self.url = self.source_url
        if not self.document_type:
            self.document_type = self.source_type
        if not self.source_type:
            self.source_type = self.document_type
        if not self.last_verified_date:
            self.last_verified_date = self.retrieved_at or ""
        if not self.retrieved_at:
            self.retrieved_at = self.last_verified_date
        if not self.ingestion_date:
            from datetime import datetime, timezone
            self.ingestion_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")


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
    heading: str = ""
    version: int = 1
    version_id: str = ""
    last_verified_date: str = ""
    ingestion_date: str = ""
    source_name: str = ""
    source_url: str = ""
    document_type: str = ""

    def __post_init__(self):
        try:
            self.version = int(self.version)
        except (ValueError, TypeError):
            self.version = 1
        if not self.version_id:
            self.version_id = f"{self.doc_id}_v{self.version}"
        if not self.source_name:
            self.source_name = self.source
        if not self.source:
            self.source = self.source_name
        if not self.source_url:
            self.source_url = self.url
        if not self.url:
            self.url = self.source_url
        if not self.document_type:
            self.document_type = self.source_type
        if not self.source_type:
            self.source_type = self.document_type
        if not self.last_verified_date:
            self.last_verified_date = self.retrieved_at or ""
        if not self.retrieved_at:
            self.retrieved_at = self.last_verified_date

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# Navigation and boilerplate artifact patterns
NAV_PATTERNS = [
    re.compile(r"^\s*(?:home\s*(?:>|»|/|\|)\s*.*|breadcrumbs?)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:skip to (?:main )?content|back to top|table of contents)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:menu|search|navigation|nav)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:next page|previous page|next|previous)\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:cookie policy|privacy policy|terms of (?:use|service)|all rights reserved\.?)\s*$", re.IGNORECASE),
]

def clean_text(raw_text: str) -> str:
    """
    Cleans raw document text:
    - Normalizes unicode whitespace and line endings
    - Strips non-printable control characters
    - Removes navigation text (breadcrumbs, skip links, menu/cookies)
    - Removes consecutive repeated headers
    - Deduplicates identical paragraphs
    - Preserves multilingual characters (Tamil, English) and markdown structure
    """
    if not raw_text:
        return ""

    # Replace carriage returns and tabs
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")

    # Remove non-printable control characters (except newline)
    text = "".join(ch for ch in text if ch == "\n" or ch >= " ")

    # Process line-by-line: remove navigation text and consecutive repeated headers
    lines = []
    last_header = ""
    heading_pattern = re.compile(r"^(#{1,6}\s+.*)$")

    for line in text.split("\n"):
        cleaned_line = re.sub(r" +", " ", line).strip()
        if not cleaned_line:
            lines.append("")
            continue

        # Check navigation boilerplate
        if any(pat.match(cleaned_line) for pat in NAV_PATTERNS):
            continue

        # Check repeated headers
        h_match = heading_pattern.match(cleaned_line)
        if h_match:
            header_text = h_match.group(1).strip().lower()
            if header_text == last_header:
                continue
            last_header = header_text
            lines.append("")
            lines.append(cleaned_line)
            lines.append("")
            continue
        else:
            last_header = ""

        lines.append(cleaned_line)

    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # Deduplicate paragraphs (preserve first occurrence of identical paragraphs)
    paragraphs = text.split("\n\n")
    seen_paras: Set[str] = set()
    unique_paras: List[str] = []

    for p in paragraphs:
        p_strip = p.strip()
        if not p_strip:
            continue
        p_norm = re.sub(r"\s+", " ", p_strip).lower()
        if len(p_norm) > 25 and p_norm in seen_paras:
            continue
        seen_paras.add(p_norm)
        unique_paras.append(p_strip)

    return "\n\n".join(unique_paras).strip()


def split_by_headings(text: str, default_heading: str = "") -> List[Tuple[str, str]]:
    """
    Splits markdown or text into sections by headings (#, ##, ###, etc.).
    Returns a list of (heading_title, section_body) tuples.
    If no headings are found, returns [(default_heading, text)].
    """
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+)$")
    lines = text.split("\n")
    sections: List[Tuple[str, str]] = []
    current_heading = default_heading
    current_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        match = heading_pattern.match(stripped)
        if match:
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_heading, body))
                current_lines = []
            current_heading = match.group(2).strip()
        else:
            current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_heading, body))

    if not sections:
        return [(default_heading, text.strip())]

    return sections


def split_into_atomic_units(text: str) -> List[str]:
    """
    Splits text into atomic units (sentences and list items).
    Guarantees that a sentence or a list item is never cut in half.
    """
    if not text:
        return []

    units: List[str] = []
    lines = text.split("\n")
    list_item_pattern = re.compile(r"^\s*([-*+•]|\d+[\.)])\s+")
    sentence_pattern = re.compile(r"(?<=[.!?])\s+(?=[A-Z\u0B80-\u0BFF0-9])")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if list_item_pattern.match(stripped):
            units.append(stripped)
        else:
            sentences = sentence_pattern.split(stripped)
            for s in sentences:
                s_strip = s.strip()
                if not s_strip:
                    continue
                words = s_strip.split()
                # If a block is a huge token stream without sentence punctuation (> 450 words)
                if len(words) > 450:
                    for i in range(0, len(words), 50):
                        sub_str = " ".join(words[i:i + 50])
                        if sub_str:
                            units.append(sub_str)
                else:
                    units.append(s_strip)

    if not units and text.strip():
        units = [text.strip()]

    return units


def chunk_text_heading_aware(
    text: str,
    target_words: int = 400,
    min_words: int = 300,
    max_words: int = 500,
    overlap_words: int = 50,
    default_heading: str = ""
) -> List[Tuple[str, int, str]]:
    """
    Heading-aware chunking:
    1. Splits on headings first.
    2. Then splits each section into atomic units (never in the middle of a sentence or list item).
    3. Groups units by size with small overlap.
    4. Preserves the heading in each chunk's metadata: (chunk_content, word_count, heading).
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    sections = split_by_headings(cleaned, default_heading=default_heading)
    results: List[Tuple[str, int, str]] = []

    for heading, section_text in sections:
        units = split_into_atomic_units(section_text)
        if not units:
            continue

        unit_counts = [len(u.split()) for u in units]
        total_words = sum(unit_counts)

        if total_words <= max_words:
            sep = "\n" if any(u.startswith(("-", "*", "•")) for u in units) else " "
            results.append((sep.join(units), total_words, heading))
            continue

        start_idx = 0
        n = len(units)

        while start_idx < n:
            curr_units: List[str] = []
            curr_words = 0
            end_idx = start_idx

            while end_idx < n:
                u = units[end_idx]
                u_words = unit_counts[end_idx]

                if curr_words + u_words > max_words and curr_words >= min_words:
                    break

                curr_units.append(u)
                curr_words += u_words
                end_idx += 1

                if curr_words >= target_words:
                    break

            if end_idx == start_idx:
                curr_units.append(units[start_idx])
                curr_words += unit_counts[start_idx]
                end_idx += 1

            sep = "\n" if any(u.startswith(("-", "*", "•")) for u in curr_units) else " "
            chunk_str = sep.join(curr_units)
            results.append((chunk_str, curr_words, heading))

            if end_idx >= n:
                break

            # Calculate overlap from trailing atomic units
            overlap_accum = 0
            overlap_start = end_idx
            for j in range(end_idx - 1, start_idx - 1, -1):
                overlap_accum += unit_counts[j]
                overlap_start = j
                if overlap_accum >= overlap_words:
                    break

            next_start = max(overlap_start, start_idx + 1)

            # If remainder would be below min_words, anchor start backwards from the end
            remainder_words = sum(unit_counts[next_start:n])
            if remainder_words < min_words and total_words >= min_words:
                accum = 0
                anchored_start = next_start
                for j in range(n - 1, -1, -1):
                    accum += unit_counts[j]
                    anchored_start = j
                    if accum >= target_words or accum >= min_words:
                        break
                if anchored_start > start_idx:
                    next_start = anchored_start

            start_idx = next_start

    return results


def chunk_text(
    text: str,
    target_words: int = 400,
    min_words: int = 300,
    max_words: int = 500,
    overlap_words: int = 50
) -> List[Tuple[str, int]]:
    """
    Standard chunking wrapper for backwards compatibility with tests and callers.
    Returns a list of (chunk_content, word_count) tuples.
    """
    heading_chunks = chunk_text_heading_aware(
        text,
        target_words=target_words,
        min_words=min_words,
        max_words=max_words,
        overlap_words=overlap_words
    )
    return [(chunk_str, w_count) for chunk_str, w_count, _ in heading_chunks]


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
    src = metadata.get("source_name") or metadata.get("source", "Unknown Source")
    url = metadata.get("url") or metadata.get("source_url", "")
    last_verified = metadata.get("last_verified_date") or metadata.get("retrieved_at", "Unknown")
    pub_date = metadata.get("publication_date", "Unknown")
    ingest_date = metadata.get("ingestion_date", "")
    try:
        version_val = int(metadata.get("version") or metadata.get("document_version") or 1)
    except (ValueError, TypeError):
        version_val = 1
    doc_type = metadata.get("document_type") or metadata.get("source_type", "reference")

    return KnowledgeDocument(
        id=doc_id,
        source=src,
        source_type=doc_type,
        title=metadata.get("title", doc_id),
        url=url,
        publication_date=pub_date,
        retrieved_at=last_verified,
        topic=metadata.get("topic", "general"),
        content=cleaned_content,
        language=metadata.get("language", "en"),
        authority_level=int(metadata.get("authority_level", 1)),
        content_hash=hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest(),
        version=version_val,
        last_verified_date=last_verified,
        ingestion_date=ingest_date,
        source_name=src,
        source_url=url,
        document_type=doc_type
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
        src = item.get("source_name") or item.get("source", "Unknown Source")
        url = item.get("url") or item.get("source_url", "")
        last_verified = item.get("last_verified_date") or item.get("retrieved_at", "Unknown")
        pub_date = item.get("publication_date", "Unknown")
        ingest_date = item.get("ingestion_date", "")
        try:
            version_val = int(item.get("version") or item.get("document_version") or 1)
        except (ValueError, TypeError):
            version_val = 1
        doc_type = item.get("document_type") or item.get("source_type", "reference")

        doc = KnowledgeDocument(
            id=item_id,
            source=src,
            source_type=doc_type,
            title=item.get("title", item_id),
            url=url,
            publication_date=pub_date,
            retrieved_at=last_verified,
            topic=item.get("topic", "general"),
            content=cleaned_content,
            language=item.get("language", "en"),
            authority_level=int(item.get("authority_level", 1)),
            content_hash=hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest(),
            version=version_val,
            last_verified_date=last_verified,
            ingestion_date=ingest_date,
            source_name=src,
            source_url=url,
            document_type=doc_type
        )
        docs.append(doc)

    return docs


def parse_pdf_document(filepath: str, fallback_id: str) -> Optional[KnowledgeDocument]:
    """
    Extracts text and metadata from a PDF file using pypdf.
    Cleans navigation artifacts, repeated page headers, and duplicate paragraphs.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
        raw_pages = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                raw_pages.append(t)

        full_text = "\n\n".join(raw_pages)
        if not full_text.strip():
            logger.warning("No extractable text found in PDF: %s", filepath)
            return None

        cleaned_content = clean_text(full_text)
        if not cleaned_content:
            return None

        meta = reader.metadata or {}
        title = getattr(meta, "title", None) or fallback_id.replace("_", " ").replace("-", " ").title()
        source = getattr(meta, "author", None) or "Clinical Document"

        has_tamil = bool(re.search(r'[\u0B80-\u0BFF]', cleaned_content))
        lang = "ta" if has_tamil else "en"

        return KnowledgeDocument(
            id=fallback_id,
            source=source,
            source_type="guideline",
            title=title,
            url="",
            publication_date="2026",
            retrieved_at="2026-10",
            topic="diabetes",
            content=cleaned_content,
            language=lang,
            authority_level=1,
            content_hash=hashlib.sha256(cleaned_content.encode("utf-8")).hexdigest()
        )
    except Exception as e:
        logger.error("Error reading PDF %s: %s", filepath, str(e))
        return None


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
        # Version tracking: preserves historical version records on modification/re-ingestion
        self.version_history: Dict[str, List[KnowledgeDocument]] = {}
        self.version_records: Dict[str, KnowledgeDocument] = {}
        self.version_chunks: Dict[str, List[KnowledgeChunk]] = {}

    def _compute_file_hash(self, filepath: str) -> str:
        """Computes SHA-256 hash of raw file bytes."""
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def load_file(self, filepath: str) -> List[KnowledgeDocument]:
        """Loads and parses documents from a single .md, .txt, .pdf, or .json file."""
        if not os.path.exists(filepath):
            return []

        base_name = os.path.splitext(os.path.basename(filepath))[0]
        ext = os.path.splitext(filepath)[1].lower()

        if ext == ".pdf":
            doc = parse_pdf_document(filepath, fallback_id=base_name)
            return [doc] if doc else []

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
        """Splits a document into chunks preserving all document metadata, headings, and versions."""
        raw_chunks = chunk_text_heading_aware(
            doc.content,
            target_words=400,
            min_words=300,
            max_words=500,
            overlap_words=50,
            default_heading=doc.title
        )
        total_chunks = len(raw_chunks)
        doc_chunks: List[KnowledgeChunk] = []

        for idx, (chunk_str, w_count, heading) in enumerate(raw_chunks):
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
                authority_level=doc.authority_level,
                heading=heading,
                version=doc.version,
                version_id=doc.version_id,
                last_verified_date=doc.last_verified_date,
                ingestion_date=doc.ingestion_date,
                source_name=doc.source_name,
                source_url=doc.source_url,
                document_type=doc.document_type
            )
            doc_chunks.append(chunk_obj)

        return doc_chunks

    def ingest_document(self, doc: KnowledgeDocument) -> bool:
        """
        Ingests a document with duplicate detection by content hash.
        If a modified version of an existing document is re-ingested:
        - Keeps the old version record in version_history and version_records (never overwrites silently).
        - Increments document version and version_id.
        - Updates the active document index and chunks.
        Returns True if ingested, False if duplicate content.
        """
        if doc.content_hash in self._doc_content_hashes:
            logger.info("Skipping duplicate document content: %s (hash: %s)", doc.id, doc.content_hash[:8])
            return False

        # If document already exists with different content (modified document being re-ingested)
        if doc.id in self.documents:
            old_doc = self.documents[doc.id]
            if old_doc.content_hash != doc.content_hash:
                # 1. Preserve old version record in history and records
                if doc.id not in self.version_history:
                    self.version_history[doc.id] = []
                if old_doc not in self.version_history[doc.id]:
                    self.version_history[doc.id].append(old_doc)
                self.version_records[old_doc.version_id] = old_doc

                # 2. Preserve old chunks for the old version
                old_chunks = [c for c in self.chunks if c.doc_id == doc.id]
                self.version_chunks[old_doc.version_id] = old_chunks

                # 3. Increment version for the new document if not explicitly higher
                if doc.version <= old_doc.version:
                    doc.version = old_doc.version + 1
                    doc.version_id = f"{doc.id}_v{doc.version}"

                # 4. Remove old content hash and old chunks from active retrieval pool
                self._doc_content_hashes.discard(old_doc.content_hash)
                for c in old_chunks:
                    self._chunk_content_hashes.discard(c.content_hash)
                self.chunks = [c for c in self.chunks if c.doc_id != doc.id]

        elif doc.id in self.version_history:
            # Document existed previously in version history
            history = self.version_history[doc.id]
            max_ver = max(d.version for d in history) if history else 0
            if doc.version <= max_ver:
                doc.version = max_ver + 1
                doc.version_id = f"{doc.id}_v{doc.version}"

        # Ingest active document
        self.documents[doc.id] = doc
        self._doc_content_hashes.add(doc.content_hash)
        self.version_records[doc.version_id] = doc

        if doc.id not in self.version_history:
            self.version_history[doc.id] = []
        if doc not in self.version_history[doc.id]:
            self.version_history[doc.id].append(doc)

        doc_chunks = self.chunk_document(doc)
        for chunk in doc_chunks:
            if chunk.content_hash not in self._chunk_content_hashes:
                self.chunks.append(chunk)
                self._chunk_content_hashes.add(chunk.content_hash)
        self.version_chunks[doc.version_id] = doc_chunks

        return True

    def remove_document(self, doc_id: str) -> None:
        """Removes a document and all its chunks from the active in-memory index."""
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
        and incrementally re-indexes documents and chunks while preserving historical version records.
        """
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0, "total_chunks": 0}

        report = {"added": 0, "updated": 0, "deleted": 0, "unchanged": 0}
        current_files: Set[str] = set()

        # Find all .md, .txt, .json, .pdf files (excluding README.md)
        for root, _, files in os.walk(self.data_dir):
            for file in files:
                if file.lower() == "readme.md":
                    continue
                ext = os.path.splitext(file)[1].lower()
                if ext in (".md", ".txt", ".json", ".pdf"):
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
            current_hash = self._compute_file_hash(fpath)

            if prev_info and prev_info.get("hash") == current_hash:
                self._file_registry[fpath]["mtime"] = mtime
                report["unchanged"] += 1
                continue

            # If previously registered, archive old version record before updating
            if prev_info:
                for old_doc_id in prev_info.get("doc_ids", []):
                    old_doc = self.documents.get(old_doc_id)
                    if old_doc:
                        if old_doc_id not in self.version_history:
                            self.version_history[old_doc_id] = []
                        if old_doc not in self.version_history[old_doc_id]:
                            self.version_history[old_doc_id].append(old_doc)
                        self.version_records[old_doc.version_id] = old_doc
                        self.version_chunks[old_doc.version_id] = [c for c in self.chunks if c.doc_id == old_doc_id]
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
        """Retrieves active document by ID."""
        return self.documents.get(doc_id)

    def get_document_version(self, doc_id: str, version: int) -> Optional[KnowledgeDocument]:
        """Retrieves a specific version record of a document."""
        version_id = f"{doc_id}_v{version}"
        if version_id in self.version_records:
            return self.version_records[version_id]
        for d in self.version_history.get(doc_id, []):
            if d.version == version:
                return d
        return None

    def get_document_history(self, doc_id: str) -> List[KnowledgeDocument]:
        """Retrieves complete version history records for a document."""
        return list(self.version_history.get(doc_id, []))

    def get_document_chunks_for_version(self, version_id: str) -> List[KnowledgeChunk]:
        """Retrieves archived chunks for a specific document version."""
        return list(self.version_chunks.get(version_id, []))

    def clear(self) -> None:
        """Clears all in-memory index structures, version history, and file registries."""
        self.documents.clear()
        self.chunks.clear()
        self._doc_content_hashes.clear()
        self._chunk_content_hashes.clear()
        self._file_registry.clear()
        self.version_history.clear()
        self.version_records.clear()
        self.version_chunks.clear()
