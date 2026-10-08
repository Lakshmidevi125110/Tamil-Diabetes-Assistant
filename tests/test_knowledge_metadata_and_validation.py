import os
import json
import pytest
import subprocess
import sys
from config import Config
from services.knowledge_base import (
    KnowledgeBase,
    KnowledgeDocument,
    KnowledgeChunk,
    parse_frontmatter_document,
    parse_json_document
)
from scripts.add_document import (
    validate_document_header,
    validate_document_file,
    is_allowed_source,
    add_document
)


# -------------------------------------------------------------------------
# 1. Metadata Fields on KnowledgeDocument and KnowledgeChunk
# -------------------------------------------------------------------------

def test_knowledge_document_and_chunk_metadata_fields():
    """Verify presence and synchronization of version, dates, and source aliases."""
    doc = KnowledgeDocument(
        id="who_test_doc_01",
        source="WHO",
        source_type="fact_sheet",
        title="Diabetes Key Facts",
        url="https://www.who.int/diabetes",
        publication_date="2023-04-01",
        retrieved_at="2026-10-07",
        topic="basics",
        content="General overview of diabetes symptoms and risk factors. " * 30,
        language="en",
        authority_level=1,
        last_verified_date="2026-10-07",
        version=1
    )

    # Verify document fields
    assert doc.version == 1
    assert doc.version_id == "who_test_doc_01_v1"
    assert doc.source_name == "WHO"
    assert doc.source_url == "https://www.who.int/diabetes"
    assert doc.document_type == "fact_sheet"
    assert doc.last_verified_date == "2026-10-07"
    assert doc.ingestion_date != ""

    kb = KnowledgeBase()
    chunks = kb.chunk_document(doc)
    assert len(chunks) >= 1

    chunk = chunks[0]
    assert chunk.version == 1
    assert chunk.version_id == "who_test_doc_01_v1"
    assert chunk.source_name == "WHO"
    assert chunk.source_url == "https://www.who.int/diabetes"
    assert chunk.document_type == "fact_sheet"
    assert chunk.last_verified_date == "2026-10-07"
    assert chunk.ingestion_date != ""

    # Verify to_dict includes all metadata fields
    c_dict = chunk.to_dict()
    assert "version" in c_dict
    assert "version_id" in c_dict
    assert "last_verified_date" in c_dict
    assert "ingestion_date" in c_dict
    assert "source_name" in c_dict
    assert "source_url" in c_dict
    assert "document_type" in c_dict


def test_frontmatter_and_json_parsing_metadata_fields(tmp_path):
    """Verify that frontmatter and JSON parsers correctly populate all metadata fields."""
    md_text = """---
id: icmr_diet_sample
title: Dietary Guide
source_name: ICMR
url: https://main.icmr.nic.in/diet
publication_date: 2022-05-10
last_verified_date: 2026-10-07
topic: healthy eating
language: en
authority_level: 1
document_type: guideline
version: 1
---

Healthy traditional foods help balance blood sugar levels. """ * 35

    md_doc = parse_frontmatter_document(md_text, fallback_id="fallback_id")
    assert md_doc is not None
    assert md_doc.id == "icmr_diet_sample"
    assert md_doc.source_name == "ICMR"
    assert md_doc.source_url == "https://main.icmr.nic.in/diet"
    assert md_doc.last_verified_date == "2026-10-07"
    assert md_doc.version == 1
    assert md_doc.document_type == "guideline"

    # JSON parsing test
    json_data = [{
        "id": "cdc_activity_sample",
        "title": "Physical Activity and Diabetes",
        "source_name": "CDC",
        "url": "https://www.cdc.gov/diabetes/activity",
        "publication_date": "2023-01-15",
        "last_verified_date": "2026-10-07",
        "topic": "physical activity",
        "language": "en",
        "authority_level": 1,
        "document_type": "report",
        "version": 2,
        "content": "Brisk walking 30 minutes daily improves glucose uptake. " * 30
    }]
    json_docs = parse_json_document(json.dumps(json_data), fallback_id="fallback_id")
    assert len(json_docs) == 1
    j_doc = json_docs[0]
    assert j_doc.id == "cdc_activity_sample"
    assert j_doc.source_name == "CDC"
    assert j_doc.source_url == "https://www.cdc.gov/diabetes/activity"
    assert j_doc.version == 2
    assert j_doc.last_verified_date == "2026-10-07"


