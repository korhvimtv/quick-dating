from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.security import decode_token
from ...db.session import get_db
from ...models.session import DatingSession, Match, SessionRound
from ...models.user import User
from ...schemas.session import PartnerInfo, RoundAction, RoundInfo


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


def get_or_create_active_session(db: Session, user: User) -> DatingSession:
    session = (
        db.query(DatingSession)
        .filter(DatingSession.owner_id == user.id, DatingSession.is_active.is_(True))
        .order_by(DatingSession.created_at.desc())
        .first()
    )
    if session:
        return session

    session = DatingSession(owner_id=user.id, is_active=True)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def find_next_partner(db: Session, user: User, session: DatingSession) -> Optional[User]:
    # collect already seen partners in this session
    seen_partner_ids = (
        db.query(SessionRound.partner_id)
        .filter(SessionRound.session_id == session.id)
        .distinct()
        .all()
    )
    seen_ids = [pid for (pid,) in seen_partner_ids]

    query = db.query(User).filter(User.id != user.id)

    # apply simple preference filters from current user
    if user.pref_min_age is not None:
        query = query.filter(User.age >= user.pref_min_age)
    if user.pref_max_age is not None:
        query = query.filter(User.age <= user.pref_max_age)
    if user.pref_gender:
        query = query.filter(User.gender == user.pref_gender)
    if user.pref_language:
        query = query.filter(User.language == user.pref_language)

    if seen_ids:
        query = query.filter(~User.id.in_(seen_ids))

    # random order
    candidate = query.order_by(func.random()).first()
    return candidate


def build_partner_info(user: User) -> PartnerInfo:
    return PartnerInfo(
        user_id=user.id,
        email=user.email,
        age=user.age,
        city=user.city,
        bio=user.bio,
        gender=user.gender,
        language=user.language,
    )


def create_round(
    db: Session,
    session: DatingSession,
    partner: User,
) -> SessionRound:
    last_round = (
        db.query(SessionRound)
        .filter(SessionRound.session_id == session.id)
        .order_by(SessionRound.round_index.desc())
        .first()
    )
    next_index = (last_round.round_index + 1) if last_round else 1
    round_obj = SessionRound(session_id=session.id, partner_id=partner.id, round_index=next_index)
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    return round_obj


def ensure_match_for_like(db: Session, user: User, partner_id: int, session: DatingSession, round_obj: SessionRound):
    # Check if partner has already liked this user in any session round
    reciprocal_like = (
        db.query(SessionRound)
        .join(DatingSession, DatingSession.id == SessionRound.session_id)
        .filter(
            DatingSession.owner_id == partner_id,
            SessionRound.partner_id == user.id,
            SessionRound.decision == "like",
        )
        .first()
    )
    if not reciprocal_like:
        return

    # ensure we don't create duplicate match
    user1_id = min(user.id, partner_id)
    user2_id = max(user.id, partner_id)

    exists = (
        db.query(Match)
        .filter(
            Match.user1_id == user1_id,
            Match.user2_id == user2_id,
        )
        .first()
    )
    if exists:
        return

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.CHAT_LIFETIME_DAYS)
    match = Match(
        user1_id=user1_id,
        user2_id=user2_id,
        chat_expires_at=expires_at,
        session_id=session.id,
    )
    db.add(match)
    round_obj.match_created = True
    db.commit()


def build_round_info(
    round_obj: Optional[SessionRound],
    partner: Optional[User],
    has_more: bool,
) -> RoundInfo:
    partner_info = build_partner_info(partner) if partner else None
    return RoundInfo(
        round_index=round_obj.round_index if round_obj else 0,
        partner=partner_info,
        round_seconds=settings.SESSION_ROUND_SECONDS,
        has_more=has_more,
    )


@router.get("/current", response_model=RoundInfo)
def get_current_round(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoundInfo:
    session = get_or_create_active_session(db, current_user)

    # try to find an existing round for this session without a decision yet
    active_round = (
        db.query(SessionRound)
        .filter(
            SessionRound.session_id == session.id,
            SessionRound.decision.is_(None),
        )
        .order_by(SessionRound.round_index.desc())
        .first()
    )

    if active_round:
        partner = db.get(User, active_round.partner_id)
        if not partner:
            return build_round_info(None, None, has_more=False)
        return build_round_info(active_round, partner, has_more=True)

    # otherwise, allocate a new partner
    partner = find_next_partner(db, current_user, session)
    if not partner:
        return build_round_info(None, None, has_more=False)

    new_round = create_round(db, session, partner)
    return build_round_info(new_round, partner, has_more=True)


@router.post("/action", response_model=RoundInfo)
def submit_round_action(
    payload: RoundAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoundInfo:
    session = get_or_create_active_session(db, current_user)

    round_obj = (
        db.query(SessionRound)
        .filter(
            SessionRound.session_id == session.id,
            SessionRound.partner_id == payload.partner_id,
            SessionRound.decision.is_(None),
        )
        .order_by(SessionRound.round_index.desc())
        .first()
    )
    if not round_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active round for this partner")

    round_obj.decision = payload.decision
    round_obj.ended_at = datetime.now(timezone.utc)
    db.add(round_obj)
    db.commit()

    if payload.decision == "like":
        ensure_match_for_like(db, current_user, payload.partner_id, session, round_obj)

    # after decision, immediately move to next partner
    partner = find_next_partner(db, current_user, session)
    if not partner:
        return build_round_info(round_obj, None, has_more=False)

    new_round = create_round(db, session, partner)
    return build_round_info(new_round, partner, has_more=True)


@router.post("/next", response_model=RoundInfo)
def next_round(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoundInfo:
    session = get_or_create_active_session(db, current_user)

    # mark any active undecided round as ended without decision
    active_round = (
        db.query(SessionRound)
        .filter(
            SessionRound.session_id == session.id,
            SessionRound.decision.is_(None),
        )
        .order_by(SessionRound.round_index.desc())
        .first()
    )
    if active_round:
        active_round.decision = "skip"
        active_round.ended_at = datetime.now(timezone.utc)
        db.add(active_round)
        db.commit()

    partner = find_next_partner(db, current_user, session)
    if not partner:
        # no more partners, end session
        session.is_active = False
        db.add(session)
        db.commit()
        return build_round_info(active_round, None, has_more=False)

    new_round = create_round(db, session, partner)
    return build_round_info(new_round, partner, has_more=True)

