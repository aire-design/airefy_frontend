"""
migrate_to_neon.py
------------------
Migrates all data from your Render PostgreSQL database to Neon.
No pg_dump required — uses pure Python + SQLAlchemy.

Usage:
    python migrate_to_neon.py
"""

import json
import os
import sys
from sqlalchemy import create_engine, text, inspect

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────

SOURCE_URL = os.getenv(
    "SOURCE_URL",
    "postgresql+psycopg2://YOUR_RENDER_USER:YOUR_RENDER_PASSWORD@YOUR_RENDER_HOST/YOUR_RENDER_DB",
)

TARGET_URL = os.getenv(
    "TARGET_URL",
    "postgresql+psycopg2://YOUR_NEON_USER:YOUR_NEON_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require",
)

# ──────────────────────────────────────────────────────────────────────────────
# Tables in dependency order (parents before children)
# ──────────────────────────────────────────────────────────────────────────────

TABLES_IN_ORDER = [
    "media",
    "users",
    "tags",
    "certifications",
    "articles",
    "article_tags",
    "comments",
    "likes",
]

# FK columns that are nullable — if a FK violation occurs on insert,
# we retry the row with these columns set to NULL instead of failing.
NULLABLE_FK_COLS = {
    "users":          ["avatar_id"],
    "articles":       ["cover_image_id"],
    "certifications": ["badge_id"],
}


def serialize_row(row_dict: dict) -> dict:
    """Convert dict/list values to JSON strings for psycopg2 compatibility."""
    return {
        k: json.dumps(v) if isinstance(v, (dict, list)) else v
        for k, v in row_dict.items()
    }


def copy_table(src_conn, tgt_conn, table_name: str) -> int:
    """
    Copy all rows from one table using per-row savepoints.
    On FK violations, retries the row with nullable FK cols set to NULL.
    Returns row count successfully copied.
    """
    rows = src_conn.execute(text(f'SELECT * FROM "{table_name}"')).fetchall()
    if not rows:
        print(f"  {table_name}: (empty, skipping)")
        return 0

    columns = list(
        src_conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 0')).keys()
    )
    col_list    = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(f":{c}" for c in columns)
    insert_sql  = f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders})'

    nullable_fks = NULLABLE_FK_COLS.get(table_name, [])
    count = 0
    skipped = 0

    for row in rows:
        row_dict = serialize_row(dict(zip(columns, row)))

        # ── first attempt ────────────────────────────────────────────────────
        sp = tgt_conn.begin_nested()
        try:
            tgt_conn.execute(text(insert_sql), row_dict)
            sp.commit()
            count += 1
            continue
        except Exception as e:
            sp.rollback()
            err_str = str(e)

        # ── retry with nullable FKs zeroed out (orphaned-FK recovery) ───────
        if nullable_fks and "ForeignKeyViolation" in err_str:
            fixed = {**row_dict, **{col: None for col in nullable_fks}}
            sp2 = tgt_conn.begin_nested()
            try:
                tgt_conn.execute(text(insert_sql), fixed)
                sp2.commit()
                count += 1
                nulled = [c for c in nullable_fks if row_dict.get(c) is not None]
                print(f"    row id={row_dict.get('id','?')} inserted with {nulled} set to NULL (orphaned FK)")
                continue
            except Exception as e2:
                sp2.rollback()
                err_str = str(e2)

        # ── give up on this row ──────────────────────────────────────────────
        print(f"    row id={row_dict.get('id','?')} SKIPPED: {err_str[:120]}")
        skipped += 1

    label = f"{count} rows copied"
    if skipped:
        label += f", {skipped} skipped"
    print(f"  {table_name}: {label}")
    return count


def reset_sequences(tgt_engine):
    """Reset all PostgreSQL sequences to max(id) so future inserts don't collide."""
    inspector = inspect(tgt_engine)
    with tgt_engine.connect() as conn:
        for table_name in inspector.get_table_names():
            try:
                result = conn.execute(
                    text(f'SELECT MAX(id) FROM "{table_name}"')
                ).scalar()
                if result is not None:
                    seq_name = f"{table_name}_id_seq"
                    conn.execute(text(f"SELECT setval('{seq_name}', {result})"))
            except Exception:
                pass
        conn.commit()
    print("  Sequences reset")


def main():
    print("=" * 60)
    print("  Render -> Neon Migration")
    print("=" * 60)

    if "YOUR_RENDER" in SOURCE_URL or "YOUR_NEON" in TARGET_URL:
        print("\nERROR: Set SOURCE_URL and TARGET_URL in the script first.")
        sys.exit(1)

    print(f"\nSource: {SOURCE_URL[:65]}...")
    print(f"Target: {TARGET_URL[:65]}...")

    src_engine = create_engine(SOURCE_URL, pool_pre_ping=True)
    tgt_engine = create_engine(TARGET_URL, pool_pre_ping=True)

    print("\nTesting connections...")
    for label, engine in [("Source (Render)", src_engine), ("Target (Neon)", tgt_engine)]:
        try:
            with engine.connect() as c:
                c.execute(text("SELECT 1"))
            print(f"  {label} connected OK")
        except Exception as e:
            print(f"  {label} connection FAILED: {e}")
            sys.exit(1)

    # ── clear target tables in reverse order so FK constraints don't block ──
    print("\nClearing existing data from Neon (safe re-run)...")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from app.models import Base
    with tgt_engine.connect() as conn:
        for table in reversed(TABLES_IN_ORDER):
            try:
                conn.execute(text(f'DELETE FROM "{table}"'))
            except Exception:
                pass
        conn.commit()

    Base.metadata.create_all(tgt_engine)
    print("  Schema ready")

    # ── copy data ────────────────────────────────────────────────────────────
    print("\nCopying data...")
    total_rows = 0

    with src_engine.connect() as src_conn:
        with tgt_engine.connect() as tgt_conn:
            with tgt_conn.begin():
                for table in TABLES_IN_ORDER:
                    count = copy_table(src_conn, tgt_conn, table)
                    total_rows += count

    # ── reset sequences ──────────────────────────────────────────────────────
    print("\nResetting sequences...")
    reset_sequences(tgt_engine)

    print(f"\n{'=' * 60}")
    print(f"  Migration complete! {total_rows} total rows copied.")
    print(f"{'=' * 60}")
    print("\nNext: update DATABASE_URL in backend/.env to your Neon URL.")


if __name__ == "__main__":
    main()
