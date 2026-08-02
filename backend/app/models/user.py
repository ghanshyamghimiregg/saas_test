"""
User model with RBAC roles (Admin/Manager/Staff/Customer).
Implements: Authentication & Security > Login authority levels
Owned by: Ankush (shared table — other modules FK into this)
"""

import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    CUSTOMER = "customer"


class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STAFF)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())