from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.main import create_app
from app.db.session import SessionLocal
from app.models import CurrentPrice, Station

ROME_TZ = ZoneInfo("Europe/Rome")
TEST_STATION_IDS = ["99110001", "99110002"]
TEST_BRAND = "Test Nearby Brand"


def _db_available() -> bool:
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return True
        finally:
            db.close()
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _db_available(), reason="PostgreSQL test database is not available")


def test_nearby_stations_returns_distance_and_price_sorted_results() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)
        now = datetime.now(ROME_TZ)
        stale = now - timedelta(days=4)

        db.execute(
            text(
                """
                INSERT INTO stations (
                    ministerial_station_id,
                    name,
                    brand,
                    address,
                    comune,
                    provincia,
                    postal_code,
                    is_highway_station,
                    is_active,
                    services_json,
                    location,
                    source_updated_at
                ) VALUES
                    (:sid1, 'Test Station 1', :brand, 'Via Test 1', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now),
                    (:sid2, 'Test Station 2', :brand, 'Via Test 2', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5100 41.9050)'), :stale)
                    """
                ),
                {"sid1": TEST_STATION_IDS[0], "sid2": TEST_STATION_IDS[1], "brand": TEST_BRAND, "now": now, "stale": stale},
            )

        station_ids = db.execute(
            select(Station.id, Station.ministerial_station_id).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
        ).all()
        station_lookup = {ministerial_station_id: station_id for station_id, ministerial_station_id in station_ids}

        db.execute(
            text(
                """
                INSERT INTO current_prices (
                    station_id,
                    fuel_type,
                    service_mode,
                    price,
                    price_effective_at,
                    source_updated_at
                ) VALUES
                    (:station1, CAST('benzina' AS fuel_type), CAST('self' AS service_mode), 1.799, :now, :now),
                    (:station2, CAST('benzina' AS fuel_type), CAST('self' AS service_mode), 1.699, :stale, :stale)
                """
            ),
            {"station1": station_lookup[TEST_STATION_IDS[0]], "station2": station_lookup[TEST_STATION_IDS[1]], "now": now, "stale": stale},
        )
        db.commit()

        client = TestClient(create_app())
        response = client.get(
            "/api/stations/nearby",
            params={
                "lat": 41.9000,
                "lon": 12.5000,
                    "radius_meters": 5000,
                    "fuel_type": "benzina",
                    "service_mode": "self",
                    "brand": TEST_BRAND,
                    "sort": "price",
                },
            )

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 2
        assert body["items"][0]["ministerial_station_id"] == TEST_STATION_IDS[1]
        assert body["items"][0]["current_price"] == "1.699"
        assert body["items"][0]["freshness_status"] == "stale"
        assert body["items"][1]["ministerial_station_id"] == TEST_STATION_IDS[0]
        assert body["items"][1]["current_price"] == "1.799"
        assert body["items"][1]["freshness_status"] == "fresh"
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


def _cleanup_test_data(db) -> None:
    station_ids = db.scalars(
        select(Station.id).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
    ).all()
    if station_ids:
        db.execute(delete(CurrentPrice).where(CurrentPrice.station_id.in_(station_ids)))
        db.execute(delete(Station).where(Station.id.in_(station_ids)))
    db.commit()
