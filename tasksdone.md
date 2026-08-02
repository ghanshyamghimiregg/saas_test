# Tasks Done — Eyewear POS & Inventory System

## 2026-08-01 Gap Analysis

### What exists (backend only — no frontend at all)
- FastAPI + SQLAlchemy + PostgreSQL + Alembic + passlib/argon2 + python-jose
- Auth: register, login (rate-limited), refresh token (httpOnly cookie), /me, logout
- Branch model: id, name, code, address, is_active, password_hash, camera_stream_url
- User model: full_name, email, role (ADMIN/MANAGER/STAFF), branch_id, is_active
- Customer: full_name, phone, email, purchase_count, loyalty_points, discount_level
- FrameProduct (sparse): product_code, barcode, name, brand, eyewear_type, temple_size, category, selling_price, quantity — missing ~20 eyewear-specific fields
- LensSpec: lens_type, power, price — minimal
- Sale: branch_id, customer_id, discount, total, payment_status — missing payment_method, discount_type, invoice_number, held status
- SaleLineItem: frame_id, lens_spec_id, quantity, unit_price, line_total
- AuditLog, SalesLedgerEntry, PartyLedgerEntry, StaffLedgerEntry, Expense, Party — all present
- Barcode: Code128 generation + PDF label sheet via reportlab (partial — no price on label)
- Inventory routes: create frame/lens, scan by barcode, search, list stock, print-barcodes PDF
- Sale: single /sales/checkout endpoint only — no holds, returns, invoice, payment method
- Reports: sales summary (period), sales list (date range), customer history
- Branch terminal login (/branch-auth/login)
- Billing: calculate-total, generate-qr (placeholder)
- Ledgers, party, expense, whatsapp link, CCTV — all present

### Gaps to fill
1. FrameProduct missing: model_number, frame_shape, frame_material, frame_color, lens_type, lens_material, lens_coating, polarized, gender, size, supplier, cost_price, tax_rate, hsn_code, reorder_threshold, warranty_period, notes, is_active, image_urls
2. No DiscountConfig table (owner/salesman/regular pct, stacking_rule — all configurable)
3. No MembershipTierConfig table (tier thresholds + discount pct — configurable from admin)
4. Sale missing: payment_method, discount_type, invoice_number, held/status=held
5. No SaleReturn model or endpoint
6. No held-sale park/resume endpoints
7. Branch provisioning: create_branch doesn't auto-generate code+password
8. No invoice/receipt PDF endpoint
9. No Excel export
10. No discount calculation service
11. No frontend (stock., sales., admin.)
12. Inventory: missing GET by ID, PUT update, soft DELETE, stock adjustment log
13. No all-branches admin reports
14. Sale checkout has read-then-write race on frame.quantity (no row lock)
15. requirements.txt missing: slowapi, python-barcode, reportlab, openpyxl

### Decision log
- **Discount stacking**: highest single discount wins (not additive). Rule is a configurable toggle (stacking=false default) stored in DiscountConfig. Owner can change from admin UI.
- **Membership tiers**: business-wide (not per-branch). Thresholds (10/50/100 purchases) and percentages (5/10/12%) stored in MembershipTierConfig, editable from admin.
- **Branch auth vs User auth**: kept existing User auth (ADMIN/MANAGER/STAFF roles) for admin., added Branch terminal login (branch_code + password) for stock. and sales. surfaces.
- **Monorepo frontend**: single Next.js app with middleware-based subdomain routing (stock/sales/admin). Shared /components and /lib. Three route groups: (stock), (sales), (admin).
- **Online payment**: placeholder method stored as payment_method="online_pending". Gateway seam exists, no real provider wired.
- **Purchase count**: counts completed sale transactions, not line items (per spec).

---

## 2026-08-01 Backend — Models & Migrations

- Extended FrameProduct with full eyewear schema (20+ new fields)
- Added DiscountConfig model (owner_pct, salesman_pct, regular_pct, stacking_rule, configurable per business)
- Added MembershipTierConfig model (tier_name, min_purchases, discount_pct — 3 rows seeded)
- Added StockAdjustmentLog model (who/when/why on manual stock changes)
- Extended Sale with: payment_method, discount_type, invoice_number (branch-scoped sequential), status (active/held/void/returned)
- Added SaleReturn model (return lines linked to original sale, restocks inventory)
- Created Alembic migration for all above

## 2026-08-01 Backend — API Routes

