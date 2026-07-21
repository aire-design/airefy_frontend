import re
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Tag, User
from ..serializers import list_response, single_response, tag_dict

router = APIRouter(prefix="/api/tags", tags=["tags"])


def slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


@router.get("")
def find_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name.asc()).all()
    return list_response([tag_dict(t) for t in tags], 1, max(len(tags), 1), len(tags))


@router.post("")
def create_tag(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.get("data") or {}
    name = (data.get("name") or "").strip()
    if not (1 <= len(name) <= 50):
        raise HTTPException(400, "Tag name must be between 1 and 50 characters")

    existing = db.query(Tag).filter(Tag.name.ilike(name)).first()
    if existing:
        # Idempotent create keeps the TagInput flow simple on double submits
        return single_response(tag_dict(existing))

    slug = (data.get("slug") or "").strip() or slugify(name) or f"tag-{secrets.token_hex(2)}"
    # De-duplicate slugs by suffixing
    if db.query(Tag).filter(Tag.slug == slug).first():
        slug = f"{slug}-{secrets.token_hex(2)}"

    tag = Tag(name=name, slug=slug)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return single_response(tag_dict(tag))
