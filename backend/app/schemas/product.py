import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator, ConfigDict


class FrameProductCreate(BaseModel):
    branch_id: uuid.UUID
    product_code: str
    name: str
    brand: Optional[str] = None
    model_number: Optional[str] = None
    sku: Optional[str] = None

    # classification
    category: Optional[str] = None
    eyewear_type: Optional[str] = None   # legacy alias
    frame_shape: Optional[str] = None
    frame_material: Optional[str] = None
    frame_color: Optional[str] = None
    gender: Optional[str] = None

    # lens
    lens_type: Optional[str] = None
    lens_material: Optional[str] = None
    lens_coating: Optional[str] = None
    polarized: Optional[bool] = False

    # sizing
    size: Optional[str] = None
    temple_size: Optional[str] = None   # legacy alias

    # pricing
    cost_price: Optional[Decimal] = None
    selling_price: Decimal
    tax_rate: Optional[Decimal] = Decimal("0")
    hsn_code: Optional[str] = None

    # supplier & stock
    supplier: Optional[str] = None
    quantity: int = 0
    reorder_threshold: int = 5

    # extras
    warranty_period: Optional[str] = None
    notes: Optional[str] = None
    image_urls: Optional[List[str]] = None

    @field_validator("selling_price")
    @classmethod
    def price_positive(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("selling_price must be >= 0")
        return v

    @field_validator("quantity")
    @classmethod
    def qty_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("quantity must be >= 0")
        return v

    @field_validator("reorder_threshold")
    @classmethod
    def threshold_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("reorder_threshold must be >= 0")
        return v


class FrameProductUpdate(BaseModel):
    """All fields optional — PATCH semantics."""
    name: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    eyewear_type: Optional[str] = None
    frame_shape: Optional[str] = None
    frame_material: Optional[str] = None
    frame_color: Optional[str] = None
    gender: Optional[str] = None
    lens_type: Optional[str] = None
    lens_material: Optional[str] = None
    lens_coating: Optional[str] = None
    polarized: Optional[bool] = None
    size: Optional[str] = None
    temple_size: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    hsn_code: Optional[str] = None
    supplier: Optional[str] = None
    reorder_threshold: Optional[int] = None
    warranty_period: Optional[str] = None
    notes: Optional[str] = None
    image_urls: Optional[List[str]] = None

    @field_validator("selling_price")
    @classmethod
    def price_non_negative(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("selling_price must be >= 0")
        return v

    @field_validator("reorder_threshold")
    @classmethod
    def threshold_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("reorder_threshold must be >= 0")
        return v


class StockAdjustIn(BaseModel):
    delta: int      # positive or negative
    reason: str
    notes: Optional[str] = None

    @field_validator("delta")
    @classmethod
    def delta_nonzero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("delta must be non-zero")
        return v

    @field_validator("reason")
    @classmethod
    def reason_nonempty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("reason is required")
        return v.strip()


class StockAdjustmentLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    frame_id: uuid.UUID
    delta: int
    quantity_before: int
    quantity_after: int
    reason: str
    notes: Optional[str]
    created_by: Optional[uuid.UUID]
    created_at: datetime


class FrameProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    product_code: str
    barcode: str
    sku: Optional[str]
    name: str
    brand: Optional[str]
    model_number: Optional[str]
    category: Optional[str]
    eyewear_type: Optional[str]
    frame_shape: Optional[str]
    frame_material: Optional[str]
    frame_color: Optional[str]
    gender: Optional[str]
    lens_type: Optional[str]
    lens_material: Optional[str]
    lens_coating: Optional[str]
    polarized: Optional[bool]
    size: Optional[str]
    temple_size: Optional[str]
    cost_price: Optional[Decimal]
    selling_price: Decimal
    tax_rate: Optional[Decimal]
    hsn_code: Optional[str]
    supplier: Optional[str]
    quantity: int
    reorder_threshold: Optional[int]
    warranty_period: Optional[str]
    notes: Optional[str]
    image_urls: Optional[List[str]]
    is_active: bool
    created_by: Optional[uuid.UUID]
    created_at: datetime


class LensSpecCreate(BaseModel):
    branch_id: uuid.UUID
    lens_type: str
    power: Optional[str] = None
    price: Decimal

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("price must be >= 0")
        return v


class LensSpecOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    lens_type: str
    power: Optional[str]
    price: Decimal
    is_active: bool
    created_by: Optional[uuid.UUID]
    created_at: datetime
