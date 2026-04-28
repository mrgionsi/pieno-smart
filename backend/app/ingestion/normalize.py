from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
import unicodedata

from app.models.common import FuelType, ServiceMode


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalize_station_id(value: str) -> str:
    station_id = value.strip()
    if not station_id:
        raise ValueError("Missing idimpianto")
    return station_id


def parse_optional_float(value: str | None) -> float | None:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    return float(normalized)


def parse_price(value: str) -> Decimal:
    normalized = value.strip()
    try:
        return Decimal(normalized)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid price value: {value}") from exc


def parse_service_mode(value: str) -> ServiceMode:
    normalized = value.strip()
    if normalized == "1":
        return ServiceMode.SELF
    if normalized == "0":
        return ServiceMode.SERVITO
    return ServiceMode.UNKNOWN


def parse_italian_datetime(value: str | None) -> datetime | None:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    return datetime.strptime(normalized, "%d/%m/%Y %H:%M:%S")


def normalize_fuel_type(value: str) -> FuelType:
    slug = _slugify(value)

    if "benzina" in slug:
        return FuelType.BENZINA
    if "gasolio" in slug or "diesel" in slug:
        return FuelType.DIESEL
    if "gpl" in slug:
        return FuelType.GPL
    if "metano" in slug:
        return FuelType.METANO
    if "gnl" in slug or "lng" in slug:
        return FuelType.GNL
    if "hvo" in slug:
        return FuelType.HVO

    return FuelType.ALTRO


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.strip().lower()
