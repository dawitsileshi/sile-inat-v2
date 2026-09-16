"""
src/services/screening_content.py — Versioned screening content registry
=========================================================================

Every word a participant reads during screening comes from here: consent text,
Stage 1 triage items, and later the EPDS. None of it is authored in Python.

The rule this module exists to enforce:

    Content is served only when a human has deliberately published it.

A bundle file appearing on disk is NOT publication. A bundle that declares
`"status": "draft"` is invisible to `get_active_content` until a human
publishes it — either by running scripts/publish_screening_content.py against
the database, or by changing that word to "active" in the file and committing
it. That is the safety valve for clinical content: placeholder or unreviewed
questions physically cannot reach a mother, even if they are committed,
deployed, and sitting in the database. Publication only ever moves in one
direction here; taking something back to draft is a hand at the database.

Layout: src/content/<content_key>/<anything>.json

Filenames are informational. The authoritative identity of a bundle is the
(content_key, version, language) triple inside the JSON, which is what gets
written to `screening_content_versions`.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.extensions import db
from src.models import ScreeningConsent, ScreeningContentVersion

log = logging.getLogger(__name__)

CONTENT_ROOT = Path(__file__).resolve().parent.parent / "content"

#: Mirrors SUPPORTED_LANGS in frontend/src/lib/i18n.ts.
SUPPORTED_LANGUAGES = ("en", "am")

CONSENT_KEY = "consent"
STAGE1_KEY = "stage1_triage"
EPDS_KEY = "epds"

#: Minimum keys each kind of bundle must carry. A malformed bundle raises at
#: sync time rather than failing halfway through a mother's screening.
REQUIRED_KEYS = {
    CONSENT_KEY: {"content_key", "version", "language", "title", "sections"},
    STAGE1_KEY: {"content_key", "version", "language", "title", "items", "scoring"},
    EPDS_KEY: {"content_key", "version", "language", "title", "items", "scoring"},
}


class ContentError(Exception):
    """Raised when a bundle is malformed or unavailable."""


#: The script a language's question wording must actually be written in.
#: A bundle can declare `"language": "am"` and carry English words — a
#: structurally perfect file that would put English PHQ items in front of a
#: mother who asked for Amharic, and score her on them. Nothing else in this
#: module can catch that: the JSON is valid, the items are present, the bands
#: cover the range. Only the script tells you the words are the wrong ones.
#: Languages absent from this map are unconstrained.
REQUIRED_SCRIPT = {
    "am": ("Ethiopic", re.compile(r"[\u1200-\u137F]")),
}


def script_violations(bundle: dict) -> list:
    """Item codes whose wording is not in the script its language requires.

    Checks the question text only. That is the participant-facing wording that
    decides her answers, and it is the text that must never be a language she
    did not choose.
    """
    entry = REQUIRED_SCRIPT.get(bundle.get("language"))
    if entry is None:
        return []
    _, pattern = entry
    return [
        item.get("code", f"#{i}")
        for i, item in enumerate(bundle.get("items") or [])
        if not pattern.search(str(item.get("text", "")))
    ]


def _publishable(bundle: dict, label: str) -> bool:
    """False, loudly, when publishing this bundle would serve the wrong language."""
    bad = script_violations(bundle)
    if not bad:
        return True
    script = REQUIRED_SCRIPT[bundle["language"]][0]
    log.error(
        "REFUSING to publish %s: %d item(s) carry no %s text (%s). A bundle "
        "that declares a language must be written in it. Left as draft.",
        label, len(bad), script, ", ".join(map(str, bad[:5])),
    )
    return False


def _checksum(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def canonical_json(bundle: dict) -> str:
    """Stable serialisation so the checksum tracks content, not formatting."""
    return json.dumps(bundle, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def bundle_of(row: ScreeningContentVersion) -> dict:
    return json.loads(row.payload) if row.payload else {}


#: Keys a scoring band may use for its label, in priority order. Stage 1 calls
#: its bands "tier" (green/amber/orange); the EPDS calls them "status". Both
#: are natural in their own instrument, so the engine accepts either rather
#: than forcing content authors into someone else's vocabulary.
BAND_LABEL_KEYS = ("band", "tier", "status")


def band_label(band: dict) -> str:
    """The label of one scoring band, whichever key the author used."""
    for key in BAND_LABEL_KEYS:
        if key in band:
            return band[key]
    raise ContentError(
        f"A scoring band must carry one of {BAND_LABEL_KEYS}; got {sorted(band)}"
    )


# ─── Validation ───────────────────────────────────────────────────────────────
def validate_bundle(bundle: dict, *, source: str = "<bundle>") -> None:
    """Structural validation only. Clinical validity is a human's job."""
    key = bundle.get("content_key")
    if key not in REQUIRED_KEYS:
        raise ContentError(f"{source}: unknown content_key {key!r}")

    missing = REQUIRED_KEYS[key] - set(bundle)
    if missing:
        raise ContentError(f"{source}: missing required keys {sorted(missing)}")

    if bundle.get("language") not in SUPPORTED_LANGUAGES:
        raise ContentError(f"{source}: unsupported language {bundle.get('language')!r}")

    if key in (STAGE1_KEY, EPDS_KEY):
        _validate_instrument(bundle, source)


