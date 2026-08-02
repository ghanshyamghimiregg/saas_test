"""
Party model — wholesale suppliers the business buys from.
Implements: Ledgers & Data > Sales ledger and party ledger
"""
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Party(Base):
    __tablename__ = "party"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())