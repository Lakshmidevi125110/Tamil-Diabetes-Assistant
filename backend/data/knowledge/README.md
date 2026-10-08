# Medical Knowledge Base Repository (`data/knowledge/`)

This directory houses trusted, authoritative medical reference documents used by the **Tamil Voice Diabetes Assistant** Retrieval-Augmented Generation (RAG) system.

---

## 🔒 Ingestion & Provenance Policies

1. **Human-Curated Only**: Only ingest files placed directly in `data/knowledge/`.
2. **No Web Scraping**: The system does **not** scrape websites automatically.
3. **Strict Validation**: Every document must include a validated header containing `source_name`, `url`, `title`, `publication_date`, and `last_verified_date`.
4. **Authorized Health Authorities**: Documents are accepted only from vetted public health bodies:
   - **`WHO`**: World Health Organization
   - **`ICMR`**: Indian Council of Medical Research
   - **`MoHFW`**: Ministry of Health and Family Welfare (India)
   - **`CDC`**: Centers for Disease Control and Prevention
   - *(Or authorities explicitly added to `Config.ALLOWED_KNOWLEDGE_SOURCES` / `.env`)*
5. **Mandatory Source URL**: Files missing a valid canonical `url` starting with `http://` or `https://` are **strictly rejected**.
6. **Immutable Version Retention**: Re-ingesting a changed document automatically increments its version and **preserves the historical version record**, never silently overwriting previous versions.

---

## 📋 Exact Header Formats

### 1. Markdown (`.md`) and Text (`.txt`) Format (YAML Frontmatter)

Save files as `.md` or `.txt` with the following YAML frontmatter at the very top:

```markdown
---
title: "Diabetes Overview and Classification"
source_name: WHO
url: "https://www.who.int/news-room/fact-sheets/detail/diabetes"
publication_date: "2023-04-05"
last_verified_date: "2026-10-07"
topic: "basics"
language: "en"
authority_level: 1
document_type: "fact_sheet"
version: 1
---

# Overview of Diabetes
Diabetes mellitus is a chronic condition that occurs when the pancreas cannot make enough insulin...
```

### 2. JSON Format (`.json`)

Save files as `.json` containing an object (or list of objects) with the required metadata fields:

```json
[
  {
    "id": "icmr_type2_dietary_guidelines_2022",
    "title": "Dietary Guidelines for Type 2 Diabetes Management in India",
    "source_name": "ICMR",
    "url": "https://main.icmr.nic.in/guidelines/diabetes",
    "publication_date": "2022-06-15",
    "last_verified_date": "2026-10-07",
    "topic": "healthy eating",
    "language": "en",
    "authority_level": 1,
    "document_type": "clinical_guideline",
    "version": 1,
    "content": "Official dietary recommendations: encourage complex carbohydrates, whole legumes, and high-fiber local vegetables..."
  }
]
```

### Metadata Fields Specification

| Field Name | Mandatory | Allowed Values / Format | Description |
| :--- | :---: | :--- | :--- |
| `source_name` | **Yes** | `WHO`, `ICMR`, `MoHFW`, `CDC` (or configured) | Official originating health body. |
| `url` | **Yes** | Valid `http://` or `https://` URL | Canonical source URL for fact-checking. Files missing this are rejected. |
| `title` | **Yes** | Non-empty string | Full title of the publication or guideline. |
| `publication_date`| **Yes** | `YYYY-MM-DD` or year `YYYY` | Date the authoritative source published the guidance. |
| `last_verified_date`| **Yes** | `YYYY-MM-DD` | Date the guideline was verified against official source. |
| `topic` | Recommended | See Topic Checklist below | Primary clinical/lifestyle topic. |
| `language` | Recommended | `en` or `ta` | Language of text (`en` = English, `ta` = Tamil). |
| `authority_level`| Recommended | `1` (Primary Body), `2` (Medical Society), `3` (Educator) | Authority level tier. Default is `1`. |
| `document_type` | Optional | `fact_sheet`, `guideline`, `report`, `clinical_reference` | Nature of the source document. |
| `version` | Optional | Integer (default: `1`) | Version of the document. Re-ingestion auto-increments this. |

---

## 📑 Clinical & Lifestyle Topic Checklist

When ingesting documents, assign one of the following standardized topic tags to ensure clean vector filtering and topic-aware retrieval:

- [ ] **`basics`**: Definition of diabetes, Type 1 vs Type 2 vs Gestational diabetes, pathophysiology, risk factors.
- [ ] **`symptoms`**: Common symptoms, frequent urination (polyuria), increased thirst (polydipsia), unexplained fatigue.
- [ ] **`healthy eating`**: Meal planning, plate method, glycemic index, fiber intake, complex carbs, South Indian / traditional dietary balance.
- [ ] **`physical activity`**: Aerobic exercise, strength training, walking routines, safety during exercise.
- [ ] **`blood glucose monitoring`**: Fasting blood sugar, postprandial levels, HbA1c target ranges, self-monitoring guidance.
- [ ] **`hypoglycemia`**: Low blood sugar signs (shakiness, sweating, dizziness), Rule of 15 emergency management.
- [ ] **`hyperglycemia`**: High blood sugar symptoms, warning signs of Diabetic Ketoacidosis (DKA).
- [ ] **`foot care`**: Daily foot inspection, footwear precautions, preventing neuropathic ulcers.
- [ ] **`complications`**: Prevention of microvascular and macrovascular complications (kidney, retina, heart, neuropathy).
- [ ] **`lifestyle`**: Sleep hygiene, stress reduction, smoking cessation, weight management.

---

## 🛠️ CLI Document Validator & Ingestion Script

Before committing or indexing documents into the knowledge repository, validate them using the built-in validator script:

```bash
# 1. Validate a document header (check-only mode)
python -m scripts.add_document path/to/my_document.md --check-only

# 2. Validate and copy the document into data/knowledge/
python -m scripts.add_document path/to/my_document.md

# 3. Rebuild the vector embeddings index
python -m scripts.build_index
```

If a document is missing the source URL or contains an unauthorized source name, the command will exit with an error and descriptive feedback.
