# OptiStore — Project Brief

**Multi-Branch Eyewear POS & Inventory Management System**

A production-grade retail platform built for eyewear businesses that operate multiple physical branches. Covers point-of-sale, inventory, customer membership, discount management, reporting, and central administration — all branch-aware and role-protected.

---

## Table of Contents

1. [What the App Is](#1-what-the-app-is)
2. [The Three Apps (Surfaces)](#2-the-three-apps-surfaces)
3. [Menus & Navigation](#3-menus--navigation)
4. [Feature Inventory](#4-feature-inventory)
5. [Visual Layout & UI Design](#5-visual-layout--ui-design)
6. [User Roles & Auth](#6-user-roles--auth)
7. [Data Model](#7-data-model)
8. [Backend API Surface](#8-backend-api-surface)
9. [Tech Stack](#9-tech-stack)
10. [Project Structure](#10-project-structure)
11. [URLs — Dev & Production](#11-urls--dev--production)

---

## 1. What the App Is

OptiStore is a **SaaS-style multi-branch retail management system** tailored for eyewear shops. The business operates one or more physical branches. Each branch has its own staff terminal (stock management + POS), and a central admin controls everything from a separate dashboard.

**Core problems it solves:**
- Branches can't oversell stock — inventory is locked atomically at checkout
- Discount rules (owner, salesman, loyalty tiers) are business-wide and controlled centrally
- Every sale generates a printable invoice (A4 or 80mm thermal)
- Every sold product can have barcode labels printed directly on 34×20mm thermal roll labels
- Management sees revenue, sales count, and low-stock alerts across all branches in real time
- Branches log in with a code + password (no email) — simple for shop staff

---

## 2. The Three Apps (Surfaces)

The frontend is a single Next.js codebase split into three distinct apps, each served from its own subdomain:

| App | Subdomain | Who uses it | Entry route |
|---|---|---|---|
| **Stock** | `stock.yourdomain.com` | Branch staff (inventory) | `/stock/inventory` |
| **Sales / POS** | `sales.yourdomain.com` | Branch staff (cashier) | `/sales/pos` |
| **Admin** | `admin.yourdomain.com` | Owner / manager | `/admin/dashboard` |

> **Dev fallback:** All three apps run on `localhost:3000` using the `?app=stock`, `?app=sales`, or `?app=admin` query param.

Each app has its own persistent header/nav bar and its own login flow. Branch logins (stock + sales) use a branch **code + password**. Admin login uses **email + password**.

---

## 3. Menus & Navigation

### Stock App — top nav

```
[ Stock (logo) ]  |  Inventory  |  Add product  |  [Branch name]  [Sign out]
```

| Nav item | Route | Description |
|---|---|---|
| Inventory | `/stock/inventory` | Product list with search, filters, stock adjust, label print |
| Add product | `/stock/inventory/new` | Full eyewear product creation form |

Additional in-page buttons:
- **Go to POS** — jumps to `/sales/pos`
- **Print labels** — prints selected product barcodes as 34×20mm thermal PDF

---

### Sales App — top nav

```
[ POS (logo) ]  |  Point of sale  |  Sales history  |  [Branch name]  [Sign out]
```

| Nav item | Route | Description |
|---|---|---|
| Point of sale | `/sales/pos` | Live checkout terminal |
| Sales history | `/sales/history` | Past sales list with invoice + return actions |

Additional in-page buttons:
- **Go to Inventory** (on POS page) — jumps to `/stock/inventory`
- **Go to POS** (on History page) — jumps to `/sales/pos`
- **Print labels** (on sale detail modal) — prints 34×20mm thermal barcode labels for sold frames

---

### Admin App — top nav

```
[ Admin (logo) ]  |  Dashboard  |  Branches  |  Configuration  |  [Sign out]
```

| Nav item | Route | Description |
|---|---|---|
| Dashboard | `/admin/dashboard` | KPI cards, revenue chart, branch breakdown, low-stock table |
| Branches | `/admin/branches` | Branch list, provision new branch, reset password, activate/deactivate |
| Configuration | `/admin/config` | Discount percentages, stacking rules, membership tier thresholds |

---

## 4. Feature Inventory

### Inventory (Stock App)

| Feature | Detail |
|---|---|
| Product list | Search by name/brand/barcode/SKU, filter by low stock only, paginated table |
| Low stock badge | Red badge when `quantity ≤ reorder_threshold` |
| Checkbox multi-select | Select multiple products to bulk-print labels |
| Print barcode labels | Generates 34×20mm thermal PDF — one label per PDF page; label shows name (top), barcode image (centre), barcode value + price (bottom) |
| Stock adjustment | Modal per product: enter delta (±), reason (physical count / damage / theft / correction), recorded in audit log |
| Edit product | Full form pre-populated — all fields editable |
| Add product | Full eyewear product form (see fields below); after save, barcode print modal pops up automatically |
| Go to POS button | Direct navigation shortcut to sales terminal |

**Product fields (all optional except name + selling price + branch):**
product code, barcode (auto-generated), SKU, name, brand, model number, category (sunglasses / optical frame / contact lens / reading glasses / lens only / accessories), frame shape, frame material, frame color, gender, lens type, lens material, lens coating, polarized flag, size (e.g. 52-18-140), cost price, selling price, tax rate, HSN code, supplier, initial stock quantity, reorder threshold, warranty period, notes, image URLs

---

### Point of Sale (Sales App)

| Feature | Detail |
|---|---|
| Barcode scanner | Hardware scanner support — rapid keystrokes ending in Enter auto-trigger product lookup |
| Product search | Text search by name / brand / SKU as fallback |
| Cart | Add, change quantity, remove line items |
| Customer lookup | Search by phone — auto-fills name and reveals membership tier discount |
| Discount selector | None / Owner / Salesman / Regular customer / Membership tier — percentage pulled from live config |
| Cash payment | Enter amount tendered → change due calculated live |
| Online / pending payment | Records sale as `online_pending` for reconciliation |
| Hold & resume | Park a sale mid-transaction, resume from a held-sales list |
| Checkout | Atomic stock deduction with `SELECT FOR UPDATE` — no oversells |
| Invoice print | A4 or 80mm thermal PDF via browser download/new-tab |
| Sales history shortcut | "Go to Inventory" button in scan bar area |

---

### Sales History (Sales App)

| Feature | Detail |
|---|---|
| Date range filter | Pick start/end dates, hit Load |
| Sales table | Invoice #, date/time, total, discount info, payment method, status badge |
| Sale detail modal | Opens on row click — shows line items with qty + unit price + total |
| Invoice print | A4 and thermal from the detail modal |
| Barcode label print | Per-sale label printing — editable copies per line item, prints 34×20mm thermal PDF |
| Return processing | Select line items + quantities to return, requires reason; inventory auto-restocked |
| Status badges | Active (green) / Held (yellow) / Void (gray) / Returned (blue) |

---

### Admin Dashboard

| Feature | Detail |
|---|---|
| Period selector | Daily / Weekly / Monthly / Yearly toggle |
| KPI cards | Total revenue, total sales count, active branches, low stock alert count |
| Revenue chart | Bar chart — Revenue vs Discounts per branch (recharts) |
| Branch breakdown table | Branch ID, sales count, revenue, discounts for selected period |
| Low stock alerts table | Product name, branch, current qty, reorder threshold |
| Excel export | Date-range picker → 5-sheet `.xlsx` (Sales Detail, Inventory Snapshot, Low Stock, Discount Usage, Membership Summary) |

---

### Branch Management (Admin App)

| Feature | Detail |
|---|---|
| Branch list | Name, code, address, active status |
| Provision new branch | Admin fills name + address → system generates unique code + 12-char password shown once |
| Credentials modal | One-time display of code + plaintext password with copy-friendly formatting |
| Reset password | Generates new password, shows once in a modal |
| Activate / Deactivate | Toggle branch active status |

---

### Configuration (Admin App)

| Feature | Detail |
|---|---|
| Discount percentages | Owner %, Salesman %, Regular customer % — editable inputs with save button |
| Stacking rule | Toggle: "highest wins" (default) vs "sum all applicable discounts" |
| Membership tiers | 3 configurable tiers — name, min purchases threshold, discount % — each saved individually |
| Last-updated audit | Shows timestamp + who last changed discount config |

**Default membership tiers:**

| Tier | Min purchases | Discount |
|---|---|---|
| Tier 1 | 10 | 5% |
| Tier 2 | 50 | 10% |
| Tier 3 | 100 | 12% |

---

### Barcode Label Printing (detail)

Two contexts produce barcode labels, both using the same backend endpoint:

**From Inventory page:**
- Select one or more products via checkboxes
- Click "Print labels" → sends selected `frame_id`s to the API
- One label per unit (or custom count)
- Labels are 34×20mm — opens as PDF download

**From Sale detail modal (Sales History):**
- "Labels" column in the line items table — shows a copy-count input per frame (pre-filled with qty sold)
- "Print labels" button at the bottom of the modal
- Sends expanded `frame_id` list (repeated by copy count) to the API
- Same 34×20mm label format

**Label content (34×20mm):**
```
┌──────────────────────────────┐
│    Product name (bold)       │  ← 5pt bold, centred
│  ▐▌▐▌▐▌ barcode ▌▐▌▌▐▐▌▐   │  ← Code128 image, 9mm tall
│  BC-XXXXXX        NPR 1200   │  ← code left, price right
└──────────────────────────────┘
```

---

## 5. Visual Layout & UI Design

### Design language

- **Color palette:** White surfaces (`bg-white`), light slate backgrounds (`bg-surface` / `bg-slate-50`), indigo/violet accent (`text-accent` / `bg-accent` = approx `#4f46e5`), light accent tint (`bg-accent-light` = `#e0e7ff`)
- **Typography:** System sans-serif, `text-slate-900` for headings, `text-slate-400`/`text-slate-500` for secondary labels
- **Borders:** Consistent `border-border` (light gray) throughout — cards, inputs, table rows, dividers
- **Spacing:** 6-unit padding blocks (`p-6`), 4-unit gaps between cards, compact `btn-sm` in toolbars
- **Shadows:** None — flat card style with borders only
- **Radius:** `rounded-lg` on cards and modals, `rounded-md` on buttons and nav pills

### Layout patterns

**App shell (all three apps):**
```
┌────────────────────────────────────────────────────┐
│  Logo  │  Nav link  │  Nav link  │  [Name] Sign out │  ← 56px fixed header
├────────────────────────────────────────────────────┤
│                                                    │
│   Page content (max-w-7xl centred, p-6)            │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Active nav item:** indigo pill background (`bg-accent-light text-accent`)
**Inactive nav item:** slate text, slate hover background

---

**Page header row (standard pattern):**
```
h1 title                    [Secondary btn]  [Primary btn]
```

**POS page (split panel):**
```
┌──────────────────────────────┬─────────────────────┐
│  Scan / search bar           │                     │
│  ─── "Go to Inventory" ───   │   Cart              │
│                              │   Customer          │
│  Search results list         │   Discount          │
│  (click to add to cart)      │   Payment           │
│                              │   Checkout          │
└──────────────────────────────┴─────────────────────┘
```

---

### UI Components

| Component | Used for |
|---|---|
| `<Table>` | All list views — branches, products, sales — with optional row click |
| `<Modal>` | Sale detail, return form, branch credentials, stock adjust, barcode print — sizes: sm / md / lg |
| `<Toast>` | Success / error / info notifications — auto-dismiss, top-right |
| `<Spinner>` | All async loading states — inline or full-page centred |

### CSS utility classes (custom, defined in globals)

| Class | Purpose |
|---|---|
| `.card` | White bg, border, rounded-lg, p-5 |
| `.btn-primary` | Indigo filled button |
| `.btn-secondary` | White bordered button |
| `.btn-danger` | Red text bordered button |
| `.btn-sm` | Compact button height/padding |
| `.input` | Standard form input |
| `.label` | Form field label |
| `.badge-green/red/yellow/gray/blue` | Status pills |

---

## 6. User Roles & Auth

### Role hierarchy

| Role | Scope | Access |
|---|---|---|
| `admin` | Global | All endpoints, branch management, config, reports |
| `manager` | Global | Read/write inventory and sales, reports; no branch provisioning |
| `staff` | Own branch only | Own branch inventory + sales only |
| `branch` (terminal) | Own branch only | Synthetic role — branch JWT maps to STAFF-level access |

### Login flows

**Admin / Manager / Staff:**
- Login via email + password at `admin.yourdomain.com/login`
- Issues JWT with `role=admin|manager|staff` and user ID as subject

**Branch terminal (Stock + POS apps):**
- Login via `branch_code` + `password` at `stock.` or `sales.` subdomain
- Issues JWT with `role=branch` and branch ID as subject
- Frontend stores `branch_id` and `branch_name` in localStorage separately
- No User row required — backend creates a `BranchPrincipal` object on the fly

### Session storage (localStorage)

| Key | Value |
|---|---|
| `access_token` | JWT — sent as `Authorization: Bearer` on every API call |
| `auth_type` | `"user"` or `"branch"` |
| `branch_id` | UUID of the authenticated branch (branch logins only) |
| `branch_name` | Display name shown in the header |

### Branch isolation

Branch-scoped endpoints verify that the requesting branch/staff can only read and write their own branch's data. Admin and Manager can access any branch.

---

## 7. Data Model

### Tables (19 total)

| Table | Purpose |
|---|---|
| `user` | Admin/manager/staff accounts with RBAC role |
| `branch` | Physical shop locations — code, name, address, password hash, camera URL |
| `frame_products` | Full eyewear product catalogue — all specs, pricing, stock qty |
| `lens_specs` | Lens type + power + price entries per branch |
| `stock_adjustment_log` | Audit log of every manual stock change |
| `sale` | Sale header — totals, discount, payment, status |
| `sale_line_item` | Individual products within a sale (snapshot of name/price at time of sale) |
| `sale_return` | Return header — refund amount, reason |
| `sale_return_item` | Individual returned line items |
| `customer` | Customer profile — name, phone, email, purchase count, loyalty points |
| `discount_config` | Singleton row — business-wide discount percentages and stacking rule |
| `membership_tier_config` | 3 configurable loyalty tiers |
| `party` | Suppliers / creditors for ledger entries |
| `party_ledger` | Double-entry ledger for party (supplier) transactions |
| `sales_ledger` | Financial ledger entries for sales |
| `staff_ledger` | Staff advance / deduction tracking |
| `expense` | Branch-level expense entries |
| `audit_log` | System-wide action audit trail |
| `billing` | (Billing/subscription module — seam for future SaaS billing) |

### Key relationships

```
Branch ──< FrameProduct
Branch ──< Sale ──< SaleLineItem ──> FrameProduct
Branch ──< Sale ──< SaleReturn ──< SaleReturnItem
Customer ──< Sale
DiscountConfig (singleton)
MembershipTierConfig (3 rows)
```

---

## 8. Backend API Surface

Base URL: `http://localhost:8001` (dev)

### Auth — `/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create admin/staff user |
| POST | `/auth/login` | Email + password → JWT |

### Branch auth — `/branch-auth`
| Method | Path | Description |
|---|---|---|
| POST | `/branch-auth/login` | Branch code + password → JWT + branch session |

### Branches — `/branches`
| Method | Path | Description |
|---|---|---|
| GET | `/branches/` | List all branches |
| POST | `/branches/` | Provision new branch (admin only) |
| PATCH | `/branches/{id}` | Update branch (name, address, active status) |
| POST | `/branches/{id}/reset-password` | Generate + return new plaintext password |

### Inventory — `/inventory`
| Method | Path | Description |
|---|---|---|
| POST | `/inventory/frames` | Create frame product |
| POST | `/inventory/frames/print-barcodes` | Generate barcode label PDF (`label_size=a4\|34x20`) |
| GET | `/inventory/frames/scan/{barcode}` | Look up frame by barcode |
| GET | `/inventory/frames/search` | Text search — name, brand, SKU, barcode |
| GET | `/inventory/frames/stock` | Branch stock list (with low-stock filter) |
| GET | `/inventory/frames/stock/all-branches` | All-branch stock (admin only) |
| GET | `/inventory/frames/{id}` | Get single frame |
| PATCH | `/inventory/frames/{id}` | Edit frame |
| DELETE | `/inventory/frames/{id}` | Soft/hard delete |
| POST | `/inventory/frames/{id}/adjust-stock` | Manual stock adjustment |
| GET | `/inventory/frames/{id}/adjustment-log` | Stock adjustment history |
| POST | `/inventory/lenses` | Create lens spec |

### Sales — `/sales`
| Method | Path | Description |
|---|---|---|
| POST | `/sales/checkout` | Atomic checkout — deducts stock, creates invoice |
| POST | `/sales/hold` | Park a sale mid-transaction |
| GET | `/sales/held` | List held sales for a branch |
| POST | `/sales/resume/{sale_id}` | Resume a held sale |
| POST | `/sales/void/{sale_id}` | Void a sale |
| POST | `/sales/{sale_id}/return` | Process return + restock |
| GET | `/sales/{sale_id}/invoice` | Serve invoice PDF (A4 or thermal, token auth) |

### Customers — `/customers`
| Method | Path | Description |
|---|---|---|
| GET | `/customers/` | List customers |
| POST | `/customers/` | Create customer |
| GET | `/customers/phone/{phone}` | Look up customer by phone |
| PATCH | `/customers/{id}` | Update customer |

### Reports — `/reports`
| Method | Path | Description |
|---|---|---|
| GET | `/reports/sales/summary/all-branches` | KPI summary for all branches by period |
| GET | `/reports/sales/list` | Paginated sale list with filters |
| GET | `/reports/inventory/low-stock` | Low stock items |
| GET | `/reports/export/excel` | 5-sheet Excel export |

### Admin — `/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/discount-config` | Get current discount config |
| PATCH | `/admin/discount-config` | Update discount percentages / stacking rule |
| GET | `/admin/membership-tiers` | List membership tiers |
| PATCH | `/admin/membership-tiers/{id}` | Update a membership tier |

### Other registered routers
- `/party` — supplier / creditor management
- `/ledger` — party, sales, staff ledger entries
- `/expense` — branch expense tracking
- `/billing` — SaaS billing seam
- `/whatsapp` — WhatsApp notification seam
- `/cctv` — camera stream URL management

---

## 9. Tech Stack

### Backend

| Layer | Choice |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI |
| ORM | SQLAlchemy 2 |
| Migrations | Alembic (11 migration files, 19 tables) |
| Database | PostgreSQL 15+ |
| Auth | JWT (python-jose), Argon2 password hashing (passlib) |
| PDF generation | reportlab |
| Excel export | openpyxl |
| Barcode | python-barcode (Code128 + ImageWriter) |
| Rate limiting | slowapi |

### Frontend

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | recharts |
| HTTP client | Custom `api` wrapper (fetch-based, auto Bearer token) |
| Routing | File-system routing + Next.js middleware for subdomain rewrites |
| State | React `useState` / `useEffect` (no Redux/Zustand) |
| Forms | Controlled inputs (no react-hook-form dependency in most pages) |

### Infrastructure (production target)

| Concern | Plan |
|---|---|
| Backend hosting | Railway / Render / Fly.io |
| Frontend hosting | Vercel |
| Database | Managed PostgreSQL (Supabase / Railway) |
| Subdomains | 3 CNAMEs: `stock.`, `sales.`, `admin.` |
| Auth cookies | `secure=True` when `ENVIRONMENT=production` |

---

## 10. Project Structure

```
saas_test/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   │   ├── auth.py
│   │   │   ├── branch_auth.py
│   │   │   ├── branch.py
│   │   │   ├── admin.py
│   │   │   ├── inventory.py
│   │   │   ├── sale.py
│   │   │   ├── customer.py
│   │   │   ├── report.py
│   │   │   ├── party.py
│   │   │   ├── ledger.py
│   │   │   ├── expense.py
│   │   │   ├── billing.py
│   │   │   ├── whatsapp.py
│   │   │   └── cctv.py
│   │   ├── core/
│   │   │   ├── config.py     # Env vars, settings
│   │   │   ├── database.py   # SQLAlchemy engine + session
│   │   │   ├── deps.py       # Auth deps, BranchPrincipal, RBAC
│   │   │   ├── security.py   # JWT encode/decode, password hash
│   │   │   └── limiter.py    # slowapi rate limiter
│   │   ├── crud/             # DB operations (one file per domain)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── utils/
│   │   │   ├── barcode.py    # Code128 + 34×20mm / A4 PDF generator
│   │   │   └── invoice.py    # A4 + 80mm thermal invoice PDF
│   │   └── main.py           # FastAPI app, CORS, router registration
│   ├── alembic/
│   │   └── versions/         # 11 migration files
│   ├── tests/                # 17 discount/membership unit tests
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── login/            # Shared login page (branch + admin modes)
    │   ├── stock/            # Inventory app
    │   │   ├── layout.tsx    # Stock shell + nav
    │   │   └── inventory/
    │   │       ├── page.tsx          # Product list + print labels
    │   │       ├── new/page.tsx      # Add product form
    │   │       ├── [id]/page.tsx     # Edit product form
    │   │       ├── ProductForm.tsx   # Shared product form component
    │   │       └── StockAdjustForm.tsx
    │   ├── sales/            # POS + history app
    │   │   ├── layout.tsx    # Sales shell + nav
    │   │   ├── pos/page.tsx          # Live checkout terminal
    │   │   └── history/page.tsx      # Sales history + label printing
    │   └── admin/            # Admin dashboard app
    │       ├── layout.tsx    # Admin shell + nav
    │       ├── dashboard/page.tsx    # KPIs, chart, branch table
    │       ├── branches/page.tsx     # Branch management
    │       └── config/page.tsx       # Discount + membership config
    ├── components/ui/
    │   ├── Table.tsx
    │   ├── Modal.tsx
    │   ├── Toast.tsx
    │   └── Spinner.tsx
    ├── lib/
    │   ├── api.ts            # Fetch wrapper with auto auth header
    │   ├── auth.ts           # Login, logout, localStorage helpers
    │   └── types.ts          # TypeScript interfaces mirroring backend schemas
    └── middleware.ts         # Subdomain → route group rewriting
```

---

## 11. URLs — Dev & Production

### Development (all on `localhost:3000`)

| Surface | URL |
|---|---|
| Inventory (Stock) | `http://localhost:3000/login?app=stock` → `/stock/inventory` |
| POS (Sales) | `http://localhost:3000/login?app=sales` → `/sales/pos` |
| Admin | `http://localhost:3000/login?app=admin` → `/admin/dashboard` |
| Backend API | `http://localhost:8001` |
| API Docs (Swagger) | `http://localhost:8001/docs` |
| Health check | `http://localhost:8001/health` |

### Production (example domain: `optishop.com`)

| Surface | URL |
|---|---|
| Inventory (Stock) | `https://stock.optishop.com` |
| POS (Sales) | `https://sales.optishop.com` |
| Admin | `https://admin.optishop.com` |

---

*Last updated: August 2026*
