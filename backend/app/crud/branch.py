import re
import secrets
import string
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate
from app.core.security import hash_password


def _generate_code(name: str, existing_codes: set[str]) -> str:
    """Derive a short branch code from name, ensure uniqueness."""
    base = re.sub(r"[^A-Z0-9]", "", name.upper())[:6] or "BR"
    candidate = base
    suffix = 1
    while candidate in existing_codes:
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate


def _generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    # Guarantee at least one of each required class
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%"),
    ]
    pwd += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def create_branch(db: Session, branch_in: BranchCreate) -> tuple[Branch, str]:
    """
    Auto-provisions a branch with a unique code and random password.
    Returns (branch, plaintext_password). Plaintext is shown once and never stored.
    """
    existing_codes = {b.code for b in db.query(Branch.code).all()}
    code = _generate_code(branch_in.name, existing_codes)
    plaintext = _generate_password()

    branch = Branch(
        name=branch_in.name,
        address=branch_in.address,
        code=code,
        password_hash=hash_password(plaintext),
        is_active=True,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch, plaintext


def get_branches(db: Session, include_inactive: bool = False) -> list[Branch]:
    q = db.query(Branch)
    if not include_inactive:
        q = q.filter(Branch.is_active == True)  # noqa: E712
    return q.all()


def get_branch_by_id(db: Session, branch_id: uuid.UUID) -> Branch | None:
    return db.query(Branch).filter(Branch.id == branch_id).first()


def get_branch_by_code(db: Session, code: str) -> Branch | None:
    return db.query(Branch).filter(Branch.code == code).first()


def update_branch(db: Session, branch: Branch, data: BranchUpdate) -> Branch:
    # code and name are immutable — BranchUpdate schema doesn't include them,
    # but guard defensively at the DB layer too
    safe_fields = {"address", "is_active", "camera_stream_url"}
    for field, value in data.model_dump(exclude_unset=True).items():
        if field not in safe_fields:
            continue  # silently ignore any attempt to change immutable fields
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return branch


def reset_branch_password(db: Session, branch: Branch) -> str:
    """Admin-triggered password reset. Returns new plaintext (shown once)."""
    plaintext = _generate_password()
    branch.password_hash = hash_password(plaintext)
    db.commit()
    return plaintext
