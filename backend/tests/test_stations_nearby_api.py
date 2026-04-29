from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import get_db
from app.main import create_app
from app.db.session import SessionLocal
from app.models import CurrentPrice, Station

ROME_TZ = ZoneInfo("Europe/Rome")
TEST_STATION_IDS = ["99110001", "99110002", "99110003"]
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


db_required = pytest.mark.skipif(not _db_available(), reason="PostgreSQL test database is not available")


@db_required
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


@db_required
def test_station_detail_returns_all_current_prices() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)
        now = datetime.now(ROME_TZ)

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
                    (:sid1, 'Detail Station', :brand, 'Via Detail 1', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now)
                """
            ),
            {"sid1": TEST_STATION_IDS[0], "brand": TEST_BRAND, "now": now},
        )
        station_id = db.scalar(
            select(Station.id).where(Station.ministerial_station_id == TEST_STATION_IDS[0])
        )
        assert station_id is not None

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
                    (:station_id, CAST('benzina' AS fuel_type), CAST('self' AS service_mode), 1.799, :now, :now),
                    (:station_id, CAST('benzina' AS fuel_type), CAST('servito' AS service_mode), 1.899, :now, :now),
                    (:station_id, CAST('gpl' AS fuel_type), CAST('servito' AS service_mode), 0.799, :now, :now)
                """
            ),
            {"station_id": station_id, "now": now},
        )
        db.commit()

        client = TestClient(create_app())
        response = client.get(f"/api/stations/{station_id}")

        assert response.status_code == 200
        body = response.json()
        assert body["ministerial_station_id"] == TEST_STATION_IDS[0]
        assert body["freshness_status"] == "fresh"
        assert len(body["prices"]) == 3
        assert body["prices"][0]["fuel_type"] == "benzina"
        assert body["prices"][0]["service_mode"] == "self"
        assert body["prices"][1]["service_mode"] == "servito"
        assert body["prices"][2]["fuel_type"] == "gpl"
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


def test_nearby_stations_rejects_invalid_coordinates() -> None:
    client = TestClient(create_app())

    response = client.get(
        "/api/stations/nearby",
        params={"lat": 100.0, "lon": 14.3027, "radius_meters": 5000},
    )

    assert response.status_code == 422


def test_nearby_stations_rejects_invalid_sort_value() -> None:
    client = TestClient(create_app())

    response = client.get(
        "/api/stations/nearby",
        params={"lat": 41.0586, "lon": 14.3027, "radius_meters": 5000, "sort": "fastest"},
    )

    assert response.status_code == 422


