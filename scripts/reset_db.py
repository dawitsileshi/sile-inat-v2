#!/usr/bin/env python3
"""
scripts/reset_db.py — One-off schema reset.

Drops every table on the configured database and lets the next app boot
(`db.create_all()`) recreate them fresh. This is the documented Round-2
recipe for picking up the new columns on the Postgres production DB,
since `db.create_all()` does NOT alter existing tables.

DESTRUCTIVE. Only safe while there is no real user data.

Usage:
    python scripts/reset_db.py --yes-i-mean-it
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app
from src.extensions import db


def reset() -> None:
    app = create_app()
    with app.app_context():
        uri = app.config["SQLALCHEMY_DATABASE_URI"]
        print(f"[reset_db] Dropping all tables on: {uri}")
        # Import models so metadata is fully populated before drop_all.
        from src.models import (  # noqa: F401
            User, UserSession, DailyLog,
            ForumPost, ForumReply, ForumReaction,
            Circle, CirclePost, CircleMembership,
        )
        db.drop_all()
        db.create_all()
        print("[reset_db] Done. Tables recreated empty. Reseed via app boot or seed_db.py.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--yes-i-mean-it",
        action="store_true",
        help="Required acknowledgement that this will delete all data.",
    )
    args = parser.parse_args()
    if not args.yes_i_mean_it:
        print("Refusing to run without --yes-i-mean-it. This wipes the database.")
        sys.exit(1)
    reset()
