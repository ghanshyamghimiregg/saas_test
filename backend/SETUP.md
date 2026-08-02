# Backend Setup — New Shop

## Prerequisites

- Python 3.11+
- PostgreSQL 17 (or compatible)

## 1. Clone and navigate
 -cd backend

## 2. Create and activate a virtual environment
-python -m venv venv
venv\Scripts\activate        # Windows

## 3. Install dependencies
 -pip install -r requirements.txt

 ## 4. Set up the database

Create a PostgreSQL database named `newshop_db` (via pgAdmin or `psql -U postgres -c "CREATE DATABASE newshop_db;"`).

## 5. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

-cp .env.example .env

Required variables:
- `DATABASE_URL` — PostgreSQL connection string, e.g. `postgresql://postgres:yourpassword@localhost:5432/newshop_db`
- `SECRET_KEY` — long random string, used to sign JWTs
- `ACCESS_TOKEN_EXPIRE_MINUTES` — default 15
- `REFRESH_TOKEN_EXPIRE_DAYS` — default 7
- `CCTV_AUTHORIZED_USER_IDS` — comma-separated list of user UUIDs allowed to access CCTV (leave empty until real users exist)

**Never commit `.env`** — it's already in `.gitignore`.

## 6. Run migrations
alembic upgrade head
This creates all tables (branch, user, audit_log, customer, party, sales_ledger_entry, party_ledger_entry, staff_ledger_entry, expense).

## 7. Run the server
-uvicorn app.main:app --reload --port 8001

(Port 8001 used since 8000 may be occupied by another local project — change if needed.)

## 8. Verify

- `http://127.0.0.1:8001/health` → `{"status": "ok"}`
- `http://127.0.0.1:8001/health/db` → `{"status": "ok", "database": "connected"}`
- `http://127.0.0.1:8001/docs` → interactive API docs, all endpoints listed

## 9. Creating your first admin user + branch

Since there's no seed data yet, register your first user via `POST /auth/register` with `"role": "admin"`, then create a branch via `POST /branches/` (requires admin role), then manually set your user's `branch_id` in the database to that branch's UUID via pgAdmin — no "update user" endpoint exists yet.

## Migrations — important

**Do not run `alembic revision --autogenerate` yourself if you're not Ankush.** Migrations are centrally owned to avoid conflicting Alembic histories across the team (see Developer Guidelines §4). If you need a schema change, describe what you need and Ankush will generate the migration.