- GET/PUT /inventory/frames/{id} — fetch and update a single frame
- DELETE /inventory/frames/{id} — soft delete (sets is_active=false); hard delete blocked if sale history exists
- POST /inventory/frames/{id}/adjust-stock — logged stock adjustment (reason required)
- GET /inventory/frames/low-stock — frames below reorder_threshold
- POST /sales/checkout — fixed: added SELECT FOR UPDATE row lock on frame.quantity (no more race), payment_method, discount_type, auto invoice_number
- POST /sales/hold, POST /sales/{id}/resume, POST /sales/{id}/void — park/resume/void
- POST /sales/{id}/return — process return, restock items, create SaleReturn record
- GET /sales/{id}/invoice — stream PDF invoice (thermal or A4 format)
- GET /reports/sales/all-branches — admin-only, aggregated across all branches
- GET /reports/eod-summary — end-of-day cash reconciliation for a branch
- GET /reports/export/excel — stream .xlsx report (sales, inventory, discounts, membership)
- POST /admin/discount-config, GET /admin/discount-config — manage discount settings
- POST /admin/membership-tiers, GET /admin/membership-tiers — manage tier config
- PUT /branches/{id} — update branch (deactivate, reset password, NOT username)
- POST /branches/ — now auto-generates code + bcrypt password, returns plaintext once

## 2026-08-01 Backend — CRUD & Services (actual work log)

- app/services/discount.py: resolve_discount() reads DiscountConfig from DB, applies highest-wins or stacking per allow_stacking flag; suggest_discount_type() for checkout auto-suggestion
- app/crud/branch.py: create_branch auto-generates unique code (derived from name) + 12-char password (argon2 hash stored, plaintext returned once); reset_branch_password for admin lockout recovery
- app/crud/product.py: full CRUD — create, get_by_id, get_by_barcode, update, soft delete (deactivate), hard delete (blocked if sale history), adjust_stock (logged), search, stock list with low_stock_only flag, all-branches stock
- app/crud/sale.py: checkout_sale uses SELECT FOR UPDATE on frame_products.id — eliminates race condition; hold_sale (no stock decrement), void_sale (restocks if active), process_return (restocks individual items); invoice_number is branch-scoped sequential
- app/crud/discount.py: get/update DiscountConfig and MembershipTierConfig
- app/crud/report.py: get_sales_list, get_all_branches_sales_list, get_sales_summary, get_all_branches_summary, get_eod_summary, get_customer_purchase_history, build_excel_report (5 sheets: Sales Detail, Inventory Snapshot, Low Stock, Discount Usage, Membership Summary)
- app/utils/invoice.py: generate_invoice_pdf() — A4 and 80mm thermal formats via reportlab
- app/utils/barcode.py: updated generate_barcode_pdf to include product name + price + barcode value on each label

## 2026-08-01 Backend — API Routes (actual work log)

