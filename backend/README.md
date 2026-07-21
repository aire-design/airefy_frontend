# Airefy Backend — FastAPI + PostgreSQL

The API server for Airefy, a single-author personal blog: JWT auth, articles with draft/publish, tags,
public profiles with per-field visibility, and image uploads with responsive
formats. Responses use `{data, meta}` envelopes with camelCase fields and
`documentId`s; errors come back as `{"error": {"message": ...}}`.

## Requirements

- Python 3.11+
- PostgreSQL 14+ installed natively (no Docker needed)

## Setup

**1. Install PostgreSQL** (skip if already installed):

- Windows: `winget install PostgreSQL.PostgreSQL.16` or the installer from
  https://www.postgresql.org/download/windows/
- During install, set the `postgres` superuser password (the default `.env`
  assumes `postgres`; adjust `DATABASE_URL` if yours differs).

**2. Create the database:**

```bash
psql -U postgres -c "CREATE DATABASE airefy;"
```

**3. Install and run the backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# .env already exists with a generated JWT_SECRET — adjust DATABASE_URL if needed

uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on startup. Interactive API docs:
http://localhost:8000/docs

> **No PostgreSQL handy?** Any SQLAlchemy URL works — set
> `DATABASE_URL=sqlite:///./dev.db` in `.env` for a zero-dependency dev run.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

The suite runs on a throwaway SQLite database by default; set
`TEST_DATABASE_URL` to a PostgreSQL URL to run it against Postgres.

## API surface

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/local/register` | — | First account only (owner); 403 afterwards |
| POST | `/api/auth/local` | — | `{identifier,password}` → `{jwt,user}` |
| GET | `/api/users/me` | ✅ | Bare user object |
| GET | `/api/articles?page&pageSize&slug&tag` | — | Published only |
| GET | `/api/articles/{documentId}` | optional | Drafts visible to author only |
| POST | `/api/articles` | ✅ | Body: `{data:{...}}`; `readTime` computed server-side |
| PUT | `/api/articles/{documentId}` | ✅ owner | `publishedAt: null` unpublishes |
| DELETE | `/api/articles/{documentId}` | ✅ owner | |
| GET | `/api/my-articles` | ✅ | Drafts + published |
| GET | `/api/articles-by-user/{username}` | — | Published only |
| GET | `/api/tags` | — | Sorted by name |
| POST | `/api/tags` | ✅ | Body: `{data:{name,slug?}}` |
| PUT | `/api/profile` | ✅ | Flat body; visibility toggles included |
| GET | `/api/profile/{username}` | optional | Respects show* toggles; owner sees all |
| GET | `/api/certifications` | — | Public timeline, newest first |
| POST | `/api/certifications` | ✅ | Body: `{data:{title,issuer,issuedDate,…}}` |
| PUT | `/api/certifications/{documentId}` | ✅ | |
| DELETE | `/api/certifications/{documentId}` | ✅ | |
| POST | `/api/upload` | ✅ | multipart `files`; returns bare array |

Uploaded files are stored in `uploads/` and served at `/uploads/...`. Images
get resized `thumbnail` (245px), `small` (500px) and `medium` (750px) formats.

## Design notes

- **Draft/publish**: an article is a draft when `publishedAt IS NULL` and
  published otherwise; unpublishing sets it back to null without losing data.
- **Authorization** is enforced directly by auth dependencies
  (`get_current_user` / owner checks) — no role/permission tables.
- **JWTs** are HS256 signed with `JWT_SECRET` and expire after
  `JWT_EXPIRES_DAYS` (default 30).
- **Read time** is computed server-side at 200 words per minute.
