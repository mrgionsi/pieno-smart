from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Text, text
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
    display_name: Mapped[str | None] = mapped_column(Text)
    external_auth_subject: Mapped[str | None] = mapped_column(Text, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    default_vehicle_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_profiles.id", ondelete="SET NULL"),
    )

    vehicle_profiles = relationship(
        "VehicleProfile",
        back_populates="user",
        foreign_keys="VehicleProfile.user_id",
    )
    favorites = relationship("Favorite", back_populates="user")
    alerts = relationship("Alert", back_populates="user")
    default_vehicle_profile = relationship(
        "VehicleProfile",
        foreign_keys=[default_vehicle_profile_id],
        uselist=False,
        post_update=True,
    )
