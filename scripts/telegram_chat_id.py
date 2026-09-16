"""
scripts/telegram_chat_id.py — find the chat id for safety alerts

A Telegram bot cannot start a conversation. Whoever should receive the alerts
has to message the bot first; that message is what tells the bot which chat to
reply to. This reads those messages and prints the chat ids it finds.

Usage:
    # token from the environment (or .env), or you will be prompted for it
    python scripts/telegram_chat_id.py

    # send a test alert to a chat id, to prove the whole path works
    python scripts/telegram_chat_id.py --test 123456789

The token is read from the environment or typed hidden, never echoed, never
written to a file, and never included in anything this prints.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.telegram.org/bot{token}/{method}"


def _load_dotenv_token() -> str:
    """Reads TELEGRAM_BOT_TOKEN from .env without needing python-dotenv."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("TELEGRAM_BOT_TOKEN="):
            return line.split("=", 1)[1].strip().strip("'\"")
    return ""


def _token() -> str:
    token = (os.getenv("TELEGRAM_BOT_TOKEN") or _load_dotenv_token()).strip()
    if token:
        return token
    print("TELEGRAM_BOT_TOKEN is not set in the environment or .env.")
    return getpass.getpass("Paste the bot token (hidden): ").strip()


def _call(token: str, method: str, payload: dict | None = None) -> dict:
    request = urllib.request.Request(
        API.format(token=token, method=method),
        data=json.dumps(payload).encode() if payload else None,
        headers={"Content-Type": "application/json"},
        method="POST" if payload else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        # Never echo the URL back — it contains the token.
        raise SystemExit(f"Telegram returned {exc.code}. Response: {body[:300]}")
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not reach Telegram: {exc.reason}")


def show_chats(token: str) -> int:
    me = _call(token, "getMe")
    if not me.get("ok"):
        raise SystemExit(f"Token rejected: {me.get('description')}")
    username = me["result"].get("username")
    print(f"Bot: @{username}")
    print()

    updates = _call(token, "getUpdates")
    if not updates.get("ok"):
        raise SystemExit(f"getUpdates failed: {updates.get('description')}")

    chats = {}
    for update in updates.get("result", []):
        message = (update.get("message") or update.get("channel_post")
                   or update.get("my_chat_member", {}).get("chat") and update["my_chat_member"])
        chat = (message or {}).get("chat") if isinstance(message, dict) else None
        if chat:
            chats[chat["id"]] = chat

    if not chats:
        print("No messages yet, so there is no chat id to report.")
        print()
        print(f"  Open Telegram, find @{username}, and press Start (or send it any")
        print("  message). For a group, add the bot to the group and send a message")
        print("  there. Then run this again.")
        print()
        print("  Note: Telegram only keeps recent updates, and they are consumed by")
        print("  whatever reads them. If you already used getUpdates in a browser,")
        print("  send the bot another message and retry.")
        return 1

    print("Chats that have written to this bot:")
    for chat_id, chat in chats.items():
        who = chat.get("title") or " ".join(
            filter(None, [chat.get("first_name"), chat.get("last_name")])
        ) or chat.get("username") or "(unnamed)"
        kind = chat.get("type", "?")
        note = "  <- group: adding responders later means adding them here" \
            if kind in ("group", "supergroup") else ""
        print(f"  {chat_id:<16} {kind:<12} {who}{note}")
    print()
    print("Set the one you want as TELEGRAM_ALERT_CHAT_ID (Render -> Environment,")
    print("and your local .env). Then: python scripts/telegram_chat_id.py --test <id>")
    return 0


def send_test(token: str, chat_id: str) -> int:
    text = (
        "✅ Sile Inat safety alerts are wired up.\n\n"
        "This is a test message. A real alert looks like this:\n\n"
        "⚠️ Safety disclosure\n\n"
        "Event:    <event id>\n"
        "Stage:    1 (stage1_safety_question)\n"
        "Item:     phq9_9\n"
        "Language: am\n"
        "Time:     <when>\n\n"
        "No answers are included in this message."
    )
    result = _call(token, "sendMessage", {"chat_id": chat_id, "text": text})
    if not result.get("ok"):
        raise SystemExit(f"Send failed: {result.get('description')}")
    print(f"Sent. Check the chat — if it arrived, {chat_id} is the id to use.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--test", metavar="CHAT_ID",
                        help="Send a test alert to this chat id.")
    args = parser.parse_args()

    token = _token()
    if not token:
        raise SystemExit("No token given.")
    return send_test(token, args.test) if args.test else show_chats(token)


if __name__ == "__main__":
    sys.exit(main())
