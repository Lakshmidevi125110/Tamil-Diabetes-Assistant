# Knowledge Base Repository (`data/knowledge/`)

This directory houses trusted, authoritative medical reference documents used by the Tamil Voice Diabetes Assistant's Retrieval-Augmented Generation (RAG) system.

---

## 📌 Document Metadata Standards

Every document added to this directory must specify the following metadata fields:

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | string | Unique document identifier | `"who_diabetes_factsheet_2023"` |
| `source` | string | Originating institution | `"World Health Organization"` |
| `source_type` | string | Format / publication type | `"fact_sheet"`, `"clinical_guideline"`, `"report"` |
| `title` | string | Full title of the document | `"Diabetes Fact Sheet"` |
| `url` | string | Permanent or canonical URL | `"https://www.who.int/news-room/fact-sheets/detail/diabetes"` |
| `publication_date` | string | Date of publication (YYYY-MM-DD) | `"2023-04-05"` |
| `retrieved_at` | string | Retrieval timestamp or date | `"2026-10-05"` |
| `topic` | string | Core clinical / lifestyle topic | `"basics"`, `"healthy eating"`, `"hypoglycemia"`, `"foot care"` |
| `language` | string | Language code (`en` or `ta`) | `"en"` |
| `authority_level`| integer | Source authority tier (see below) | `1` |
| `content` | string | Full body text of the document | Full text content |

### 🛡️ Authority Level Hierarchy
- **Level 1**: Official international & national public health bodies (e.g., WHO, ICMR, MoHFW India, CDC).
- **Level 2**: Recognized medical associations and peer-reviewed clinical guidelines (e.g., ADA, RSSDI, Endocrine Society).
- **Level 3**: Verified educational supplementary material.

---

## 📝 How to Add Real Documents

### Option 1: Markdown (`.md`) or Text (`.txt`) with YAML Frontmatter
Add `.md` or `.txt` files containing YAML-style headers at the very top:

```markdown
---
id: who_diabetes_overview
source: World Health Organization
source_type: fact_sheet
title: Diabetes Key Facts
url: https://www.who.int/news-room/fact-sheets/detail/diabetes
publication_date: 2023-04-05
retrieved_at: 2026-10-05
topic: basics
language: en
authority_level: 1
---

Paste the official public domain text or licensed reference excerpt here.
Ensure no proprietary or copyrighted text is included without proper license.
```

### Option 2: JSON Files (`.json`)
You can store a single JSON object or an array of objects:

```json
[
  {
    "id": "icmr_guidelines_diet_2022",
    "source": "Indian Council of Medical Research (ICMR)",
    "source_type": "clinical_guideline",
    "title": "Dietary Management for Type 2 Diabetes in India",
    "url": "https://main.icmr.nic.in/content/guidelines",
    "publication_date": "2022-06-15",
    "retrieved_at": "2026-10-05",
    "topic": "healthy eating",
    "language": "en",
    "authority_level": 1,
    "content": "Full guideline excerpt text here..."
  }
]
```

---

## ⚠️ Important Ingestion Policies
1. **No Automated Web Scraping**: Ingest only verified documents placed intentionally in this folder.
2. **Strict Verification**: Only add genuine text from trusted health organizations that explicitly permit educational reuse.
3. **Change Detection**: The ingestion engine automatically computes content SHA-256 hashes and tracks file modification timestamps to re-index changed files and prune deleted ones.
