import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..models import Article, Media, Tag, User, Comment, Like
from ..serializers import article_dict, list_response, single_response, comment_dict

router = APIRouter(prefix="/api", tags=["articles"])


def calculate_read_time(content: str) -> int:
    """Estimated reading time: 200 words per minute, minimum 1."""
    words_per_minute = 200
    word_count = len([w for w in content.strip().split() if w])
    return max(1, math.ceil(word_count / words_per_minute))


def parse_published_at(value) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise HTTPException(400, "publishedAt must be an ISO date string or null")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "publishedAt is not a valid ISO date")


def get_article_or_404(db: Session, document_id: str) -> Article:
    article = db.query(Article).filter(Article.document_id == document_id).first()
    if article is None:
        raise HTTPException(404, "Article not found")
    return article


def apply_data(db: Session, article: Article, data: dict) -> None:
    """Apply the request body's {data: {...}} payload to an article."""
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not (3 <= len(title) <= 255):
            raise HTTPException(400, "Title must be between 3 and 255 characters")
        article.title = title

    if "slug" in data:
        slug = (data.get("slug") or "").strip()
        if not slug:
            raise HTTPException(400, "Slug is required")
        clash = (
            db.query(Article)
            .filter(Article.slug == slug, Article.id != (article.id or 0))
            .first()
        )
        if clash:
            raise HTTPException(400, "This attribute must be unique (slug)")
        article.slug = slug

    if "content" in data:
        content = data.get("content") or ""
        if not content.strip():
            raise HTTPException(400, "Content is required")
        article.content = content
        article.read_time = calculate_read_time(content)

    if "excerpt" in data:
        excerpt = data.get("excerpt")
        if excerpt is not None and len(excerpt) > 500:
            excerpt = excerpt[:500]
        article.excerpt = excerpt

    if "coverImage" in data:
        cover_id = data.get("coverImage")
        if cover_id is None:
            article.cover_image = None
        else:
            media = db.get(Media, cover_id)
            if media is None:
                raise HTTPException(400, "coverImage media not found")
            article.cover_image = media

    if "tags" in data:
        tag_ids = data.get("tags") or []
        article.tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all() if tag_ids else []
        article.tag_order = tag_ids

    if "publishedAt" in data:
        article.published_at = parse_published_at(data.get("publishedAt"))


