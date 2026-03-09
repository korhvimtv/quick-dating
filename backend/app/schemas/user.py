from datetime import time

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(UserBase):
    password: str


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileBase(BaseModel):
    age: int | None = Field(default=None, ge=18, le=120)
    city: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=1000)
    gender: str | None = Field(default=None, max_length=32)
    language: str | None = Field(default=None, max_length=32)


class ProfileUpdate(ProfileBase):
    pass


class ProfileRead(ProfileBase):
    id: int
    email: EmailStr
    photo_path: str | None = None

    class Config:
        from_attributes = True


class PreferencesBase(BaseModel):
    min_age: int | None = Field(default=None, ge=18, le=120)
    max_age: int | None = Field(default=None, ge=18, le=120)
    gender: str | None = Field(default=None, max_length=32)
    language: str | None = Field(default=None, max_length=32)

    @field_validator("max_age")
    @classmethod
    def validate_age_range(cls, v: int | None, info):
        min_age = info.data.get("min_age")
        if v is not None and min_age is not None and v < min_age:
            raise ValueError("max_age must be greater than or equal to min_age")
        return v


class PreferencesUpdate(PreferencesBase):
    pass


class PreferencesRead(PreferencesBase):
    class Config:
        from_attributes = True


class AvailabilitySlotBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def validate_time_range(cls, v: time, info):
        start = info.data.get("start_time")
        if start is not None and v <= start:
            raise ValueError("end_time must be after start_time")
        return v


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlotRead(AvailabilitySlotBase):
    id: int

    class Config:
        from_attributes = True


class AvailabilityUpdate(BaseModel):
    slots: list[AvailabilitySlotCreate]

