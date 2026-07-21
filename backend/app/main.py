import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from . import config
from .database import engine
from .models import Base
from .routers import articles, auth, certifications, profile, tags, upload, users

# 210 MB – gives room for 200 MB video + multipart envelope
MAX_UPLOAD_BYTES = 210 * 1024 * 1024


class LimitUploadSize(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds MAX_UPLOAD_BYTES early,
    before we even start reading the body, to avoid memory exhaustion."""

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > MAX_UPLOAD_BYTES:
            return JSONResponse(
                status_code=413,
                content={"data": None, "error": {"status": 413, "message": "Request body too large (max 200 MB)."}},
            )
        return await call_next(request)



def init_db(retries: int = 5, delay_seconds: float = 2.0) -> None:
    """Create tables, retrying briefly — serverless databases (e.g. Neon) can
    take a moment to wake from idle on the first connection."""
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(engine)
            # Add missing columns for guests if tables already existed
            try:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE comments ADD COLUMN guest_name VARCHAR(255)"))
            except (ProgrammingError, OperationalError):
                pass  # Column already exists
                
            try:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE likes ADD COLUMN guest_id VARCHAR(255)"))
            except (ProgrammingError, OperationalError):
                pass  # Column already exists
                
            try:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE articles ADD COLUMN tag_order JSON"))
            except (ProgrammingError, OperationalError):
                pass  # Column already exists
            return
        except OperationalError as exc:
            if attempt == retries:
                raise RuntimeError(
                    f"Could not connect to the database after {retries} attempts. "
                    f"Check the DATABASE_URL environment variable — currently "
                    f"pointing at an unreachable server. Underlying error: {exc}"
                ) from exc
            time.sleep(delay_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    init_db()
    yield


app = FastAPI(title="Airefy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LimitUploadSize)



# The frontend reads errors as body.error.message.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "error": {"status": exc.status_code, "message": str(exc.detail)},
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(loc) for loc in first.get("loc", []) if loc != "body")
    message = f"{field}: {first.get('msg', 'Invalid request')}" if field else "Invalid request"
    return JSONResponse(
        status_code=400,
        content={"data": None, "error": {"status": 400, "message": message}},
    )


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profile.router)
app.include_router(articles.router)
app.include_router(tags.router)
app.include_router(certifications.router)
app.include_router(upload.router)

app.mount("/uploads", StaticFiles(directory=str(config.UPLOAD_DIR)), name="uploads")


@app.get("/")
def root():
    return {"name": "Airefy API", "docs": "/docs"}