@router.get("/articles")
def find_articles(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    slug: str | None = None,
    tag: str | None = None,
    db: Session = Depends(get_db),
):
    """Public find — published articles only."""
    query = db.query(Article).filter(Article.published_at.isnot(None))
    if slug:
        query = query.filter(Article.slug == slug)
    if tag:
        query = query.join(Article.tags).filter(Tag.slug == tag)

    total = query.count()
    articles = (
        query.order_by(Article.published_at.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )
    return list_response([article_dict(a) for a in articles], page, pageSize, total)


@router.get("/my-articles")
def find_mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All of the authenticated user's articles — drafts and published."""
    articles = (
        db.query(Article)
        .filter(Article.author_id == user.id)
        .order_by(Article.created_at.desc())
        .all()
    )
    return list_response([article_dict(a) for a in articles], 1, max(len(articles), 1), len(articles))


@router.get("/articles-by-user/{username}")
def find_by_username(username: str, db: Session = Depends(get_db)):
    """Published articles for a public profile page. Unknown user → empty list."""
    author = db.query(User).filter(User.username == username).first()
    if author is None:
        return list_response([], 1, 25, 0)

    articles = (
        db.query(Article)
        .filter(Article.author_id == author.id, Article.published_at.isnot(None))
        .order_by(Article.published_at.desc())
        .all()
    )
    return list_response([article_dict(a) for a in articles], 1, max(len(articles), 1), len(articles))


@router.get("/articles/{document_id}")
def find_one(
    document_id: str,
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    article = get_article_or_404(db, document_id)
    # Drafts are only visible to their author
    if article.published_at is None and (user is None or article.author_id != user.id):
        raise HTTPException(404, "Article not found")
    return single_response(article_dict(article))


@router.post("/articles")
def create_article(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.get("data") or {}
    for required in ("title", "slug", "content"):
        if required not in data:
            raise HTTPException(400, f"{required} is required")

    article = Article(author=user)
    apply_data(db, article, data)
    db.add(article)
    db.commit()
    db.refresh(article)
    return single_response(article_dict(article))


@router.put("/articles/{document_id}")
def update_article(
    document_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = get_article_or_404(db, document_id)
    if article.author_id != user.id:
        raise HTTPException(403, "You can only edit your own articles")

    apply_data(db, article, body.get("data") or {})
    db.commit()
    db.refresh(article)
    return single_response(article_dict(article))


@router.delete("/articles/{document_id}")
def delete_article(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = get_article_or_404(db, document_id)
    if article.author_id != user.id:
        raise HTTPException(403, "You can only delete your own articles")

    db.delete(article)
    db.commit()
    # 200 with a body (not 204): the frontend always calls res.json()
    return single_response(None)


@router.get("/articles/{document_id}/related")
def get_related_articles(document_id: str, db: Session = Depends(get_db)):
    article = get_article_or_404(db, document_id)
    tag_ids = [t.id for t in article.tags]
    
    query = db.query(Article).filter(
        Article.id != article.id,
        Article.published_at.isnot(None)
    )
    
    if tag_ids:
        query = query.join(Article.tags).filter(Tag.id.in_(tag_ids))
    else:
        # fallback to same author if no tags
        query = query.filter(Article.author_id == article.author_id)
        
    related = query.order_by(Article.published_at.desc()).limit(3).all()
    return list_response([article_dict(a) for a in related], 1, 3, len(related))


@router.get("/articles/{document_id}/comments")
def get_comments(document_id: str, db: Session = Depends(get_db)):
    article = get_article_or_404(db, document_id)
    comments = db.query(Comment).filter(Comment.article_id == article.id).order_by(Comment.created_at.asc()).all()
    return list_response([comment_dict(c) for c in comments], 1, max(len(comments), 1), len(comments))


@router.post("/articles/{document_id}/comments")
def create_comment(
    document_id: str,
    body: dict,
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    article = get_article_or_404(db, document_id)
    data = body.get("data", {})
    content = data.get("content", "").strip()
    guest_name = data.get("guestName", "").strip()
    
    if not content:
        raise HTTPException(400, "Comment content is required")
    if not user and not guest_name:
        raise HTTPException(400, "Name is required when not logged in")
        
    comment = Comment(
        content=content, 
        article=article, 
        author=user,
        guest_name=None if user else guest_name
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return single_response(comment_dict(comment))


@router.delete("/articles/{document_id}/comments/{comment_id}")
def delete_comment(
    document_id: str,
    comment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    article = get_article_or_404(db, document_id)
    comment = db.query(Comment).filter(Comment.document_id == comment_id, Comment.article_id == article.id).first()
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.author_id != user.id:
        raise HTTPException(403, "You can only delete your own comments")
        
    db.delete(comment)
    db.commit()
    return single_response(None)


@router.get("/articles/{document_id}/like-status")
def get_like_status(
    document_id: str,
    guest_id: str | None = Query(None, alias="guestId"),
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    article = get_article_or_404(db, document_id)
    count = db.query(Like).filter(Like.article_id == article.id).count()
    is_liked = False
    if user:
        is_liked = db.query(Like).filter(Like.article_id == article.id, Like.user_id == user.id).first() is not None
    elif guest_id:
        is_liked = db.query(Like).filter(Like.article_id == article.id, Like.guest_id == guest_id).first() is not None
        
    return {"data": {"isLiked": is_liked, "count": count}}


@router.post("/articles/{document_id}/like")
def toggle_like(
    document_id: str,
    body: dict,
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    article = get_article_or_404(db, document_id)
    guest_id = body.get("data", {}).get("guestId")
    
    if not user and not guest_id:
        raise HTTPException(400, "guestId is required when not logged in")
        
    if user:
        existing_like = db.query(Like).filter(Like.article_id == article.id, Like.user_id == user.id).first()
    else:
        existing_like = db.query(Like).filter(Like.article_id == article.id, Like.guest_id == guest_id).first()
    
    if existing_like:
        db.delete(existing_like)
        is_liked = False
    else:
        new_like = Like(article=article, user=user, guest_id=None if user else guest_id)
        db.add(new_like)
        is_liked = True
        
    db.commit()
    count = db.query(Like).filter(Like.article_id == article.id).count()
    
    return {"data": {"isLiked": is_liked, "count": count}}
