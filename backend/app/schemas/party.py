import uuid
from pydantic import BaseModel, ConfigDict


class PartyCreate(BaseModel):
    name: str
    contact_number: str | None = None
    address: str | None = None


class PartyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    contact_number: str | None
    address: str | None
    is_active: bool