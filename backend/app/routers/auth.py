import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import create_token, hash_password, verify_password
from ..serializers import user_dict

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterInput(BaseModel):
    username: str
    email: str
    password: str


class LoginInput(BaseModel):
    identifier: str
    password: str


@router.post("/local/register")
def register(body: RegisterInput, db: Session = Depends(get_db)):
    # Single-author blog: only the very first account (the owner) can register.
    if db.query(User).count() > 0:
        raise HTTPException(403, "Registration is closed — Airefy is a personal blog.")

    username = body.username.strip()
    email = body.email.strip().lower()

    if len(username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Please provide a valid email address")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    exists = (
        db.query(User)
        .filter(or_(User.username == username, User.email == email))
        .first()
    )
    if exists:
        raise HTTPException(400, "Email or Username are already taken")

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"jwt": create_token(user.id), "user": user_dict(user)}


@router.post("/local")
def login(body: LoginInput, db: Session = Depends(get_db)):
    identifier = body.identifier.strip()
    user = (
        db.query(User)
        .filter(or_(User.email == identifier.lower(), User.username == identifier))
        .first()
    )
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(400, "Invalid identifier or password")

    return {"jwt": create_token(user.id), "user": user_dict(user)}
