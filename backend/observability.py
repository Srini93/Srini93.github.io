"""Langfuse tracing helpers for the local FastAPI chat API."""

from __future__ import annotations

import json
import os
import random
from typing import Any, Optional

_langfuse = None


def _resolve_langfuse_host() -> str:
    return (
        os.environ.get("LANGFUSE_BASE_URL")
        or os.environ.get("LANGFUSE_HOST")
        or "https://us.cloud.langfuse.com"
    )


def _resolve_langfuse_environment() -> str:
    return (
        os.environ.get("LANGFUSE_TRACING_ENVIRONMENT")
        or os.environ.get("LANGFUSE_ENVIRONMENT")
        or "local"
    )


def _stringify_metadata(metadata: Optional[dict[str, Any]] = None) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in (metadata or {}).items():
        if value is None:
            continue
        text = value if isinstance(value, str) else json.dumps(value, default=str)
        out[key] = text[:200]
    return out


def _should_sample() -> bool:
    raw = os.environ.get("LANGFUSE_SAMPLE_RATE")
    if raw is None or raw == "":
        return True
    try:
        rate = float(raw)
    except ValueError:
        return True
    if rate >= 1:
        return True
    if rate <= 0:
        return False
    return random.random() < rate


def has_langfuse_credentials() -> bool:
    return bool(os.environ.get("LANGFUSE_PUBLIC_KEY") and os.environ.get("LANGFUSE_SECRET_KEY"))


def get_langfuse():
    global _langfuse
    if _langfuse is not None:
        return _langfuse

    if not has_langfuse_credentials():
        return None

    from langfuse import Langfuse

    _langfuse = Langfuse(
        public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
        secret_key=os.environ["LANGFUSE_SECRET_KEY"],
        host=_resolve_langfuse_host(),
        release=os.environ.get("LANGFUSE_RELEASE"),
        environment=_resolve_langfuse_environment(),
    )
    return _langfuse


def is_observability_enabled() -> bool:
    return get_langfuse() is not None and _should_sample()


def summarize_messages_for_trace(messages: list[dict[str, Any]], user_message: str) -> dict[str, Any]:
    system = next((message for message in messages if message.get("role") == "system"), None)
    system_content = system.get("content") if system else ""
    return {
        "user_message": user_message[:500],
        "message_count": len(messages),
        "system_prompt_chars": len(system_content or ""),
    }


def start_chat_trace(
    *,
    message: str,
    session_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    page_path: Optional[str] = None,
    page_title: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    lf = get_langfuse()
    if not lf or not _should_sample():
        return None

    trace = lf.trace(
        id=trace_id or None,
        name="chat",
        session_id=session_id,
        input=message,
        metadata=_stringify_metadata(
            {
                "page_path": page_path,
                "page_title": page_title,
                "backend": "fastapi",
                "endpoint": "chat",
            }
        ),
        tags=["srini-chatbot", "chat"],
    )
    return {"lf": lf, "trace": trace}


def record_intent_shortcut(obs: Optional[dict[str, Any]], *, intent: str, answer: str) -> None:
    if not obs:
        return
    obs["trace"].event(name="intent-shortcut", input={"intent": intent}, output={"answer": answer[:500]})
    obs["trace"].update(output=answer)


def end_span(span, *, output: Any = None, metadata: Optional[dict[str, Any]] = None, level: Optional[str] = None) -> None:
    if not span:
        return
    span.end(output=output, metadata=_stringify_metadata(metadata), level=level)


def start_groq_generation(
    obs: Optional[dict[str, Any]],
    *,
    model: str,
    messages: list[dict[str, Any]],
    user_message: str,
) -> Any:
    if not obs:
        return None
    return obs["trace"].generation(
        name="groq-completion",
        model=model,
        model_parameters={"temperature": 0.25, "max_tokens": 600},
        input=summarize_messages_for_trace(messages, user_message),
    )


def end_groq_generation(
    generation,
    *,
    output: Any,
    usage: Optional[dict[str, Any]] = None,
    metadata: Optional[dict[str, Any]] = None,
    level: Optional[str] = None,
    status_message: Optional[str] = None,
) -> None:
    if not generation:
        return
    mapped_usage = None
    if usage:
        mapped_usage = {
            "input": usage.get("prompt_tokens") or usage.get("input"),
            "output": usage.get("completion_tokens") or usage.get("output"),
            "total": usage.get("total_tokens") or usage.get("total"),
        }
    generation.end(
        output=output,
        usage=mapped_usage,
        metadata=_stringify_metadata(metadata),
        level=level,
        status_message=status_message,
    )


def finish_chat_trace(
    obs: Optional[dict[str, Any]],
    *,
    output: Any,
    metadata: Optional[dict[str, Any]] = None,
    level: Optional[str] = None,
    status_message: Optional[str] = None,
) -> None:
    if not obs:
        return
    obs["trace"].update(
        output=output,
        metadata=_stringify_metadata(metadata),
        level=level,
        status_message=status_message,
    )


def record_error(obs: Optional[dict[str, Any]], err: Exception, *, stage: str) -> None:
    if not obs:
        return
    obs["trace"].event(
        name="error",
        level="ERROR",
        input={"stage": stage},
        output={"message": str(err)},
    )
    obs["trace"].update(level="ERROR", status_message=str(err), metadata=_stringify_metadata({"stage": stage}))


def flush_observability(obs: Optional[dict[str, Any]] = None) -> None:
    lf = (obs or {}).get("lf") or get_langfuse()
    if lf:
        lf.flush()
