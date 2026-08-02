import uuid
from decimal import Decimal
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SalesSummaryOut(BaseModel):
    branch_id: Optional[str] = None
    period: Optional[str] = None
    period_start: date
    period_end: date
    total_revenue: Decimal
    total_sales_count: int
    total_discount: Optional[Decimal] = None


class SaleLineItemDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    frame_id: Optional[uuid.UUID]
    lens_spec_id: Optional[uuid.UUID]
    product_name: Optional[str]
    sku: Optional[str]
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class SalesListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    customer_id: Optional[uuid.UUID]
    invoice_number: Optional[str]
    status: Optional[str]
    payment_method: Optional[str]
    discount_type: Optional[str]
    discount_pct: Optional[Decimal]
    subtotal: Optional[Decimal]
    tax_amount: Optional[Decimal]
    discount: Decimal
    total: Decimal
    created_at: datetime
    completed_at: Optional[datetime]
    line_items: List[SaleLineItemDetailOut]
