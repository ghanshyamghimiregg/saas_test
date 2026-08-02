import re
import uuid
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from app.models.user import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.STAFF
    branch_id: uuid.UUID | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 10:
            raise ValueError("Password must be at least 10 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", value):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\/;']", value):
            raise ValueError("Password must contain at least one special character")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: UserRole
    branch_id: uuid.UUID | None
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"