def test_nearby_stations_rejects_convenience_sort_without_fuel_type() -> None:
    client = TestClient(create_app())

    response = client.get(
        "/api/stations/nearby",
        params={"lat": 41.0586, "lon": 14.3027, "radius_meters": 5000, "sort": "convenience"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "fuel_type is required when sort=convenience"


@db_required
def test_nearby_stations_returns_empty_list_when_filters_do_not_match() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)
        now = datetime.now(ROME_TZ)
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
                    (:sid1, 'Filtered Station', :brand, 'Via Test 1', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now)
                """
            ),
            {"sid1": TEST_STATION_IDS[0], "brand": TEST_BRAND, "now": now},
        )
        db.commit()

        client = TestClient(create_app())
        response = client.get(
            "/api/stations/nearby",
            params={
                "lat": 41.9000,
                "lon": 12.5000,
                "radius_meters": 5000,
                "fuel_type": "gnl",
                "service_mode": "self",
                "brand": TEST_BRAND,
            },
        )

        assert response.status_code == 200
        assert response.json()["items"] == []
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


@db_required
def test_nearby_stations_returns_convenience_ranking_with_scores_and_reasons() -> None:
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
                    (:sid1, 'Convenience Station 1', :brand, 'Via Test 1', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now),
                    (:sid2, 'Convenience Station 2', :brand, 'Via Test 2', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5140 41.9140)'), :stale),
                    (:sid3, 'Convenience Station 3', :brand, 'Via Test 3', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5100 41.9090)'), :now)
                """
            ),
            {
                "sid1": TEST_STATION_IDS[0],
                "sid2": TEST_STATION_IDS[1],
                "sid3": TEST_STATION_IDS[2],
                "brand": TEST_BRAND,
                "now": now,
                "stale": stale,
            },
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
                    (:station1, CAST('benzina' AS fuel_type), CAST('self' AS service_mode), 1.700, :now, :now),
                    (:station2, CAST('benzina' AS fuel_type), CAST('servito' AS service_mode), 1.690, :stale, :stale),
                    (:station3, CAST('diesel' AS fuel_type), CAST('self' AS service_mode), 1.500, :now, :now)
                """
            ),
            {
                "station1": station_lookup[TEST_STATION_IDS[0]],
                "station2": station_lookup[TEST_STATION_IDS[1]],
                "station3": station_lookup[TEST_STATION_IDS[2]],
                "now": now,
                "stale": stale,
            },
        )
        db.commit()

        client = TestClient(create_app())
        response = client.get(
            "/api/stations/nearby",
            params={
                "lat": 41.9000,
                "lon": 12.5000,
                "radius_meters": 2000,
                "fuel_type": "benzina",
                "service_mode": "self",
                "brand": TEST_BRAND,
                "sort": "convenience",
                "limit": 10,
            },
        )

        assert response.status_code == 200
        body = response.json()
        items = body["items"]
        assert len(items) == 2
        assert items[0]["ministerial_station_id"] == TEST_STATION_IDS[0]
        assert items[0]["score"] is not None
        assert items[0]["score"] > items[1]["score"]
        assert "fresh price data" in items[0]["match_reasons"]
        assert "matches requested self service" in items[0]["match_reasons"]
        assert items[1]["freshness_status"] == "stale"
        assert "price data may be outdated" in items[1]["match_reasons"]
        assert all(item["selected_fuel_type"] == "benzina" for item in items)
        assert TEST_STATION_IDS[2] not in {item["ministerial_station_id"] for item in items}
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


@db_required
def test_station_detail_returns_empty_prices_when_station_has_no_current_prices() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)
        now = datetime.now(ROME_TZ)
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
                    (:sid1, 'No Prices Station', :brand, 'Via Test 1', 'Roma', 'RM', '00100', false, true, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now)
                """
            ),
            {"sid1": TEST_STATION_IDS[0], "brand": TEST_BRAND, "now": now},
        )
        station_id = db.scalar(select(Station.id).where(Station.ministerial_station_id == TEST_STATION_IDS[0]))
        assert station_id is not None
        db.commit()

        client = TestClient(create_app())
        response = client.get(f"/api/stations/{station_id}")

        assert response.status_code == 200
        body = response.json()
        assert body["ministerial_station_id"] == TEST_STATION_IDS[0]
        assert body["prices"] == []
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


@db_required
def test_station_detail_returns_404_for_missing_station() -> None:
    client = TestClient(create_app(), raise_server_exceptions=False)

    response = client.get("/api/stations/999999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Station not found"


@db_required
def test_station_detail_returns_404_for_inactive_station() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)
        now = datetime.now(ROME_TZ)
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
                    (:sid1, 'Inactive Station', :brand, 'Via Test 1', 'Roma', 'RM', '00100', false, false, CAST(NULL AS jsonb), ST_GeogFromText('SRID=4326;POINT(12.5000 41.9000)'), :now)
                """
            ),
            {"sid1": TEST_STATION_IDS[0], "brand": TEST_BRAND, "now": now},
        )
        station_id = db.scalar(select(Station.id).where(Station.ministerial_station_id == TEST_STATION_IDS[0]))
        assert station_id is not None
        db.commit()

        client = TestClient(create_app(), raise_server_exceptions=False)
        response = client.get(f"/api/stations/{station_id}")

        assert response.status_code == 404
    finally:
        db.rollback()
        _cleanup_test_data(db)
        db.close()


def test_nearby_stations_returns_500_when_database_fails() -> None:
    app = create_app()

    class BrokenSession:
        def execute(self, *args, **kwargs):  # noqa: ANN002, ANN003
            raise SQLAlchemyError("database unavailable")

        def close(self) -> None:
            return None

    def override_get_db():
        broken = BrokenSession()
        try:
            yield broken
        finally:
            broken.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(
            "/api/stations/nearby",
            params={"lat": 41.0586, "lon": 14.3027, "radius_meters": 5000},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500


def _cleanup_test_data(db) -> None:
    station_ids = db.scalars(
        select(Station.id).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
    ).all()
    if station_ids:
        db.execute(delete(CurrentPrice).where(CurrentPrice.station_id.in_(station_ids)))
        db.execute(delete(Station).where(Station.id.in_(station_ids)))
    db.commit()
