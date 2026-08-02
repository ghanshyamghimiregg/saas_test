"""
Customer model — shared foundation for Ledgers (Ankush), Loyalty features (Bishan),
and Membership points (Ghanshyam). Ankush owns this table; others read/write these
fields without changing the model structure.
Implements: shared foundation across Ledgers & Data, Customer Pricing & Loyalty
"""
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Customer(Base):
    __tablename__ = "customer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    purchase_count = Column(Integer, default=0, nullable=False)  # Bishan: verified badge at 10+
    loyalty_points = Column(Integer, default=0, nullable=False)  # Ghanshyam: membership points
    discount_level = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())