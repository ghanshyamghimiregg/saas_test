import uuid
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate


def create_customer(db: Session, customer_in: CustomerCreate) -> Customer:
    db_customer = Customer(**customer_in.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def get_customers(db: Session, limit: int = 50, offset: int = 0) -> list[Customer]:
    return db.query(Customer).offset(offset).limit(limit).all()


def get_customer_by_id(db: Session, customer_id: uuid.UUID) -> Customer | None:
    return db.query(Customer).filter(Customer.id == customer_id).first()

def get_customer_by_phone(db: Session, phone: str) -> Customer | None:
    return db.query(Customer).filter(Customer.phone == phone).first()