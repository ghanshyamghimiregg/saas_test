import uuid
import enum
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, Enum, Boolean, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SaleStatus(str, enum.Enum):
    ACTIVE = "active"
    HELD = "held"
    VOID = "void"
    RETURNED = "returned"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    ONLINE_PENDING = "online_pending"   # placeholder seam — real gateway dropped in here later
    ONLINE_CONFIRMED = "online_confirmed"


class DiscountType(str, enum.Enum):
    NONE = "none"
    OWNER = "owner"
    SALESMAN = "salesman"
    REGULAR_CUSTOMER = "regular_customer"
    MEMBERSHIP_TIER = "membership_tier"


class Sale(Base):
    __tablename__ = "sale"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=True)

    invoice_number = Column(String, nullable=True, index=True)
    status = Column(Enum(SaleStatus, values_callable=lambda x: [e.value for e in x], native_enum=False), nullable=False, default=SaleStatus.ACTIVE)
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda x: [e.value for e in x], native_enum=False), nullable=True)
    payment_status = Column(String, nullable=False, default="pending")

    discount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_pct = Column(Numeric(5, 2), nullable=True)
    discount_type = Column(Enum(DiscountType, values_callable=lambda x: [e.value for e in x], native_enum=False), nullable=False, default=DiscountType.NONE)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    cash_tendered = Column(Numeric(12, 2), nullable=True)        # for cash payment
    change_due = Column(Numeric(12, 2), nullable=True)

    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    line_items = relationship("SaleLineItem", backref="sale", lazy="joined")
    returns = relationship("SaleReturn", backref="original_sale", lazy="select")


class SaleLineItem(Base):
    __tablename__ = "sale_line_item"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sale.id"), nullable=False, index=True)
    frame_id = Column(UUID(as_uuid=True), ForeignKey("frame_products.id"), nullable=True)
    lens_spec_id = Column(UUID(as_uuid=True), ForeignKey("lens_specs.id"), nullable=True)
    product_name = Column(String, nullable=True)    # snapshot at time of sale — survives soft-delete
    sku = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)


class SaleReturn(Base):
    """Records items returned from a completed sale. Restocks inventory on creation."""
    __tablename__ = "sale_return"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_sale_id = Column(UUID(as_uuid=True), ForeignKey("sale.id"), nullable=False, index=True)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False, index=True)
    refund_amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    return_items = relationship("SaleReturnItem", backref="sale_return", lazy="joined")


class SaleReturnItem(Base):
    __tablename__ = "sale_return_item"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_id = Column(UUID(as_uuid=True), ForeignKey("sale_return.id"), nullable=False, index=True)
    sale_line_item_id = Column(UUID(as_uuid=True), ForeignKey("sale_line_item.id"), nullable=False)
    frame_id = Column(UUID(as_uuid=True), ForeignKey("frame_products.id"), nullable=True)
    quantity_returned = Column(Integer, nullable=False)
    refund_line_total = Column(Numeric(12, 2), nullable=False)
