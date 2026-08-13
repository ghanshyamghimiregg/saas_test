import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.crud.branch import get_branch_by_id
from app.schemas.product import (
    FrameProductCreate, FrameProductOut, FrameProductUpdate,
    LensSpecCreate, LensSpecOut,
    StockAdjustIn, StockAdjustmentLogOut,
)
from app.crud.product import (
    create_frame_product, get_frame_by_id, get_frame_by_barcode,
    update_frame_product, soft_delete_frame, deactivate_frame,
    adjust_stock, get_adjustment_log,
    create_lens_spec, search_frames, get_stock_by_branch,
    get_stock_all_branches, get_frames_by_ids,
)
from app.utils.barcode import generate_barcode_pdf

router = APIRouter(prefix="/inventory", tags=["Inventory"])

_WRITE_ROLES = (UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
_MAX_LIMIT = 500  # cap on all list endpoints to prevent unbounded queries


def _check_branch_read(current_user: User, branch_id: uuid.UUID) -> None:
    """STAFF may only read their own branch's data."""
    from app.core.deps import verify_branch_access
    verify_branch_access(current_user, branch_id)


# ------------------------------------------------------------------ #
# Frames — static paths FIRST (must come before /{frame_id})
# ------------------------------------------------------------------ #

@router.post("/frames", response_model=FrameProductOut, status_code=201)
def add_frame(
    product_in: FrameProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    branch = get_branch_by_id(db, product_in.branch_id)
    if not branch:
        raise HTTPException(status_code=400, detail="Invalid branch_id")
    return create_frame_product(
        db, product_in,
        created_by=current_user.id,
        branch_code=branch.code,
        current_user=current_user,
    )


@router.post("/frames/print-barcodes")
def print_barcodes(
    frame_ids: list[uuid.UUID],
    copies_per_frame: int = Query(
        1, ge=1, le=500,
        description="How many label copies per frame. Pass 0 to use the frame's current stock qty."
    ),
    use_stock_qty: bool = Query(
        False,
        description="If true, print one label per unit of current stock quantity for each frame."
    ),
    label_size: str = Query(
        "a4",
        description="Label size/layout: 'a4' for 3×8 grid on A4, '34x20' for 34×20mm thermal roll labels.",
        pattern="^(a4|34x20)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    if not frame_ids:
        raise HTTPException(status_code=400, detail="frame_ids must not be empty")
    if len(frame_ids) > 200:
        raise HTTPException(status_code=400, detail="Cannot print more than 200 products at once")
    frames = get_frames_by_ids(db, frame_ids)
    if len(frames) != len(frame_ids):
        raise HTTPException(status_code=400, detail="One or more frame_ids not found")

    # Build items list — each entry is one label copy
    items: list[tuple[str, str, object]] = []
    for f in frames:
        n = f.quantity if use_stock_qty else copies_per_frame
        n = max(1, min(n, 500))  # clamp 1-500 per product
        for _ in range(n):
            items.append((f.barcode, f.name, f.selling_price))

    pdf = generate_barcode_pdf(items, label_size=label_size)
    filename = f"barcodes-{'thermal' if label_size == '34x20' else 'a4'}.pdf"
    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/frames/scan/{barcode}", response_model=FrameProductOut)
def scan_frame(
    barcode: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    frame = get_frame_by_barcode(db, barcode)
    if not frame:
        raise HTTPException(status_code=404, detail="Barcode not found")
    return frame


@router.get("/frames/search", response_model=list[FrameProductOut])
def search_frame(
    branch_id: uuid.UUID,
    q: str,
    limit: int = Query(50, ge=1, le=_MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_branch_read(current_user, branch_id)
    if len(q) > 200:
        raise HTTPException(status_code=400, detail="Search query too long")
    return search_frames(db, branch_id, q, limit, offset)


@router.get("/frames/stock/all-branches", response_model=list[FrameProductOut])
def all_branches_stock(
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return get_stock_all_branches(db, low_stock_only)


@router.get("/frames/stock", response_model=list[FrameProductOut])
def branch_stock(
    branch_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=_MAX_LIMIT),
    offset: int = Query(0, ge=0),
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_branch_read(current_user, branch_id)
    return get_stock_by_branch(db, branch_id, limit, offset, low_stock_only)


# ------------------------------------------------------------------ #
# Frames — dynamic /{frame_id} paths AFTER static paths
# ------------------------------------------------------------------ #

@router.get("/frames/{frame_id}", response_model=FrameProductOut)
def get_frame(
    frame_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    frame = get_frame_by_id(db, frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Product not found")
    return frame


@router.patch("/frames/{frame_id}", response_model=FrameProductOut)
def edit_frame(
    frame_id: uuid.UUID,
    data: FrameProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    frame = get_frame_by_id(db, frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Product not found")
    # Enforce branch isolation on writes
    from app.core.deps import verify_branch_access
    verify_branch_access(current_user, frame.branch_id)
    return update_frame_product(db, frame, data)


@router.delete("/frames/{frame_id}", status_code=204)
def remove_frame(
    frame_id: uuid.UUID,
    hard: bool = Query(False, description="Hard delete only if zero sale history"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    frame = get_frame_by_id(db, frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Product not found")
    if hard:
        soft_delete_frame(db, frame)
    else:
        deactivate_frame(db, frame)


@router.post("/frames/{frame_id}/adjust-stock", response_model=FrameProductOut)
def stock_adjust(
    frame_id: uuid.UUID,
    data: StockAdjustIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    frame = get_frame_by_id(db, frame_id)
    if not frame:
        raise HTTPException(status_code=404, detail="Product not found")
    # Branch isolation: STAFF can only adjust their own branch's stock
    from app.core.deps import verify_branch_access
    verify_branch_access(current_user, frame.branch_id)
    return adjust_stock(db, frame, data, adjusted_by=current_user.id, current_user=current_user)


@router.get("/frames/{frame_id}/adjustment-log", response_model=list[StockAdjustmentLogOut])
def adjustment_log(
    frame_id: uuid.UUID,
    branch_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=_MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_branch_read(current_user, branch_id)
    return get_adjustment_log(db, branch_id, frame_id=frame_id, limit=limit, offset=offset)


# ------------------------------------------------------------------ #
# Lens specs
# ------------------------------------------------------------------ #

@router.post("/lenses", response_model=LensSpecOut, status_code=201)
def add_lens(
    lens_in: LensSpecCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    return create_lens_spec(db, lens_in, created_by=current_user.id, current_user=current_user)
