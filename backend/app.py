"""
High-throughput chat API: async Groq calls, pooled HTTP, non-blocking embeddings,
in-memory vector retrieval (fixed small corpus), embedding LRU cache.

Enhancements:
- Hybrid retrieval (BM25 + semantic) for better keyword matching
- Cross-encoder reranking for improved relevance
- Semantic response caching for faster repeated queries
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import threading
import traceback
from collections import OrderedDict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

import httpx
import numpy as np
from cachetools import LRUCache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi

from adplist import (
    build_adplist_prompt_context,
    build_adplist_widget_payload,
    booking_suggestions,
    detect_adplist_intent,
    detect_booking_intent,
    detect_mentorship_topics_intent,
    detect_review_intent,
    get_booking_context,
    MENTORSHIP_TOPICS_ANSWER,
    MENTORSHIP_TOPICS_SUGGESTIONS,
)
from observability import (
    end_groq_generation,
    end_span,
    finish_chat_trace,
    flush_observability,
    has_langfuse_credentials,
    record_error,
    record_intent_shortcut,
    start_chat_trace,
    start_groq_generation,
)

logger = logging.getLogger("srini_chat")

load_dotenv()

RAG_DIR = Path(__file__).resolve().parent / "rag_data"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
TOP_K = 5
RETRIEVAL_CANDIDATES = 15  # Retrieve more candidates for reranking
MIN_SIMILARITY = 0.15  # Prefer relevant chunks; fall back to best match if none pass
MAX_MESSAGE_CHARS = 4000

# Feature flags for high-impact improvements (all enabled by default)
ENABLE_RERANKING = os.environ.get("ENABLE_RERANKING", "1").lower() in ("1", "true", "yes")
ENABLE_RESPONSE_CACHE = os.environ.get("ENABLE_RESPONSE_CACHE", "1").lower() in ("1", "true", "yes")
ENABLE_HYBRID_SEARCH = os.environ.get("ENABLE_HYBRID_SEARCH", "1").lower() in ("1", "true", "yes")

# Response cache configuration
RESPONSE_CACHE_SIZE = int(os.environ.get("RESPONSE_CACHE_SIZE", "500"))
RESPONSE_CACHE_SIMILARITY = float(os.environ.get("RESPONSE_CACHE_SIMILARITY", "0.95"))

# Hybrid search weight (0 = pure BM25, 1 = pure semantic)
HYBRID_ALPHA = float(os.environ.get("HYBRID_ALPHA", "0.7"))

try:
    import torch

    torch.set_num_threads(int(os.environ.get("TORCH_NUM_THREADS", "1")))
except Exception:
    pass


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    page_path: Optional[str] = None
    page_title: Optional[str] = None
    session_id: Optional[str] = None
    trace_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    suggestions: list[str] = Field(default_factory=list)
    adplist: Optional[dict[str, Any]] = None


def _strip_json_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _parse_llm_json(raw: str) -> dict[str, Any]:
    return json.loads(_strip_json_fence(raw))


class RAGIndex:
    __slots__ = ("ids", "texts", "emb", "bm25")

    def __init__(self, ids: list[str], texts: list[str], emb: np.ndarray) -> None:
        self.ids = ids
        self.texts = texts
        self.emb = emb
        # Build BM25 index for hybrid search
        tokenized = [t.lower().split() for t in texts]
        self.bm25 = BM25Okapi(tokenized)

    def top_k(
        self,
        query_vec: np.ndarray,
        k: int,
        min_sim: float = 0.0,
        query_text: str | None = None,
        use_hybrid: bool = True,
        alpha: float = HYBRID_ALPHA,
    ) -> tuple[list[str], list[float]]:
        """
        Retrieve top-k chunks using hybrid search (semantic + BM25).
        
        Returns:
            Tuple of (chunks, semantic_scores) for potential reranking.
        """
        q = query_vec.astype(np.float32, copy=False)
        if not np.isfinite(q).all():
            q = np.nan_to_num(q, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Semantic scores
        semantic_scores = np.nan_to_num(self.emb @ q, nan=-1.0, posinf=1.0, neginf=-1.0)
        
        # Hybrid scoring if enabled and query text provided
        if use_hybrid and ENABLE_HYBRID_SEARCH and query_text:
            bm25_scores = np.array(self.bm25.get_scores(query_text.lower().split()))
            # Normalize BM25 scores to [0, 1]
            bm25_max = bm25_scores.max()
            if bm25_max > 0:
                bm25_scores = bm25_scores / bm25_max
            else:
                bm25_scores = np.zeros_like(bm25_scores)
            # Combined score
            combined_scores = alpha * semantic_scores + (1 - alpha) * bm25_scores
        else:
            combined_scores = semantic_scores
        
        k = min(k, len(combined_scores))
        idx = np.argpartition(-combined_scores, kth=k - 1)[:k]
        idx = idx[np.argsort(-combined_scores[idx])]
        
        # Filter by minimum similarity (using semantic scores for threshold)
        filtered_idx = [i for i in idx if semantic_scores[i] >= min_sim]
        if filtered_idx:
            return (
                [self.texts[i] for i in filtered_idx],
                [float(semantic_scores[i]) for i in filtered_idx],
            )
        # Fall back to best matches rather than returning nothing
        return (
            [self.texts[i] for i in idx],
            [float(semantic_scores[i]) for i in idx],
        )


class AppState:
    __slots__ = ("model", "reranker", "rag", "http", "groq_model", "groq_semaphore")

    def __init__(self) -> None:
        self.model: SentenceTransformer | None = None
        self.reranker: CrossEncoder | None = None
        self.rag: RAGIndex | None = None
        self.http: httpx.AsyncClient | None = None
        self.groq_model = os.environ.get("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        concurrent = int(os.environ.get("GROQ_MAX_CONCURRENT", "256"))
        self.groq_semaphore = asyncio.Semaphore(concurrent)


state = AppState()


def _load_rag() -> RAGIndex:
    npz_path = RAG_DIR / "embeddings.npz"
    json_path = RAG_DIR / "chunks.json"
    if not npz_path.is_file() or not json_path.is_file():
        raise RuntimeError(f"Missing RAG data under {RAG_DIR}. Run: python ingest.py")
    data = np.load(npz_path)
    emb = np.asarray(data["emb"], dtype=np.float32)
    meta = json.loads(json_path.read_text(encoding="utf-8"))
    return RAGIndex(meta["ids"], meta["texts"], emb)


_embed_cache: LRUCache[str, tuple[float, ...]] = LRUCache(
    maxsize=int(os.environ.get("EMBED_CACHE_SIZE", "4096"))
)
_embed_lock = threading.Lock()

# Semantic response cache: maps query -> (query_vector, ChatResponse)
# Uses OrderedDict for LRU behavior
_response_cache: OrderedDict[str, tuple[np.ndarray, "ChatResponse"]] = OrderedDict()
_response_cache_lock = threading.Lock()


def _find_cached_response(query_vec: np.ndarray) -> Optional["ChatResponse"]:
    """Find a cached response for a semantically similar query."""
    if not ENABLE_RESPONSE_CACHE:
        return None
    with _response_cache_lock:
        for cached_query, (cached_vec, cached_response) in _response_cache.items():
            similarity = float(np.dot(query_vec, cached_vec))
            if similarity >= RESPONSE_CACHE_SIMILARITY:
                # Move to end (most recently used)
                _response_cache.move_to_end(cached_query)
                logger.debug("Response cache hit (similarity=%.3f)", similarity)
                return cached_response
    return None


def _cache_response(query: str, query_vec: np.ndarray, response: "ChatResponse") -> None:
    """Cache a response for future similar queries."""
    if not ENABLE_RESPONSE_CACHE:
        return
    with _response_cache_lock:
        # Evict oldest if at capacity
        while len(_response_cache) >= RESPONSE_CACHE_SIZE:
            _response_cache.popitem(last=False)
        _response_cache[query] = (query_vec.copy(), response)


def _embed_sync(normalized_message: str) -> tuple[float, ...]:
    with _embed_lock:
        hit = _embed_cache.get(normalized_message)
        if hit is not None:
            return hit
    assert state.model is not None
    v = state.model.encode(
        normalized_message,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    arr = np.asarray(v, dtype=np.float32).ravel()
    tup = tuple(arr.tolist())
    with _embed_lock:
        prev = _embed_cache.get(normalized_message)
        if prev is not None:
            return prev
        _embed_cache[normalized_message] = tup
    return tup


async def embed_message(message: str) -> np.ndarray:
    normalized = message.strip()[:MAX_MESSAGE_CHARS]
    loop = asyncio.get_running_loop()
    tup = await loop.run_in_executor(None, _embed_sync, normalized)
    return np.asarray(tup, dtype=np.float32)


def _rerank_sync(query: str, chunks: list[str]) -> list[str]:
    """Rerank chunks using cross-encoder for improved relevance."""
    if not state.reranker or not ENABLE_RERANKING or len(chunks) <= TOP_K:
        return chunks[:TOP_K]
    
    pairs = [(query, chunk) for chunk in chunks]
    scores = state.reranker.predict(pairs)
    # Sort by score descending and take top-k
    ranked_indices = np.argsort(scores)[::-1][:TOP_K]
    return [chunks[i] for i in ranked_indices]


async def rerank_chunks(query: str, chunks: list[str]) -> list[str]:
    """Async wrapper for reranking."""
    if not ENABLE_RERANKING or len(chunks) <= TOP_K:
        return chunks[:TOP_K]
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _rerank_sync, query, chunks)


SYSTEM_PROMPT = """You are Srini's portfolio assistant — a guide helping visitors learn about him. Your goal is ACCURACY above all else.