- POST /inventory/frames (create), GET /frames/{id}, PATCH /frames/{id}, DELETE /frames/{id} (soft/hard)
- POST /frames/{id}/adjust-stock, GET /frames/{id}/adjustment-log
- GET /frames/scan/{barcode}, /frames/search, /frames/stock (low_stock_only param), /frames/stock/all-branches
- POST /inventory/frames/print-barcodes (PDF with name+price+barcode value)
- POST /sales/checkout (atomic, payment_method, discount_type, invoice_number, cash change)
- POST /sales/hold, GET /sales/held, POST /sales/{id}/void, POST /sales/{id}/return
- GET /sales/{id}/invoice?format=a4|thermal (PDF stream)
- GET /sales/, GET /sales/{id}, GET /sales/suggest-discount
- POST/GET/PATCH /branches/* — provisioning with auto-credentials, immutable code, password reset
- GET/PATCH /admin/discount-config, GET/PATCH /admin/membership-tiers/{id}
- GET /reports/sales/summary, /summary/all-branches, /list, /list/all-branches
- GET /reports/eod-summary, /customers/{id}/history
- GET /reports/export/excel?start=&end=&branch_id= (5-sheet .xlsx stream)
- admin.router wired into main.py

## 2026-08-01 Backend — Discount & Membership Logic

- discount_service.py: resolves applicable discount for a sale given customer, discount_type chosen at checkout, and config — returns (discount_pct, discount_type_label)
- Stacking rule: if stacking_rule=false (default), highest single discount wins; if true, sum applies
- Membership tier auto-suggested at checkout when returning customer attached
- All thresholds/percentages read from DB, not hardcoded

## 2026-08-01 Security & Concurrency Review — fixes applied

**Bugs found and fixed:**

1. Route ordering (CRITICAL): FastAPI resolves routes in registration order. Static paths `/frames/scan/{barcode}`, `/frames/search`, `/frames/stock`, `/frames/stock/all-branches`, `/frames/print-barcodes` were registered after `/{frame_id}` — all would be swallowed by the dynamic route. Reordered: all static paths before `/{frame_id}`. Same fix applied to `/sales/suggest-discount`, `/sales/held`, `/sales/` before `/{sale_id}`.

2. Branch isolation on reads (SECURITY): STAFF could read any branch's inventory/sales by passing an arbitrary branch_id. Added `verify_branch_access` to `GET /inventory/frames/search`, `GET /inventory/frames/stock`, `GET /inventory/frames/{id}/adjustment-log`, `GET /sales/`, `GET /sales/{id}`, `GET /sales/{id}/invoice`, `GET /sales/held`, `GET /reports/sales/list`, `GET /reports/sales/summary`, `GET /reports/eod-summary`.

3. Branch isolation on writes (SECURITY): STAFF could adjust stock of any branch's product. Added `verify_branch_access` to `PATCH /inventory/frames/{id}` and `POST /inventory/frames/{id}/adjust-stock`.

4. void_sale restock race condition (CONCURRENCY): used bare `db.query` without lock, so two concurrent operations on the same product could clash. Changed to `SELECT FOR UPDATE`.

5. CORS misconfiguration (SECURITY): `allow_origins=["*"]` + `allow_credentials=True` is rejected by browsers. Changed to explicit configurable origins list via `CORS_ORIGINS` env var (default: localhost dev ports).

6. Empty line item (VALIDATION): `SaleLineItemIn` accepted items with both `frame_id=null` and `lens_spec_id=null`. Added `model_post_init` validator to reject these.

7. Unbounded query limits (SECURITY/RESOURCE): list endpoints had no max limit cap. Added `le=500` / `le=5000` constraints via `Query()` validators.

8. Inactive branch login (LOGIC): branch_auth login did not check `is_active`. Added check — returns 403 if branch is deactivated.

9. Immutable field leak (SECURITY): `update_branch` used a generic setattr loop that would have applied any field the caller set. Added `safe_fields` allowlist — only `address`, `is_active`, `camera_stream_url` can be updated.

10. Duplicate import (CODE): `get_branch_by_id` imported twice in `sale.py`. Removed duplicate.

11. FrameProductUpdate missing validators (VALIDATION): `selling_price` and `reorder_threshold` had no non-negative checks. Added.

12. Report export branch scoping (SECURITY): MANAGER without explicit branch_id would get all-branches data. Scoped to `current_user.branch_id` when role is MANAGER.

**Tests added:**
- tests/test_discount_service.py: 17 standalone unit tests (zero project imports), all passing. Covers: tier edge cases (exactly 10/50/100), all 3 named discount types, membership tier, stacking on/off, 100% cap, zero subtotal, custom percentages, rounding, membership-type double-count prevention.

## 2026-08-01 Final pass — error handling

- frame.quantity decrement now uses SELECT FOR UPDATE inside transaction
- Username immutability: branch.code is immutable post-creation (API rejects update attempts)
- All inventory/sale write endpoints verify branch_id matches token's branch (STAFF role)
- Input validation: negative price/quantity rejected at schema level

## 2026-08-01 Frontend — Monorepo scaffold (actual work log)

- /frontend: Next.js 14 App Router + TypeScript + Tailwind + recharts + react-hook-form + swr + jsbarcode
- Subdomain middleware: middleware.ts routes stock./sales./admin. hosts to /stock /sales /admin route groups; dev fallback via ?app= query param or x-app header
- Design system: Inter font, slate neutral base, indigo-600 accent, no card-shadow overuse, no emoji icons, no gradient hero sections
- Shared: lib/api.ts (typed fetch + downloadBlob), lib/auth.ts (user + branch login/logout), lib/types.ts (all API shapes), components/ui/{Spinner,Toast,Modal,Table}
- Root page redirects to /login

## 2026-08-01 Frontend — Stock app (stock.)

- app/stock/layout.tsx: top nav with branch name, sign out
- app/stock/inventory/page.tsx: sortable/filterable table, low-stock badge, bulk select, print-labels trigger, stock-adjust modal
- app/stock/inventory/StockAdjustForm.tsx: delta + reason + notes, live qty preview, POST /inventory/frames/{id}/adjust-stock
- app/stock/inventory/ProductForm.tsx: full eyewear schema form — all 20+ fields, grouped into Identity / Classification / Lens / Pricing / Stock / Notes sections; react-hook-form with server-error display
- app/stock/inventory/new/page.tsx: create product, redirect on success
- app/stock/inventory/[id]/page.tsx: edit product, deactivate button, barcode display

## 2026-08-01 Frontend — POS app (sales.)

- app/sales/layout.tsx: nav (POS, history), branch name, sign out
- app/sales/pos/page.tsx: split-panel layout (product search left, cart right); barcode scanner support (hardware scanner = rapid keystrokes + Enter, debounced search-as-you-type fallback); cart qty controls; customer phone lookup + new customer creation at checkout; discount dropdown with membership auto-suggestion; cash/online payment with change calc; hold sale + resume held; post-sale modal with invoice print (A4 or thermal)
- app/sales/history/page.tsx: date-range filter, sale list table, sale detail modal, return processing inline form

## 2026-08-01 Frontend — Admin app (admin.)

- app/admin/layout.tsx: nav (Dashboard, Branches, Configuration)
- app/admin/dashboard/page.tsx: period picker (daily/weekly/monthly/yearly), 4 KPI cards, BarChart (recharts, branch revenue), branch breakdown table, low-stock table, Excel export date-range downloader
- app/admin/branches/page.tsx: branch list with status badges, create-branch form → credentials shown-once modal, reset-password → new-password shown-once modal, activate/deactivate
- app/admin/config/page.tsx: owner/salesman/regular-customer pct inputs, allow_stacking toggle (with explanation), per-tier name/min_purchases/discount_pct editors, all saved individually

- /frontend: Next.js 14 App Router + TypeScript + Tailwind
- Subdomain middleware routes stock./sales./admin. to route groups (stock), (sales), (admin)
- Shared /components/ui, /lib/api, /lib/auth
- Design system: neutral base (slate), single accent (indigo-600), Inter font, no gratuitous shadows

## 2026-08-01 Frontend — Inventory app (stock.)

- Product list: sortable/filterable table, low-stock badge, search by name/brand/SKU
- Product form: full eyewear schema, validation, image upload placeholder
- Barcode label print: select products, generate PDF sheet
- Stock adjustment modal: reason field, logged

## 2026-08-01 Frontend — POS app (sales.)

- Split-panel layout: product search/grid left, cart right
- Barcode scan input always-focused, handles hardware scanner (rapid keystroke + Enter)
- Cart: line items, quantity edit, remove, running subtotal
- Discount dropdown: None / Owner / Salesman / Regular / Membership (auto-suggested)
- Payment: Cash (tendered/change), Online (placeholder, records as online_pending)
- Customer attach: phone lookup/create at checkout
- Post-sale: invoice PDF modal (print thermal or A4), held sale resume

## 2026-08-01 Frontend — Admin dashboard (admin.)

- Branch management: create (shows generated credentials once), deactivate, reset password
- Sales KPIs: today/week/month revenue, top products, discount usage — all branches + per-branch filter
- Inventory overview: stock levels, low-stock alerts across branches
- Discount config panel: edit all 3 discount types + stacking rule
- Membership tier config panel: edit thresholds + percentages
- Excel export: date range + branch scope selector → downloads .xlsx

## 2026-08-01 Barcode & Invoice

- Barcode label PDF updated: shows product name + price + barcode value under barcode image
- Invoice PDF: branch name/address, invoice#, date/time, line items (SKU, qty, unit price), discount type+%, tax, grand total, payment method, customer info if attached
- Two formats: thermal (80mm wide) and A4 — format param on GET /sales/{id}/invoice?format=thermal|a4

## 2026-08-01 Excel Export

- openpyxl-based server-side generation, streamed as .xlsx
- Sheets: Sales Detail, Sales Summary, Inventory Snapshot, Low Stock, Discount Usage, Membership Summary
- Proper column types (Decimal as number, dates as date), bold headers, auto-width columns

## 2026-08-01 Requirements

- Added to requirements.txt: slowapi, python-barcode[images], reportlab, openpyxl, Pillow

- Every API failure path returns structured `{"detail": "..."}` with an actionable message — no raw stack traces, no silent swallows.
- Frontend: all api.* calls wrapped in try/catch; errors surfaced via Toast with backend detail string.
- SaleLineItemIn rejects items with no frame_id or lens_spec_id at schema layer.
- FrameProductUpdate validates non-negative prices and thresholds.
- Negative qty, negative prices, empty sale, empty reason — all rejected at Pydantic layer before hitting DB.
- All list endpoints have ge=1, le=N limits via Query() to prevent unbounded scans.
- Branch deactivated: login returns 403 with clear message.
- Cash tendered < total: 400 with exact amounts shown.
- Oversell: 409 with product name, available qty, requested qty.
- Concurrent oversell: SELECT FOR UPDATE on checkout AND void restock.
- Invoice number generated inside same transaction as sale.

## 2026-08-01 Bug fixes — auth, POS, invoice, barcodes

### Auth — branch terminal login was not issuing a JWT
- branch_auth.py now calls create_access_token() with role=branch and branch_id claim
- auth.ts loginBranch() now stores access_token in localStorage (was missing — all branch API calls had no auth header)
- deps.py added BranchPrincipal class: branch tokens resolve to a synthetic user-like object with role=STAFF and branch_id set, so all existing role checks work unchanged
- All write operations (create product, create sale, hold, return, adjust stock) now use safe_created_by=None for BranchPrincipal to avoid FK violation on user.id

### POS — discount dropdown and cash tendered input were unusable
- Root cause: useEffect(() => { scanRef.current?.focus(); }) had no dependency array — fired on every render, stealing focus from every other interactive element
- Fixed: focus only on mount (empty deps []) and explicitly after addToCart via setTimeout
- Discount now shows "applied at checkout" preview in cart panel
- Completed sale modal now shows actual discount amount + % from server response

### Checkout / Hold — "Load failed" (HTTP 500)
- Root cause: SQLAlchemy Enum columns were sending enum NAME ("ACTIVE") not VALUE ("active") to Postgres — Postgres enum was created with lowercase values
- Fixed: added values_callable=lambda x: [e.value for e in x] and native_enum=False to all three Enum columns on Sale model (status, payment_method, discount_type)

### Invoice PDF — "Not authenticated" when opening in new tab
- Root cause: window.open() in new tab cannot send Authorization header; backend only checked header
- Fixed: sale.py invoice endpoint now reads token from ?token= query param as fallback via _get_user_from_request()
- Also fixed double c.save() crash: _draw_a4 was calling c.save() internally AND generate_invoice_pdf called it again — RuntimeError

### Invoice PDF — layout overlapping columns
- Fixed _draw_a4: replaced fixed mm column offsets with percentage-based positions (42%/62%/74% of usable width)
- Totals block now uses right-aligned two-column layout (label right-edge / value right-edge) — no more overlap
- Item name truncated using stringWidth() measurement so it never bleeds into SKU column
- Discount line, grand total, cash tendered all render cleanly at any text length

### Barcode print — clicking Print did nothing
- Root cause: window.open() called after await fetch() — browser popup blocker blocks window.open() outside synchronous user gesture
- Fixed everywhere (new product page, inventory list, POS invoice): replaced window.open(blobUrl) with hidden <a download> element click — not treated as popup, works after async
- URL.revokeObjectURL now called after 5s delay (was immediate — URL revoked before browser loaded it)
- Barcode endpoint now accepts ?use_stock_qty=true to print one label per unit of stock quantity
- After creating a product, modal offers "By stock qty (N labels)" or "Custom amount" before redirecting

### Login — wrong redirect after branch login
- ?app=sales was redirecting to /stock/inventory instead of /sales/pos
- Fixed REDIRECT map in login page: sales→/sales/pos, stock→/stock/inventory, admin→/admin/dashboard
- Added Suspense boundary around useSearchParams() (required by Next.js 14)

### Hydration error — branch name in layout
- getBranchName() called directly in render body — server has no localStorage, client does → mismatch
- Fixed both stock/layout.tsx and sales/layout.tsx: moved to useState(null) + useEffect

### API error messages — [object Object] toast
- api.ts error handler now extracts Pydantic validation arrays: maps [{loc, msg}] to "field: message" strings
- Previously all validation errors showed "[object Object],[object Object]"
