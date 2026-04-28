from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from app.models.common import FuelType, ServiceMode


@dataclass(slots=True)
class ParsedStationRow:
    extraction_date: date
    ministerial_station_id: str
    manager: str | None
    brand: str | None
    station_type: str | None
    name: str | None
    address: str | None
    comune: str | None
    provincia: str | None
    latitude: float | None
    longitude: float | None


@dataclass(slots=True)
class ParsedPriceRow:
    extraction_date: date
    ministerial_station_id: str
    fuel_description: str
    fuel_type: FuelType
    price: Decimal
    service_mode: ServiceMode
    communicated_at: datetime | None


@dataclass(slots=True)
class StationFileParseResult:
    extraction_date: date
    rows: list[ParsedStationRow]


@dataclass(slots=True)
class PriceFileParseResult:
    extraction_date: date
    rows: list[ParsedPriceRow]
