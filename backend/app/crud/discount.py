import uuid
from sqlalchemy.orm import Session

from app.models.discount import DiscountConfig, MembershipTierConfig
from app.schemas.discount import DiscountConfigUpdate, MembershipTierConfigUpdate


def get_discount_config(db: Session) -> DiscountConfig | None:
    return db.query(DiscountConfig).first()


def update_discount_config(
    db: Session, cfg: DiscountConfig,
    data: DiscountConfigUpdate, updated_by: str,
) -> DiscountConfig:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cfg, field, value)
    cfg.updated_by = updated_by
    db.commit()
    db.refresh(cfg)
    return cfg


def get_membership_tiers(db: Session) -> list[MembershipTierConfig]:
    return db.query(MembershipTierConfig).order_by(MembershipTierConfig.sort_order).all()


def get_membership_tier_by_id(
    db: Session, tier_id: uuid.UUID,
) -> MembershipTierConfig | None:
    return db.query(MembershipTierConfig).filter(MembershipTierConfig.id == tier_id).first()


def update_membership_tier(
    db: Session, tier: MembershipTierConfig,
    data: MembershipTierConfigUpdate,
) -> MembershipTierConfig:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tier, field, value)
    db.commit()
    db.refresh(tier)
    return tier
