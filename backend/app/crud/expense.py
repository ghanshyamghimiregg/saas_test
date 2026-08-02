import uuid
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


def create_expense(db: Session, expense_in: ExpenseCreate, created_by: uuid.UUID) -> Expense:
    expense = Expense(**expense_in.model_dump(), created_by=created_by)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def get_expenses(db: Session, branch_id: uuid.UUID | None = None):
    query = db.query(Expense)
    if branch_id:
        query = query.filter(Expense.branch_id == branch_id)
    return query.order_by(Expense.created_at.desc()).all()


def get_expense_by_id(db: Session, expense_id: uuid.UUID) -> Expense | None:
    return db.query(Expense).filter(Expense.id == expense_id).first()


def update_expense(db: Session, expense: Expense, expense_in: ExpenseUpdate) -> Expense:
    for field, value in expense_in.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense: Expense) -> None:
    db.delete(expense)
    db.commit()