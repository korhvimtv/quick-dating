from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ...core.security import decode_token
from ...db.session import get_db
from ...models.session import Match, Message
from ...models.user import User
from ...schemas.session import MatchSummary, MessageCreate, MessageRead


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user_id = decode_token(token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.get("/matches", response_model=list[MatchSummary])
def list_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MatchSummary]:
    now = datetime.now(timezone.utc)
    matches = (
        db.query(Match)
        .filter(
            Match.chat_expires_at > now,
            (Match.user1_id == current_user.id) | (Match.user2_id == current_user.id),
        )
        .order_by(Match.created_at.desc())
        .all()
    )

    items: list[MatchSummary] = []
    for m in matches:
        partner_id = m.user2_id if m.user1_id == current_user.id else m.user1_id
        partner = db.get(User, partner_id)
        if not partner:
            continue
        items.append(
            MatchSummary(
                id=m.id,
                partner_id=partner.id,
                partner_email=partner.email,
                partner_age=partner.age,
                partner_city=partner.city,
                chat_expires_at=m.chat_expires_at,
            )
        )
    return items


def _get_match_for_user(db: Session, current_user: User, match_id: int) -> Match:
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if current_user.id not in (match.user1_id, match.user2_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed for this match")
    return match


@router.get("/matches/{match_id}/messages", response_model=list[MessageRead])
def list_messages(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageRead]:
    _get_match_for_user(db, current_user, match_id)
    msgs = (
        db.query(Message)
        .filter(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [MessageRead(id=m.id, sender_id=m.sender_id, body=m.body, created_at=m.created_at) for m in msgs]


@router.post("/matches/{match_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def send_message(
    match_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    match = _get_match_for_user(db, current_user, match_id)

    if not payload.body.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    msg = Message(match_id=match.id, sender_id=current_user.id, body=payload.body.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return MessageRead(id=msg.id, sender_id=msg.sender_id, body=msg.body, created_at=msg.created_at)

