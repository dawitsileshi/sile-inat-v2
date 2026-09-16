"""
scripts/publish_screening_content.py — Publish a screening content bundle

Content lands in the database in whatever status its file declares. Clinical
instruments declare "draft", which means `get_active_content` ignores them and
the screening routes return 409.

There are two ways to publish one. This script flips a row directly, for when
you have a shell on the database. Alternatively the bundle file itself may
declare "active": sync_content promotes a registered draft on the next boot
(see rule 4 there), which is how a deployment with no shell publishes.

Either way it is a deliberate act by a human who has read what they are
publishing. Neither route can un-publish: nothing demotes an active version
back to draft except a hand at the database.

Usage:
    python scripts/publish_screening_content.py --list
    python scripts/publish_screening_content.py \\
        --content-key stage1_triage --version 1.0.0 --language am
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app                                   # noqa: E402
from src.extensions import db                                # noqa: E402
from src.services.screening_content import (                 # noqa: E402
    ContentError,
    bundle_of,
    publish,
)


def list_content() -> None:
    from src.models import ScreeningContentVersion

    rows = ScreeningContentVersion.query.order_by(
        ScreeningContentVersion.content_key,
        ScreeningContentVersion.version,
        ScreeningContentVersion.language,
    ).all()
    if not rows:
        print("No content registered. Boot the app once to sync src/content/.")
        return

    print(f"{'STATUS':<9} {'REVIEW':<8} CONTENT")
    for row in rows:
        review = "NEEDED" if bundle_of(row).get("review_required") else "-"
        print(f"{row.status:<9} {review:<8} {row.label}  (items={row.item_count})")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="Show registered content.")
    parser.add_argument("--content-key")
    parser.add_argument("--version")
    parser.add_argument("--language")
    parser.add_argument("--yes", action="store_true",
                        help="Skip the confirmation prompt (for automation).")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        if args.list:
            list_content()
            return 0

        if not (args.content_key and args.version and args.language):
            parser.error("--content-key, --version and --language are all required.")

        from src.models import ScreeningContentVersion
        row = ScreeningContentVersion.query.filter_by(
            content_key=args.content_key, version=args.version, language=args.language
        ).one_or_none()
        if row is None:
            print(f"No such content: {args.content_key}@{args.version}/{args.language}")
            return 1

        if row.status == "active":
            print(f"{row.label} is already active.")
            return 0

        bundle = bundle_of(row)
        print(f"\nAbout to publish: {row.label}")
        print(f"  title    : {bundle.get('title')}")
        print(f"  items    : {row.item_count}")
        print(f"  checksum : {row.checksum}")
        if bundle.get("review_required"):
            print("\n  WARNING: this bundle is marked review_required.")
            print("  It has not been signed off. Publishing serves it to real participants.")
        if row.notes:
            print(f"\n  notes: {row.notes[:400]}")

        if not args.yes:
            answer = input("\nType PUBLISH to confirm: ").strip()
            if answer != "PUBLISH":
                print("Aborted. Nothing changed.")
                return 1

        try:
            publish(args.content_key, args.version, args.language)
        except ContentError as exc:
            print(f"Failed: {exc}")
            return 1

        print(f"Published {row.label}.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
