"""
wa.me deep link generator for WhatsApp order confirmations.
See WHATSAPP_NOTE.md for why this approach was chosen over the full
WhatsApp Business API, and the upgrade path if the business scales up.
Implements: Integrations & Automation > Direct WhatsApp message generation
"""
from urllib.parse import quote


def generate_whatsapp_link(phone_number: str, message: str) -> str:
    """
    Generates a wa.me deep link that opens WhatsApp with a pre-filled message.
    phone_number must include country code, digits only (e.g. '9779800000000').

    NOTE: This is the MVP approach — no Meta Business Verification needed,
    no per-message cost, works immediately. If the business scales up and
    needs fully automated, no-tap sending (order confirmations firing
    without any human opening WhatsApp), that requires the full WhatsApp
    Business API — see the note in README / team docs for what that involves.
    """
    clean_number = "".join(filter(str.isdigit, phone_number))
    encoded_message = quote(message)
    return f"https://wa.me/{clean_number}?text={encoded_message}"


def build_order_confirmation_message(customer_name: str, order_items: list[str], total_amount: str, reference_id: str) -> str:
    items_text = ", ".join(order_items)
    return (
        f"Hi {customer_name}, your order at New Shop is confirmed!\n"
        f"Items: {items_text}\n"
        f"Total: Rs. {total_amount}\n"
        f"Order Ref: {reference_id}\n"
        f"Thank you for shopping with us."
    )