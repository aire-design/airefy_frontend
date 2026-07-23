import logging
import os
from pathlib import Path

import cloudinary
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/airefy",
)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-do-not-use-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", "30"))

UPLOAD_DIR = BASE_DIR / "uploads"

CORS_ORIGINS = ["*"]
    # origin.strip()
    # for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    # if origin.strip()

# ── Environment detection ──────────────────────────────────────────────────────
# Render automatically sets RENDER=true in every deployed service.
IS_PRODUCTION = os.getenv("RENDER", "").lower() == "true"

_logger = logging.getLogger(__name__)

# ── Cloudinary ────────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

# Auto-enable Cloudinary when all three credentials are present.
USE_CLOUDINARY = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

if USE_CLOUDINARY:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )
    print(
        f"[Cloudinary] ✅ Active — cloud_name={CLOUDINARY_CLOUD_NAME!r}, "
        f"api_key={CLOUDINARY_API_KEY[:6] + '***' if CLOUDINARY_API_KEY else ''}",
        flush=True,
    )
else:
    _missing = [
        name
        for name, val in [
            ("CLOUDINARY_CLOUD_NAME", CLOUDINARY_CLOUD_NAME),
            ("CLOUDINARY_API_KEY", CLOUDINARY_API_KEY),
            ("CLOUDINARY_API_SECRET", CLOUDINARY_API_SECRET),
        ]
        if not val
    ]
    if IS_PRODUCTION:
        # Hard error — never silently write to Render's ephemeral disk.
        raise RuntimeError(
            "[Cloudinary] ❌ Missing credentials in production: "
            + ", ".join(_missing)
            + ". Set these environment variables in the Render dashboard "
              "(Environment tab) and redeploy."
        )
    else:
        print(
            "[Cloudinary] ⚠️  Inactive (local dev fallback). "
            f"Missing vars: {', '.join(_missing)}",
            flush=True,
        )

