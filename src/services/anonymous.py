"""
src/services/anonymous.py — Anonymous client identification helpers
"""

from __future__ import annotations

import re
import uuid

from flask import request

UUID_V4_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

HEADER_NAME = "X-Anonymous-Client-Id"


def is_valid_client_id(value: str) -> bool:
    return bool(value and UUID_V4_RE.match(value.strip()))


def normalize_client_id(value: str) -> str:
    return value.strip().lower()


def get_client_id_from_request(*, required: bool = True) -> str | None:
    """
    Reads anonymous_client_id from header or JSON body.
    Returns None when missing and required=False.
    """
    header = request.headers.get(HEADER_NAME)
    if header and is_valid_client_id(header):
        return normalize_client_id(header)

    payload = request.get_json(silent=True) or {}
    body_id = payload.get("anonymous_client_id")
    if body_id and is_valid_client_id(str(body_id)):
        return normalize_client_id(str(body_id))

    if required:
        return None
    return None


def generate_client_id() -> str:
    return str(uuid.uuid4())
