"""
Discount resolution service.

Rules (configurable from admin, stored in discount_config):
- allow_stacking=False (default): highest single applicable discount wins.
- allow_stacking=True: sum of all applicable discounts applied.

Three named discount types (pct from DB, default 5% each):
  owner, salesman, regular_customer

Membership tier discount: auto-resolved from customer.purchase_count
against membership_tier_config rows (sorted desc by min_purchases).

At checkout the cashier explicitly picks a DiscountType (none/owner/
salesman/regular_customer/membership_tier). Membership tier discount is
auto-suggested by the API but the choice is always explicit in the request
so every sale's discount reasoning is auditable.
"""
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.discount import DiscountConfig, MembershipTierConfig
from app.models.sale import DiscountType


def _get_config(db: Session) -> DiscountConfig:
    cfg = db.query(DiscountConfig).first()
    if not cfg:
        # Fallback if seed missing — all 5%
        cfg = DiscountConfig(
            owner_pct=Decimal("5"),
            salesman_pct=Decimal("5"),
            regular_customer_pct=Decimal("5"),
            allow_stacking=False,
        )
    return cfg


def get_membership_tier(db: Session, purchase_count: int) -> tuple[Decimal, str] | tuple[None, None]:
    """Return (discount_pct, tier_name) for the highest tier the customer qualifies for."""
    tiers = (
        db.query(MembershipTierConfig)
        .filter(MembershipTierConfig.min_purchases <= purchase_count)
        .order_by(MembershipTierConfig.min_purchases.desc())
        .first()
    )
    if tiers:
        return tiers.discount_pct, tiers.tier_name
    return None, None


def suggest_discount_type(db: Session, purchase_count: int) -> DiscountType | None:
    """Return the membership tier DiscountType if customer qualifies, else None."""
    pct, _ = get_membership_tier(db, purchase_count)
    if pct is not None:
        return DiscountType.MEMBERSHIP_TIER
    return None


def resolve_discount(
    db: Session,
    discount_type: DiscountType,
    customer_purchase_count: int | None,
    subtotal: Decimal,
) -> tuple[Decimal, Decimal]:
    """
    Returns (discount_amount, discount_pct) to apply to this sale.

    discount_type: the cashier's explicit choice.
    customer_purchase_count: None if no customer attached.
    subtotal: pre-discount line total.
    """
    cfg = _get_config(db)

    named_pct: dict[DiscountType, Decimal] = {
        DiscountType.OWNER: cfg.owner_pct,
        DiscountType.SALESMAN: cfg.salesman_pct,
        DiscountType.REGULAR_CUSTOMER: cfg.regular_customer_pct,
    }

    if discount_type == DiscountType.NONE:
        return Decimal("0"), Decimal("0")

    if discount_type == DiscountType.MEMBERSHIP_TIER:
        pct, _ = get_membership_tier(db, customer_purchase_count or 0)
        if pct is None:
            return Decimal("0"), Decimal("0")
        chosen_pct = pct
    else:
        chosen_pct = named_pct.get(discount_type, Decimal("0"))

    if not cfg.allow_stacking:
        # Highest single wins — if cashier explicitly chose one, use it directly.
        # (Stacking is across multiple simultaneously applicable types; a single
        # explicit choice never needs a "highest" comparison against itself.)
        discount_pct = chosen_pct
    else:
        # Stacking: sum named discount + membership tier if customer qualifies
        membership_pct, _ = get_membership_tier(db, customer_purchase_count or 0)
        all_pcts = [chosen_pct]
        if membership_pct and discount_type != DiscountType.MEMBERSHIP_TIER:
            all_pcts.append(membership_pct)
        discount_pct = sum(all_pcts, Decimal("0"))
        discount_pct = min(discount_pct, Decimal("100"))  # cap at 100%

    discount_amount = (subtotal * discount_pct / Decimal("100")).quantize(Decimal("0.01"))
    return discount_amount, discount_pct