def _validate_instrument(bundle: dict, source: str) -> None:
    items = bundle.get("items") or []
    if not items:
        raise ContentError(f"{source}: instrument has no items")

    codes = set()
    for i, item in enumerate(items):
        for field in ("code", "text", "options"):
            if field not in item:
                raise ContentError(f"{source}: item {i} is missing {field!r}")
        if item["code"] in codes:
            raise ContentError(f"{source}: duplicate item code {item['code']!r}")
        codes.add(item["code"])
        if not item["options"]:
            raise ContentError(f"{source}: item {item['code']!r} has no options")
        for opt in item["options"]:
            if "value" not in opt or "label" not in opt:
                raise ContentError(
                    f"{source}: item {item['code']!r} has an option missing value/label"
                )
        if item.get("is_safety_item") and "safety_trigger_min_value" not in item:
            raise ContentError(
                f"{source}: safety item {item['code']!r} must declare "
                f"safety_trigger_min_value - the trigger threshold is content, "
                f"not something the engine may guess"
            )

    scoring = bundle.get("scoring") or {}
    tiers = scoring.get("tiers") or scoring.get("bands") or []
    if not tiers:
        raise ContentError(f"{source}: scoring has no tiers/bands")
    for tier in tiers:
        for field in ("min", "max"):
            if field not in tier:
                raise ContentError(f"{source}: a scoring band is missing {field!r}")
        band_label(tier)          # raises when no label key is present

    override = scoring.get("safety_override")
    if override is not None:
        band_label(override)

    # Every attainable total must land in exactly one band. A gap means a real
    # participant could score a number the engine cannot classify.
    max_possible = sum(max(o["value"] for o in item["options"]) for item in items)
    declared = scoring.get("max_score")
    if declared is not None and declared != max_possible:
        raise ContentError(
            f"{source}: scoring.max_score is {declared} but the items can total "
            f"{max_possible}. One of them is wrong, and a wrong maximum means a "
            f"wrong band."
        )
    for total in range(0, max_possible + 1):
        matches = [t for t in tiers if t["min"] <= total <= t["max"]]
        if len(matches) != 1:
            raise ContentError(
                f"{source}: total {total} matches {len(matches)} tier bands "
                f"(must match exactly 1). Bands must cover 0..{max_possible} "
                f"with no gaps and no overlaps."
            )


# ─── Discovery + sync ─────────────────────────────────────────────────────────
def discover_bundles() -> list:
    """Returns [(path, bundle_dict)] for every JSON under src/content/*/."""
    if not CONTENT_ROOT.is_dir():
        return []
    found = []
    for path in sorted(CONTENT_ROOT.glob("*/*.json")):
        try:
            with path.open(encoding="utf-8") as fh:
                bundle = json.load(fh)
        except json.JSONDecodeError as exc:
            raise ContentError(f"{path.name}: invalid JSON - {exc}") from exc
        validate_bundle(bundle, source=path.name)
        found.append((path, bundle))
    return found


def _has_dependent_records(row: ScreeningContentVersion) -> bool:
    """True when participants have already been served this exact version."""
    from src.models import ScreeningItemResponse, ScreeningSession

    for model in (ScreeningConsent, ScreeningSession, ScreeningItemResponse):
        exists = db.session.query(
            model.query.filter_by(content_version_id=row.id).exists()
        ).scalar()
        if exists:
            return True
    return False


