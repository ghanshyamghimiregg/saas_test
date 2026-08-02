import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator, ConfigDict
from app.models.sale import SaleStatus, PaymentMethod, DiscountType


class SaleLineItemIn(BaseModel):
    frame_id: Optional[uuid.UUID] = None
    lens_spec_id: Optional[uuid.UUID] = None
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be > 0")
        return v

    def model_post_init(self, __context: object) -> None:
        if self.frame_id is None and self.lens_spec_id is None:
            raise ValueError("Each line item must reference a frame_id or lens_spec_id")


class SaleCreate(BaseModel):
    branch_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    discount_type: DiscountType = DiscountType.NONE
    payment_method: PaymentMethod = PaymentMethod.CASH
    cash_tendered: Optional[Decimal] = None   # required when payment_method=cash
    notes: Optional[str] = None
    line_items: List[SaleLineItemIn]

    @field_validator("line_items")
    @classmethod
    def items_nonempty(cls, v: list) -> list:
        if not v:
            raise ValueError("Sale must have at least one line item")
        return v


class SaleHoldCreate(BaseModel):
    branch_id: uuid.UUID
    customer_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    line_items: List[SaleLineItemIn]


class SaleReturnItemIn(BaseModel):
    sale_line_item_id: uuid.UUID
    quantity_returned: int

    @field_validator("quantity_returned")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity_returned must be > 0")
        return v


class SaleReturnCreate(BaseModel):
    reason: str
    notes: Optional[str] = None
    items: List[SaleReturnItemIn]

    @field_validator("reason")
    @classmethod
    def reason_nonempty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("reason is required")
        return v.strip()


class SaleLineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    frame_id: Optional[uuid.UUID]
    lens_spec_id: Optional[uuid.UUID]
    product_name: Optional[str]
    sku: Optional[str]
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class SaleReturnItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sale_line_item_id: uuid.UUID
    frame_id: Optional[uuid.UUID]
    quantity_returned: int
    refund_line_total: Decimal


class SaleReturnOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_sale_id: uuid.UUID
    branch_id: uuid.UUID
    refund_amount: Decimal
    reason: str
    notes: Optional[str]
    created_at: datetime
    return_items: List[SaleReturnItemOut]


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    customer_id: Optional[uuid.UUID]
    invoice_number: Optional[str]
    status: SaleStatus
    payment_method: Optional[PaymentMethod]
    payment_status: str
    discount: Decimal
    discount_pct: Optional[Decimal]
    discount_type: DiscountType
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    cash_tendered: Optional[Decimal]
    change_due: Optional[Decimal]
    notes: Optional[str]
    created_by: Optional[uuid.UUID]
    created_at: datetime
    completed_at: Optional[datetime]
    line_items: List[SaleLineItemOut]
