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
    Integer,
    Numeric,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GeographyPoint
from app.models.common import AlertType, FuelType, TimestampMixin, alert_type_enum, fuel_type_enum


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("radius_meters > 0", name="ck_alerts_radius_positive"),
        Index("idx_alerts_user", "user_id"),
        Index("idx_alerts_center", "center", postgresql_using="gist"),
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
    vehicle_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_profiles.id", ondelete="SET NULL"),
    )
    station_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("stations.id", ondelete="CASCADE"),
    )
    alert_type: Mapped[AlertType] = mapped_column(alert_type_enum, nullable=False)
    fuel_type: Mapped[FuelType | None] = mapped_column(fuel_type_enum)
    threshold_price: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))
    center: Mapped[str | None] = mapped_column(GeographyPoint())
    radius_meters: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    user = relationship("AppUser", back_populates="alerts")
    vehicle_profile = relationship("VehicleProfile", back_populates="alerts")
    station = relationship("Station", back_populates="alerts")
    alert_events = relationship("AlertEvent", back_populates="alert")


class AlertEvent(Base):
    __tablename__ = "alert_events"
    __table_args__ = (Index("idx_alert_events_alert_time", "alert_id", "triggered_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
    )
    station_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("stations.id", ondelete="SET NULL"),
    )
    current_price_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("current_prices.id", ondelete="SET NULL"),
    )
    triggered_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))

    alert = relationship("Alert", back_populates="alert_events")
    current_price = relationship("CurrentPrice", back_populates="alert_events")
