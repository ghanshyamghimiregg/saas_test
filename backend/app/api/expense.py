"""
Expense CRUD (create/list/update/delete) — restricted to Admin/Manager.
Implements: Ledgers & Data > Expense data management
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.user import User, UserRole
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from app.crud.expense import create_expense, get_expenses, get_expense_by_id, update_expense, delete_expense

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("/", response_model=ExpenseOut, status_code=201)
def add_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return create_expense(db, expense_in, created_by=current_user.id)


@router.get("/", response_model=list[ExpenseOut])
def list_expenses(
    branch_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    return get_expenses(db, branch_id)


@router.put("/{expense_id}", response_model=ExpenseOut)
def edit_expense(
    expense_id: uuid.UUID,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    expense = get_expense_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return update_expense(db, expense, expense_in)


@router.delete("/{expense_id}", status_code=204)
def remove_expense(
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
):
    expense = get_expense_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    delete_expense(db, expense)
    