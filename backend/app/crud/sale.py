"""
Sale CRUD — all stock mutations inside a single DB transaction with
SELECT FOR UPDATE row locks on frame_products to prevent overselling.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.sale import (
    Sale, SaleLineItem, SaleReturn, SaleReturnItem,
    SaleStatus, PaymentMethod, DiscountType,
)
from app.models.product import FrameProduct, LensSpec
from app.models.customer import Customer
from app.models.sales_ledger import EntryType
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleHoldCreate, SaleReturnCreate
from app.schemas.ledger import SalesLedgerCreate
from app.crud.ledger import create_sales_entry
from app.core.deps import verify_branch_access
from app.services.discount import resolve_discount, suggest_discount_type


# ------------------------------------------------------------------ #
# Invoice number (branch-scoped sequential)
# ------------------------------------------------------------------ #

def _next_invoice_number(db: Session, branch_id: uuid.UUID, branch_code: str) -> str:
    count = db.query(func.count(Sale.id)).filter(
        Sale.branch_id == branch_id,
        Sale.status != SaleStatus.VOID,
    ).scalar() or 0
    return f"{branch_code}-{count + 1:04d}"


# ------------------------------------------------------------------ #
# Checkout
# ------------------------------------------------------------------ #

def checkout_sale(
    db: Session, sale_in: SaleCreate,
    created_by: uuid.UUID, current_user: User,
    branch_code: str,
) -> Sale:
    verify_branch_access(current_user, sale_in.branch_id)

    # Branch principals map to branch.id, not user.id — don't set FK to user table
    from app.core.deps import BranchPrincipal
    safe_created_by = None if isinstance(current_user, BranchPrincipal) else created_by

    # Validate cash_tendered when paying with cash
    if sale_in.payment_method == PaymentMethod.CASH:
        if sale_in.cash_tendered is None:
            raise HTTPException(status_code=400, detail="cash_tendered is required for cash payment")

    sale = Sale(
        branch_id=sale_in.branch_id,
        customer_id=sale_in.customer_id,
        discount_type=sale_in.discount_type,
        payment_method=sale_in.payment_method,
        status=SaleStatus.ACTIVE,
        payment_status="pending",
        discount=Decimal("0"),
        subtotal=Decimal("0"),
        tax_amount=Decimal("0"),
        total=Decimal("0"),
        cash_tendered=sale_in.cash_tendered,
        notes=sale_in.notes,
        created_by=safe_created_by,
    )
    db.add(sale)
    db.flush()  # get sale.id before line items

    running_subtotal = Decimal("0")
    running_tax = Decimal("0")

    for item_in in sale_in.line_items:
        frame_price = Decimal("0")
        lens_price = Decimal("0")
        product_name = None
        sku = None
        tax_rate = Decimal("0")

        if item_in.frame_id:
            # SELECT FOR UPDATE — locks the row, prevents concurrent oversell
            frame = (
                db.execute(
                    select(FrameProduct)
                    .where(FrameProduct.id == item_in.frame_id)
                    .with_for_update()
                )
                .scalars().first()
            )
            if not frame or not frame.is_active:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Product {item_in.frame_id} not found or inactive")
            if frame.quantity < item_in.quantity:
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient stock for '{frame.name}': available {frame.quantity}, requested {item_in.quantity}",
                )
            frame_price = frame.selling_price
            product_name = frame.name
            sku = frame.sku or frame.product_code
            tax_rate = frame.tax_rate or Decimal("0")
            frame.quantity -= item_in.quantity

        if item_in.lens_spec_id:
            lens = db.query(LensSpec).filter(
                LensSpec.id == item_in.lens_spec_id,
                LensSpec.is_active == True,  # noqa: E712
            ).first()
            if not lens:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Lens spec {item_in.lens_spec_id} not found")
            lens_price = lens.price
            if not product_name:
                product_name = f"Lens: {lens.lens_type}"

        unit_price = frame_price + lens_price
        line_total = unit_price * item_in.quantity
        line_tax = (line_total * tax_rate / Decimal("100")).quantize(Decimal("0.01"))

        running_subtotal += line_total
        running_tax += line_tax

        db.add(SaleLineItem(
            sale_id=sale.id,
            frame_id=item_in.frame_id,
            lens_spec_id=item_in.lens_spec_id,
            product_name=product_name,
            sku=sku,
            quantity=item_in.quantity,
            unit_price=unit_price,
            line_total=line_total,
        ))

    # Resolve discount
    customer_purchases = None
    customer = None
    if sale.customer_id:
        customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
        if customer:
            customer_purchases = customer.purchase_count

    discount_amount, discount_pct = resolve_discount(
        db, sale_in.discount_type, customer_purchases, running_subtotal
    )

    sale.subtotal = running_subtotal
    sale.tax_amount = running_tax
    sale.discount = discount_amount
    sale.discount_pct = discount_pct
    sale.total = (running_subtotal + running_tax - discount_amount).quantize(Decimal("0.01"))
    if sale.total < Decimal("0"):
        sale.total = Decimal("0")

    # Cash change
    if sale_in.payment_method == PaymentMethod.CASH and sale_in.cash_tendered is not None:
        if sale_in.cash_tendered < sale.total:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Cash tendered ({sale_in.cash_tendered}) is less than total ({sale.total})",
            )
        sale.change_due = (sale_in.cash_tendered - sale.total).quantize(Decimal("0.01"))

    sale.payment_status = "paid"
    sale.status = SaleStatus.ACTIVE
    sale.completed_at = datetime.now(timezone.utc)
    sale.invoice_number = _next_invoice_number(db, sale.branch_id, branch_code)

    # Update customer
    if customer:
        customer.purchase_count += 1
        customer.loyalty_points += 1
        # Update discount_level to reflect current tier (for quick reads)
        from app.services.discount import get_membership_tier
        tier_pct, _ = get_membership_tier(db, customer.purchase_count)
        if tier_pct is not None:
            customer.discount_level = int(tier_pct)

    # Ledger entry
    create_sales_entry(
        db,
        SalesLedgerCreate(
            branch_id=sale.branch_id,
            customer_id=sale.customer_id,
            entry_type=EntryType.CREDIT,
            amount=sale.total,
            description=f"POS sale {sale.invoice_number}",
            reference_id=str(sale.id),
        ),
        created_by=safe_created_by,  # None for branch principals — FK safe
        commit=False,
    )

    db.commit()
    db.refresh(sale)
    return sale


# ------------------------------------------------------------------ #
# Hold / resume / void
# ------------------------------------------------------------------ #

def hold_sale(
    db: Session, sale_in: SaleHoldCreate,
    created_by: uuid.UUID, current_user: User,
) -> Sale:
    """Park a sale without decrementing stock. Stock reserved at resume/checkout."""
    verify_branch_access(current_user, sale_in.branch_id)

    from app.core.deps import BranchPrincipal
    safe_created_by = None if isinstance(current_user, BranchPrincipal) else created_by

    sale = Sale(
        branch_id=sale_in.branch_id,
        customer_id=sale_in.customer_id,
        status=SaleStatus.HELD,
        payment_method=None,
        payment_status="held",
        discount=Decimal("0"),
        subtotal=Decimal("0"),
        tax_amount=Decimal("0"),
        total=Decimal("0"),
        notes=sale_in.notes,
        created_by=safe_created_by,
    )
    db.add(sale)
    db.flush()

    for item_in in sale_in.line_items:
        db.add(SaleLineItem(
            sale_id=sale.id,
            frame_id=item_in.frame_id,
            lens_spec_id=item_in.lens_spec_id,
            quantity=item_in.quantity,
            unit_price=Decimal("0"),   # priced at resume
            line_total=Decimal("0"),
        ))

    db.commit()
    db.refresh(sale)
    return sale


def get_held_sales(db: Session, branch_id: uuid.UUID) -> list[Sale]:
    return db.query(Sale).filter(
        Sale.branch_id == branch_id,
        Sale.status == SaleStatus.HELD,
    ).order_by(Sale.created_at.desc()).all()


def void_sale(db: Session, sale: Sale, current_user: User) -> Sale:
    verify_branch_access(current_user, sale.branch_id)
    if sale.status not in (SaleStatus.ACTIVE, SaleStatus.HELD):
        raise HTTPException(status_code=409, detail=f"Cannot void a sale with status '{sale.status}'")
    if sale.status == SaleStatus.ACTIVE:
        # Restock with SELECT FOR UPDATE to avoid race with concurrent sales
        for item in sale.line_items:
            if item.frame_id:
                frame = (
                    db.execute(
                        select(FrameProduct)
                        .where(FrameProduct.id == item.frame_id)
                        .with_for_update()
                    ).scalars().first()
                )
                if frame:
                    frame.quantity += item.quantity
    sale.status = SaleStatus.VOID
    sale.payment_status = "void"
    db.commit()
    db.refresh(sale)
    return sale


def get_sale_by_id(db: Session, sale_id: uuid.UUID) -> Sale | None:
    return db.query(Sale).filter(Sale.id == sale_id).first()


def get_sales_by_branch(
    db: Session, branch_id: uuid.UUID,
    limit: int = 50, offset: int = 0,
) -> list[Sale]:
    return (
        db.query(Sale)
        .filter(Sale.branch_id == branch_id, Sale.status == SaleStatus.ACTIVE)
        .order_by(Sale.created_at.desc())
        .offset(offset).limit(limit).all()
    )


# ------------------------------------------------------------------ #
# Returns
# ------------------------------------------------------------------ #

def process_return(
    db: Session, sale: Sale,
    return_in: SaleReturnCreate,
    created_by: uuid.UUID, current_user: User,
) -> SaleReturn:
    verify_branch_access(current_user, sale.branch_id)

    if sale.status not in (SaleStatus.ACTIVE,):
        raise HTTPException(status_code=409, detail=f"Sale status '{sale.status}' cannot be returned")

    from app.core.deps import BranchPrincipal
    safe_created_by = None if isinstance(current_user, BranchPrincipal) else created_by

    line_map = {str(li.id): li for li in sale.line_items}
    refund_total = Decimal("0")
    return_obj = SaleReturn(
        original_sale_id=sale.id,
        branch_id=sale.branch_id,
        refund_amount=Decimal("0"),
        reason=return_in.reason,
        notes=return_in.notes,
        created_by=safe_created_by,
    )
    db.add(return_obj)
    db.flush()

    for ri in return_in.items:
        li = line_map.get(str(ri.sale_line_item_id))
        if not li:
            raise HTTPException(status_code=400, detail=f"Line item {ri.sale_line_item_id} not in this sale")
        if ri.quantity_returned > li.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Return qty {ri.quantity_returned} exceeds sold qty {li.quantity}",
            )
        unit = li.unit_price
        refund_line = (unit * ri.quantity_returned).quantize(Decimal("0.01"))
        refund_total += refund_line

        db.add(SaleReturnItem(
            return_id=return_obj.id,
            sale_line_item_id=li.id,
            frame_id=li.frame_id,
            quantity_returned=ri.quantity_returned,
            refund_line_total=refund_line,
        ))

        # Restock
        if li.frame_id:
            frame = (
                db.execute(
                    select(FrameProduct)
                    .where(FrameProduct.id == li.frame_id)
                    .with_for_update()
                ).scalars().first()
            )
            if frame:
                frame.quantity += ri.quantity_returned

    return_obj.refund_amount = refund_total
    sale.status = SaleStatus.RETURNED
    db.commit()
    db.refresh(return_obj)
    return return_obj
