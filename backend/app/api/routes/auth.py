from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db.session import Base, engine, get_db
from ...models import user as user_models  # noqa: F401
from ...models import session as session_models  # noqa: F401
from ...schemas.user import Token, UserCreate, UserLogin, UserRead
from ...services.user_service import UserService

Base.metadata.create_all(bind=engine)

router = APIRouter()

@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    service = UserService(db)
    try:
        user = service.register_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return user

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    service = UserService(db)
    token = service.authenticate_user(payload)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return token

