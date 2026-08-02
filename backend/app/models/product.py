import uuid
from sqlalchemy import (
    Column, String, Numeric, Integer, Boolean,
    ForeignKey, DateTime, Text, func
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.core.database import Base


class FrameProduct(Base):
    __tablename__ = "frame_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False, index=True)

    # --- identity ---
    product_code = Column(String, nullable=False)
    barcode = Column(String, unique=True, nullable=False, index=True)
    sku = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    model_number = Column(String, nullable=True)

    # --- eyewear classification ---
    category = Column(String, nullable=True)          # sunglasses / optical_frame / contact_lens / reading_glasses / lens_only / accessories
    eyewear_type = Column(String, nullable=True)       # legacy alias for category — kept for backwards compat
    frame_shape = Column(String, nullable=True)        # aviator / wayfarer / round / cat_eye / rectangle / etc.
    frame_material = Column(String, nullable=True)     # acetate / metal / titanium / tr90 / combination / etc.
    frame_color = Column(String, nullable=True)
    gender = Column(String, nullable=True)             # men / women / unisex / kids

    # --- lens attributes ---
    lens_type = Column(String, nullable=True)          # single_vision / bifocal / progressive / non_prescription / plano
    lens_material = Column(String, nullable=True)      # cr39 / polycarbonate / high_index / glass
    lens_coating = Column(String, nullable=True)       # ar / blue_light / uv / scratch / photochromic
    polarized = Column(Boolean, nullable=True, default=False)

    # --- sizing ---
    size = Column(String, nullable=True)               # e.g. "52-18-140"
    temple_size = Column(String, nullable=True)        # legacy — kept for backwards compat

    # --- pricing & tax ---
    cost_price = Column(Numeric(12, 2), nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=True, default=0)   # percentage, e.g. 13.00
    hsn_code = Column(String, nullable=True)

    # --- supplier ---
    supplier = Column(String, nullable=True)

    # --- stock ---
    quantity = Column(Integer, nullable=False, default=0)
    reorder_threshold = Column(Integer, nullable=True, default=5)

    # --- extras ---
    warranty_period = Column(String, nullable=True)    # e.g. "1 year", "6 months"
    notes = Column(Text, nullable=True)
    image_urls = Column(ARRAY(String), nullable=True, default=list)

    # --- lifecycle ---
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)


class LensSpec(Base):
    __tablename__ = "lens_specs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False, index=True)
    lens_type = Column(String, nullable=False)
    power = Column(String, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StockAdjustmentLog(Base):
    """Append-only log of manual stock corrections (physical count, damage write-off, etc.)."""
    __tablename__ = "stock_adjustment_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branch.id"), nullable=False, index=True)
    frame_id = Column(UUID(as_uuid=True), ForeignKey("frame_products.id"), nullable=False, index=True)
    delta = Column(Integer, nullable=False)            # positive = add, negative = remove
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)            # "physical_count" / "damage" / "theft" / "correction" / "other"
    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
