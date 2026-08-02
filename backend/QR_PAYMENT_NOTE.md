# QR Payment Generation — Current Status

**Status:** Not implemented. `/billing/generate-qr` returns a placeholder
response (`"status": "not_implemented"`) rather than a real QR code.

## Why

Real QR generation requires a merchant account with a payment provider —
either Fonepay or eSewa. This is a team decision, not a technical blocker:

- **Fonepay**: [merchant onboarding — link/contact once decided]
- **eSewa**: [merchant onboarding — link/contact once decided]

Both require business registration documents and a merchant API key/secret
that doesn't exist yet.

## What's needed to unblock this

1. Team decision: Fonepay or eSewa (or both, with a fallback)
2. Merchant account created with the chosen provider
3. API credentials (merchant ID, secret key) added to `.env` — never hardcoded
4. Provider's QR generation API docs reviewed to match their exact request/response format

## What the endpoint will do once unblocked

`POST /billing/generate-qr` already has the correct request/response shape
(`branch_id`, `amount`, `reference_id` in; `qr_payload` out) — once a
provider is chosen, only the internal implementation changes, not the
endpoint contract. Ghanshyam's billing UI can build against this shape today.

## Owner

Ankush — ping when a provider decision is made.