"""
WhatsApp order confirmation link endpoint (wa.me deep link approach).
Implements: Integrations & Automation > Direct WhatsApp message generation
"""
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.core.whatsapp import generate_whatsapp_link, build_order_confirmation_message
from app.models.user import User
from app.schemas.whatsapp import WhatsAppOrderRequest, WhatsAppLinkResponse

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/order-confirmation-link", response_model=WhatsAppLinkResponse)
def get_order_confirmation_link(
    request: WhatsAppOrderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Returns a wa.me link with the order confirmation pre-filled.
    Frontend opens this link (or shows it as a button) — staff or the
    system taps it, WhatsApp opens with the message ready to send.
    """
    message = build_order_confirmation_message(
        customer_name=request.customer_name,
        order_items=request.order_items,
        total_amount=request.total_amount,
        reference_id=request.reference_id,
    )
    link = generate_whatsapp_link(request.customer_phone, message)

    return WhatsAppLinkResponse(whatsapp_link=link, message_preview=message)