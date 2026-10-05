import os
import json
import pytest
from services.knowledge_base import (
    KnowledgeBase,
    KnowledgeDocument,
    KnowledgeChunk,
    clean_text,
    chunk_text,
    parse_frontmatter_document,
    parse_json_document
)

DUMMY_HEADER = "[DUMMY TEST DATA FOR UNIT TESTS ONLY - NOT REAL MEDICAL ADVICE]"

def generate_dummy_words(count: int, prefix: str = "word") -> str:
    """Helper to generate a specific number of dummy words for chunking tests."""
    return " ".join(f"{prefix}_{i}" for i in range(count))


def test_clean_text_normalizes_whitespace_and_preserves_tamil():
    """Verify that clean_text removes non-printable artifacts, collapses spaces, and preserves Tamil."""
    raw = (
        f"{DUMMY_HEADER}\n\n\n"
        "This is   a test   with   excessive    spaces.\r\n\r\n"
        "தமிழ் சோதனை உரை:\tமருத்துவ விழிப்புணர்வு.\x00\x07\n\n\n\n"
        "Final paragraph."
    )
    cleaned = clean_text(raw)
    assert "\x00" not in cleaned
    assert "\x07" not in cleaned
    assert "\r" not in cleaned
    assert "  " not in cleaned # no double spaces
    assert "தமிழ் சோதனை உரை: மருத்துவ விழிப்புணர்வு." in cleaned
    assert cleaned.count("\n\n") == 3
    assert "\n\n\n" not in cleaned


def test_chunking_word_counts_and_overlap():
    """Verify chunking produces chunks of about 300-500 words with overlap."""
    # Generate 900 dummy words
    text = f"{DUMMY_HEADER} " + generate_dummy_words(900, "testtoken")
    chunks = chunk_text(text, target_words=400, min_words=300, max_words=500, overlap_words=50)

    assert len(chunks) >= 2, f"Expected multiple chunks, got {len(chunks)}"

    for chunk_str, word_count in chunks:
        # Every chunk should be within or very close to target range
        assert 300 <= word_count <= 500

    # Verify overlap exists between consecutive chunks
    chunk1_words = set(chunks[0][0].split()[-50:])
    chunk2_words = set(chunks[1][0].split()[:50])
    overlap = chunk1_words.intersection(chunk2_words)
    assert len(overlap) > 0, "Consecutive chunks must share overlapping words."


def test_load_json_document(tmp_path):
    """Verify loading documents from a local JSON file with all required metadata fields."""
    dummy_doc = {
        "id": "dummy_json_doc_01",
        "source": "Dummy Health Body",
        "source_type": "guideline",
        "title": "Dummy Diabetes Guideline",
        "url": "https://example.org/dummy_guideline",
        "publication_date": "2024-01-15",
        "retrieved_at": "2026-10-05",
        "topic": "basics",
        "language": "en",
        "authority_level": 1,
        "content": f"{DUMMY_HEADER} " + generate_dummy_words(350, "token")
    }

    json_file = tmp_path / "test_doc.json"
    json_file.write_text(json.dumps([dummy_doc]), encoding="utf-8")

    kb = KnowledgeBase(data_dir=str(tmp_path))
    docs = kb.load_file(str(json_file))

    assert len(docs) == 1
    doc = docs[0]
    assert doc.id == "dummy_json_doc_01"
    assert doc.source == "Dummy Health Body"
    assert doc.source_type == "guideline"
    assert doc.title == "Dummy Diabetes Guideline"
    assert doc.url == "https://example.org/dummy_guideline"
    assert doc.publication_date == "2024-01-15"
    assert doc.retrieved_at == "2026-10-05"
    assert doc.topic == "basics"
    assert doc.language == "en"
    assert doc.authority_level == 1
    assert doc.content_hash != ""


def test_load_markdown_and_text_frontmatter(tmp_path):
    """Verify loading documents from .md and .txt files with frontmatter."""
    md_content = f"""---
id: dummy_md_doc_02
source: Verified Medical Association
source_type: report
title: Dietary Educational Notes
url: https://example.org/diet_notes
publication_date: 2023-11-20
retrieved_at: 2026-10-05
topic: healthy eating
language: en
authority_level: 2
---

{DUMMY_HEADER}
""" + generate_dummy_words(320, "dietword")

    md_file = tmp_path / "diet.md"
    md_file.write_text(md_content, encoding="utf-8")

    kb = KnowledgeBase(data_dir=str(tmp_path))
    docs = kb.load_file(str(md_file))

    assert len(docs) == 1
    doc = docs[0]
    assert doc.id == "dummy_md_doc_02"
    assert doc.source == "Verified Medical Association"
    assert doc.source_type == "report"
    assert doc.topic == "healthy eating"
    assert doc.authority_level == 2


def test_metadata_preserved_on_every_chunk(tmp_path):
    """Verify that every chunk preserves document-level metadata."""
    doc = KnowledgeDocument(
        id="dummy_multi_chunk_doc",
        source="Official Health Organization",
        source_type="fact_sheet",
        title="Comprehensive Glucose Overview",
        url="https://example.org/glucose",
        publication_date="2024-05-10",
        retrieved_at="2026-10-05",
        topic="glucose",
        language="en",
        authority_level=1,
        content=f"{DUMMY_HEADER} " + generate_dummy_words(850, "glucoseword")
    )

    kb = KnowledgeBase(data_dir=str(tmp_path))
    kb.ingest_document(doc)

    assert len(kb.chunks) >= 2
    for idx, chunk in enumerate(kb.chunks):
        assert chunk.doc_id == "dummy_multi_chunk_doc"
        assert chunk.chunk_id == f"dummy_multi_chunk_doc_chunk_{idx + 1}"
        assert chunk.chunk_index == idx + 1
        assert chunk.total_chunks == len(kb.chunks)
        assert chunk.source == "Official Health Organization"
        assert chunk.source_type == "fact_sheet"
        assert chunk.title == "Comprehensive Glucose Overview"
        assert chunk.url == "https://example.org/glucose"
        assert chunk.publication_date == "2024-05-10"
        assert chunk.retrieved_at == "2026-10-05"
        assert chunk.topic == "glucose"
        assert chunk.language == "en"
        assert chunk.authority_level == 1
        assert chunk.content_hash != ""
        assert chunk.word_count > 0


