import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.product import FrameProduct, LensSpec, StockAdjustmentLog
from app.models.user import User
from app.schemas.product import FrameProductCreate, FrameProductUpdate, LensSpecCreate, StockAdjustIn
from app.utils.barcode import generate_barcode_code
from app.core.deps import verify_branch_access


# ------------------------------------------------------------------ #
# Frame products
# ------------------------------------------------------------------ #

def create_frame_product(
    db: Session, product_in: FrameProductCreate,
    created_by: uuid.UUID, branch_code: str, current_user: User,
) -> FrameProduct:
    verify_branch_access(current_user, product_in.branch_id)

    data = product_in.model_dump()

    # Branch principals have an ID that maps to branch.id, not user.id.
    # Only set created_by when the caller is an actual User row.
    from app.core.deps import BranchPrincipal
    safe_created_by = None if isinstance(current_user, BranchPrincipal) else created_by

    product = FrameProduct(**data, created_by=safe_created_by, barcode="PENDING")
    db.add(product)
    try:
        db.flush()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not create product: {e}")

    product.barcode = generate_barcode_code(branch_code, product.id)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not save barcode: {e}")
    db.refresh(product)
    return product


def get_frame_by_id(db: Session, frame_id: uuid.UUID) -> FrameProduct | None:
    return db.query(FrameProduct).filter(
        FrameProduct.id == frame_id,
        FrameProduct.is_active == True,  # noqa: E712
    ).first()


def get_frame_by_barcode(db: Session, barcode: str) -> FrameProduct | None:
    return db.query(FrameProduct).filter(
        FrameProduct.barcode == barcode,
        FrameProduct.is_active == True,  # noqa: E712
    ).first()


def update_frame_product(
    db: Session, frame: FrameProduct, data: FrameProductUpdate,
) -> FrameProduct:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(frame, field, value)
    db.commit()
    db.refresh(frame)
    return frame


def soft_delete_frame(db: Session, frame: FrameProduct) -> None:
    """Soft-delete only if no completed sales reference this frame."""
    from app.models.sale import SaleLineItem, SaleStatus
    has_sales = db.query(SaleLineItem).join(
        SaleLineItem.sale
    ).filter(
        SaleLineItem.frame_id == frame.id,
    ).first()
    if has_sales:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a product with sales history. Deactivate it instead.",
        )
    db.delete(frame)
    db.commit()


def deactivate_frame(db: Session, frame: FrameProduct) -> FrameProduct:
    frame.is_active = False
    db.commit()
    db.refresh(frame)
    return frame


def adjust_stock(
    db: Session, frame: FrameProduct,
    data: StockAdjustIn, adjusted_by: uuid.UUID,
    current_user: User = None,
) -> FrameProduct:
    before = frame.quantity
    after = before + data.delta
    if after < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Adjustment would result in negative stock ({after}). Current: {before}.",
        )
    frame.quantity = after
    from app.core.deps import BranchPrincipal
    safe_by = None if isinstance(current_user, BranchPrincipal) else adjusted_by
    log = StockAdjustmentLog(
        branch_id=frame.branch_id,
        frame_id=frame.id,
        delta=data.delta,
        quantity_before=before,
        quantity_after=after,
        reason=data.reason,
        notes=data.notes,
        created_by=safe_by,
    )
    db.add(log)
    db.commit()
    db.refresh(frame)
    return frame


def search_frames(
    db: Session, branch_id: uuid.UUID, q: str,
    limit: int = 50, offset: int = 0,
) -> list[FrameProduct]:
    return (
        db.query(FrameProduct)
        .filter(
            FrameProduct.branch_id == branch_id,
            FrameProduct.is_active == True,  # noqa: E712
            (
                FrameProduct.name.ilike(f"%{q}%")
                | FrameProduct.product_code.ilike(f"%{q}%")
                | FrameProduct.brand.ilike(f"%{q}%")
                | FrameProduct.sku.ilike(f"%{q}%")
                | FrameProduct.barcode.ilike(f"%{q}%")
            ),
        )
        .offset(offset).limit(limit).all()
    )


def get_stock_by_branch(
    db: Session, branch_id: uuid.UUID,
    limit: int = 50, offset: int = 0,
    low_stock_only: bool = False,
) -> list[FrameProduct]:
    q = db.query(FrameProduct).filter(
        FrameProduct.branch_id == branch_id,
        FrameProduct.is_active == True,  # noqa: E712
    )
    if low_stock_only:
        q = q.filter(FrameProduct.quantity <= FrameProduct.reorder_threshold)
    return q.offset(offset).limit(limit).all()


def get_stock_all_branches(db: Session, low_stock_only: bool = False) -> list[FrameProduct]:
    q = db.query(FrameProduct).filter(FrameProduct.is_active == True)  # noqa: E712
    if low_stock_only:
        q = q.filter(FrameProduct.quantity <= FrameProduct.reorder_threshold)
    return q.all()


def get_frames_by_ids(db: Session, frame_ids: list[uuid.UUID]) -> list[FrameProduct]:
    return db.query(FrameProduct).filter(FrameProduct.id.in_(frame_ids)).all()


def get_adjustment_log(
    db: Session, branch_id: uuid.UUID,
    frame_id: uuid.UUID | None = None,
    limit: int = 100, offset: int = 0,
) -> list[StockAdjustmentLog]:
    q = db.query(StockAdjustmentLog).filter(
        StockAdjustmentLog.branch_id == branch_id
    )
    if frame_id:
        q = q.filter(StockAdjustmentLog.frame_id == frame_id)
    return q.order_by(StockAdjustmentLog.created_at.desc()).offset(offset).limit(limit).all()


# ------------------------------------------------------------------ #
# Lens specs
# ------------------------------------------------------------------ #

def create_lens_spec(
    db: Session, lens_in: LensSpecCreate,
    created_by: uuid.UUID, current_user: User,
) -> LensSpec:
    verify_branch_access(current_user, lens_in.branch_id)
    from app.core.deps import BranchPrincipal
    safe_created_by = None if isinstance(current_user, BranchPrincipal) else created_by
    lens = LensSpec(**lens_in.model_dump(), created_by=safe_created_by)
    db.add(lens)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not create lens spec: {e}")
    db.refresh(lens)
    return lens
