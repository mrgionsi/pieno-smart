from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
import re
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ingestion.models import ParsedPriceRow, ParsedStationRow, PriceFileParseResult, StationFileParseResult
from app.models import CurrentPrice, PriceChange, Station, SyncRun
from app.models.common import SyncStatus

ROME_TZ = ZoneInfo("Europe/Rome")
POSTAL_CODE_RE = re.compile(r"\b(\d{5})\b")


@dataclass(slots=True)
class IngestionCounters:
    station_rows_seen: int = 0
    station_rows_upserted: int = 0
    station_rows_skipped: int = 0
    price_rows_seen: int = 0
    price_rows_upserted: int = 0
    price_change_rows_inserted: int = 0
    price_rows_skipped: int = 0


class MimitIngestionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def ingest(
        self,
        *,
        source_name: str,
        station_data: StationFileParseResult | None = None,
        price_data: PriceFileParseResult | None = None,
    ) -> IngestionCounters:
        counters = IngestionCounters()
        sync_run = SyncRun(source_name=source_name, status=SyncStatus.STARTED)
        self.db.add(sync_run)
        self.db.flush()
        self.db.commit()

        try:
            station_lookup: dict[str, int] = {}
            sync_run = self.db.get(SyncRun, sync_run.id)
            if sync_run is None:
                raise RuntimeError("Sync run was not persisted correctly.")

            if station_data is not None:
                station_lookup = self._ingest_stations(station_data, counters)
            if price_data is not None:
                if not station_lookup:
                    station_lookup = self._load_station_lookup()
                self._ingest_prices(price_data, station_lookup, counters)

            sync_run.status = SyncStatus.COMPLETED
            sync_run.completed_at = datetime.now(ROME_TZ)
            sync_run.station_records_seen = counters.station_rows_seen
            sync_run.price_records_seen = counters.price_rows_seen
            sync_run.station_records_upserted = counters.station_rows_upserted
            sync_run.price_records_upserted = counters.price_rows_upserted
            sync_run.price_change_records_inserted = counters.price_change_rows_inserted
            self.db.commit()
            return counters
        except Exception as exc:
            self.db.rollback()
            failed_sync_run = self.db.get(SyncRun, sync_run.id)
            if failed_sync_run is not None:
                failed_sync_run.status = SyncStatus.FAILED
                failed_sync_run.completed_at = datetime.now(ROME_TZ)
                failed_sync_run.station_records_seen = counters.station_rows_seen
                failed_sync_run.price_records_seen = counters.price_rows_seen
                failed_sync_run.station_records_upserted = counters.station_rows_upserted
                failed_sync_run.price_records_upserted = counters.price_rows_upserted
                failed_sync_run.price_change_records_inserted = counters.price_change_rows_inserted
                failed_sync_run.error_message = str(exc)
                self.db.commit()
            raise

    def _ingest_stations(
        self,
        station_data: StationFileParseResult,
        counters: IngestionCounters,
    ) -> dict[str, int]:
        station_lookup: dict[str, int] = {}
        source_updated_at = source_timestamp(station_data.extraction_date)

        for row in station_data.rows:
            counters.station_rows_seen += 1
            station_id = self._upsert_station(row, source_updated_at)
            if station_id is None:
                counters.station_rows_skipped += 1
                continue
            station_lookup[row.ministerial_station_id] = station_id
            counters.station_rows_upserted += 1

        self.db.flush()
        return station_lookup

    def _ingest_prices(
        self,
        price_data: PriceFileParseResult,
        station_lookup: dict[str, int],
        counters: IngestionCounters,
    ) -> None:
        source_updated_at = source_timestamp(price_data.extraction_date)

        for row in price_data.rows:
            counters.price_rows_seen += 1
            station_id = station_lookup.get(row.ministerial_station_id)
            if station_id is None:
                counters.price_rows_skipped += 1
                continue

            change_written = self._upsert_current_price(
                station_id=station_id,
                row=row,
                source_updated_at=source_updated_at,
            )
            counters.price_rows_upserted += 1
            if change_written:
                counters.price_change_rows_inserted += 1

    def _upsert_station(self, row: ParsedStationRow, source_updated_at: datetime) -> int | None:
        location_wkt = station_location_wkt(row)
        if location_wkt is None:
            return None

        existing_id = self.db.scalar(
            select(Station.id).where(Station.ministerial_station_id == row.ministerial_station_id)
        )
        params = {
            "ministerial_station_id": row.ministerial_station_id,
            "name": row.name,
            "brand": row.brand,
            "address": row.address,
            "comune": row.comune,
            "provincia": row.provincia,
            "postal_code": station_postal_code(row.address),
            "is_highway_station": is_highway_station(row.station_type),
            "is_active": True,
            "services_json": None,
            "location_wkt": location_wkt,
            "source_updated_at": source_updated_at,
        }

        if existing_id is None:
            inserted_id = self.db.execute(
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
                    ) VALUES (
                        :ministerial_station_id,
                        :name,
                        :brand,
                        :address,
                        :comune,
                        :provincia,
                        :postal_code,
                        :is_highway_station,
                        :is_active,
                        CAST(:services_json AS jsonb),
                        ST_GeogFromText(:location_wkt),
                        :source_updated_at
                    )
                    RETURNING id
                    """
                ),
                params,
            ).scalar_one()
            return int(inserted_id)

        self.db.execute(
            text(
                """
                UPDATE stations
                SET
                    name = :name,
                    brand = :brand,
                    address = :address,
                    comune = :comune,
                    provincia = :provincia,
                    postal_code = :postal_code,
                    is_highway_station = :is_highway_station,
                    is_active = :is_active,
                    services_json = CAST(:services_json AS jsonb),
                    location = ST_GeogFromText(:location_wkt),
                    source_updated_at = :source_updated_at,
                    updated_at = now()
                WHERE id = :station_id
                """
            ),
            {**params, "station_id": existing_id},
        )
        return int(existing_id)

    def _upsert_current_price(
        self,
        *,
        station_id: int,
        row: ParsedPriceRow,
        source_updated_at: datetime,
    ) -> bool:
        existing = self.db.scalar(
            select(CurrentPrice).where(
                CurrentPrice.station_id == station_id,
                CurrentPrice.fuel_type == row.fuel_type,
                CurrentPrice.service_mode == row.service_mode,
            )
        )

        if existing is None:
            self.db.add(
                CurrentPrice(
                    station_id=station_id,
                    fuel_type=row.fuel_type,
                    service_mode=row.service_mode,
                    price=row.price,
                    price_effective_at=row.communicated_at,
                    source_updated_at=source_updated_at,
                )
            )
            return False

        if existing.price != row.price:
            self.db.add(
                PriceChange(
                    station_id=station_id,
                    fuel_type=row.fuel_type,
                    service_mode=row.service_mode,
                    old_price=existing.price,
                    new_price=row.price,
                    changed_at=row.communicated_at or source_updated_at,
                    source_updated_at=source_updated_at,
                )
            )
            existing.price = row.price
            existing.price_effective_at = row.communicated_at
            existing.source_updated_at = source_updated_at
            return True

        existing.price_effective_at = row.communicated_at
        existing.source_updated_at = source_updated_at
        return False

    def _load_station_lookup(self) -> dict[str, int]:
        rows = self.db.execute(select(Station.ministerial_station_id, Station.id)).all()
        return {ministerial_station_id: int(station_id) for ministerial_station_id, station_id in rows}


def source_timestamp(extraction_date: date) -> datetime:
    return datetime.combine(extraction_date, time(hour=8, minute=0), tzinfo=ROME_TZ)


def station_postal_code(address: str | None) -> str | None:
    if address is None:
        return None
    match = POSTAL_CODE_RE.search(address)
    return match.group(1) if match else None


def is_highway_station(station_type: str | None) -> bool | None:
    if station_type is None:
        return None
    normalized = station_type.strip().lower()
    if not normalized:
        return None
    return normalized == "autostradale"


def station_location_wkt(row: ParsedStationRow) -> str | None:
    if row.latitude is None or row.longitude is None:
        return None
    return f"SRID=4326;POINT({row.longitude} {row.latitude})"
