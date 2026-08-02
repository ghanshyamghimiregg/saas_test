import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.sales_ledger import EntryType


class SalesLedgerCreate(BaseModel):
    branch_id: uuid.UUID
    customer_id: uuid.UUID | None = None
    entry_type: EntryType
    amount: Decimal
    description: str | None = None
    reference_id: str | None = None


class SalesLedgerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    customer_id: uuid.UUID | None
    entry_type: EntryType
    amount: Decimal
    description: str | None
    reference_id: str | None
    created_by: uuid.UUID | None
    created_at: datetime


class PartyLedgerCreate(BaseModel):
    branch_id: uuid.UUID
    party_id: uuid.UUID
    entry_type: EntryType
    amount: Decimal
    description: str | None = None
    reference_id: str | None = None


class PartyLedgerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    party_id: uuid.UUID
    entry_type: EntryType
    amount: Decimal
    description: str | None
    reference_id: str | None
    created_by: uuid.UUID | None
    created_at: datetime


class StaffLedgerCreate(BaseModel):
    branch_id: uuid.UUID
    staff_id: uuid.UUID
    entry_type: EntryType
    amount: Decimal
    description: str | None = None


class StaffLedgerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    staff_id: uuid.UUID
    entry_type: EntryType
    amount: Decimal
    description: str | None
    created_by: uuid.UUID | None
    created_at: datetime