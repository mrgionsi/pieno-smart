from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    TIMESTAMP,
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import FuelType, ServiceMode, TimestampMixin, fuel_type_enum, service_mode_enum


class VehicleProfile(TimestampMixin, Base):
    __tablename__ = "vehicle_profiles"
    __table_args__ = (
        CheckConstraint(
            "avg_consumption_l_per_100km > 0",
            name="ck_vehicle_profiles_avg_consumption_positive",
        ),
        Index("idx_vehicle_profiles_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    fuel_type: Mapped[FuelType] = mapped_column(fuel_type_enum, nullable=False)
    avg_consumption_l_per_100km: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    tank_capacity_liters: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    preferred_service_mode: Mapped[ServiceMode] = mapped_column(
        service_mode_enum,
        nullable=False,
        server_default=text("'self'"),
    )
    preferred_brands: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
    )
    excluded_brands: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
    )
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    user = relationship("AppUser", back_populates="vehicle_profiles", foreign_keys=[user_id])
    alerts = relationship("Alert", back_populates="vehicle_profile")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "station_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
    )
    station_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("stations.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    user = relationship("AppUser", back_populates="favorites")
    station = relationship("Station", back_populates="favorites")
