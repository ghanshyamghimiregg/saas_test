import uuid
from sqlalchemy.orm import Session

from app.models.party import Party
from app.schemas.party import PartyCreate


def create_party(db: Session, party_in: PartyCreate) -> Party:
    db_party = Party(**party_in.model_dump())
    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    return db_party


def get_parties(db: Session) -> list[Party]:
    return db.query(Party).all()

