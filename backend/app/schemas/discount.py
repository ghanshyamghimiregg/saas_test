import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class DiscountConfigUpdate(BaseModel):
    owner_pct: Optional[Decimal] = None
    salesman_pct: Optional[Decimal] = None
    regular_customer_pct: Optional[Decimal] = None
    allow_stacking: Optional[bool] = None

    @field_validator("owner_pct", "salesman_pct", "regular_customer_pct", mode="before")
    @classmethod
    def pct_range(cls, v):
        if v is not None:
            v = Decimal(str(v))
            if v < 0 or v > 100:
                raise ValueError("Discount percentage must be between 0 and 100")
        return v


class DiscountConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_pct: Decimal
    salesman_pct: Decimal
    regular_customer_pct: Decimal
    allow_stacking: bool
    updated_at: Optional[datetime]
    updated_by: Optional[str]


class MembershipTierConfigUpdate(BaseModel):
    tier_name: Optional[str] = None
    min_purchases: Optional[int] = None
    discount_pct: Optional[Decimal] = None

    @field_validator("min_purchases")
    @classmethod
    def min_purchases_positive(cls, v):
        if v is not None and v < 1:
            raise ValueError("min_purchases must be >= 1")
        return v

    @field_validator("discount_pct")
    @classmethod
    def pct_range(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("discount_pct must be between 0 and 100")
        return v


class MembershipTierConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tier_name: str
    min_purchases: int
    discount_pct: Decimal
    sort_order: int
    updated_at: Optional[datetime]
