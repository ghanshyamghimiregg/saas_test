import uuid
from decimal import Decimal
from pydantic import BaseModel


class BillLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: Decimal


class CalculateTotalRequest(BaseModel):
    branch_id: uuid.UUID
    customer_id: uuid.UUID | None = None
    items: list[BillLineItem]
    discount_amount: Decimal = Decimal("0")  # flat discount, applied by Bishan's discount logic upstream


class CalculateTotalResponse(BaseModel):
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal


class QRPaymentRequest(BaseModel):
    branch_id: uuid.UUID
    amount: Decimal
    reference_id: str | None = None


class QRPaymentResponse(BaseModel):
    status: str
    provider: str
    amount: Decimal
    qr_payload: str | None = None
    message: str