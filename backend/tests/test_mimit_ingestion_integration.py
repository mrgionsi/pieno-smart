from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import SessionLocal
from app.ingestion.parser import parse_price_csv, parse_station_csv
from app.ingestion.service import MimitIngestionService
from app.models import CurrentPrice, PriceChange, Station, SyncRun
from app.models.common import FuelType, ServiceMode, SyncStatus

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "mimit"
TEST_STATION_IDS = ["99000001", "99000002"]
TEST_SOURCE_NAMES = ["test.mimit.integration.v1", "test.mimit.integration.v2"]


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


def test_end_to_end_ingestion_updates_stations_prices_and_price_changes() -> None:
    db = SessionLocal()
    try:
        _cleanup_test_data(db)

        station_data = parse_station_csv((FIXTURES_DIR / "anagrafica_sample_v1.csv").read_text(encoding="utf-8"))
        prices_v1 = parse_price_csv((FIXTURES_DIR / "prezzo_sample_v1.csv").read_text(encoding="utf-8"))
        prices_v2 = parse_price_csv((FIXTURES_DIR / "prezzo_sample_v2.csv").read_text(encoding="utf-8"))

        service = MimitIngestionService(db)
        first_run = service.ingest(
            source_name=TEST_SOURCE_NAMES[0],
            station_data=station_data,
            price_data=prices_v1,
        )

        assert first_run.station_rows_seen == 2
        assert first_run.station_rows_upserted == 2
        assert first_run.price_rows_seen == 3
        assert first_run.price_rows_upserted == 3
        assert first_run.price_change_rows_inserted == 0

        stations = db.scalars(
            select(Station).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
        ).all()
        assert len(stations) == 2

        benzina_price = db.scalar(
            select(CurrentPrice).join(Station).where(
                Station.ministerial_station_id == "99000001",
                CurrentPrice.fuel_type == FuelType.BENZINA,
                CurrentPrice.service_mode == ServiceMode.SELF,
            )
        )
        assert benzina_price is not None
        assert str(benzina_price.price) == "1.799"

        second_run = service.ingest(
            source_name=TEST_SOURCE_NAMES[1],
            price_data=prices_v2,
        )

        assert second_run.station_rows_seen == 0
        assert second_run.price_rows_seen == 3
        assert second_run.price_rows_upserted == 3
        assert second_run.price_change_rows_inserted == 2

        updated_benzina_price = db.scalar(
            select(CurrentPrice).join(Station).where(
                Station.ministerial_station_id == "99000001",
                CurrentPrice.fuel_type == FuelType.BENZINA,
                CurrentPrice.service_mode == ServiceMode.SELF,
            )
        )
        assert updated_benzina_price is not None
        assert str(updated_benzina_price.price) == "1.829"

        price_changes = db.scalars(
            select(PriceChange).join(Station).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
        ).all()
        assert len(price_changes) == 2

        sync_runs = db.scalars(
            select(SyncRun).where(SyncRun.source_name.in_(TEST_SOURCE_NAMES)).order_by(SyncRun.id.asc())
        ).all()
        assert len(sync_runs) == 2
        assert all(run.status == SyncStatus.COMPLETED for run in sync_runs)
    finally:
        _cleanup_test_data(db)
        db.close()


def _cleanup_test_data(db) -> None:
    station_ids = db.scalars(
        select(Station.id).where(Station.ministerial_station_id.in_(TEST_STATION_IDS))
    ).all()

    if station_ids:
        db.execute(delete(CurrentPrice).where(CurrentPrice.station_id.in_(station_ids)))
        db.execute(delete(PriceChange).where(PriceChange.station_id.in_(station_ids)))
        db.execute(delete(Station).where(Station.id.in_(station_ids)))

    db.execute(delete(SyncRun).where(SyncRun.source_name.in_(TEST_SOURCE_NAMES)))
    db.commit()
