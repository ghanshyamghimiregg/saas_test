"""
Branch management — admin-only write ops, open read for list.
- POST /branches/         auto-provisions credentials, returns plaintext password once.
- GET  /branches/         list (active by default)
- GET  /branches/{id}     single branch
- PATCH /branches/{id}    update address/active/camera (NOT name, NOT code)
- POST /branches/{id}/reset-password   admin-triggered reset
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role, get_current_user
from app.models.user import User, UserRole
from app.schemas.branch import BranchCreate, BranchOut, BranchUpdate, BranchProvisionOut
from app.crud.branch import (
    create_branch, get_branches, get_branch_by_id,
    update_branch, reset_branch_password,
)

router = APIRouter(prefix="/branches", tags=["Branches"])


@router.post("/", response_model=BranchProvisionOut, status_code=201)
def add_branch(
    branch_in: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Creates branch, auto-generates code + password. Password shown exactly once."""
    branch, plaintext = create_branch(db, branch_in)
    return BranchProvisionOut(
        id=branch.id,
        name=branch.name,
        code=branch.code,
        address=branch.address,
        is_active=branch.is_active,
        plaintext_password=plaintext,
    )


@router.get("/", response_model=list[BranchOut])
def list_branches(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_branches(db, include_inactive=include_inactive)


@router.get("/{branch_id}", response_model=BranchOut)
def get_branch(
    branch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.patch("/{branch_id}", response_model=BranchOut)
def edit_branch(
    branch_id: uuid.UUID,
    data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Update address/is_active/camera_stream_url. Code and name are immutable."""
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return update_branch(db, branch, data)


@router.post("/{branch_id}/reset-password")
def reset_password(
    branch_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin resets branch password. Returns new plaintext once."""
    branch = get_branch_by_id(db, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    new_pwd = reset_branch_password(db, branch)
    return {
        "branch_id": str(branch.id),
        "branch_code": branch.code,
        "new_password": new_pwd,
        "message": "Password reset. Share securely — not stored in plaintext.",
    }
