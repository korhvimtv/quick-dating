from sqlalchemy import Column, Integer, String, DateTime, func, Text, Time, ForeignKey
from sqlalchemy.orm import relationship

from ..db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Profile fields
    age = Column(Integer, nullable=True)
    city = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    gender = Column(String, nullable=True)
    language = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)

    # Preference fields
    pref_min_age = Column(Integer, nullable=True)
    pref_max_age = Column(Integer, nullable=True)
    pref_gender = Column(String, nullable=True)
    pref_language = Column(String, nullable=True)

    # Relationships
    availability_slots = relationship("Availability", back_populates="user", cascade="all, delete-orphan")


class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0 = Monday ... 6 = Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    user = relationship("User", back_populates="availability_slots")

