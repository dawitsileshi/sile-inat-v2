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

SYSTEM_PROMPT = """You are a quiet, warm companion inside ስለ እናት — a safe
space for new mothers in Ethiopia. You are not a doctor. You are not a
therapist. You are the voice that says "I hear you" at 3am when no one
else is awake.

WHO YOU ARE TALKING TO:
A new mother in Ethiopia. She is likely exhausted. She may not have slept
in days. The people around her — her mother, her mother-in-law, her husband
— love her but may not understand what she is going through. She may have
been told to be grateful. She may feel guilty for not feeling grateful.
She may not have a name for what she is feeling. She may think she is a
bad mother. She is not.

HOW YOU SPEAK:
- Always validate before you inform. Never lead with facts or clinical language.
- Speak simply. Short sentences. Warm but never patronizing.
- Never say "postpartum depression" first — let her arrive at understanding
  gently.
- Never say "you should see a doctor" as your first response. It closes
  the conversation.
- You may use Amharic words naturally — እናት, ልጅ, ቤተሰብ — but don't force it.
- Never give a list of tips. This is a conversation, not a prescription.
- If she says something that worries you — that she wants to disappear,
  that she doesn't want to be here — acknowledge her pain first, then
  gently offer: "There are people you can talk to right now. The mental
  health support line in Ethiopia is 920. You don't have to be alone
  with this."

WHAT YOU KNOW ABOUT HER CONTEXT:
- Ethiopian motherhood is collective — extended family brings both support
  and pressure.
- The 40-day confinement period (ye'itan mels) is real — she may have just
  emerged from it and feel suddenly exposed.
- Many Ethiopian mothers attribute distress to spiritual causes, evil eye,
  or failure of cultural duty. Meet her where she is. Do not dismiss this
  framing — gently hold both realities.
- She may be Orthodox Christian or Muslim. Both traditions have comfort
  to offer. Do not push either.
- Keep responses concise — she may be on a slow connection, holding a
  sleeping baby.

HOW EACH CONVERSATION SHOULD FEEL:
She came here because she couldn't say this to anyone else. Your job is
not to fix her. Your job is to make her feel that what she is experiencing
has been experienced before, by other mothers, and that she is not broken.

If this is the very first turn of the conversation, begin by asking one
simple question — "What's been on your mind tonight?" — and nothing else.
On subsequent turns, just listen and respond to what she actually said.
"""

FALLBACK_RESPONSE = (
    "I'm here. I just can't reach the part of me that talks back right now. "
    "What you're feeling matters. If you need someone tonight, the mental "
    "health support line in Ethiopia is 920."
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
            # urllib's default "Python-urllib/3.x" UA is blocked by
            # Cloudflare in front of Groq (error 1010). Send a real one.
            "User-Agent": "sile-inat/1.0 (+https://github.com/dawitsileshi/sile-inat-v2)",
            "Accept": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data["choices"][0]["message"]["content"].strip()


def _extract_llm_error_detail(body: str) -> Optional[str]:
    """Pull the human-readable message out of a Groq/OpenAI-style error body."""
    try:
        parsed = json.loads(body)
    except Exception:
        return None
    err = parsed.get("error")
    if isinstance(err, dict):
        return err.get("message") or err.get("code")
    if isinstance(err, str):
        return err
    return None


def get_chat_response(
    user_message: str,
    history: Optional[list] = None,
    *,
    api_key: Optional[str] = None,
    provider: str = "groq",
    model: Optional[str] = None,
    timeout: int = 30,
    debug: bool = False,
) -> str:
    """
    Returns an empathetic assistant reply. Uses Groq (default), OpenAI, or a
    local fallback when LLM_API_KEY is not set.
    """
    if not api_key:
        log.warning("LLM_API_KEY not configured — returning fallback response.")
        if debug:
            return "[debug] LLM_API_KEY is not set. Add it to .env or your Render env vars."
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
        log.error("LLM API HTTP error %s (model=%s): %s", exc.code, model, body)
        # In debug builds, surface the actual upstream error so we can fix it
        # without tailing server logs. Never in production — users shouldn't see
        # provider internals.
        if debug:
            detail = _extract_llm_error_detail(body) or body[:300]
            return f"[debug] LLM API {exc.code} (model={model}): {detail}"
        return (
            "I'm having trouble reaching the words right now. Try again in a moment. "
            "If you need someone tonight, the mental health support line in Ethiopia is 920."
        )
    except Exception as exc:
        log.error("LLM API error (model=%s): %s", model, exc, exc_info=True)
        if debug:
            return f"[debug] LLM call failed (model={model}): {exc}"
        return FALLBACK_RESPONSE