# -------------------------------------------------------------------------
# 2. Re-ingesting Changed Document Preserves Old Version Record
# -------------------------------------------------------------------------

def test_reingesting_changed_document_preserves_old_version_record(tmp_path):
    """Verify that re-ingesting a changed document increments version and preserves historical record."""
    kb = KnowledgeBase(data_dir=str(tmp_path))

    doc_v1 = KnowledgeDocument(
        id="who_guideline_01",
        source="WHO",
        source_type="guideline",
        title="WHO Diabetes Facts V1",
        url="https://www.who.int/facts",
        publication_date="2021-01-01",
        retrieved_at="2026-10-01",
        topic="basics",
        content="Version 1 content: Early diabetes detection prevents complications. " * 30,
        language="en",
        authority_level=1,
        last_verified_date="2026-10-01",
        version=1
    )

    # 1. Ingest Version 1
    assert kb.ingest_document(doc_v1) is True
    assert kb.get_document("who_guideline_01").title == "WHO Diabetes Facts V1"
    assert kb.get_document("who_guideline_01").version == 1

    # 2. Prepare Version 2 with modified content
    doc_v2 = KnowledgeDocument(
        id="who_guideline_01",
        source="WHO",
        source_type="guideline",
        title="WHO Diabetes Facts V2 Updated",
        url="https://www.who.int/facts",
        publication_date="2023-01-01",
        retrieved_at="2026-10-07",
        topic="basics",
        content="Version 2 content: Updated guidelines emphasize lifestyle interventions. " * 35,
        language="en",
        authority_level=1,
        last_verified_date="2026-10-07",
        version=1  # Even if incoming object has version=1, ingestion must detect change and increment
    )

    # Re-ingest
    assert kb.ingest_document(doc_v2) is True

    # 3. Verify Active Document is Version 2
    active_doc = kb.get_document("who_guideline_01")
    assert active_doc is not None
    assert active_doc.version == 2
    assert active_doc.title == "WHO Diabetes Facts V2 Updated"
    assert "Version 2 content" in active_doc.content

    # 4. Verify Old Version Record is NOT overwritten or lost
    old_record = kb.get_document_version("who_guideline_01", version=1)
    assert old_record is not None
    assert old_record.version == 1
    assert old_record.title == "WHO Diabetes Facts V1"
    assert "Version 1 content" in old_record.content

    # Verify history list contains both versions
    history = kb.get_document_history("who_guideline_01")
    assert len(history) == 2
    assert history[0].version == 1
    assert history[1].version == 2

    # Verify old version chunks were preserved in version archive
    old_chunks = kb.get_document_chunks_for_version("who_guideline_01_v1")
    assert len(old_chunks) >= 1
    assert "Version 1 content" in old_chunks[0].content


# -------------------------------------------------------------------------
# 3. Header Validation & Rejection Rules
# -------------------------------------------------------------------------

def test_header_validation_rejects_missing_url():
    """Verify header validation strictly rejects headers missing source URL."""
    # Missing 'url' and 'source_url'
    header_without_url = {
        "title": "Diabetes Overview",
        "source_name": "WHO",
        "publication_date": "2023-01-01",
        "last_verified_date": "2026-10-07"
    }
    is_valid, err = validate_document_header(header_without_url)
    assert is_valid is False
    assert "Missing source URL" in err

    # Empty string URL
    header_empty_url = {
        "title": "Diabetes Overview",
        "source_name": "WHO",
        "url": "   ",
        "publication_date": "2023-01-01",
        "last_verified_date": "2026-10-07"
    }
    is_valid, err = validate_document_header(header_empty_url)
    assert is_valid is False
    assert "Missing source URL" in err


def test_header_validation_rejects_unauthorized_source():
    """Verify rejection of unauthorized sources and acceptance of WHO, ICMR, MoHFW, CDC."""
    # 1. Unauthorized source
    invalid_header = {
        "title": "Diet Advice",
        "source_name": "Random Health Blog",
        "url": "https://example.com/diet",
        "publication_date": "2023-01-01",
        "last_verified_date": "2026-10-07"
    }
    is_valid, err = validate_document_header(invalid_header)
    assert is_valid is False
    assert "Unauthorized source_name" in err

    # 2. Authorized standard sources
    for allowed in ["WHO", "ICMR", "MoHFW", "CDC", "World Health Organization (WHO)"]:
        valid_header = {
            "title": f"Facts from {allowed}",
            "source_name": allowed,
            "url": "https://official.org/guideline",
            "publication_date": "2023-01-01",
            "last_verified_date": "2026-10-07"
        }
        is_valid, err = validate_document_header(valid_header)
        assert is_valid is True, f"Expected {allowed} to pass validation, got error: {err}"


