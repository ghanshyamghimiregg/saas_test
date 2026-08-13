# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, FastAPI backend (PostgreSQL). Three subdomain apps: stock.*, sales.*, admin.*

## Users

- **Branch staff (inventory):** shop floor workers doing stock counts, adding products, printing barcode labels. Desktop/tablet. Time pressure during stock-takes.
- **Branch cashiers (POS):** processing sales transactions in-queue, scanning products, handling cash/online payments. Desktop. High time pressure, mid-queue.
- **Owner / manager (admin):** reviewing revenue, branch performance, adjusting discount rules. Desktop primary, mobile secondary (checking numbers between tasks).

## Product Purpose

OptiStore is a multi-branch eyewear retail management platform. It replaces paper/spreadsheet-based inventory and cash registers with an integrated POS, inventory, and admin system that enforces stock integrity (no oversells), centralises discount and membership rules, and gives the owner a live view across all branches.

## Positioning

The only thing that locks stock atomically at checkout and ties that same stock directly to barcode-label printing on 34×20mm thermal roll labels, while letting a non-technical owner set discount rules and read revenue from a phone.

## Operating Context

- Physical optical shops — bright retail lighting, staff often mid-count or mid-queue
- Hardware barcode scanners attached to POS terminals (rapid keystroke + Enter detection must be preserved)
- 34×20mm Coral Direct Thermal label rolls for product labelling
- Branches log in with code + password (no email) — simple credentials for shop staff
- Admin logs in with email + password on any device

## Capabilities and Constraints

- Three separate app surfaces (stock, sales, admin) served from subdomains
- Shared JWT auth; branch tokens get STAFF-level access, user tokens get ADMIN/MANAGER/STAFF
- All pricing in NPR (Nepalese Rupee)
- Barcode format: Code128
- Invoice formats: A4 PDF and 80mm thermal PDF
- No backend changes unless strictly required by a new read-only field (must be discussed first)
- Bundle must stay lean — POS terminals may run on modest hardware

## Brand Commitments

- Name: **OptiStore**
- Accent color: `#4f46e5` (indigo) — already threaded through barcode/label system and branch identity, kept as the single deliberate accent
- Eyewear domain: design restraint that reads "optical instrument panel," not "startup SaaS dashboard"

## Evidence on Hand

- Full working codebase with all features implemented and tested
- 34×20mm Coral Direct Thermal label roll (product label format confirmed)
- NPR pricing throughout

## Product Principles

1. **Numbers are the loudest thing on screen** — prices, quantities, SKUs, and barcodes get monospace treatment and visual weight; decorative elements get none
2. **Speed under pressure** — cashiers and stock clerks scan interfaces mid-task; every layout decision must pass the "findable in under 2 seconds" test
3. **One accent, used with discipline** — indigo signals actions and active states only; never decoration
4. **State completeness** — every screen ships with empty, loading, error, and disabled states; a dead gray box is never acceptable
5. **Cross-device, not just cross-browser** — admin must genuinely work on a phone; stock and sales must not break on one

## Accessibility & Inclusion

WCAG 2.1 AA minimum: all interactive elements keyboard-navigable, visible focus rings, inputs labelled, modals aria-modal, toasts role=alert. Touch targets ≥ 44px on mobile.
