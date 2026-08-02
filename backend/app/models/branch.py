"""
Branch model — represents a physical shop location.
Implements: Infrastructure > Branch-wise data architecture (multi-branch database)
Owned by: Ankush (shared table — other modules FK into this)
"""

import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Branch(Base):
    __tablename__ = "branch"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)  # short code, e.g. "KTM01" — used for barcode prefix + POS login
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # app/models/branch.py
    password_hash = Column(String, nullable=True)
    camera_stream_url = Column(String, nullable=True)  # filled in once a camera model/vendor is chosen# nullable initially so existing branches don't break