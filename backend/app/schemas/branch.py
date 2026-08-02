import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BranchCreate(BaseModel):
    name: str
    address: Optional[str] = None


class BranchUpdate(BaseModel):
    address: Optional[str] = None
    is_active: Optional[bool] = None
    camera_stream_url: Optional[str] = None
    # NOTE: `name` and `code` are intentionally absent — immutable post-creation


class BranchPasswordReset(BaseModel):
    new_password: str


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    address: Optional[str]
    is_active: bool
    camera_stream_url: Optional[str]


class BranchProvisionOut(BaseModel):
    """Returned only on creation — plaintext password shown exactly once."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    code: str
    address: Optional[str]
    is_active: bool
    plaintext_password: str    # shown once; not stored
