from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class PartnerInfo(BaseModel):
    user_id: int
    email: str
    age: Optional[int] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    language: Optional[str] = None


class RoundInfo(BaseModel):
    round_index: int
    partner: Optional[PartnerInfo] = None
    round_seconds: int
    has_more: bool


class RoundAction(BaseModel):
    partner_id: int
    decision: Literal["like", "skip"]


class MatchSummary(BaseModel):
    id: int
    partner_id: int
    partner_email: str
    partner_age: Optional[int] = None
    partner_city: Optional[str] = None
    chat_expires_at: datetime


class MessageRead(BaseModel):
    id: int
    sender_id: int
    body: str
    created_at: datetime


class MessageCreate(BaseModel):
    body: str

