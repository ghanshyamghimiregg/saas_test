from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.limiter import limiter
from app.models.branch import Branch

router = APIRouter(prefix="/branch-auth", tags=["Branch Auth"])


class BranchLoginRequest(BaseModel):
    branch_code: str
    password: str


@router.post("/login")
@limiter.limit("5/minute")
def branch_login(payload: BranchLoginRequest, request: Request, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.code == payload.branch_code).first()
    if not branch or not branch.password_hash:
        raise HTTPException(status_code=401, detail="Invalid branch code or password")
    if not branch.is_active:
        raise HTTPException(status_code=403, detail="This branch has been deactivated")
    if not verify_password(payload.password, branch.password_hash):
        raise HTTPException(status_code=401, detail="Invalid branch code or password")

    # Issue a JWT so branch-surface API calls can authenticate normally.
    # Token carries branch_id and role=branch so backend can scope reads.
    access_token = create_access_token({
        "sub": str(branch.id),
        "role": "branch",
        "branch_id": str(branch.id),
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "branch_id": str(branch.id),
        "branch_name": branch.name,
        "message": "Terminal unlocked",
    }
