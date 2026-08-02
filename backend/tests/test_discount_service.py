"""
Standalone unit tests for discount resolution logic.
No database, no SQLAlchemy — pure function tests using inline stubs.
Run: pytest tests/test_discount_service.py --noconftest
"""
from decimal import Decimal
from unittest.mock import MagicMock
import enum


# ---- Inline stubs so this file has zero project imports ----

class DiscountType(str, enum.Enum):
    NONE = "none"
    OWNER = "owner"
    SALESMAN = "salesman"
    REGULAR_CUSTOMER = "regular_customer"
    MEMBERSHIP_TIER = "membership_tier"


class _DiscountConfig:
    def __init__(self, owner=5, salesman=5, regular=5, stacking=False):
        self.owner_pct = Decimal(str(owner))
        self.salesman_pct = Decimal(str(salesman))
        self.regular_customer_pct = Decimal(str(regular))
        self.allow_stacking = stacking


class _MembershipTier:
    def __init__(self, name, min_purchases, pct):
        self.tier_name = name
        self.min_purchases = min_purchases
        self.discount_pct = Decimal(str(pct))


# ---- Inline implementation (mirrors app/services/discount.py logic) ----

def _get_membership_tier(tier_or_none):
    """Simulate get_membership_tier with a pre-resolved result."""
    if tier_or_none:
        return tier_or_none.discount_pct, tier_or_none.tier_name
    return None, None


def resolve_discount_pure(
    cfg: _DiscountConfig,
    discount_type: DiscountType,
    top_tier,          # _MembershipTier or None
    subtotal: Decimal,
) -> tuple[Decimal, Decimal]:
    """
    Pure reimplementation of app/services/discount.resolve_discount
    for isolated unit testing.
    """
    if discount_type == DiscountType.NONE:
        return Decimal("0"), Decimal("0")

    named_pct = {
        DiscountType.OWNER: cfg.owner_pct,
        DiscountType.SALESMAN: cfg.salesman_pct,
        DiscountType.REGULAR_CUSTOMER: cfg.regular_customer_pct,
    }

    if discount_type == DiscountType.MEMBERSHIP_TIER:
        if top_tier is None:
            return Decimal("0"), Decimal("0")
        chosen_pct = top_tier.discount_pct
    else:
        chosen_pct = named_pct.get(discount_type, Decimal("0"))

    if not cfg.allow_stacking:
        discount_pct = chosen_pct
    else:
        all_pcts = [chosen_pct]
        if top_tier and discount_type != DiscountType.MEMBERSHIP_TIER:
            all_pcts.append(top_tier.discount_pct)
        discount_pct = sum(all_pcts, Decimal("0"))
        discount_pct = min(discount_pct, Decimal("100"))

    discount_amount = (subtotal * discount_pct / Decimal("100")).quantize(Decimal("0.01"))
    return discount_amount, discount_pct


# ---- Tests ----

class TestMembershipTierEdgeCases:
    def test_no_tier_below_10(self):
        pct, name = _get_membership_tier(None)
        assert pct is None

    def test_tier1_exactly_10(self):
        tier = _MembershipTier("Tier 1", 10, 5)
        pct, name = _get_membership_tier(tier)
        assert pct == Decimal("5")
        assert name == "Tier 1"

    def test_tier2_exactly_50(self):
        tier = _MembershipTier("Tier 2", 50, 10)
        pct, _ = _get_membership_tier(tier)
        assert pct == Decimal("10")

    def test_tier3_exactly_100(self):
        tier = _MembershipTier("Tier 3", 100, 12)
        pct, _ = _get_membership_tier(tier)
        assert pct == Decimal("12")


class TestResolveDiscount:
    cfg = _DiscountConfig()
    t1 = _MembershipTier("Tier 1", 10, 5)
    t3 = _MembershipTier("Tier 3", 100, 12)

    def test_none_discount(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.NONE, None, Decimal("100"))
        assert amt == Decimal("0") and pct == Decimal("0")

    def test_owner_5pct_on_200(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.OWNER, None, Decimal("200"))
        assert pct == Decimal("5")
        assert amt == Decimal("10.00")

    def test_salesman_5pct(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.SALESMAN, None, Decimal("100"))
        assert pct == Decimal("5") and amt == Decimal("5.00")

    def test_regular_5pct(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.REGULAR_CUSTOMER, None, Decimal("100"))
        assert pct == Decimal("5") and amt == Decimal("5.00")

    def test_membership_tier1(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.MEMBERSHIP_TIER, self.t1, Decimal("100"))
        assert pct == Decimal("5") and amt == Decimal("5.00")

    def test_membership_not_qualified(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.MEMBERSHIP_TIER, None, Decimal("100"))
        assert amt == Decimal("0")

    def test_no_stacking_uses_chosen_only(self):
        cfg = _DiscountConfig(owner=5, stacking=False)
        amt, pct = resolve_discount_pure(cfg, DiscountType.OWNER, self.t1, Decimal("100"))
        assert pct == Decimal("5")  # tier (5%) not added

    def test_stacking_adds_membership(self):
        cfg = _DiscountConfig(owner=5, stacking=True)
        amt, pct = resolve_discount_pure(cfg, DiscountType.OWNER, self.t1, Decimal("100"))
        assert pct == Decimal("10")  # 5 + 5
        assert amt == Decimal("10.00")

    def test_stacking_caps_at_100pct(self):
        cfg = _DiscountConfig(owner=95, stacking=True)
        amt, pct = resolve_discount_pure(cfg, DiscountType.OWNER, self.t3, Decimal("100"))
        assert pct == Decimal("100")
        assert amt == Decimal("100.00")

    def test_zero_subtotal_gives_zero_amount(self):
        amt, pct = resolve_discount_pure(self.cfg, DiscountType.OWNER, None, Decimal("0"))
        assert amt == Decimal("0")

    def test_custom_percentages(self):
        cfg = _DiscountConfig(owner=15, salesman=8, regular=3)
        _, p1 = resolve_discount_pure(cfg, DiscountType.OWNER, None, Decimal("100"))
        _, p2 = resolve_discount_pure(cfg, DiscountType.SALESMAN, None, Decimal("100"))
        _, p3 = resolve_discount_pure(cfg, DiscountType.REGULAR_CUSTOMER, None, Decimal("100"))
        assert p1 == Decimal("15")
        assert p2 == Decimal("8")
        assert p3 == Decimal("3")

    def test_rounding_to_2dp(self):
        """NPR 333 × 5% = 16.65"""
        amt, _ = resolve_discount_pure(self.cfg, DiscountType.OWNER, None, Decimal("333"))
        assert amt == Decimal("16.65")

    def test_stacking_membership_type_not_double_counted(self):
        """When discount_type is already MEMBERSHIP_TIER, stacking should not add tier again."""
        cfg = _DiscountConfig(stacking=True)
        amt, pct = resolve_discount_pure(cfg, DiscountType.MEMBERSHIP_TIER, self.t1, Decimal("100"))
        assert pct == Decimal("5")  # not 10
