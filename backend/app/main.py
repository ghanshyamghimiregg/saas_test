from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.core.database import engine
from app.core.limiter import limiter
from app.api import (
    auth, cctv, branch, customer, party,
    ledger, expense, billing, whatsapp,
    inventory, sale, branch_auth, report, admin,
)

app = FastAPI(
    title="Eyewear POS & Inventory — Backend",
    description="Multi-branch eyewear POS system: inventory, sales, admin.",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

import os

# Allowed origins: explicit list in prod, permissive in dev
_ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://stock.localhost:3000,http://sales.localhost:3000,http://admin.localhost:3000",
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(branch_auth.router)
app.include_router(branch.router)
app.include_router(admin.router)
app.include_router(inventory.router)
app.include_router(sale.router)
app.include_router(customer.router)
app.include_router(report.router)
app.include_router(party.router)
app.include_router(ledger.router)
app.include_router(expense.router)
app.include_router(billing.router)
app.include_router(whatsapp.router)
app.include_router(cctv.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "eyewear-pos-backend"}


@app.get("/health/db")
def health_check_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "not connected", "detail": str(e)}
