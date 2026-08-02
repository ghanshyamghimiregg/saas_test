from pydantic import BaseModel


class WhatsAppOrderRequest(BaseModel):
    customer_name: str
    customer_phone: str
    order_items: list[str]
    total_amount: str
    reference_id: str


class WhatsAppLinkResponse(BaseModel):
    whatsapp_link: str
    message_preview: str