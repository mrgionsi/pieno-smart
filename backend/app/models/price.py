from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    TIMESTAMP,
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import FuelType, ServiceMode, TimestampMixin, fuel_type_enum, service_mode_enum


class CurrentPrice(TimestampMixin, Base):
    __tablename__ = "current_prices"
    __table_args__ = (
        UniqueConstraint("station_id", "fuel_type", "service_mode"),
        CheckConstraint("price > 0", name="ck_current_prices_price_positive"),
        Index("idx_current_prices_station", "station_id"),
        Index("idx_current_prices_lookup", "fuel_type", "service_mode", "price"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    station_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("stations.id", ondelete="CASCADE"),
        nullable=False,
    )
    fuel_type: Mapped[FuelType] = mapped_column(fuel_type_enum, nullable=False)
    service_mode: Mapped[ServiceMode] = mapped_column(
        service_mode_enum,
        nullable=False,
        server_default=text("'unknown'"),
    )
    price: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    price_effective_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    source_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    station = relationship("Station", back_populates="current_prices")
    alert_events = relationship("AlertEvent", back_populates="current_price")


class PriceChange(Base):
    __tablename__ = "price_changes"
    __table_args__ = (
        CheckConstraint("new_price > 0", name="ck_price_changes_new_price_positive"),
        Index("idx_price_changes_station_time", "station_id", "changed_at"),
        Index("idx_price_changes_fuel_time", "fuel_type", "changed_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    station_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("stations.id", ondelete="CASCADE"),
        nullable=False,
    )
    fuel_type: Mapped[FuelType] = mapped_column(fuel_type_enum, nullable=False)
    service_mode: Mapped[ServiceMode] = mapped_column(
        service_mode_enum,
        nullable=False,
        server_default=text("'unknown'"),
    )
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(6, 3))
    new_price: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    source_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    station = relationship("Station", back_populates="price_changes")
