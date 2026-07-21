from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_token


def _user_from_authorization(authorization: str | None, db: Session) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    user_id = decode_token(authorization.removeprefix("Bearer ").strip())
    if user_id is None:
        return None
    return db.get(User, user_id)


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    return _user_from_authorization(authorization, db)


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    user = _user_from_authorization(authorization, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
