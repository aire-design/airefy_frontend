"""JSON serializers for the API response contract the frontend consumes:
camelCase field names, `documentId`s, and `{data, meta}` envelopes."""

from datetime import datetime, timezone

from .models import Article, Certification, Media, Tag, User, Comment


def iso(dt: datetime | None) -> str | None:
    """Format like JS Date.toISOString(): millisecond precision, Z suffix."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def media_dict(m: Media | None) -> dict | None:
    if m is None:
        return None
    return {
        "id": m.id,
        "documentId": m.document_id,
        "name": m.name,
        "url": m.url,
        "alternativeText": m.alternative_text,
        "width": m.width,
        "height": m.height,
        "formats": m.formats,
        "mime": m.mime,
        "size": m.size,
    }


def author_dict(u: User | None) -> dict | None:
    """Minimal author shape used inside articles (username + ids)."""
    if u is None:
        return None
    return {
        "id": u.id,
        "documentId": u.document_id,
        "username": u.username,
    }


def user_dict(u: User) -> dict:
    """Full user shape for /users/me and profile updates (never the password)."""
    return {
        "id": u.id,
        "documentId": u.document_id,
        "username": u.username,
        "email": u.email,
        "createdAt": iso(u.created_at),
        "avatar": media_dict(u.avatar),
        "bio": u.bio,
        "website": u.website,
        "twitter": u.twitter,
        "instagram": u.instagram,
        "linkedin": u.linkedin,
        "github": u.github,
        "showEmail": u.show_email,
        "showBio": u.show_bio,
        "showWebsite": u.show_website,
        "showTwitter": u.show_twitter,
        "showInstagram": u.show_instagram,
        "showLinkedin": u.show_linkedin,
        "showGithub": u.show_github,
    }


def tag_dict(t: Tag) -> dict:
    return {
        "id": t.id,
        "documentId": t.document_id,
        "name": t.name,
        "slug": t.slug,
    }


def article_dict(a: Article) -> dict:
    tags = [tag_dict(t) for t in a.tags]
    if getattr(a, "tag_order", None):
        order = {tid: i for i, tid in enumerate(a.tag_order)}
        tags.sort(key=lambda t: order.get(t["id"], 999))

    return {
        "id": a.id,
        "documentId": a.document_id,
        "title": a.title,
        "slug": a.slug,
        "content": a.content,
        "excerpt": a.excerpt,
        "coverImage": media_dict(a.cover_image),
        "readTime": a.read_time,
        "publishedAt": iso(a.published_at),
        "createdAt": iso(a.created_at),
        "updatedAt": iso(a.updated_at),
        "author": author_dict(a.author),
        "tags": tags,
        "likesCount": len(a.likes) if hasattr(a, "likes") else 0,
        "commentsCount": len(a.comments) if hasattr(a, "comments") else 0,
    }


def comment_dict(c: Comment) -> dict:
    author_info = author_dict(c.author) if c.author else {
        "id": 0,
        "documentId": f"guest-{c.id}",
        "username": c.guest_name or "Guest"
    }
    return {
        "id": c.id,
        "documentId": c.document_id,
        "content": c.content,
        "createdAt": iso(c.created_at),
        "updatedAt": iso(c.updated_at),
        "author": author_info,
    }


def certification_dict(c: Certification) -> dict:
    return {
        "id": c.id,
        "documentId": c.document_id,
        "title": c.title,
        "issuer": c.issuer,
        "description": c.description,
        "credentialUrl": c.credential_url,
        "skills": c.skills,
        "issuedDate": iso(c.issued_date),
        "badge": media_dict(c.badge),
        "createdAt": iso(c.created_at),
        "updatedAt": iso(c.updated_at),
    }


def list_response(items: list[dict], page: int, page_size: int, total: int) -> dict:
    page_count = (total + page_size - 1) // page_size if page_size > 0 else 0
    return {
        "data": items,
        "meta": {
            "pagination": {
                "page": page,
                "pageSize": page_size,
                "pageCount": page_count,
                "total": total,
            }
        },
    }


def single_response(item: dict | None) -> dict:
    return {"data": item, "meta": {}}