def test_duplicate_detection_by_content_hash(tmp_path):
    """Verify that duplicate documents with identical content hashes are skipped."""
    shared_content = f"{DUMMY_HEADER} " + generate_dummy_words(350, "uniqueword")

    doc1 = KnowledgeDocument(
        id="doc_first",
        source="Source A",
        source_type="sheet",
        title="Document 1",
        url="https://example.org/1",
        publication_date="2023-01-01",
        retrieved_at="2026-10-05",
        topic="basics",
        language="en",
        authority_level=1,
        content=shared_content
    )

    doc2 = KnowledgeDocument(
        id="doc_second_copy",
        source="Source B",
        source_type="sheet",
        title="Document 2 Copy",
        url="https://example.org/2",
        publication_date="2023-02-01",
        retrieved_at="2026-10-05",
        topic="basics",
        language="en",
        authority_level=1,
        content=shared_content
    )

    kb = KnowledgeBase(data_dir=str(tmp_path))
    assert kb.ingest_document(doc1) is True
    # doc2 has identical content -> duplicate hash detected!
    assert kb.ingest_document(doc2) is False
    assert len(kb.documents) == 1
    assert "doc_first" in kb.documents
    assert "doc_second_copy" not in kb.documents


def test_reindexing_when_file_changes_and_deletions(tmp_path):
    """Verify incremental sync detects added, unchanged, modified, and deleted files."""
    kb = KnowledgeBase(data_dir=str(tmp_path))

    test_file = tmp_path / "doc_sync.json"
    doc_data = {
        "id": "sync_test_doc",
        "source": "Test Source",
        "source_type": "article",
        "title": "Version 1",
        "url": "https://example.org/v1",
        "publication_date": "2024-01-01",
        "retrieved_at": "2026-10-05",
        "topic": "basics",
        "language": "en",
        "authority_level": 3,
        "content": f"{DUMMY_HEADER} " + generate_dummy_words(320, "original")
    }
    test_file.write_text(json.dumps(doc_data), encoding="utf-8")

    # 1. Initial sync (added)
    report1 = kb.sync()
    assert report1["added"] == 1
    assert report1["total_documents"] == 1
    assert kb.get_document("sync_test_doc").title == "Version 1"

    # 2. Subsequent sync without change (unchanged)
    report2 = kb.sync()
    assert report2["unchanged"] == 1
    assert report2["added"] == 0
    assert report2["updated"] == 0

    # 3. Modify file content (updated)
    doc_data["title"] = "Version 2 Modified"
    doc_data["content"] = f"{DUMMY_HEADER} " + generate_dummy_words(340, "modified")
    test_file.write_text(json.dumps(doc_data), encoding="utf-8")

    report3 = kb.sync()
    assert report3["updated"] == 1
    assert kb.get_document("sync_test_doc").title == "Version 2 Modified"

    # 4. Delete file (deleted)
    test_file.unlink()
    report4 = kb.sync()
    assert report4["deleted"] == 1
    assert report4["total_documents"] == 0
    assert kb.get_document("sync_test_doc") is None
    assert len(kb.get_all_chunks()) == 0


def test_tamil_multilingual_document_ingestion(tmp_path):
    """Verify ingestion of Tamil document preserving Tamil characters and metadata."""
    tamil_content = (
        f"{DUMMY_HEADER}\n"
        "சர்க்கரை நோய் மேலாண்மையில் சமச்சீரான உணவு முறை முக்கிய பங்கு வகிக்கிறது. "
        "நார்ச்சத்து நிறைந்த காய்கறிகள், முழு தானியங்கள் மற்றும் போதுமான நீர்ச்சத்து "
        "இரத்த சர்க்கரை அளவை சீராக வைத்திருக்க உதவுகின்றன. "
    ) * 40  # Repeat to reach reasonable length

    doc_data = {
        "id": "tamil_dummy_doc_01",
        "source": "Tamil Health Initiative",
        "source_type": "fact_sheet",
        "title": "நீரிழிவு விழிப்புணர்வு",
        "url": "https://example.org/tamil_guide",
        "publication_date": "2024-03-01",
        "retrieved_at": "2026-10-05",
        "topic": "healthy eating",
        "language": "ta",
        "authority_level": 1,
        "content": tamil_content
    }

    t_file = tmp_path / "tamil_guide.json"
    t_file.write_text(json.dumps(doc_data), encoding="utf-8")

    kb = KnowledgeBase(data_dir=str(tmp_path))
    kb.sync()

    doc = kb.get_document("tamil_dummy_doc_01")
    assert doc is not None
    assert doc.language == "ta"
    assert "நீரிழிவு விழிப்புணர்வு" in doc.title
    chunks = kb.get_chunks_by_topic("healthy eating")
    assert len(chunks) >= 1
    assert "நார்ச்சத்து" in chunks[0].content
