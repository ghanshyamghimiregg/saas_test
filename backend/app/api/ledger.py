# NOTE: "Previous rate lookup by individual customer" needs an item-level table
# (e.g. sale_line_item with customer_id, product_id, rate, created_at) that doesn't
# exist yet — sales_ledger_entry is a financial summary, not a line-item table.
# This depends on Bishan's PRODUCT table (uuid PK) for product_id FK.
# Building the real endpoint once that's confirmed with Bishan.
"""
Sales, party, and staff ledger endpoints. Sales ledger open to any logged-in
user (routine checkout activity); party/staff ledgers restricted to Admin/Manager.
Implements: Ledgers & Data > Sales ledger, party ledger, staff ledger
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.ledger import (
    SalesLedgerCreate, SalesLedgerOut,
    PartyLedgerCreate, PartyLedgerOut,
    StaffLedgerCreate, StaffLedgerOut,
)
from app.crud.ledger import (
    create_sales_entry, get_sales_entries,
    create_party_entry, get_party_entries,
    create_staff_entry, get_staff_entries,
)

router = APIRouter(prefix="/ledgers", tags=["Ledgers"])


@router.post("/sales", response_model=SalesLedgerOut, status_code=201)
def add_sales_entry(
    entry_in: SalesLedgerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_sales_entry(db, entry_in, created_by=current_user.id)


@router.get("/sales", response_model=list[SalesLedgerOut])
def list_sales_entries(
    customer_id: uuid.UUID | None = None,
    branch_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_sales_entries(db, customer_id, branch_id)


@router.post("/party", response_model=PartyLedgerOut, status_code=201)
def add_party_entry(
    entry_in: PartyLedgerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return create_party_entry(db, entry_in, created_by=current_user.id)


@router.get("/party", response_model=list[PartyLedgerOut])
def list_party_entries(
    party_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return get_party_entries(db, party_id)


@router.post("/staff", response_model=StaffLedgerOut, status_code=201)
def add_staff_entry(
    entry_in: StaffLedgerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return create_staff_entry(db, entry_in, created_by=current_user.id)


@router.get("/staff", response_model=list[StaffLedgerOut])
def list_staff_entries(
    staff_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return get_staff_entries(db, staff_id)