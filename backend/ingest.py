"""Build RAG index (embeddings + chunk metadata) for runtime loading. Run after editing knowledge.py."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

from knowledge import KNOWLEDGE_BASE

RAG_DIR = Path(__file__).resolve().parent / "rag_data"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def main() -> None:
    RAG_DIR.mkdir(parents=True, exist_ok=True)
    model = SentenceTransformer(MODEL_NAME)
    ids = [e["id"] for e in KNOWLEDGE_BASE]
    texts = [e["text"] for e in KNOWLEDGE_BASE]
    emb = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True,
        batch_size=32,
    )
    np.savez_compressed(RAG_DIR / "embeddings.npz", emb=np.asarray(emb, dtype=np.float32))
    payload = {"ids": ids, "texts": texts}
    (RAG_DIR / "chunks.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(texts)} chunks to {RAG_DIR}")


if __name__ == "__main__":
    main()
