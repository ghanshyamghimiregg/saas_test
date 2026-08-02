"""
Staff ledger — append-only record of staff-related money movements
(salary, bonus, advance). Feeds Ghanshyam's staff bonus/commission feature.
Implements: Ledgers & Data > Staff ledger
"""
import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.sales_ledger import EntryType


class StaffLedgerEntry(Base):
    __tablename__ = "staff_ledger_entry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    entry_type = Column(Enum(EntryType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())