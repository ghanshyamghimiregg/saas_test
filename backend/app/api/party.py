"""
Party (supplier) CRUD — restricted to Admin/Manager.
Implements: Ledgers & Data > Sales ledger and party ledger
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.schemas.party import PartyCreate, PartyOut
from app.crud.party import create_party, get_parties

router = APIRouter(prefix="/parties", tags=["Parties"])


@router.post("/", response_model=PartyOut, status_code=201)
def add_party(
    party_in: PartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return create_party(db, party_in)


@router.get("/", response_model=list[PartyOut])
def list_parties(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER))):
    return get_parties(db)