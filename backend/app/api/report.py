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


@router.get("/sales/summary", response_model=SalesSummaryOut)
def sales_summary(
    branch_id: uuid.UUID,
    period: str = Query(..., pattern="^(daily|weekly|monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    verify_branch_access(current_user, branch_id)
    return get_sales_summary(db, branch_id, period)


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


@router.get("/sales/list", response_model=list[SalesListItemOut])
def sales_list(
    branch_id: uuid.UUID,
    start: date,
    end: date,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    verify_branch_access(current_user, branch_id)
    return get_sales_list(db, branch_id, start, end, limit, offset)


@router.get("/eod-summary")
def eod_summary(
    branch_id: uuid.UUID,
    target_date: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
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


@router.get("/export/excel")
def export_excel(
    start: date,
    end: date,
    branch_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    # MANAGER can only export their own branch; ADMIN can export any/all
    if branch_id:
        verify_branch_access(current_user, branch_id)
    elif current_user.role == UserRole.MANAGER:
        # MANAGER without explicit branch_id: scope to their own branch
        branch_id = current_user.branch_id
    buf = build_excel_report(db, start, end, branch_id=branch_id)
    scope = str(branch_id)[:8] if branch_id else "all-branches"
    filename = f"report-{scope}-{start}-{end}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
