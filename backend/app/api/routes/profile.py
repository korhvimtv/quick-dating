from datetime import time
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ...core.security import decode_token
from ...db.session import get_db
from ...models.user import User, Availability
from ...schemas.user import (
    ProfileRead,
    ProfileUpdate,
    PreferencesRead,
    PreferencesUpdate,
    AvailabilitySlotCreate,
    AvailabilitySlotRead,
    AvailabilityUpdate,
)


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


@router.get("/me", response_model=ProfileRead)
def read_profile(current_user: User = Depends(get_current_user)) -> ProfileRead:
    return ProfileRead.model_validate(current_user)


@router.put("/me", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileRead:
    data = payload.model_dump(exclude_unset=True)

    # Simple validation for age range (already validated in schema, but keep basic guardrails here too)
    age = data.get("age")
    if age is not None and not (18 <= age <= 120):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Age must be between 18 and 120")

    for field, value in data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return ProfileRead.model_validate(current_user)


@router.post("/photo", response_model=ProfileRead)
def upload_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProfileRead:
    uploads_dir = Path("media/profile_photos")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename).suffix or ".jpg"
    filename = f"user_{current_user.id}{extension}"
    save_path = uploads_dir / filename

    with save_path.open("wb") as buffer:
        buffer.write(file.file.read())

    current_user.photo_path = str(save_path)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return ProfileRead.model_validate(current_user)


@router.get("/preferences", response_model=PreferencesRead)
def read_preferences(current_user: User = Depends(get_current_user)) -> PreferencesRead:
    return PreferencesRead(
        min_age=current_user.pref_min_age,
        max_age=current_user.pref_max_age,
        gender=current_user.pref_gender,
        language=current_user.pref_language,
    )


@router.put("/preferences", response_model=PreferencesRead)
def update_preferences(
    payload: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferencesRead:
    data = payload.model_dump(exclude_unset=True)

    min_age = data.get("min_age")
    max_age = data.get("max_age")
    if min_age is not None and max_age is not None and max_age < min_age:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_age must be greater than or equal to min_age",
        )

    if "min_age" in data:
        current_user.pref_min_age = data["min_age"]
    if "max_age" in data:
        current_user.pref_max_age = data["max_age"]
    if "gender" in data:
        current_user.pref_gender = data["gender"]
    if "language" in data:
        current_user.pref_language = data["language"]

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return PreferencesRead(
        min_age=current_user.pref_min_age,
        max_age=current_user.pref_max_age,
        gender=current_user.pref_gender,
        language=current_user.pref_language,
    )


def _has_overlaps(slots: List[AvailabilitySlotCreate]) -> bool:
    by_day: dict[int, list[tuple[time, time]]] = {}
    for slot in slots:
        by_day.setdefault(slot.day_of_week, []).append((slot.start_time, slot.end_time))

    for ranges in by_day.values():
        # sort by start_time
        ranges.sort(key=lambda r: r[0])
        for i in range(1, len(ranges)):
            prev_start, prev_end = ranges[i - 1]
            cur_start, _ = ranges[i]
            if cur_start < prev_end:
                return True
    return False


@router.get("/availability", response_model=list[AvailabilitySlotRead])
def read_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AvailabilitySlotRead]:
    slots = (
        db.query(Availability)
        .filter(Availability.user_id == current_user.id)
        .order_by(Availability.day_of_week, Availability.start_time)
        .all()
    )
    return [AvailabilitySlotRead.model_validate(slot) for slot in slots]


@router.put("/availability", response_model=list[AvailabilitySlotRead])
def update_availability(
    payload: AvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AvailabilitySlotRead]:
    slots = payload.slots

    if _has_overlaps(slots):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Availability slots have overlaps. Please adjust the time ranges.",
        )

    # Remove existing availability entries for the user
    db.query(Availability).filter(Availability.user_id == current_user.id).delete()

    created: list[Availability] = []
    for slot in slots:
        record = Availability(
            user_id=current_user.id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time,
            end_time=slot.end_time,
        )
        db.add(record)
        created.append(record)

    db.commit()

    # Refresh to ensure IDs are populated
    for record in created:
        db.refresh(record)

    return [AvailabilitySlotRead.model_validate(record) for record in created]

