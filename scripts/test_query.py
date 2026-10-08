import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import Config
from services.embedding_service import VectorStore, embed, cosine_similarity

def test_query(question: str):
    store = VectorStore()
    if store.is_empty():
        print("ERROR: Vector store is empty! Build index first with python -m scripts.build_index")
        return []

    min_score = Config.RAG_MIN_SCORE
    query_vec = embed(question)
    if not query_vec:
        print(f"ERROR: Could not embed query: '{question}'")
        return []

    scored = []
    for entry in store.entries:
        meta = entry.get("metadata", {})
        vec = entry.get("vector", [])
        score = cosine_similarity(query_vec, vec)
        scored.append((score, meta))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_5 = scored[:5]

    print("=" * 75)
    print(f"Query: \"{question}\"")
    print(f"Configured RAG_MIN_SCORE Cutoff: {min_score}")
    print("=" * 75)
    print(f"{'#':<3} {'Score':<8} {'Pass?':<7} {'Source':<12} {'Title'}")
    print("-" * 75)

    results = []
    for idx, (score, meta) in enumerate(top_5, 1):
        passes = score >= min_score
        title = meta.get("title", "Untitled")[:40]
        source = meta.get("source", "Unknown")[:10]
        pass_str = "PASS" if passes else "FAIL"
        print(f"{idx:<3} {score:.4f}   {pass_str:<7} {source:<12} {title}")
        results.append({
            "rank": idx,
            "score": round(score, 4),
            "passes": passes,
            "title": meta.get("title", ""),
            "source": meta.get("source", ""),
            "topic": meta.get("topic", ""),
            "chunk_id": meta.get("chunk_id", "")
        })

    print("-" * 75)
    pass_count = sum(1 for r in results if r["passes"])
    print(f"Summary: {pass_count}/5 top chunks passed cutoff {min_score}\n")
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        q = " ".join(sys.argv[1:])
        test_query(q)
    else:
        sample_queries = [
            "What is HbA1c?",
            "What are the symptoms of low blood sugar?",
            "How should I care for my feet with diabetes?",
            "Can diabetic patients eat apples?",
            "Does a woman have diabetes?"
        ]
        for query in sample_queries:
            test_query(query)
