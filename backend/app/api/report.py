from datetime import date
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.deps import require_role, get_current_user, verify_branch_access
from app.models.user import User, UserRole
from app.schemas.report import SalesSummaryOut, SalesListItemOut
from app.crud.report import (
    get_sales_list, get_sales_summary, get_customer_purchase_history,
    get_all_branches_summary, get_all_branches_sales_list,
    get_eod_summary, build_excel_report,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


# ── Branch-accessible endpoints ───────────────────────────────────────────────
# Use get_current_user (no role gate). verify_branch_access enforces that a
# branch terminal can only read its own branch. Admins/Managers read any.

@router.get("/sales/summary", response_model=SalesSummaryOut)
def sales_summary(
    branch_id: uuid.UUID,
    period: str = Query(..., pattern="^(daily|weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_branch_access(current_user, branch_id)
    return get_sales_summary(db, branch_id, period)


@router.get("/sales/list", response_model=list[SalesListItemOut])
def sales_list(
    branch_id: uuid.UUID,
    start: date,
    end: date,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_branch_access(current_user, branch_id)
    return get_sales_list(db, branch_id, start, end, limit, offset)


@router.get("/export/excel")
def export_excel(
    start: date,
    end: date,
    branch_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin: export all branches or one specific branch.
    Branch terminal / Staff / Manager: always scoped to their own branch.
    """
    from app.core.deps import BranchPrincipal

    if isinstance(current_user, BranchPrincipal):
        # Branch terminal — force scope to their own branch, ignore branch_id param
        branch_id = current_user.branch_id
    elif current_user.role == UserRole.ADMIN:
        # Admin — honour branch_id param (None = all branches)
        if branch_id:
            verify_branch_access(current_user, branch_id)
    else:
        # Manager / Staff — scope to their own branch
        if branch_id:
            verify_branch_access(current_user, branch_id)
        else:
            branch_id = current_user.branch_id

    buf = build_excel_report(db, start, end, branch_id=branch_id)
    scope = str(branch_id)[:8] if branch_id else "all-branches"
    filename = f"report-{scope}-{start}-{end}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Admin-only endpoints ───────────────────────────────────────────────────────

@router.get("/sales/summary/all-branches")
def all_branches_summary(
    period: str = Query(..., pattern="^(daily|weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    return get_all_branches_summary(db, period)


@router.get("/sales/list/all-branches")
def all_branches_sales(
    start: date,
    end: date,
    branch_id: uuid.UUID | None = None,
    limit: int = Query(200, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    return get_all_branches_sales_list(db, start, end, branch_id=branch_id, limit=limit, offset=offset)


@router.get("/eod-summary")
def eod_summary(
    branch_id: uuid.UUID,
    target_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_branch_access(current_user, branch_id)
    from datetime import date as date_type
    d = target_date or date_type.today()
    return get_eod_summary(db, branch_id, d)


@router.get("/customers/{customer_id}/history", response_model=list[SalesListItemOut])
def customer_history(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return get_customer_purchase_history(db, customer_id)
