from __future__ import annotations

import uuid

from sqlalchemy import Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin


class AppUser(TimestampMixin, Base):
    __tablename__ = "app_users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str | None] = mapped_column(Text, unique=True)

    vehicle_profiles = relationship("VehicleProfile", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    alerts = relationship("Alert", back_populates="user")
