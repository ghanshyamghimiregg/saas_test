import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.sales_ledger import SalesLedgerEntry
from app.models.party_ledger import PartyLedgerEntry
from app.models.staff_ledger import StaffLedgerEntry
from app.schemas.ledger import SalesLedgerCreate, PartyLedgerCreate, StaffLedgerCreate


def create_sales_entry(db: Session, entry_in: SalesLedgerCreate, created_by: uuid.UUID, commit: bool = True) -> SalesLedgerEntry:
    """
    commit=True (default): used when this endpoint is called directly — commits immediately.
    commit=False: used when called from inside another transaction (e.g. Bishan's
    create_sale()) — caller is responsible for committing, so both writes succeed
    or fail together atomically.
    """
    entry = SalesLedgerEntry(**entry_in.model_dump(), created_by=created_by)
    db.add(entry)
    if commit:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="Invalid branch_id or customer_id — referenced record does not exist")
        db.refresh(entry)
    else:
        db.flush()  # writes to the transaction without committing — lets the FK/PK resolve so refresh works later
    return entry


def get_sales_entries(db: Session, customer_id: uuid.UUID | None = None, branch_id: uuid.UUID | None = None):
    query = db.query(SalesLedgerEntry)
    if customer_id:
        query = query.filter(SalesLedgerEntry.customer_id == customer_id)
    if branch_id:
        query = query.filter(SalesLedgerEntry.branch_id == branch_id)
    return query.order_by(SalesLedgerEntry.created_at.desc()).all()


def create_party_entry(db: Session, entry_in: PartyLedgerCreate, created_by: uuid.UUID) -> PartyLedgerEntry:
    entry = PartyLedgerEntry(**entry_in.model_dump(), created_by=created_by)
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid branch_id or party_id — referenced record does not exist")
    db.refresh(entry)
    return entry


def get_party_entries(db: Session, party_id: uuid.UUID | None = None):
    query = db.query(PartyLedgerEntry)
    if party_id:
        query = query.filter(PartyLedgerEntry.party_id == party_id)
    return query.order_by(PartyLedgerEntry.created_at.desc()).all()


def create_staff_entry(db: Session, entry_in: StaffLedgerCreate, created_by: uuid.UUID) -> StaffLedgerEntry:
    entry = StaffLedgerEntry(**entry_in.model_dump(), created_by=created_by)
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid branch_id or staff_id — referenced record does not exist")
    db.refresh(entry)
    return entry


def get_staff_entries(db: Session, staff_id: uuid.UUID | None = None):
    query = db.query(StaffLedgerEntry)
    if staff_id:
        query = query.filter(StaffLedgerEntry.staff_id == staff_id)
    return query.order_by(StaffLedgerEntry.created_at.desc()).all()