def test_header_validation_supports_custom_sources_in_config(monkeypatch):
    """Verify that adding a source to Config.ALLOWED_KNOWLEDGE_SOURCES allows it."""
    monkeypatch.setattr(Config, "ALLOWED_KNOWLEDGE_SOURCES", ["WHO", "ICMR", "MoHFW", "CDC", "ADA", "NHS"])

    custom_header = {
        "title": "ADA Standards of Medical Care",
        "source_name": "ADA",
        "url": "https://diabetes.org/standards",
        "publication_date": "2024-01-01",
        "last_verified_date": "2026-10-07"
    }
    is_valid, err = validate_document_header(custom_header)
    assert is_valid is True
    assert err is None


def test_header_validation_requires_all_mandatory_fields():
    """Verify title, publication_date, and last_verified_date are required."""
    base_header = {
        "source_name": "WHO",
        "url": "https://who.int/diabetes",
        "title": "Title",
        "publication_date": "2023",
        "last_verified_date": "2026-10-07"
    }

    # Missing title
    h1 = dict(base_header, title="")
    assert validate_document_header(h1)[0] is False

    # Missing publication_date
    h2 = dict(base_header, publication_date="")
    assert validate_document_header(h2)[0] is False

    # Missing last_verified_date
    h3 = dict(base_header, last_verified_date="")
    assert validate_document_header(h3)[0] is False


# -------------------------------------------------------------------------
# 4. Script CLI Execution (python -m scripts.add_document)
# -------------------------------------------------------------------------

def test_add_document_script_cli(tmp_path):
    """Verify CLI behavior when invoked as a module."""
    # 1. Invalid file (missing URL)
    bad_file = tmp_path / "bad_no_url.md"
    bad_file.write_text("""---
title: Test
source_name: WHO
publication_date: 2023-01-01
last_verified_date: 2026-10-07
---
Body text without URL.
""", encoding="utf-8")

    res_bad = subprocess.run(
        [sys.executable, "-m", "scripts.add_document", str(bad_file), "--check-only"],
        capture_output=True,
        text=True
    )
    assert res_bad.returncode != 0
    assert "Missing source URL" in res_bad.stdout or "Missing source URL" in res_bad.stderr

    # 2. Invalid file (unauthorized source)
    unauthorized_file = tmp_path / "bad_source.md"
    unauthorized_file.write_text("""---
title: Test
source_name: Unverified Forum
url: https://example.com
publication_date: 2023-01-01
last_verified_date: 2026-10-07
---
Body text.
""", encoding="utf-8")

    res_unauth = subprocess.run(
        [sys.executable, "-m", "scripts.add_document", str(unauthorized_file), "--check-only"],
        capture_output=True,
        text=True
    )
    assert res_unauth.returncode != 0
    assert "Unauthorized source_name" in res_unauth.stdout or "Unauthorized source_name" in res_unauth.stderr

    # 3. Valid file with --check-only
    valid_file = tmp_path / "valid_who_doc.md"
    valid_file.write_text("""---
title: Official WHO Diabetes Factsheet
source_name: WHO
url: https://www.who.int/diabetes
publication_date: 2023-04-05
last_verified_date: 2026-10-07
topic: basics
language: en
authority_level: 1
---
Valid medical factsheet body content.
""", encoding="utf-8")

    res_valid = subprocess.run(
        [sys.executable, "-m", "scripts.add_document", str(valid_file), "--check-only"],
        capture_output=True,
        text=True
    )
    assert res_valid.returncode == 0
    assert "HEADER VALIDATION PASSED" in res_valid.stdout


def test_data_knowledge_has_no_synthetic_articles():
    """Verify that all markdown files in data/knowledge/ (other than README.md) pass official header validation."""
    from scripts.add_document import validate_document_file
    knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")
    items = [f for f in os.listdir(knowledge_dir) if f != "README.md" and f.endswith(".md")]
    for filename in items:
        filepath = os.path.join(knowledge_dir, filename)
        is_valid, msg, _ = validate_document_file(filepath)
        assert is_valid, f"Document {filename} failed validation: {msg}"

