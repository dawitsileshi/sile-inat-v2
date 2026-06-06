"""
src/services/chatbot_service.py — LLM chatbot integration
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Optional

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert maternal mental health companion. Provide warm, validating, "
    "evidence-backed advice to mothers. You are not a medical doctor. Be gentle and brief."
)

FALLBACK_RESPONSE = (
    "I'm here to listen and support you. While the AI service isn't fully configured yet, "
    "please know that what you're feeling matters. Consider reaching out to a trusted friend, "
    "your healthcare provider, or a postpartum support line if you need immediate help."
)


def _build_messages(user_message: str, history: Optional[list]) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for item in history[-10:]:
            role = item.get("role")
            content = item.get("content") or item.get("text", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})
    messages.append({"role": "user", "content": user_message})
    return messages


def _call_openai_compatible(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict],
    timeout: int,
) -> str:
    url = f"{base_url.rstrip('/')}/chat/completions"
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data["choices"][0]["message"]["content"].strip()


def get_chat_response(
    user_message: str,
    history: Optional[list] = None,
    *,
    api_key: Optional[str] = None,
    provider: str = "groq",
    model: Optional[str] = None,
    timeout: int = 30,
) -> str:
    """
    Returns an empathetic assistant reply. Uses Groq (default), OpenAI, or a
    local fallback when LLM_API_KEY is not set.
    """
    if not api_key:
        log.warning("LLM_API_KEY not configured — returning fallback response.")
        return FALLBACK_RESPONSE

    messages = _build_messages(user_message, history)

    provider = (provider or "groq").lower()
    if provider == "openai":
        base_url = "https://api.openai.com/v1"
        model = model or "gpt-4o-mini"
    elif provider == "groq":
        base_url = "https://api.groq.com/openai/v1"
        model = model or "llama-3.1-8b-instant"
    else:
        base_url = "https://api.groq.com/openai/v1"
        model = model or "llama-3.1-8b-instant"

    try:
        return _call_openai_compatible(
            api_key=api_key,
            base_url=base_url,
            model=model,
            messages=messages,
            timeout=timeout,
        )
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        log.error("LLM API HTTP error %s: %s", exc.code, body)
        return (
            "I'm having trouble connecting right now. Please try again in a moment, "
            "or reach out to your healthcare provider if you need urgent support."
        )
    except Exception as exc:
        log.error("LLM API error: %s", exc)
        return FALLBACK_RESPONSE
