import uuid
from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class CustomerCreate(BaseModel):
    full_name: str
    phone: str | None = None
    email: str | None = None
    discount_level: int = 0   # <-- new

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            if not v.isdigit() or len(v) != 10:
                raise ValueError("Phone number must be exactly 10 digits")
        return v


def get_badge_tier(purchase_count: int) -> str | None:
    if purchase_count >= 1000:
        return "diamond"
    elif purchase_count >= 500:
        return "platinum"
    elif purchase_count >= 100:
        return "gold"
    elif purchase_count >= 50:
        return "silver"
    elif purchase_count >= 10:
        return "verified"
    return None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None
    email: str | None
    is_active: bool
    purchase_count: int
    loyalty_points: int
    discount_level: int
    badge_tier: str | None = None

    @model_validator(mode="after")
    def compute_badge(self):
        self.badge_tier = get_badge_tier(self.purchase_count)
        return self