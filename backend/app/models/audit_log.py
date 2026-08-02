"""
Audit log model — append-only record of user actions for transparency.
Implements: Authentication & Security > Login authority levels + transparency/audit logs
"""
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    action = Column(String, nullable=False)       # e.g. "login", "stock_update", "ledger_view"
    ip_address = Column(String, nullable=True)
    details = Column(String, nullable=True)        # optional free-text context
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Deliberately: no updated_at, no soft-delete flag.
    # This table is append-only — rows are never edited or removed.