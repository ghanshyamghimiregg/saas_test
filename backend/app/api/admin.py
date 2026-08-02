"""
Admin-only configuration endpoints.
- GET/PATCH /admin/discount-config
- GET       /admin/membership-tiers
- PATCH     /admin/membership-tiers/{id}
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.schemas.discount import (
    DiscountConfigOut, DiscountConfigUpdate,
    MembershipTierConfigOut, MembershipTierConfigUpdate,
)
from app.crud.discount import (
    get_discount_config, update_discount_config,
    get_membership_tiers, get_membership_tier_by_id, update_membership_tier,
)

router = APIRouter(prefix="/admin", tags=["Admin Config"])


@router.get("/discount-config", response_model=DiscountConfigOut)
def get_discounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    cfg = get_discount_config(db)
    if not cfg:
        raise HTTPException(status_code=404, detail="Discount config not seeded — run migration")
    return cfg


@router.patch("/discount-config", response_model=DiscountConfigOut)
def edit_discounts(
    data: DiscountConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    cfg = get_discount_config(db)
    if not cfg:
        raise HTTPException(status_code=404, detail="Discount config not found")
    return update_discount_config(db, cfg, data, updated_by=current_user.email)


@router.get("/membership-tiers", response_model=list[MembershipTierConfigOut])
def get_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    return get_membership_tiers(db)


@router.patch("/membership-tiers/{tier_id}", response_model=MembershipTierConfigOut)
def edit_tier(
    tier_id: uuid.UUID,
    data: MembershipTierConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    tier = get_membership_tier_by_id(db, tier_id)
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    return update_membership_tier(db, tier, data)
