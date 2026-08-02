"""
Reusable FastAPI dependencies for authentication and RBAC enforcement.

Supports two token types:
  - User tokens  (type=access, role=admin|manager|staff): look up User row
  - Branch tokens (type=access, role=branch): synthetic User-like object
    built from the branch record — no User row needed.
"""
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.crud.user import get_user_by_id
from app.models.user import User, UserRole
from app.models.branch import Branch

bearer_scheme = HTTPBearer()

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


class BranchPrincipal:
    """
    Lightweight stand-in for User when the request comes from a branch terminal.
    Exposes the same fields that deps/routes read so they don't need to branch
    on the type.
    """
    def __init__(self, branch: Branch):
        self.id = branch.id
        self.email = f"branch:{branch.code}"
        self.full_name = branch.name
        self.role = UserRole.STAFF          # branch terminals get STAFF-level access
        self.branch_id = branch.id
        self.is_active = branch.is_active


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        raise _CREDENTIALS_EXC

    role = payload.get("role")
    sub = payload.get("sub")
    if not sub:
        raise _CREDENTIALS_EXC

    # ---- Branch terminal token ----
    if role == "branch":
        branch = db.query(Branch).filter(Branch.id == uuid.UUID(sub)).first()
        if not branch or not branch.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Branch is inactive or not found",
            )
        return BranchPrincipal(branch)  # type: ignore[return-value]

    # ---- Regular user token ----
    user = get_user_by_id(db, uuid.UUID(sub))
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


def require_role(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action",
            )
        return current_user
    return role_checker


def verify_branch_access(current_user: User, branch_id: uuid.UUID):
    """
    STAFF (and branch principals) can only touch their own branch.
    ADMIN and MANAGER can touch any branch.
    """
    if current_user.role in (UserRole.STAFF,) and current_user.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only act on your own branch",
        )
