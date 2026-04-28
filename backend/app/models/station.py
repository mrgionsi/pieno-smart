from __future__ import annotations

from datetime import datetime

from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Index, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import GeographyPoint
from app.models.common import TimestampMixin


class Station(TimestampMixin, Base):
    __tablename__ = "stations"
    __table_args__ = (
        Index("idx_stations_location", "location", postgresql_using="gist"),
        Index("idx_stations_comune", "comune"),
        Index("idx_stations_brand", "brand"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ministerial_station_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    comune: Mapped[str | None] = mapped_column(Text)
    provincia: Mapped[str | None] = mapped_column(Text)
    postal_code: Mapped[str | None] = mapped_column(Text)
    is_highway_station: Mapped[bool | None] = mapped_column(Boolean)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    services_json: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    location: Mapped[str] = mapped_column(GeographyPoint(), nullable=False)
    source_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    current_prices = relationship("CurrentPrice", back_populates="station")
    price_changes = relationship("PriceChange", back_populates="station")
    favorites = relationship("Favorite", back_populates="station")
    alerts = relationship("Alert", back_populates="station")
