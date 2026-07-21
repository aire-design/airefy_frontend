import secrets
import string
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

_DOCUMENT_ID_ALPHABET = string.ascii_lowercase + string.digits


def generate_document_id() -> str:
    """Random 24-char public id used in URLs and API payloads."""
    return "".join(secrets.choice(_DOCUMENT_ID_ALPHABET) for _ in range(24))


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Media(Base, TimestampMixin):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alternative_text: Mapped[str | None] = mapped_column(String(255))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    # {"thumbnail": {"url","width","height"}, "small": ..., "medium": ...}
    formats: Mapped[dict | None] = mapped_column(JSON)
    mime: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False
    )
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    avatar_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    avatar: Mapped[Media | None] = relationship(lazy="joined")

    bio: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(255))
    twitter: Mapped[str | None] = mapped_column(String(255))
    instagram: Mapped[str | None] = mapped_column(String(255))
    linkedin: Mapped[str | None] = mapped_column(String(255))
    github: Mapped[str | None] = mapped_column(String(255))

    # Visibility toggles — email hidden by default, everything else visible
    show_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_bio: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_website: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_twitter: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_instagram: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_linkedin: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_github: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    articles: Mapped[list["Article"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    likes: Mapped[list["Like"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    articles: Mapped[list["Article"]] = relationship(
        secondary=article_tags, back_populates="tags"
    )


class Certification(Base, TimestampMixin):
    """A certification or badge earned by the owner, shown on the public
    /certifications timeline."""

    __tablename__ = "certifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Public verification link (Credly, Coursera, etc.)
    credential_url: Mapped[str | None] = mapped_column(String(500))
    # Comma-separated skill names rendered as chips
    skills: Mapped[str | None] = mapped_column(String(500))
    issued_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    badge_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    badge: Mapped[Media | None] = relationship(lazy="joined")


class Article(Base, TimestampMixin):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt: Mapped[str | None] = mapped_column(String(500))
    read_time: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # Null = draft, set = published.
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    tag_order: Mapped[list[int] | None] = mapped_column(JSON)

    cover_image_id: Mapped[int | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    cover_image: Mapped[Media | None] = relationship(lazy="joined")

    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    author: Mapped[User | None] = relationship(back_populates="articles", lazy="joined")

    tags: Mapped[list[Tag]] = relationship(
        secondary=article_tags, back_populates="articles", lazy="selectin"
    )

    comments: Mapped[list["Comment"]] = relationship(back_populates="article", cascade="all, delete-orphan")
    likes: Mapped[list["Like"]] = relationship(back_populates="article", cascade="all, delete-orphan")


class Comment(Base, TimestampMixin):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(24), unique=True, default=generate_document_id, nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    article: Mapped[Article] = relationship(back_populates="comments")

    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    author: Mapped[User | None] = relationship(back_populates="comments", lazy="joined")
    guest_name: Mapped[str | None] = mapped_column(String(255))


class Like(Base, TimestampMixin):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    article: Mapped[Article] = relationship(back_populates="likes")

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user: Mapped[User | None] = relationship(back_populates="likes")
    guest_id: Mapped[str | None] = mapped_column(String(255), index=True)
