"""
Billing total calculation and QR payment placeholder.
calculate-total is the shared dependency feeding Ghanshyam's billing UI.
generate-qr is a placeholder pending Fonepay/eSewa provider decision.
Implements: Integrations & Automation > Auto QR code generation + balance calculation
"""
from decimal import Decimal
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.billing import (
    CalculateTotalRequest, CalculateTotalResponse,
    QRPaymentRequest, QRPaymentResponse,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post("/calculate-total", response_model=CalculateTotalResponse)
def calculate_total(
    request: CalculateTotalRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Called by Ghanshyam's billing UI to get a live total as items are added/removed.
    This is the shared dependency flagged in the coordination notes — the flow is:
    Ghanshyam's UI sends line items -> this calculates subtotal/discount/total
    -> UI displays it -> customer pays -> a sales_ledger_entry gets recorded separately.
    """
    subtotal = sum((item.unit_price * item.quantity for item in request.items), Decimal("0"))
    total = subtotal - request.discount_amount
    if total < 0:
        total = Decimal("0")

    return CalculateTotalResponse(
        subtotal=subtotal,
        discount_amount=request.discount_amount,
        total_amount=total,
    )


@router.post("/generate-qr", response_model=QRPaymentResponse)
def generate_payment_qr(
    request: QRPaymentRequest,
    current_user: User = Depends(get_current_user),
):
    """
    PLACEHOLDER — real QR generation depends on Fonepay or eSewa merchant API
    credentials and integration docs, not yet available.
    Once decided, this will call the provider's API with request.amount and
    request.reference_id, and return their actual QR payload/image URL here.
    """
    return QRPaymentResponse(
        status="not_implemented",
        provider="pending_decision",
        amount=request.amount,
        qr_payload=None,
        message="See QR_PAYMENT_NOTE.md — pending Fonepay/eSewa merchant account decision",
    )