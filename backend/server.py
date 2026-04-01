"""
Srini portfolio chat API — FastAPI + lightweight LLM (Groq by default).

Uses the OpenAI-compatible HTTP API (same client SDK) for Groq, OpenAI, or
local Ollama. Concurrency is bounded by _CHAT_SEM — see SCALABILITY.md.
"""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

load_dotenv()

# --- Tunable via environment (see .env.example) ---
_CHAT_SEM = asyncio.Semaphore(max(1, int(os.getenv("CHAT_MAX_CONCURRENT", "32"))))
_LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT_SEC", os.getenv("OPENAI_TIMEOUT_SEC", "60")))
_LLM_MAX_RETRIES = max(0, int(os.getenv("LLM_MAX_RETRIES", os.getenv("OPENAI_MAX_RETRIES", "2"))))
_RATE_LIMIT_PER_IP = os.getenv("RATE_LIMIT_PER_IP", "30/minute").strip() or "30/minute"

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_llm_client: OpenAI | None = None
_llm_model: str | None = None


def _infer_provider() -> str:
    explicit = (os.getenv("LLM_PROVIDER") or "").strip().lower()
    if explicit in ("groq", "openai", "ollama"):
        return explicit
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    return "groq"


def _build_llm_client() -> tuple[OpenAI, str]:
    """OpenAI-compatible client + model id for chat.completions."""
    provider = _infer_provider()
    kwargs: dict[str, Any] = {
        "timeout": _LLM_TIMEOUT,
        "max_retries": _LLM_MAX_RETRIES,
    }

    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError(
                "LLM_PROVIDER=openai requires OPENAI_API_KEY. "
                "Or use Groq (default): set GROQ_API_KEY from https://console.groq.com"
            )
        client = OpenAI(api_key=key, **kwargs)
        model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        return client, model

    if provider == "ollama":
        base = (os.getenv("OLLAMA_BASE_URL") or "http://127.0.0.1:11434/v1").rstrip("/")
        if not base.endswith("/v1"):
            base = base + "/v1"
        client = OpenAI(
            base_url=base,
            api_key=os.getenv("OLLAMA_API_KEY") or "ollama",
            **kwargs,
        )
        model = os.getenv("OLLAMA_MODEL", "llama3.2")
        return client, model

    # groq — fast, free tier, small models (no OpenAI account)
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise RuntimeError(
            "Set GROQ_API_KEY (free at https://console.groq.com) for the default lightweight "
            "provider, or set LLM_PROVIDER=ollama with Ollama running locally, or "
            "LLM_PROVIDER=openai with OPENAI_API_KEY."
        )
    client = OpenAI(base_url=GROQ_BASE_URL, api_key=key, **kwargs)
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    return client, model


def get_llm() -> tuple[OpenAI, str]:
    global _llm_client, _llm_model
    if _llm_client is None or _llm_model is None:
        _llm_client, _llm_model = _build_llm_client()
    return _llm_client, _llm_model


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip, default_limits=[])

app = FastAPI(title="Srini Chat API", version="1.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are Srini's AI assistant on his portfolio website. Srinivasan (Srini) is a Staff Product Designer at Intuit, previously at Norton, Google, and Zoho. He is based in the San Francisco Bay Area.

Key facts:
- Currently designing GenAI-powered developer experiences (Intuit Assist) and API platform tools at Intuit.
- At Norton: designed Spam Protection features and a white-label design system for Norton 360 iOS.
- At Google: built a component library / design system for Google Ad Manager.
- At Zoho: designed and shipped Zoho Sheet for iOS and Android.
- Also worked on Holachef (FoodTech startup) ecosystem of applications.
- Full-spectrum product designer: research, interaction design, visual design, prototyping, design systems.
- Email: tcsreeni93@gmail.com
- LinkedIn: linkedin.com/in/srinivasanchakkarapani

Be friendly, concise, and helpful. If someone asks something you don't know about Srini, say so politely and suggest they email him directly."""

_DEFAULT_SUGGESTIONS = [
    "What does Srini focus on at Intuit?",
    "Tell me about Srini's design systems work",
    "How can I contact Srini?",
]

_startup_monotonic = time.monotonic()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)


def _build_response_payload(answer_text: str) -> dict[str, Any]:
    return {
        "answer": answer_text,
        "reply": answer_text,
        "suggestions": list(_DEFAULT_SUGGESTIONS),
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    out: dict[str, Any] = {
        "status": "ok",
        "uptime_sec": round(time.monotonic() - _startup_monotonic, 3),
        "llm_provider": _infer_provider(),
    }
    try:
        get_llm()
        out["llm_configured"] = True
    except RuntimeError as e:
        out["llm_configured"] = False
        out["llm_error"] = str(e)
    return out


@app.post("/chat")
@limiter.limit(_RATE_LIMIT_PER_IP)
async def chat(request: Request, req: ChatRequest) -> dict[str, Any]:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        llm, model = get_llm()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    try:
        async with _CHAT_SEM:
            response = await asyncio.to_thread(
                lambda: llm.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": req.message},
                    ],
                    max_tokens=500,
                    temperature=0.7,
                )
            )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise HTTPException(status_code=502, detail="Empty model response.")
        return _build_response_payload(text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8888)
