#!/usr/bin/env python3
"""
Extract visible text from portfolio HTML into JSON chunks for the SriniLM RAG backend.

Usage (from repo root):
  python3 scripts/extract_portfolio_knowledge.py

Outputs:
  portfolio_knowledge.json   — list of { id, source_file, title, text } for ingest.py

Skips chatbot UIs, duplicate images/ tree, and password-shell pages without case-study body text.
"""

from __future__ import annotations

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# Repo root = parent of scripts/
REPO_ROOT = Path(__file__).resolve().parent.parent

# Do not index duplicate mirror under images/ (same content as root pages)
EXCLUDE_DIR_PREFIXES = ("chatbot/", "srini-chatbot/", "images/")

# Password-only shells (real case study is encrypted inside; no public HTML body to index)
EXCLUDE_FILES = frozenset({"Norton.html", "Nortonp.html"})

# Split very long pages into multiple embedding rows (characters per chunk)
CHUNK_SIZE = 2200
CHUNK_OVERLAP = 200


class _TextHTMLParser(HTMLParser):
    _SKIP = frozenset(
        {
            "script",
            "style",
            "noscript",
            "svg",
            "template",
            "iframe",
        }
    )

    def __init__(self) -> None:
        super().__init__()
        self._depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() in self._SKIP:
            self._depth += 1
        elif tag.lower() == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self._SKIP and self._depth > 0:
            self._depth -= 1

    def handle_data(self, data: str) -> None:
        if self._depth == 0 and data:
            self.parts.append(data)

    def text(self) -> str:
        raw = "".join(self.parts)
        raw = html.unescape(raw)
        raw = re.sub(r"[\t\xa0]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        raw = re.sub(r" {2,}", " ", raw)
        return raw.strip()


def _title_from_html(content: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", content, re.I | re.S)
    if not m:
        return ""
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))
    return re.sub(r"\s+", " ", t).strip()


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text] if text else []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


def extract_text_from_file(path: Path) -> tuple[str, str]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    title = _title_from_html(raw)
    parser = _TextHTMLParser()
    try:
        parser.feed(raw)
        parser.close()
    except Exception:
        return title, ""
    return title, parser.text()


def iter_html_files(root: Path) -> list[Path]:
    out: list[Path] = []
    for p in sorted(root.rglob("*.html")):
        rel = p.relative_to(root).as_posix()
        if any(rel.startswith(pref) for pref in EXCLUDE_DIR_PREFIXES):
            continue
        if p.name in EXCLUDE_FILES:
            continue
        out.append(p)
    return out


def main() -> int:
    entries: list[dict] = []
    for path in iter_html_files(REPO_ROOT):
        rel = path.relative_to(REPO_ROOT).as_posix()
        title, text = extract_text_from_file(path)
        if not text or len(text) < 80:
            # Skip near-empty shells
            continue
        base_id = re.sub(r"[^\w\-]+", "-", rel.replace("/", "__")).strip("-").lower()
        chunks = _chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
        for i, chunk in enumerate(chunks):
            cid = f"{base_id}" if len(chunks) == 1 else f"{base_id}__part{i+1}"
            label = title or path.stem
            if len(chunks) > 1:
                label = f"{label} (section {i+1}/{len(chunks)})"
            entries.append(
                {
                    "id": cid,
                    "source_file": rel,
                    "title": label,
                    "text": chunk,
                }
            )

    out_path = REPO_ROOT / "portfolio_knowledge.json"
    out_path.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} chunks to {out_path.relative_to(REPO_ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
