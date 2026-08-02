import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role, verify_branch_access
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.schemas.sale import SaleCreate, SaleOut, SaleHoldCreate, SaleReturnCreate, SaleReturnOut
from app.crud.sale import (
    checkout_sale, hold_sale, get_held_sales,
    void_sale, process_return, get_sale_by_id, get_sales_by_branch,
)
from app.crud.branch import get_branch_by_id
from app.services.discount import suggest_discount_type
from app.models.customer import Customer
from app.models.branch import Branch
from app.utils.invoice import generate_invoice_pdf

router = APIRouter(prefix="/sales", tags=["Sales"])

_WRITE_ROLES = (UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)


def _get_user_from_request(request: Request, db: Session) -> User:
    """
    Resolves the current user from either:
    - Authorization: Bearer <token> header (normal API calls)
    - ?token=<token> query param (PDF/download links opened in new tabs)
    """
    from app.core.deps import BranchPrincipal
    import uuid as _uuid

    token: str | None = None

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Not authenticated")

    role = payload.get("role")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if role == "branch":
        branch = db.query(Branch).filter(Branch.id == _uuid.UUID(sub)).first()
        if not branch or not branch.is_active:
            raise HTTPException(status_code=403, detail="Branch inactive")
        return BranchPrincipal(branch)  # type: ignore[return-value]

    from app.crud.user import get_user_by_id
    user = get_user_by_id(db, _uuid.UUID(sub))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ------------------------------------------------------------------ #
# Static paths FIRST — must come before /{sale_id}
# ------------------------------------------------------------------ #

@router.post("/checkout", response_model=SaleOut, status_code=201)
def checkout(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    branch = get_branch_by_id(db, sale_in.branch_id)
    if not branch:
        raise HTTPException(status_code=400, detail="Invalid branch_id")
    if not branch.is_active:
        raise HTTPException(status_code=403, detail="Branch is inactive")
    return checkout_sale(db, sale_in, created_by=current_user.id,
                         current_user=current_user, branch_code=branch.code)


@router.post("/hold", response_model=SaleOut, status_code=201)
def park_sale(
    sale_in: SaleHoldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    return hold_sale(db, sale_in, created_by=current_user.id, current_user=current_user)


@router.get("/held", response_model=list[SaleOut])
def list_held(
    branch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_branch_access(current_user, branch_id)
    return get_held_sales(db, branch_id)


@router.get("/suggest-discount")
def suggest_discount(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-suggest a discount type for a customer at checkout."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    suggestion = suggest_discount_type(db, customer.purchase_count)
    return {"suggested_discount_type": suggestion.value if suggestion else "none"}


@router.get("/", response_model=list[SaleOut])
def list_sales(
    branch_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_branch_access(current_user, branch_id)
    return get_sales_by_branch(db, branch_id, limit, offset)


# ------------------------------------------------------------------ #
# Dynamic /{sale_id} paths AFTER static paths
# ------------------------------------------------------------------ #

@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sale = get_sale_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    verify_branch_access(current_user, sale.branch_id)
    return sale


@router.get("/{sale_id}/invoice")
def get_invoice(
    sale_id: uuid.UUID,
    request: Request,
    fmt: str = Query("a4", pattern="^(a4|thermal)$"),
    db: Session = Depends(get_db),
):
    # Accept token from header OR query param (needed for browser tab PDF links)
    current_user = _get_user_from_request(request, db)
    sale = get_sale_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    verify_branch_access(current_user, sale.branch_id)
    branch = get_branch_by_id(db, sale.branch_id)
    customer = None
    if sale.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
    pdf = generate_invoice_pdf(sale, branch, customer, fmt=fmt)
    filename = f"invoice-{sale.invoice_number or str(sale.id)[:8]}.pdf"
    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"},
    )


@router.post("/{sale_id}/void", response_model=SaleOut)
def void(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    sale = get_sale_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return void_sale(db, sale, current_user)


@router.post("/{sale_id}/return", response_model=SaleReturnOut, status_code=201)
def return_sale(
    sale_id: uuid.UUID,
    return_in: SaleReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*_WRITE_ROLES)),
):
    sale = get_sale_by_id(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return process_return(db, sale, return_in, created_by=current_user.id, current_user=current_user)
