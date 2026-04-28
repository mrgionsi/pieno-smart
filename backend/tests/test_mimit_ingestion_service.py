from datetime import date
from decimal import Decimal

from app.ingestion.models import ParsedPriceRow, ParsedStationRow
from app.ingestion.service import (
    is_highway_station,
    source_timestamp,
    station_location_wkt,
    station_postal_code,
)
from app.models.common import FuelType, ServiceMode


def test_station_helpers_extract_location_and_postal_code() -> None:
    row = ParsedStationRow(
        extraction_date=date(2026, 4, 28),
        ministerial_station_id="12345",
        manager="Gestore Demo",
        brand="Q8",
        station_type="Autostradale",
        name="Q8 Nord",
        address="Via Roma 10, 00100 Roma",
        comune="Roma",
        provincia="RM",
        latitude=41.9,
        longitude=12.5,
    )

    assert station_location_wkt(row) == "SRID=4326;POINT(12.5 41.9)"
    assert station_postal_code(row.address) == "00100"
    assert is_highway_station(row.station_type) is True


def test_station_location_wkt_returns_none_without_coordinates() -> None:
    row = ParsedStationRow(
        extraction_date=date(2026, 4, 28),
        ministerial_station_id="12345",
        manager=None,
        brand=None,
        station_type=None,
        name=None,
        address=None,
        comune=None,
        provincia=None,
        latitude=None,
        longitude=None,
    )

    assert station_location_wkt(row) is None


def test_source_timestamp_uses_8am_rome_time() -> None:
    timestamp = source_timestamp(date(2026, 4, 28))

    assert timestamp.isoformat().startswith("2026-04-28T08:00:00")
    assert timestamp.tzinfo is not None


def test_parsed_price_row_shape_for_upsert_stage() -> None:
    row = ParsedPriceRow(
        extraction_date=date(2026, 4, 28),
        ministerial_station_id="54321",
        fuel_description="Benzina",
        fuel_type=FuelType.BENZINA,
        price=Decimal("1.799"),
        service_mode=ServiceMode.SELF,
        communicated_at=None,
    )

    assert row.fuel_type is FuelType.BENZINA
    assert row.service_mode is ServiceMode.SELF
    assert row.price == Decimal("1.799")
