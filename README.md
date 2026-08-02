# OptiStore — Multi-Branch Eyewear POS & Inventory System

A production-grade retail management platform for eyewear businesses operating multiple branches. Covers point-of-sale, inventory, customer membership, reporting, and central admin — all branch-aware.

---

## What's built

### Backend (FastAPI + PostgreSQL)
- **Inventory:** full eyewear product schema (brand, model, frame shape/material/color, lens type/material/coating, polarized, gender, size, HSN code, cost price, tax rate, reorder threshold, warranty, image URLs, soft delete, stock adjustment log)
- **POS / Sales:** atomic checkout with `SELECT FOR UPDATE` on stock (no overselling), held/parked sales, void, returns with restocking, branch-scoped sequential invoice numbers
- **Discounts:** 3 named types (owner, salesman, regular customer) + membership tiers — all percentages and stacking rules stored in DB, editable from admin UI
- **Membership:** business-wide customer purchase tracking, 3 configurable tiers (default: 10/50/100 purchases → 5/10/12%)
- **Branch provisioning:** admin creates a branch, system auto-generates a unique code and 12-char password (shown once, hashed at rest)
- **Invoice PDF:** A4 (percentage-based column layout, no overlap) and 80mm thermal formats via reportlab
- **Barcode labels:** Code128, 3×8 grid per A4 page, name + price + barcode value; print by stock quantity or custom count
- **Excel reports:** 5-sheet `.xlsx` export (Sales Detail, Inventory Snapshot, Low Stock, Discount Usage, Membership Summary)
- **Auth:** branch terminal login issues real JWTs; `BranchPrincipal` class bridges branch tokens to the existing role-check system without a User table row

### Frontend (Next.js 14 + Tailwind)
Three surfaces routed by subdomain. Dev fallback: `?app=stock|sales|admin`.

| Subdomain | App | Key screens |
|---|---|---|
| `stock.` | Inventory | Product list (search/filter/low-stock), full eyewear product form, stock adjustment modal, barcode label print (by qty or custom) |
| `sales.` | POS | Split-panel, hardware barcode scanner support, customer lookup, discount selector, cash/online payment, hold/resume, invoice print (A4 + thermal), sales history + returns |
| `admin.` | Dashboard | KPI cards + revenue chart, branch management (provision, deactivate, password reset), discount config, membership tier editor, Excel export |

### Tests
- 17 standalone unit tests covering all discount/membership tier logic

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 15+ |
| Auth | JWT (access token), argon2 password hashing |
| PDF | reportlab |
| Excel | openpyxl |
| Barcode | python-barcode (Code128) |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, recharts, react-hook-form |

---

## Local setup

> **All dependencies listed in one place:** see `requirements.txt` at the project root for the full annotated list of both Python and Node packages with version pins.

### Prerequisites
- Python 3.11+ (Anaconda works)
- PostgreSQL 15+ running locally
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit DATABASE_URL and SECRET_KEY
alembic upgrade head           # creates all 19 tables, seeds discount config + membership tiers
uvicorn app.main:app --reload --port 8001
```

API docs: `http://localhost:8001/docs`

### Create first admin + branch (one-time)

```bash
# 1. Register admin user
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Admin","email":"admin@test.com","password":"Admin@1234!","role":"admin"}'

# 2. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin@1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 3. Create a branch (response contains branch code + password — save them)
curl -X POST http://localhost:8001/branches/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Main Branch","address":"Kathmandu"}'
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev    # http://localhost:3000
```

Dev URLs:

| Surface | URL |
|---|---|
| Inventory | `http://localhost:3000/login?app=stock` |
| POS | `http://localhost:3000/login?app=sales` |
| Admin | `http://localhost:3000/login?app=admin` |

### Environment variables (backend `.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user@localhost:5432/newshop_pos` |
| `SECRET_KEY` | Random 32+ char string for JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: 15 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: 7 |
| `CORS_ORIGINS` | Comma-separated allowed origins (no wildcards in production) |

---

## Project structure

```
SaaS_Project/
├── backend/
│   ├── app/
│   │   ├── api/           # route handlers (auth, inventory, sale, branch, admin, report)
│   │   ├── core/          # config, database, deps (auth), security, limiter
│   │   ├── crud/          # DB operations
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # discount resolution logic
│   │   └── utils/         # barcode PDF, invoice PDF generation
│   ├── alembic/versions/  # 11 migration files
│   └── tests/             # 17 discount unit tests
├── frontend/
│   ├── app/
│   │   ├── stock/         # inventory app
│   │   ├── sales/         # POS app
│   │   ├── admin/         # admin dashboard
│   │   └── login/         # shared login (branch + admin modes)
│   ├── components/ui/     # Table, Modal, Toast, Spinner
│   └── lib/               # api client, auth helpers, shared types
├── tasksdone.md            # running work log with all decisions and bug fixes
└── ankush_production_tasks.md  # infra/hosting checklist for production deploy
```

---

## Production

See `ankush_production_tasks.md` for the full cloud hosting, DB, DNS, and security checklist.

Key items before going live:
- Provision a managed PostgreSQL instance and run `alembic upgrade head`
- Deploy backend (Railway/Render/Fly.io) with production env vars
- Deploy frontend to Vercel with custom domain + 3 subdomain CNAMEs
- Set `CORS_ORIGINS` to actual production domains
- Set `secure=True` on auth cookies (already conditional on `ENVIRONMENT=production`)
- Rotate `SECRET_KEY`

---

## License

To be determined.
