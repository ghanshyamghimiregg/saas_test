"""
Party ledger — append-only double-entry record of supplier transactions.
Implements: Ledgers & Data > Sales ledger and party ledger
"""

import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.sales_ledger import EntryType


class PartyLedgerEntry(Base):
    __tablename__ = "party_ledger_entry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False)
    party_id = Column(UUID(as_uuid=True), ForeignKey("party.id"), nullable=False)
    entry_type = Column(Enum(EntryType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    reference_id = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())