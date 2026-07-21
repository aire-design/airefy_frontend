import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..models import Media, User
from ..security import hash_password
from ..serializers import media_dict, user_dict

router = APIRouter(prefix="/api/profile", tags=["profile"])

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")
BIO_WORD_LIMIT = 1000

VISIBILITY_FIELDS = {
    "showEmail": "show_email",
    "showBio": "show_bio",
    "showWebsite": "show_website",
    "showTwitter": "show_twitter",
    "showInstagram": "show_instagram",
    "showLinkedin": "show_linkedin",
    "showGithub": "show_github",
}

OPTIONAL_TEXT_FIELDS = {
    "bio": "bio",
    "website": "website",
    "twitter": "twitter",
    "instagram": "instagram",
    "linkedin": "linkedin",
    "github": "github",
}


@router.put("")
def update_profile(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    body = body or {}

    if "username" in body:
        username = body.get("username")
        if not isinstance(username, str) or len(username.strip()) < 3:
            raise HTTPException(400, "Username must be at least 3 characters.")
        username = username.strip()
        if not USERNAME_RE.match(username):
            raise HTTPException(
                400, "Username can only contain letters, numbers, hyphens and underscores."
            )
        clash = db.query(User).filter(User.username == username, User.id != user.id).first()
        if clash:
            raise HTTPException(400, "Username is already taken.")
        user.username = username

    if "email" in body:
        email = (body.get("email") or "").strip().lower()
        clash = db.query(User).filter(User.email == email, User.id != user.id).first()
        if clash:
            raise HTTPException(400, "Email is already taken.")
        user.email = email

    if "password" in body and body.get("password"):
        password = body["password"]
        if len(password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters.")
        user.hashed_password = hash_password(password)

    if "bio" in body and body.get("bio"):
        if len(str(body["bio"]).split()) > BIO_WORD_LIMIT:
            raise HTTPException(400, f"Bio must be {BIO_WORD_LIMIT} words or fewer.")

    for key, attr in OPTIONAL_TEXT_FIELDS.items():
        if key in body:
            setattr(user, attr, body.get(key) or None)

    if "avatar" in body:
        avatar_id = body.get("avatar")
        if avatar_id is None:
            user.avatar = None
        else:
            media = db.get(Media, avatar_id)
            if media is None:
                raise HTTPException(400, "avatar media not found")
            user.avatar = media

    for key, attr in VISIBILITY_FIELDS.items():
        if key in body:
            setattr(user, attr, bool(body.get(key)))

    db.commit()
    db.refresh(user)
    return user_dict(user)


@router.get("/{username}")
def get_public_profile(
    username: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Public profile. Username and avatar are always visible; everything else
    respects the user's show* toggles. The owner sees all fields plus toggles."""
    u = db.query(User).filter(User.username == username).first()
    if u is None:
        raise HTTPException(404, "User not found")

    profile: dict = {
        "id": u.id,
        "documentId": u.document_id,
        "username": u.username,
        "avatar": media_dict(u.avatar),
    }

    is_owner = viewer is not None and viewer.username == u.username

    if is_owner:
        if u.email:
            profile["email"] = u.email
        if u.bio:
            profile["bio"] = u.bio
        if u.website:
            profile["website"] = u.website
        if u.twitter:
            profile["twitter"] = u.twitter
        if u.instagram:
            profile["instagram"] = u.instagram
        if u.linkedin:
            profile["linkedin"] = u.linkedin
        if u.github:
            profile["github"] = u.github

        profile["showEmail"] = u.show_email
        profile["showBio"] = u.show_bio
        profile["showWebsite"] = u.show_website
        profile["showTwitter"] = u.show_twitter
        profile["showInstagram"] = u.show_instagram
        profile["showLinkedin"] = u.show_linkedin
        profile["showGithub"] = u.show_github
    else:
        if u.show_email and u.email:
            profile["email"] = u.email
        if u.show_bio and u.bio:
            profile["bio"] = u.bio
        if u.show_website and u.website:
            profile["website"] = u.website
        if u.show_twitter and u.twitter:
            profile["twitter"] = u.twitter
        if u.show_instagram and u.instagram:
            profile["instagram"] = u.instagram
        if u.show_linkedin and u.linkedin:
            profile["linkedin"] = u.linkedin
        if u.show_github and u.github:
            profile["github"] = u.github

    return profile
