import uuid
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(db: Session, action: str, user_id: uuid.UUID | None, ip_address: str | None, details: str | None = None):
    entry = AuditLog(action=action, user_id=user_id, ip_address=ip_address, details=details)
    db.add(entry)
    db.commit()