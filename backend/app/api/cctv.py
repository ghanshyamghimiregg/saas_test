"""
CCTV access check — restricts stream access to a whitelist of user IDs
loaded from environment variables, not the database.
Implements: Authentication & Security > CCTV access restricted to 4 authorized persons
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.branch import Branch

router = APIRouter(prefix="/cctv", tags=["CCTV"])

AUTHORIZED_CCTV_USER_IDS = set(
    filter(None, settings.CCTV_AUTHORIZED_USER_IDS.split(","))
)


@router.get("/stream-access")
def check_cctv_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.id) not in AUTHORIZED_CCTV_USER_IDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access CCTV",
        )
    branches = db.query(Branch).all()
    streams = [
        {"branch_id": str(b.id), "branch_name": b.name, "stream_url": b.camera_stream_url}
        for b in branches
    ]
    return {"status": "authorized", "streams": streams}