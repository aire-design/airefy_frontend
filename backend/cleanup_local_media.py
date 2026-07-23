import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace") if hasattr(sys.stdout, "reconfigure") else None
"""
cleanup_local_media.py
──────────────────────
Find and remove stale /uploads/ references in two places:
  1. The `media` table (url column)
  2. Article `content` bodies (inline markdown images)

Usage
-----
  # Preview only — no changes written:
  python cleanup_local_media.py

  # Actually delete/fix:
  python cleanup_local_media.py --delete

Run from the `backend/` directory (where .env lives).
"""

import argparse
import re
from pathlib import Path

# ── Load DATABASE_URL directly from .env (no app imports needed) ─────────────
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent / ".env")

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/airefy",
)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

# Regex to find any markdown image or src= pointing to /uploads/
UPLOADS_PATTERN = re.compile(r'(/uploads/[^\s\)\'"]+)')

# ─────────────────────────────────────────────────────────────────────────────
# PART 1 — media table rows
# ─────────────────────────────────────────────────────────────────────────────

def find_stale_media(db) -> list[dict]:
    rows = db.execute(
        text("SELECT id, name, mime, size, url FROM media WHERE url LIKE '/uploads/%'")
    ).fetchall()
    return [dict(r._mapping) for r in rows]


def find_media_references(db, ids: list[int]) -> list[str]:
    warnings: list[str] = []
    if not ids:
        return warnings
    id_list = ", ".join(str(i) for i in ids)
    for row in db.execute(text(f"SELECT id, username FROM users WHERE avatar_id IN ({id_list})")):
        warnings.append(f"  User '{row.username}' (id={row.id}) avatar")
    for row in db.execute(text(f"SELECT id, title FROM articles WHERE cover_image_id IN ({id_list})")):
        warnings.append(f"  Article '{row.title}' (id={row.id}) cover image")
    for row in db.execute(text(f"SELECT id, title FROM certifications WHERE badge_id IN ({id_list})")):
        warnings.append(f"  Certification '{row.title}' (id={row.id}) badge")
    return warnings


def delete_stale_media(db, ids: list[int]) -> None:
    id_list = ", ".join(str(i) for i in ids)
    na = db.execute(text(f"UPDATE users SET avatar_id = NULL WHERE avatar_id IN ({id_list})"))
    nc = db.execute(text(f"UPDATE articles SET cover_image_id = NULL WHERE cover_image_id IN ({id_list})"))
    nb = db.execute(text(f"UPDATE certifications SET badge_id = NULL WHERE badge_id IN ({id_list})"))
    nd = db.execute(text(f"DELETE FROM media WHERE id IN ({id_list})"))
    db.commit()
    print(f"[DELETED] {nd.rowcount} media row(s).")
    if na.rowcount: print(f"         Nulled avatar_id on {na.rowcount} user(s).")
    if nc.rowcount: print(f"         Nulled cover_image_id on {nc.rowcount} article(s).")
    if nb.rowcount: print(f"         Nulled badge_id on {nb.rowcount} certification(s).")


# ─────────────────────────────────────────────────────────────────────────────
# PART 2 — /uploads/ references embedded in article content
# ─────────────────────────────────────────────────────────────────────────────

def find_stale_content(db) -> list[dict]:
    """Return articles whose content contains at least one /uploads/ reference."""
    rows = db.execute(
        text("SELECT id, title, content FROM articles WHERE content LIKE '%/uploads/%'")
    ).fetchall()
    results = []
    for row in rows:
        matches = UPLOADS_PATTERN.findall(row.content)
        if matches:
            results.append({
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "matches": list(dict.fromkeys(matches)),  # deduplicated, order preserved
            })
    return results


def strip_stale_content(db, articles: list[dict]) -> None:
    """Remove broken /uploads/ image markdown from article bodies."""
    # Removes:  ![alt text](/uploads/...)
    # Removes:  <img src="/uploads/..." .../>
    # Removes:  bare /uploads/... references left over
    img_md_pattern   = re.compile(r'!\[[^\]]*\]\(/uploads/[^\)]+\)')
    img_html_pattern = re.compile(r'<img[^>]+src=["\']?/uploads/[^\s"\'/>]+["\']?[^>]*/?>',  re.IGNORECASE)
    bare_pattern     = re.compile(r'/uploads/\S+')

    for art in articles:
        cleaned = img_md_pattern.sub("", art["content"])
        cleaned = img_html_pattern.sub("", cleaned)
        cleaned = bare_pattern.sub("", cleaned)
        # Collapse any resulting blank lines (more than 2 in a row → 1 blank line)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()

        db.execute(
            text("UPDATE articles SET content = :content WHERE id = :id"),
            {"content": cleaned, "id": art["id"]},
        )
        print(f"  [FIXED] Article id={art['id']} '{art['title']}'")

    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Clean up stale /uploads/ references.")
    parser.add_argument("--delete", action="store_true",
                        help="Apply changes. Without this flag the script is a dry-run.")
    args = parser.parse_args()

    db = Session()
    try:
        # ── Part 1: media table ──────────────────────────────────────────────
        print("=" * 60)
        print("PART 1: media table rows")
        print("=" * 60)
        stale_media = find_stale_media(db)

        if not stale_media:
            print("[OK] No stale media rows found.\n")
        else:
            print(f"[!] Found {len(stale_media)} stale media row(s):\n")
            print(f"  {'ID':>5}  {'MIME':<20}  {'SIZE':>9}  URL")
            print(f"  {'─'*5}  {'─'*20}  {'─'*9}  {'─'*55}")
            for m in stale_media:
                size_kb = f"{m['size']/1024:.1f} KB" if m["size"] else "?"
                print(f"  {m['id']:>5}  {m['mime']:<20}  {size_kb:>9}  {m['url']}")
            print()

            ids = [m["id"] for m in stale_media]
            refs = find_media_references(db, ids)
            if refs:
                print("[REF] These are actively referenced (will be NULLed):")
                for r in refs: print(r)
                print()

            if args.delete:
                delete_stale_media(db, ids)
            else:
                print("[DRY-RUN] No changes made to media table.\n")

        # ── Part 2: article content ──────────────────────────────────────────
        print("=" * 60)
        print("PART 2: /uploads/ URLs inside article content")
        print("=" * 60)
        stale_articles = find_stale_content(db)

        if not stale_articles:
            print("[OK] No stale /uploads/ references in article content.\n")
        else:
            print(f"[!] Found {len(stale_articles)} article(s) with stale image references:\n")
            for art in stale_articles:
                print(f"  Article id={art['id']} '{art['title']}'")
                for url in art["matches"]:
                    print(f"    -> {url}")
            print()

            if args.delete:
                print("[...] Stripping broken image references from article content...")
                strip_stale_content(db, stale_articles)
                print("[DONE] Article content cleaned.\n")
            else:
                print("[DRY-RUN] No changes made to article content.\n")
                print("    Re-run with --delete to strip these broken image references.\n")

        if not args.delete:
            print("Run with --delete to apply all changes.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
