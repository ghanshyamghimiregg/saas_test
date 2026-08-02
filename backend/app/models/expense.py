"""
Expense model — full CRUD (not append-only) for operational costs.
Implements: Ledgers & Data > Expense data management
"""
import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Expense(Base):
    __tablename__ = "expense"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)