def sync_content() -> dict:
    """
    Upserts on-disk bundles into `screening_content_versions`.

    Idempotent and safe on every boot. Three rules:

    1. A new bundle is inserted with the status its file declares, defaulting
       to 'active'. Clinical instruments should declare "draft".
    2. An existing row is updated only when the checksum differs.
    3. A checksum change is REFUSED when any participant record already points
       at that version. Editing text under a version people have already been
       served would silently invalidate their records. Bump the version.
    4. A file that declares "active" for a version already registered as
       'draft' PUBLISHES it. Promotion is one-way: nothing here can ever take
       a published version back to draft, so a redeploy cannot un-publish
       something a human published.

    Rule 4 exists because the status on a new row (rule 1) only reaches a
    database that is being populated for the first time. Where the database
    outlives the deploy — which is the normal case — editing the file and
    committing it would otherwise do nothing at all, silently. Publishing
    stays a deliberate human act either way: it is a reviewed change to a
    version-controlled file, or a run of
    scripts/publish_screening_content.py against the database directly.

    Returns {content_key: rows_written}.
    """
    written: dict = {}
    for path, bundle in discover_bundles():
        payload = canonical_json(bundle)
        digest = _checksum(payload)
        key = bundle["content_key"]

        row = ScreeningContentVersion.query.filter_by(
            content_key=key,
            version=bundle["version"],
            language=bundle["language"],
        ).one_or_none()

        # Declared status, downgraded to draft when the wording is not in the
        # language the bundle claims. Never raises: a bad bundle must not stop
        # the app from booting, it must only fail to publish.
        declared_status = bundle.get("status", "active")
        if declared_status == "active" and not _publishable(
            bundle, f"{key}@{bundle['version']}/{bundle['language']}"
        ):
            declared_status = "draft"

        if row is None:
            row = ScreeningContentVersion(
                content_key=key,
                version=bundle["version"],
                language=bundle["language"],
                stage=bundle.get("stage"),
                status=declared_status,
                item_count=len(bundle.get("items", bundle.get("sections", []))),
                payload=payload,
                checksum=digest,
                notes=bundle.get("notes"),
                published_at=datetime.utcnow() if declared_status == "active" else None,
            )
            db.session.add(row)
            written[key] = written.get(key, 0) + 1
            log.info("Content registered: %s [%s]", row.label, declared_status)

        else:
            if row.checksum != digest:
                if _has_dependent_records(row):
                    # The stored payload stays exactly as served. Publication
                    # below is still allowed: it changes which version is
                    # served, not a word of what it says.
                    log.error(
                        "Refusing to rewrite %s: participant records already "
                        "reference this version. Bump the version instead.",
                        row.label,
                    )
                else:
                    row.payload = payload
                    row.checksum = digest
                    row.notes = bundle.get("notes")
                    row.item_count = len(
                        bundle.get("items", bundle.get("sections", []))
                    )
                    written[key] = written.get(key, 0) + 1
                    log.info("Content updated: %s", row.label)

            # Rule 4. Never the other way round.
            if declared_status == "active" and row.status == "draft":
                row.status = "active"
                row.published_at = row.published_at or datetime.utcnow()
                written[key] = written.get(key, 0) + 1
                log.info("Content PUBLISHED from file: %s", row.label)

    if written:
        db.session.commit()
    return written


# ─── Lookup ───────────────────────────────────────────────────────────────────
def get_active_content(content_key: str, language: str) -> ScreeningContentVersion:
    """
    The publishable bundle for this key and language.

    Never falls back to another language. Serving a mother content in a
    language she did not choose is not acceptable for consent, and is not
    acceptable for a clinical question either.
    """
    if language not in SUPPORTED_LANGUAGES:
        raise ContentError(f"Unsupported language {language!r}.")

    row = (
        ScreeningContentVersion.query
        .filter_by(content_key=content_key, language=language, status="active")
        .order_by(ScreeningContentVersion.published_at.desc(),
                  ScreeningContentVersion.id.desc())
        .first()
    )
    if row is None:
        raise ContentError(
            f"No published {content_key!r} content in {language!r}."
        )
    return row


def available_languages(content_key: str) -> list:
    rows = ScreeningContentVersion.query.filter_by(
        content_key=content_key, status="active"
    ).all()
    return sorted({r.language for r in rows})


def publish(content_key: str, version: str, language: str) -> ScreeningContentVersion:
    """
    Flips a draft to active. Called by scripts/publish_screening_content.py.

    Deliberately not callable from any route: publishing clinical content is a
    human decision made at a terminal, not something a web request can do.
    """
    row = ScreeningContentVersion.query.filter_by(
        content_key=content_key, version=version, language=language
    ).one_or_none()
    if row is None:
        raise ContentError(f"No such content: {content_key}@{version}/{language}")

    bad = script_violations(bundle_of(row))
    if bad:
        script = REQUIRED_SCRIPT[language][0]
        raise ContentError(
            f"Refusing to publish {row.label}: {len(bad)} item(s) carry no "
            f"{script} text ({', '.join(map(str, bad[:5]))}). This bundle "
            f"declares {language!r} but its questions are not written in it. "
            f"Publishing it would put the wrong language in front of a "
            f"participant and score her answers to it."
        )

    row.status = "active"
    if row.published_at is None:
        row.published_at = datetime.utcnow()
    db.session.commit()
    log.info("Published %s", row.label)
    return row