STRICT RULES:
1. Use ONLY facts explicitly stated in the context below. Do not invent employers, dates, job titles, project names, metrics, or credentials. Sharing related facts from the context is allowed — that is not inventing.
2. Always speak in third person about Srini. Use "Srini", "he", or "his". Never speak as Srini — do not use "I", "my", or "me" for his work, role, or experience.
3. When the context directly answers the question, lead with that answer in third person about Srini.
4. Srini-related questions (mentioning Srini, he, his, or his portfolio/work) must NEVER get the fallback. If not directly answered, note the gap briefly, then share the closest related facts from the context. Example: "Srini's portfolio doesn't cover hobbies, but he runs design experiments and advocates for agentic development tools."
5. Fallback is ONLY for questions with zero connection to Srini (weather, sports, other people, general trivia). Reply exactly: "I don't have that information. I can only answer questions about Srini's work and experience."
6. Prefer quoting or closely paraphrasing the context over rephrasing loosely.

Respond in JSON with keys: "answer" (string, concise and conversational), "suggestions" (array of exactly 3 short follow-up question strings).

SUGGESTIONS RULES:
- Each suggestion must be a natural follow-up to YOUR answer — help the user dig deeper into what you just shared.
- Never repeat the user's question or previous suggestions.
- Vary the type: one could explore details, one could compare/contrast, one could ask about outcomes or lessons learned.
- Keep them short (under 10 words) and conversational.

