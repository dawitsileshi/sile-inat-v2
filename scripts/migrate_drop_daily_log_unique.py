#!/usr/bin/env python3
"""
scripts/migrate_drop_daily_log_unique.py
=========================================
One-off migration: drop the uq_user_date unique constraint on daily_logs
so multiple check-ins per (user, date) are allowed.

Idempotent — safe to run twice. Detects the database flavour from the
configured SQLAlchemy URL and uses the appropriate path:

  * PostgreSQL → ALTER TABLE ... DROP CONSTRAINT IF EXISTS uq_user_date
  * SQLite     → table rebuild (CREATE TABLE ... new, INSERT SELECT,
                 DROP old, RENAME). SQLite cannot ALTER away a constraint.

Usage:
    python scripts/migrate_drop_daily_log_unique.py

For production, set DATABASE_URL before running, just like reset_prod.ps1
does. All existing rows are preserved.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make src importable when run from project root.
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import inspect, text

from app import create_app
from src.extensions import db


def _drop_postgres(connection) -> bool:
    """Returns True if a constraint was actually dropped, False if no-op."""
    inspector = inspect(connection)
    constraints = inspector.get_unique_constraints("daily_logs")
    target = next(
        (c for c in constraints if c["name"] == "uq_user_date"),
        None,
    )
    if not target:
        return False
    connection.execute(text("ALTER TABLE daily_logs DROP CONSTRAINT uq_user_date"))
    return True


def _drop_sqlite(connection) -> bool:
    """
    SQLite can't ALTER away constraints — rebuild the table.

    Resilient to a half-finished prior run: if _daily_logs_old already
    exists from a previous crash, we treat that as the source-of-truth
    and just complete the rebuild instead of starting over.

    Steps (fresh case):
      1. Capture user-defined index names (so they can be recreated).
      2. Rename daily_logs -> _daily_logs_old.
      3. Drop those indexes (they still bind to the renamed table; the
         names would otherwise collide when the new table is created).
      4. Create the new daily_logs from the current model definition.
      5. Copy data from _daily_logs_old.
      6. Drop _daily_logs_old.
    """
    from src.models import DailyLog  # noqa: F401 — ensures model is registered

    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    source_table = None  # which table holds the real rows

    if "_daily_logs_old" in tables:
        # Crashed mid-migration last time. Recover from the backup.
        source_table = "_daily_logs_old"
        if "daily_logs" in tables:
            # New empty table from the prior crash — drop it before retry.
            connection.execute(text("DROP TABLE daily_logs"))
    elif "daily_logs" in tables:
        constraints = inspector.get_unique_constraints("daily_logs")
        if not any(c["name"] == "uq_user_date" for c in constraints):
            return False  # Already migrated — no-op.
        source_table = "daily_logs"
    else:
        return False  # Nothing to migrate.

    connection.execute(text("PRAGMA foreign_keys=OFF"))
    try:
        if source_table == "daily_logs":
            # Rename the live table out of the way.
            connection.execute(text("ALTER TABLE daily_logs RENAME TO _daily_logs_old"))

        # Drop any indexes whose names would collide when we recreate
        # daily_logs. Covers both the fresh path (indexes carried over by
        # the RENAME above) and the recovery path (indexes left orphaned
        # on _daily_logs_old by a prior crashed run). sqlite_autoindex_*
        # entries are cleaned up automatically with their table.
        rows = connection.execute(text(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'index' AND tbl_name = '_daily_logs_old' "
            "AND name NOT LIKE 'sqlite_autoindex_%'"
        )).fetchall()
        for (idx_name,) in rows:
            connection.execute(text(f"DROP INDEX IF EXISTS {idx_name}"))

        # Recreate daily_logs with the current model definition.
        DailyLog.__table__.create(bind=connection)

        # Copy data across — same columns either way because the shape
        # didn't change, just the constraint set.
        old_cols_info = inspect(connection).get_columns("_daily_logs_old")
        old_cols = [c["name"] for c in old_cols_info]
        col_list = ", ".join(f'"{c}"' for c in old_cols)
        connection.execute(text(
            f"INSERT INTO daily_logs ({col_list}) "
            f"SELECT {col_list} FROM _daily_logs_old"
        ))

        connection.execute(text("DROP TABLE _daily_logs_old"))
    finally:
        connection.execute(text("PRAGMA foreign_keys=ON"))

    return True


def run() -> int:
    app = create_app()
    with app.app_context():
        engine = db.engine
        dialect = engine.dialect.name
        print(f"[migrate] DB dialect: {dialect}")
        with engine.begin() as conn:
            if dialect.startswith("postgres"):
                changed = _drop_postgres(conn)
            elif dialect == "sqlite":
                changed = _drop_sqlite(conn)
            else:
                print(f"[migrate] Unsupported dialect: {dialect}", file=sys.stderr)
                return 2

        if changed:
            print("[migrate] OK — uq_user_date dropped. Multiple check-ins per day are now allowed.")
        else:
            print("[migrate] No-op — uq_user_date was already absent. Nothing to do.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
