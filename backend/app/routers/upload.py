import io
import re
import secrets
from pathlib import Path

import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..deps import get_current_user
from ..models import Media, User
from ..serializers import media_dict

router = APIRouter(prefix="/api/upload", tags=["upload"])

MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB  – images
MAX_VIDEO_SIZE = 200 * 1024 * 1024  # 200 MB – video / audio

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
}
ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
    "audio/wav", "audio/x-wav",
}
ALLOWED_MIME_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES | ALLOWED_AUDIO_TYPES

# Responsive image breakpoints (width in px) — used for local-disk fallback only.
# When using Cloudinary, resized variants are generated via transformation URLs.
FORMAT_BREAKPOINTS = {"thumbnail": 245, "small": 500, "medium": 750}


def safe_stem(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"[^\w-]+", "_", stem).strip("_") or "file"
    return stem[:80]


# ── Cloudinary helpers ────────────────────────────────────────────────────────

def _cloudinary_upload(content: bytes, public_id: str, mime: str) -> dict:
    """Upload raw bytes to Cloudinary and return the uploader result dict."""
    resource_type = "image" if mime in ALLOWED_IMAGE_TYPES else "video"
    result = cloudinary.uploader.upload(
        io.BytesIO(content),
        public_id=public_id,
        resource_type=resource_type,
        overwrite=True,
        # Ask Cloudinary to return width/height in the response
        # (only meaningful for images)
        image_metadata=True,
    )
    return result


def _cloudinary_formats(secure_url: str, width: int | None, height: int | None) -> dict | None:
    """
    Build format variants using Cloudinary transformation URLs.
    e.g. https://res.cloudinary.com/<cloud>/image/upload/w_500,c_scale/<public_id>
    We derive the transformation URL by inserting a transform segment before the
    version/public_id portion of the secure URL.
    """
    if not secure_url or not width:
        return None

    # Split the URL at "/upload/" to inject the transformation
    parts = secure_url.split("/upload/", 1)
    if len(parts) != 2:
        return None

    base, rest = parts
    formats: dict = {}
    for name, target_w in FORMAT_BREAKPOINTS.items():
        if width <= target_w:
            continue
        target_h = round((height or 0) * target_w / width) if height else None
        transform = f"w_{target_w},c_scale"
        variant_url = f"{base}/upload/{transform}/{rest}"
        formats[name] = {
            "url": variant_url,
            "width": target_w,
            "height": target_h,
        }
    return formats or None


# ── Local-disk helpers (dev fallback) ────────────────────────────────────────

def _local_build_formats(source_path: Path, stem: str, suffix: str) -> tuple[dict | None, int | None, int | None]:
    """Generate resized copies for images on local disk. Returns (formats, width, height)."""
    try:
        with Image.open(source_path) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode == "P":
                img = img.convert("RGBA" if "transparency" in img.info else "RGB")
            width, height = img.size
            formats: dict = {}
            for name, target_width in FORMAT_BREAKPOINTS.items():
                if width <= target_width:
                    continue
                target_height = round(height * target_width / width)
                resized = img.resize((target_width, target_height), Image.LANCZOS)
                if suffix in (".jpg", ".jpeg") and resized.mode != "RGB":
                    resized = resized.convert("RGB")
                out_name = f"{name}_{stem}{suffix}"
                resized.save(config.UPLOAD_DIR / out_name)
                formats[name] = {
                    "url": f"/uploads/{out_name}",
                    "width": target_width,
                    "height": target_height,
                }
            return (formats or None, width, height)
    except (OSError, ValueError):
        return (None, None, None)


# ── Upload endpoint ───────────────────────────────────────────────────────────

@router.post("")
async def upload(
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    saved: list[Media] = []
    for file in files:
        mime = file.content_type or "application/octet-stream"

        # Validate MIME type
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                400,
                f"Unsupported file type '{mime}'. "
                "Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV, MP3, WAV, OGG audio.",
            )

        # Per-type size limit
        is_image = mime in ALLOWED_IMAGE_TYPES
        max_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
        max_label = "10 MB" if is_image else "200 MB"

        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(400, f"File too large (max {max_label})")

        original_name = file.filename or "file"
        stem = f"{safe_stem(original_name)}_{secrets.token_hex(4)}"
        suffix = Path(original_name).suffix.lower() or ".bin"
        disk_name = f"{stem}{suffix}"

        if config.USE_CLOUDINARY:
            # ── Cloudinary path ──────────────────────────────────────────────
            # public_id does NOT include the extension; Cloudinary manages that.
            public_id = f"airefy/{stem}"
            try:
                result = _cloudinary_upload(content, public_id, mime)
            except Exception as exc:
                raise HTTPException(500, f"Cloudinary upload failed: {exc}") from exc

            stored_url = result.get("secure_url", "")
            width = result.get("width")
            height = result.get("height")
            formats = _cloudinary_formats(stored_url, width, height) if is_image else None

        else:
            # ── Local-disk fallback (development) ────────────────────────────
            config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            disk_path = config.UPLOAD_DIR / disk_name
            disk_path.write_bytes(content)

            formats, width, height = (None, None, None)
            if is_image:
                formats, width, height = _local_build_formats(disk_path, stem, suffix)

            stored_url = f"/uploads/{disk_name}"

        media = Media(
            name=original_name,
            url=stored_url,
            alternative_text=None,
            width=width,
            height=height,
            formats=formats,
            mime=mime,
            size=len(content),
        )
        db.add(media)
        saved.append(media)

    db.commit()
    for media in saved:
        db.refresh(media)

    return [media_dict(m) for m in saved]
