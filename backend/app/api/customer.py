"""
Customer CRUD — open to any logged-in user (Staff register customers at checkout).
Implements: shared foundation for Ledgers (Ankush) and Loyalty features (Bishan)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerOut
from app.crud.customer import create_customer, get_customers, get_customer_by_phone

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("/", response_model=CustomerOut, status_code=201)
def add_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_customer(db, customer_in)


@router.get("/", response_model=list[CustomerOut])
def list_customers(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_customers(db, limit, offset)


@router.get("/lookup", response_model=CustomerOut | None)
def lookup_customer(
    phone: str = Query(..., min_length=10, max_length=10, pattern=r"^\d{10}$"),
    db: Session = Depends(get_db),
):
    customer = get_customer_by_phone(db, phone)
    return customer