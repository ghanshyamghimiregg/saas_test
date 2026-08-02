# WhatsApp Integration — Current Approach & Future Upgrade Path

**Current implementation (live now):** wa.me deep links.
When an order is placed, the backend generates a link like:
`https://wa.me/9779800000000?text=Order+confirmed...`

Opening this link launches WhatsApp with the message pre-filled — staff
or the customer taps Send. No external approval, no per-message cost,
works immediately.

**Limitation:** requires a human to tap "Send" — it is not fully automated.
The system cannot silently fire a message with zero human interaction.

**If the business scales up and wants full automation** (e.g. system sends
confirmations automatically with no tap needed, at high volume), that
requires the official WhatsApp Business API. This involves:
- Meta Business Verification (legal business documents, 2-14+ days)
- A dedicated phone number, not usable on personal WhatsApp
- Message templates pre-approved by Meta
- Per-message cost (since July 2025 pricing)

This is a deliberate scope decision — not a missing feature. Revisit only
if order volume or automation needs grow enough to justify the setup and
ongoing cost.