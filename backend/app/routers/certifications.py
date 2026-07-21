from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Certification, Media, User
from ..serializers import certification_dict, list_response, single_response

router = APIRouter(prefix="/api/certifications", tags=["certifications"])


def parse_issued_date(value) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(400, "issuedDate is required (YYYY-MM-DD)")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "issuedDate is not a valid date (use YYYY-MM-DD)")


def get_certification_or_404(db: Session, document_id: str) -> Certification:
    cert = db.query(Certification).filter(Certification.document_id == document_id).first()
    if cert is None:
        raise HTTPException(404, "Certification not found")
    return cert


def apply_data(db: Session, cert: Certification, data: dict) -> None:
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not (1 <= len(title) <= 255):
            raise HTTPException(400, "Title is required (max 255 characters)")
        cert.title = title

    if "issuer" in data:
        issuer = (data.get("issuer") or "").strip()
        if not (1 <= len(issuer) <= 255):
            raise HTTPException(400, "Issuer is required (max 255 characters)")
        cert.issuer = issuer

    if "description" in data:
        cert.description = (data.get("description") or "").strip() or None

    if "credentialUrl" in data:
        url = (data.get("credentialUrl") or "").strip() or None
        if url and not url.startswith(("http://", "https://")):
            raise HTTPException(400, "credentialUrl must start with http:// or https://")
        cert.credential_url = url

    if "skills" in data:
        cert.skills = (data.get("skills") or "").strip() or None

    if "issuedDate" in data:
        cert.issued_date = parse_issued_date(data.get("issuedDate"))

    if "badge" in data:
        badge_id = data.get("badge")
        if badge_id is None:
            cert.badge = None
        else:
            media = db.get(Media, badge_id)
            if media is None:
                raise HTTPException(400, "badge media not found")
            cert.badge = media


@router.get("")
def find_certifications(db: Session = Depends(get_db)):
    """Public timeline — newest first, so recruiters see progress at a glance."""
    certs = db.query(Certification).order_by(Certification.issued_date.desc()).all()
    return list_response(
        [certification_dict(c) for c in certs], 1, max(len(certs), 1), len(certs)
    )


@router.post("")
def create_certification(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.get("data") or {}
    for required in ("title", "issuer", "issuedDate"):
        if required not in data:
            raise HTTPException(400, f"{required} is required")

    cert = Certification()
    apply_data(db, cert, data)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return single_response(certification_dict(cert))


@router.put("/{document_id}")
def update_certification(
    document_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cert = get_certification_or_404(db, document_id)
    apply_data(db, cert, body.get("data") or {})
    db.commit()
    db.refresh(cert)
    return single_response(certification_dict(cert))


@router.delete("/{document_id}")
def delete_certification(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cert = get_certification_or_404(db, document_id)
    db.delete(cert)
    db.commit()
    return single_response(None)
