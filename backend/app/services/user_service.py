from typing import Optional

from sqlalchemy.orm import Session

from ..core.security import get_password_hash, verify_password, create_access_token
from ..repositories.user_repository import UserRepository
from ..schemas.user import UserCreate, UserLogin, UserRead, Token

class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register_user(self, data: UserCreate) -> UserRead:
        existing = self.repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")
        hashed = get_password_hash(data.password)
        user = self.repo.create(email=data.email, hashed_password=hashed)
        return UserRead.model_validate(user)

    def authenticate_user(self, data: UserLogin) -> Optional[Token]:
        user = self.repo.get_by_email(data.email)
        if not user:
            return None
        if not verify_password(data.password, user.hashed_password):
            return None
        token = create_access_token(subject=str(user.id))
        return Token(access_token=token)

