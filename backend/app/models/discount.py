"""
DiscountConfig — business-level configurable discount percentages.
One row per business (singleton pattern — id=1 enforced at app layer).
Editable only by ADMIN from admin. interface.

MembershipTierConfig — three configurable tiers keyed by min_purchases.
Default seed: Tier1 ≥10 → 5%, Tier2 ≥50 → 10%, Tier3 ≥100 → 12%.
"""
import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class DiscountConfig(Base):
    __tablename__ = "discount_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # percentages — stored as Decimal, e.g. 5.00 = 5%
    owner_pct = Column(Numeric(5, 2), nullable=False, default=5)
    salesman_pct = Column(Numeric(5, 2), nullable=False, default=5)
    regular_customer_pct = Column(Numeric(5, 2), nullable=False, default=5)
    # stacking rule: false = highest wins, true = sum all applicable discounts
    allow_stacking = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    updated_by = Column(String, nullable=True)   # store email/name for audit display


class MembershipTierConfig(Base):
    """One row per tier. Admin can edit pct and threshold; cannot reduce below 1."""
    __tablename__ = "membership_tier_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier_name = Column(String, nullable=False)          # e.g. "Tier 1", "Tier 2", "Tier 3"
    min_purchases = Column(Integer, nullable=False)     # purchases needed to reach this tier
    discount_pct = Column(Numeric(5, 2), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)  # display order; higher = better tier
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
