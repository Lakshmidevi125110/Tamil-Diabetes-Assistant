import os
import sys
import time
import logging
from config import Config
from services.knowledge_base import KnowledgeBase
from services.embedding_service import VectorStore, DEFAULT_INDEX_DIR, DEFAULT_INDEX_FILE

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BuildIndex")


def build_knowledge_index():
    """
    Manual CLI task to rebuild vector index from data/knowledge/.
    Executes on-demand via: python -m scripts.build_index
    Never runs synchronously on user requests.
    """
    print("=" * 65)
    print("🚀 Tamil Voice Diabetes Assistant - Vector Index Builder")
    print("=" * 65)

    start_time = time.time()
    knowledge_dir = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge")
    index_dir = DEFAULT_INDEX_DIR
    index_file = DEFAULT_INDEX_FILE

    # 1. Check API key status
    api_key = Config.GEMINI_API_KEY
    if not api_key or api_key == "your_api_key_here":
        print("\n⚠️ WARNING: GEMINI_API_KEY is not configured in .env!")
        print("Please configure your free Gemini API key to generate live vector embeddings.")
        print("Index build was aborted gracefully without crashing.\n")
        return False

    # 2. Ingest documents and generate chunks
    print(f"\n📂 Scanning knowledge directory: {knowledge_dir}")
    kb = KnowledgeBase(data_dir=knowledge_dir)
    sync_report = kb.sync()

    total_docs = sync_report.get("total_documents", 0)
    total_chunks = sync_report.get("total_chunks", 0)

    print(f"📄 Documents found: {total_docs}")
    print(f"🧩 Chunks generated: {total_chunks}")

    if total_chunks == 0:
        print("\nℹ️ No documents to index. Add .json, .md, or .txt files into data/knowledge/ first.")
        print("See data/knowledge/README.md for instructions.\n")
        return True

    # 3. Embed chunks into vector store
    print(f"\n⚡ Generating embeddings using Gemini API...")
    vector_store = VectorStore(index_path=index_file)
    vector_store.clear()  # Fresh rebuild

    all_chunks = kb.get_all_chunks()
    indexed_count = vector_store.add_chunks(all_chunks)

    # 4. Save index to disk
    vector_store.save()
    elapsed = time.time() - start_time
    file_size_kb = os.path.getsize(index_file) / 1024 if os.path.exists(index_file) else 0

    print("\n" + "=" * 65)
    print("✅ Index Build Complete!")
    print(f"• Total Chunks Indexed: {indexed_count} / {total_chunks}")
    print(f"• Target Index File:    {index_file}")
    print(f"• Index File Size:      {file_size_kb:.1f} KB")
    print(f"• Time Elapsed:         {elapsed:.2f} seconds")
    print("=" * 65 + "\n")

    return True


if __name__ == "__main__":
    success = build_knowledge_index()
    sys.exit(0 if success else 1)
