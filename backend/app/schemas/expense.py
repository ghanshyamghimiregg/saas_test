import uuid
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ExpenseCreate(BaseModel):
    branch_id: uuid.UUID
    category: str
    amount: Decimal
    description: str | None = None


class ExpenseUpdate(BaseModel):
    category: str | None = None
    amount: Decimal | None = None
    description: str | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    branch_id: uuid.UUID
    category: str
    amount: Decimal
    description: str | None
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime | None