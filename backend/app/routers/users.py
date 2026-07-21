from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..serializers import user_dict

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    # /users/me returns the user object bare (no {data} envelope)
    return user_dict(user)