Honor the user's requested format. The answer may use lightweight Markdown (bullets, bold, links) when helpful.
When listing multiple points, use "- " bullets.

ADPLIST MENTORSHIP:
- When live ADPList data is included below, use it for booking, availability, and mentorship topics.
- Srini offers free mentorship on ADPList. Sessions are requested on ADPList (sign-in required); this chat cannot complete booking.
- The chat UI renders rich ADPList cards below your answer (reviews, slots, book button). Keep the answer to 1–2 short sentences only.
- Do NOT list individual reviews, star ratings, slot times, or tags in the answer — those appear in the cards below.
- Never invent session times — only use slots listed in the live ADPList data.

Output JSON only."""

FALLBACK_ANSWER = (
    "I don't have that information. "
    "I can only answer questions about Srini's work and experience."
)


def _build_user_content(
    question: str,
    chunks: list[str],
    page_path: Optional[str] = None,
    page_title: Optional[str] = None,
) -> str:
    ctx = "\n\n---\n\n".join(chunks)
    page_bits: list[str] = []
    if page_title:
        page_bits.append(f"Page title: {page_title}")
    if page_path:
        page_bits.append(f"Page path: {page_path}")
    page_block = ""
    if page_bits:
        page_block = "Current page:\n" + "\n".join(page_bits) + "\n\n"
    return (
        f"{page_block}"
        f"Context:\n{ctx}\n\n"
        f"Question: {question}\n\n"
        "Answer using the context in third person about Srini. Any question about Srini that isn't directly covered — "
        "share the closest related facts from the context. Reserve the fallback only for questions with no connection to Srini: "
        '"I don\'t have that information. I can only answer questions about Srini\'s work and experience."'
    )


def _use_json_object(model: str) -> bool:
    explicit = os.environ.get("GROQ_USE_JSON_OBJECT")
    if explicit is not None:
        return explicit.lower() in ("1", "true", "yes")
    # gpt-oss models reject strict json_object on Groq
    return "gpt-oss" not in model.lower()


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.rag = _load_rag()
    state.model = SentenceTransformer(MODEL_NAME)
    
    # Load cross-encoder reranker if enabled
    if ENABLE_RERANKING:
        try:
            state.reranker = CrossEncoder(RERANKER_MODEL)
            logger.info("Reranker loaded: %s", RERANKER_MODEL)
        except Exception as e:
            logger.warning("Failed to load reranker, falling back to semantic-only: %s", e)
            state.reranker = None
    
    logger.info(
        "RAG enhancements: reranking=%s, response_cache=%s, hybrid_search=%s",
        ENABLE_RERANKING and state.reranker is not None,
        ENABLE_RESPONSE_CACHE,
        ENABLE_HYBRID_SEARCH,
    )
    
    limits = httpx.Limits(
        max_connections=int(os.environ.get("HTTP_MAX_CONNECTIONS", "256")),
        max_keepalive_connections=int(os.environ.get("HTTP_KEEPALIVE", "128")),
    )
    timeout = httpx.Timeout(60.0, connect=10.0)
    state.http = httpx.AsyncClient(limits=limits, timeout=timeout)
    yield
    await state.http.aclose()
    state.http = None
    state.model = None
    state.reranker = None
    state.rag = None


app = FastAPI(title="Srini AI Chat API", lifespan=lifespan, default_response_class=ORJSONResponse)
_cors_raw = os.environ.get("CORS_ORIGINS", "*")
_cors_list = [o.strip() for o in _cors_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list if _cors_list else ["*"],
    allow_credentials=_cors_list != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    logger.error("Unhandled error on %s: %s\n%s", request.url.path, exc, traceback.format_exc())
    return ORJSONResponse(
        status_code=500,
        content={"detail": f"Internal error: {type(exc).__name__}: {exc}"},
    )


@app.get("/health")
async def health():
    ok = state.rag is not None and state.model is not None and state.http is not None
    return {
        "status": "ok" if ok else "degraded",
        "observability": {
            "langfuse": has_langfuse_credentials(),
        },
        "enhancements": {
            "reranking": ENABLE_RERANKING and state.reranker is not None,
            "response_cache": ENABLE_RESPONSE_CACHE,
            "hybrid_search": ENABLE_HYBRID_SEARCH,
        },
        "cache_stats": {
            "response_cache_size": len(_response_cache),
            "embed_cache_size": len(_embed_cache),
        },
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    obs = start_chat_trace(
        message=body.message,
        session_id=body.session_id,
        trace_id=body.trace_id,
        page_path=body.page_path,
        page_title=body.page_title,
    )
    try:
        if not state.http or not state.rag or not state.model:
            raise HTTPException(status_code=503, detail="Service not ready")

        q = body.message.strip()
        if not q:
            raise HTTPException(status_code=400, detail="Message is empty")

        if detect_mentorship_topics_intent(q):
            record_intent_shortcut(
                obs,
                intent="mentorship-topics",
                answer=MENTORSHIP_TOPICS_ANSWER,
            )
            flush_observability(obs)
            return ChatResponse(
                answer=MENTORSHIP_TOPICS_ANSWER,
                suggestions=MENTORSHIP_TOPICS_SUGGESTIONS,
            )

        embed_span = obs["trace"].span(name="embed") if obs else None
        embed_started = asyncio.get_running_loop().time()
        qvec = await embed_message(q)
        end_span(
            embed_span,
            output={"dimensions": int(qvec.shape[0])},
            metadata={"duration_ms": int((asyncio.get_running_loop().time() - embed_started) * 1000)},
        )

        # Check response cache first (skip for ADPList queries which have dynamic data)
        if not detect_adplist_intent(q):
            cache_span = obs["trace"].span(name="response-cache") if obs else None
            cached_response = _find_cached_response(qvec)
            end_span(
                cache_span,
                output={"hit": cached_response is not None},
            )
            if cached_response is not None:
                finish_chat_trace(
                    obs,
                    output=cached_response.answer,
                    metadata={"response_cache_hit": True},
                )
                flush_observability(obs)
                return cached_response

        # Hybrid retrieval: get more candidates for reranking
        retrieval_span = obs["trace"].span(name="retrieval") if obs else None
        retrieval_k = RETRIEVAL_CANDIDATES if ENABLE_RERANKING else TOP_K
        candidates, semantic_scores = state.rag.top_k(
            qvec,
            k=retrieval_k,
            min_sim=MIN_SIMILARITY,
            query_text=q,
            use_hybrid=ENABLE_HYBRID_SEARCH,
        )
        end_span(
            retrieval_span,
            output={
                "candidate_count": len(candidates),
                "top_score": max(semantic_scores) if semantic_scores else None,
            },
            metadata={
                "hybrid_search": ENABLE_HYBRID_SEARCH,
                "retrieval_k": retrieval_k,
            },
        )

        # Rerank candidates to get final chunks
        rerank_span = obs["trace"].span(name="rerank") if obs else None
        chunks = await rerank_chunks(q, candidates)
        end_span(
            rerank_span,
            output={"chunk_count": len(chunks)},
            metadata={"reranking_enabled": ENABLE_RERANKING},
        )

        user_content = _build_user_content(q, chunks, body.page_path, body.page_title)

        adplist_context = ""
        adplist_widget: dict[str, Any] | None = None
        response_suggestions: list[str] | None = None
        if detect_adplist_intent(q) and state.http:
            adplist_span = obs["trace"].span(name="adplist-fetch") if obs else None
            adplist_started = asyncio.get_running_loop().time()
            try:
                booking_intent = detect_booking_intent(q)
                review_intent = detect_review_intent(q)
                booking = await get_booking_context(state.http)
                adplist_context = f"\n\n{build_adplist_prompt_context(booking)}"
                adplist_widget = build_adplist_widget_payload(
                    booking,
                    review_intent=review_intent,
                    booking_intent=booking_intent,
                )
                response_suggestions = booking_suggestions(
                    booking["profile"],
                    booking["availability"],
                    review_intent=review_intent,
                    booking_intent=booking_intent,
                )
                end_span(
                    adplist_span,
                    output={"ok": True},
                    metadata={"duration_ms": int((asyncio.get_running_loop().time() - adplist_started) * 1000)},
                )
            except Exception as exc:
                logger.warning("ADPList booking context failed: %s", exc)
                end_span(
                    adplist_span,
                    output={"ok": False},
                    metadata={"duration_ms": int((asyncio.get_running_loop().time() - adplist_started) * 1000)},
                    level="ERROR",
                )
                adplist_context = (
                    "\n\nADPLIST NOTE: Live mentor data is temporarily unavailable. "
                    "Mention Srini mentors on ADPList and link to https://adplist.org when relevant."
                )

        groq_key = os.environ.get("GROQ_API_KEY")
        if not groq_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + adplist_context},
            {"role": "user", "content": user_content},
        ]
        payload: dict[str, Any] = {
            "model": state.groq_model,
            "temperature": 0.25,
            "max_tokens": 600,
            "messages": messages,
        }
        if _use_json_object(state.groq_model):
            payload["response_format"] = {"type": "json_object"}

        generation = start_groq_generation(
            obs, model=state.groq_model, messages=messages, user_message=q
        )
        groq_started = asyncio.get_running_loop().time()

        async with state.groq_semaphore:
            r = await state.http.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code == 400 and payload.pop("response_format", None):
                r = await state.http.post(
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

        if r.status_code != 200:
            detail = r.text[:500]
            try:
                err = r.json()
                detail = err.get("error", {}).get("message", detail)
            except Exception:
                pass
            end_groq_generation(
                generation,
                output=detail,
                metadata={"duration_ms": int((asyncio.get_running_loop().time() - groq_started) * 1000)},
                level="ERROR",
                status_message=f"Groq HTTP {r.status_code}",
            )
            raise HTTPException(status_code=502, detail=f"Groq error: {detail}")

        data = r.json()
        try:
            msg = data["choices"][0]["message"]
            raw = msg.get("content")
            if not raw and msg.get("reasoning"):
                raw = msg["reasoning"]
        except (KeyError, IndexError, TypeError) as e:
            end_groq_generation(
                generation,
                output=None,
                metadata={"duration_ms": int((asyncio.get_running_loop().time() - groq_started) * 1000)},
                level="ERROR",
                status_message="Unexpected Groq response",
            )
            raise HTTPException(status_code=502, detail="Unexpected Groq response") from e

        if not raw:
            end_groq_generation(
                generation,
                output=None,
                metadata={"duration_ms": int((asyncio.get_running_loop().time() - groq_started) * 1000)},
                level="ERROR",
                status_message="Empty Groq response",
            )
            raise HTTPException(status_code=502, detail="Empty Groq response")

        try:
            parsed = _parse_llm_json(str(raw))
            answer = str(parsed.get("answer", "")).strip()
            suggestions = parsed.get("suggestions") or []
            if not isinstance(suggestions, list):
                suggestions = []
            suggestions = [str(s).strip() for s in suggestions if str(s).strip()][:3]
            while len(suggestions) < 3:
                suggestions.append("What else would you like to know about Srini's work?")
            if not answer:
                raise ValueError("empty answer")
            if response_suggestions:
                suggestions = response_suggestions
            if adplist_widget:
                answer = adplist_widget["companion_answer"]
            response = ChatResponse(
                answer=answer,
                suggestions=suggestions[:3],
                adplist=adplist_widget,
            )
            end_groq_generation(
                generation,
                output=answer,
                usage=data.get("usage"),
                metadata={
                    "duration_ms": int((asyncio.get_running_loop().time() - groq_started) * 1000),
                    "adplist_widget": bool(adplist_widget),
                },
            )
            finish_chat_trace(
                obs,
                output=answer,
                metadata={
                    "response_cache_hit": False,
                    "adplist_widget": bool(adplist_widget),
                },
            )
            # Cache non-ADPList responses for future similar queries
            if not adplist_widget:
                _cache_response(q, qvec, response)
            flush_observability(obs)
            return response
        except (json.JSONDecodeError, ValueError, TypeError):
            fallback = str(raw).strip() or FALLBACK_ANSWER
            response = ChatResponse(
                answer=fallback[:2000],
                suggestions=[
                    "What is Srini's current role?",
                    "What kind of products has Srini designed?",
                    "What is Srini's design philosophy?",
                ],
            )
            end_groq_generation(
                generation,
                output=response.answer,
                usage=data.get("usage"),
                metadata={
                    "duration_ms": int((asyncio.get_running_loop().time() - groq_started) * 1000),
                    "json_parse_fallback": True,
                },
            )
            finish_chat_trace(
                obs,
                output=response.answer,
                metadata={"json_parse_fallback": True},
            )
            # Cache fallback responses too
            _cache_response(q, qvec, response)
            flush_observability(obs)
            return response
    except HTTPException:
        flush_observability(obs)
        raise
    except Exception as exc:
        record_error(obs, exc, stage="chat")
        flush_observability(obs)
        logger.error("Chat handler failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chat failed: {type(exc).__name__}: {exc}") from exc


@app.get("/")
async def root():
    return {"service": "Srini AI Chat API", "docs": "/docs"}
