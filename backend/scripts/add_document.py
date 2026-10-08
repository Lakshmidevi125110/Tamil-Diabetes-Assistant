import os
import sys
import re
import json
import shutil
import argparse
from typing import Dict, Any, Tuple, Optional, List
from app.config import Config

DEFAULT_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")


def is_allowed_source(source_name: str, allowed_sources: Optional[List[str]] = None) -> bool:
    """
    Checks if source_name matches an allowed authority (WHO, ICMR, MoHFW, CDC, or configured in Config).
    Supports case-insensitive matching and standard acronym boundaries.
    """
    if not source_name or not source_name.strip():
        return False

    if allowed_sources is None:
        allowed_sources = getattr(
            Config, "ALLOWED_KNOWLEDGE_SOURCES", ["WHO", "ICMR", "MoHFW", "CDC"]
        )

    s_clean = source_name.strip()
    for allowed in allowed_sources:
        a_clean = allowed.strip()
        # 1. Exact match (case-insensitive)
        if s_clean.lower() == a_clean.lower():
            return True
        # 2. Word-boundary or parenthetical match (e.g. "World Health Organization (WHO)")
        if re.search(r"\b" + re.escape(a_clean) + r"\b", s_clean, re.IGNORECASE):
            return True

    return False


def extract_header_from_content(content: str, ext: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Extracts header dictionary from raw file content.
    Returns (header_dict, error_message).
    """
    ext = ext.lower()
    if ext in (".md", ".txt"):
        stripped = content.strip()
        if not stripped.startswith("---"):
            return None, "File does not start with YAML frontmatter delimiter ('---')."

        parts = stripped.split("---", 2)
        if len(parts) < 3:
            return None, "YAML frontmatter is not closed with a second '---' delimiter."

        raw_meta = parts[1].strip()
        meta: Dict[str, Any] = {}
        for line in raw_meta.split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" in line:
                key, val = line.split(":", 1)
                meta[key.strip().lower()] = val.strip().strip("\"'")
        return meta, None

    elif ext == ".json":
        try:
            data = json.loads(content)
            if isinstance(data, list):
                if not data or not isinstance(data[0], dict):
                    return None, "JSON array is empty or contains non-object elements."
                return data[0], None
            elif isinstance(data, dict):
                return data, None
            else:
                return None, "JSON root is neither an object nor an array."
        except json.JSONDecodeError as e:
            return None, f"Invalid JSON syntax: {str(e)}"

    return None, f"Unsupported file extension '{ext}'. Only .md, .txt, and .json are supported."


def validate_document_header(
    header: Dict[str, Any], allowed_sources: Optional[List[str]] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates a document header:
    - Rejects missing source URL (url or source_url).
    - Rejects source_name that is not WHO, ICMR, MoHFW, CDC or configured in Config.
    - Requires title, publication_date, and last_verified_date.
    """
    if not isinstance(header, dict):
        return False, "Header must be a dictionary of key-value pairs."

    # 1. Source URL validation (mandatory)
    url = header.get("url") or header.get("source_url")
    if not url or not str(url).strip():
        return False, "Missing source URL: 'url' or 'source_url' is mandatory. Files missing a source URL are rejected."

    url_str = str(url).strip()
    if not (url_str.startswith("http://") or url_str.startswith("https://")):
        return False, f"Invalid source URL '{url_str}': Must start with http:// or https://."

    # 2. Source Name validation (must be one of allowed sources)
    source_name = header.get("source_name") or header.get("source")
    if not source_name or not str(source_name).strip():
        return False, "Missing source name: 'source_name' or 'source' is mandatory."

    if allowed_sources is None:
        allowed_sources = getattr(
            Config, "ALLOWED_KNOWLEDGE_SOURCES", ["WHO", "ICMR", "MoHFW", "CDC"]
        )

    if not is_allowed_source(str(source_name), allowed_sources=allowed_sources):
        allowed_repr = ", ".join(allowed_sources)
        return (
            False,
            f"Unauthorized source_name '{source_name}'. Must be one of: [{allowed_repr}] or added to Config.ALLOWED_KNOWLEDGE_SOURCES.",
        )

    # 3. Title validation
    title = header.get("title")
    if not title or not str(title).strip():
        return False, "Missing title: Document header must contain a non-empty 'title'."

    # 4. Publication date validation
    pub_date = header.get("publication_date")
    if not pub_date or not str(pub_date).strip():
        return False, "Missing publication_date: Header must contain 'publication_date' (e.g. YYYY-MM-DD or year)."

    # 5. Last verified date validation
    last_verified = header.get("last_verified_date") or header.get("retrieved_at")
    if not last_verified or not str(last_verified).strip():
        return False, "Missing last_verified_date: Header must contain 'last_verified_date' (e.g. YYYY-MM-DD)."

    return True, None


def validate_document_file(
    filepath: str, allowed_sources: Optional[List[str]] = None
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Reads a document file, extracts its header, and validates it.
    Returns (is_valid, error_reason, header_dict).
    """
    if not os.path.exists(filepath):
        return False, f"File does not exist: {filepath}", None

    ext = os.path.splitext(filepath)[1].lower()
    if ext not in (".md", ".txt", ".json"):
        return False, f"Unsupported file type '{ext}'. Allowed extensions: .md, .txt, .json", None

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return False, f"Could not read file: {str(e)}", None

    header, extract_err = extract_header_from_content(content, ext)
    if extract_err:
        return False, extract_err, None

    is_valid, validation_err = validate_document_header(header, allowed_sources=allowed_sources)
    if not is_valid:
        return False, validation_err, header

    return True, None, header


def add_document(
    filepath: str,
    dest_dir: Optional[str] = None,
    check_only: bool = False,
    allowed_sources: Optional[List[str]] = None,
) -> bool:
    """
    Validates document header and optionally copies it to data/knowledge/.
    """
    target_dest_dir = dest_dir or DEFAULT_KNOWLEDGE_DIR
    print("=" * 70)
    print("📋 Medical Knowledge Document Ingestion Validator")
    print("=" * 70)
    print(f"Target File: {filepath}")

    is_valid, error_msg, header = validate_document_file(filepath, allowed_sources=allowed_sources)

    if not is_valid:
        print("\n❌ VALIDATION REJECTED:")
        print(f"   Reason: {error_msg}")
        print("=" * 70 + "\n")
        return False

    print("\n✅ HEADER VALIDATION PASSED:")
    print(f"   • Title:              {header.get('title')}")
    print(f"   • Source Name:        {header.get('source_name') or header.get('source')}")
    print(f"   • Source URL:         {header.get('url') or header.get('source_url')}")
    print(f"   • Publication Date:   {header.get('publication_date')}")
    print(f"   • Last Verified Date: {header.get('last_verified_date') or header.get('retrieved_at')}")
    print(f"   • Topic:              {header.get('topic', 'general')}")
    print(f"   • Language:           {header.get('language', 'en')}")
    print(f"   • Version:            {header.get('version', 1)}")

    if check_only:
        print("\n🔍 Mode: --check-only (No files copied).")
        print("=" * 70 + "\n")
        return True

    # Copy to data/knowledge/ if not already in the target folder
    abs_src = os.path.abspath(filepath)
    abs_dest_dir = os.path.abspath(target_dest_dir)
    os.makedirs(abs_dest_dir, exist_ok=True)
    abs_target_file = os.path.abspath(os.path.join(abs_dest_dir, os.path.basename(filepath)))

    if abs_src == abs_target_file:
        print(f"\n📁 File is already in knowledge repository: {abs_target_file}")
    else:
        shutil.copy2(abs_src, abs_target_file)
        print(f"\n📥 Document successfully copied to: {abs_target_file}")

    print("=" * 70 + "\n")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Validate and ingest medical knowledge documents into data/knowledge/."
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="Path to the document file (.md, .txt, or .json) to validate and ingest.",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only validate headers without copying file to data/knowledge/.",
    )
    parser.add_argument(
        "--dest-dir",
        default=DEFAULT_KNOWLEDGE_DIR,
        help="Destination directory for knowledge base (defaults to data/knowledge/).",
    )

    args = parser.parse_args()

    if not args.file:
        parser.print_help()
        print("\nExample:")
        print("  python -m scripts.add_document my_guideline.md")
        print("  python -m scripts.add_document my_guideline.md --check-only\n")
        sys.exit(1)

    success = add_document(args.file, dest_dir=args.dest_dir, check_only=args.check_only)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
