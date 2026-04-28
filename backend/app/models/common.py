from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import TIMESTAMP, Enum, func
from sqlalchemy.orm import Mapped, mapped_column


class FuelType(str, enum.Enum):
    BENZINA = "benzina"
    DIESEL = "diesel"
    GPL = "gpl"
    METANO = "metano"
    GNL = "gnl"
    HVO = "hvo"
    ALTRO = "altro"


class ServiceMode(str, enum.Enum):
    SELF = "self"
    SERVITO = "servito"
    UNKNOWN = "unknown"


class AlertType(str, enum.Enum):
    PRICE_THRESHOLD = "price_threshold"
    FAVORITE_STATION = "favorite_station"


class SyncStatus(str, enum.Enum):
    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


fuel_type_enum = Enum(FuelType, name="fuel_type", create_type=False)
service_mode_enum = Enum(ServiceMode, name="service_mode", create_type=False)
alert_type_enum = Enum(AlertType, name="alert_type", create_type=False)
sync_status_enum = Enum(SyncStatus, name="sync_status", create_type=False)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
