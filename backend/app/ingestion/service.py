from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal
from itertools import islice
from time import perf_counter
import re
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.ingestion.models import ParsedPriceRow, ParsedStationRow, PriceFileParseResult, StationFileParseResult
from app.models import CurrentPrice, PriceChange, Station, SyncRun
from app.models.common import FuelType, ServiceMode, SyncStatus

ROME_TZ = ZoneInfo("Europe/Rome")
POSTAL_CODE_RE = re.compile(r"\b(\d{5})\b")
EARLY_PROGRESS_MARKERS = {1, 100, 500, 1_000}
PROGRESS_LOG_EVERY = 5_000
BATCH_SIZE = 1_000


@dataclass(slots=True)
class CurrentPriceState:
    id: int
    price: Decimal


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

            self.db.expire_all()
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
        station_lookup = self._load_station_lookup()
        source_updated_at = source_timestamp(station_data.extraction_date)
        total_rows = len(station_data.rows)
        phase_started_at = perf_counter()

        self._log(
            "Station upsert phase started",
            total_rows=total_rows,
            existing_stations=len(station_lookup),
        )

        station_upsert_rows: list[dict[str, object]] = []
        for index, row in enumerate(station_data.rows, start=1):
            counters.station_rows_seen += 1
            upsert_payload = self._build_station_upsert_payload(row, source_updated_at)
            if upsert_payload is None:
                counters.station_rows_skipped += 1
            else:
                station_upsert_rows.append(upsert_payload)
                counters.station_rows_upserted += 1

            if index in EARLY_PROGRESS_MARKERS or index % PROGRESS_LOG_EVERY == 0 or index == total_rows:
                self._log(
                    "Station upsert progress",
                    processed=index,
                    total_rows=total_rows,
                    upserted=counters.station_rows_upserted,
                    skipped=counters.station_rows_skipped,
                    elapsed_seconds=f"{perf_counter() - phase_started_at:.2f}",
                )

        self._execute_station_upserts(station_upsert_rows)
        self.db.flush()
        station_lookup = self._load_station_lookup()
        self._log(
            "Station upsert phase completed",
            total_rows=total_rows,
            upserted=counters.station_rows_upserted,
            skipped=counters.station_rows_skipped,
            elapsed_seconds=f"{perf_counter() - phase_started_at:.2f}",
        )
        return station_lookup

    def _ingest_prices(
        self,
        price_data: PriceFileParseResult,
        station_lookup: dict[str, int],
        counters: IngestionCounters,
    ) -> None:
        source_updated_at = source_timestamp(price_data.extraction_date)
        total_rows = len(price_data.rows)
        phase_started_at = perf_counter()
        current_price_lookup = self._load_current_price_lookup()

        self._log(
            "Price upsert phase started",
            total_rows=total_rows,
            existing_prices=len(current_price_lookup),
        )

        current_price_inserts: list[dict[str, object]] = []
        current_price_updates: list[dict[str, object]] = []
        price_change_inserts: list[dict[str, object]] = []

        for index, row in enumerate(price_data.rows, start=1):
            counters.price_rows_seen += 1
            station_id = station_lookup.get(row.ministerial_station_id)
            if station_id is None:
                counters.price_rows_skipped += 1
            else:
                lookup_key = (station_id, row.fuel_type, row.service_mode)
                existing = current_price_lookup.get(lookup_key)
                if existing is None:
                    current_price_inserts.append(
                        {
                            "station_id": station_id,
                            "fuel_type": row.fuel_type.value,
                            "service_mode": row.service_mode.value,
                            "price": row.price,
                            "price_effective_at": row.communicated_at,
                            "source_updated_at": source_updated_at,
                        }
                    )
                else:
                    current_price_updates.append(
                        {
                            "id": existing.id,
                            "price": row.price,
                            "price_effective_at": row.communicated_at,
                            "source_updated_at": source_updated_at,
                        }
                    )
                    if existing.price != row.price:
                        price_change_inserts.append(
                            {
                                "station_id": station_id,
                                "fuel_type": row.fuel_type.value,
                                "service_mode": row.service_mode.value,
                                "old_price": existing.price,
                                "new_price": row.price,
                                "changed_at": row.communicated_at or source_updated_at,
                                "source_updated_at": source_updated_at,
                            }
                        )
                        counters.price_change_rows_inserted += 1

                current_price_lookup[lookup_key] = CurrentPriceState(
                    id=existing.id if existing is not None else -1,
                    price=row.price,
                )
                counters.price_rows_upserted += 1

            if index % PROGRESS_LOG_EVERY == 0 or index == total_rows:
                self._log(
                    "Price upsert progress",
                    processed=index,
                    total_rows=total_rows,
                    upserted=counters.price_rows_upserted,
                    skipped=counters.price_rows_skipped,
                    price_changes=counters.price_change_rows_inserted,
                    elapsed_seconds=f"{perf_counter() - phase_started_at:.2f}",
                )

        self._execute_current_price_inserts(current_price_inserts)
        if current_price_updates:
            self._execute_current_price_updates(current_price_updates)
        if price_change_inserts:
            self._execute_price_change_inserts(price_change_inserts)

        self._log(
            "Price upsert phase completed",
            total_rows=total_rows,
            upserted=counters.price_rows_upserted,
            skipped=counters.price_rows_skipped,
            price_changes=counters.price_change_rows_inserted,
            elapsed_seconds=f"{perf_counter() - phase_started_at:.2f}",
        )

    def _build_station_upsert_payload(
        self,
        row: ParsedStationRow,
        source_updated_at: datetime,
    ) -> dict[str, object] | None:
        location_wkt = station_location_wkt(row)
        if location_wkt is None:
            return None

        return {
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

    def _execute_station_upserts(self, rows: list[dict[str, object]]) -> None:
        if not rows:
            return

        statement = text(
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
            ON CONFLICT (ministerial_station_id) DO UPDATE
            SET
                name = EXCLUDED.name,
                brand = EXCLUDED.brand,
                address = EXCLUDED.address,
                comune = EXCLUDED.comune,
                provincia = EXCLUDED.provincia,
                postal_code = EXCLUDED.postal_code,
                is_highway_station = EXCLUDED.is_highway_station,
                is_active = EXCLUDED.is_active,
                services_json = EXCLUDED.services_json,
                location = EXCLUDED.location,
                source_updated_at = EXCLUDED.source_updated_at,
                updated_at = now()
            """
        )
        for batch in chunked(rows, BATCH_SIZE):
            self.db.execute(statement, batch)

    def _execute_current_price_inserts(self, rows: list[dict[str, object]]) -> None:
        if not rows:
            return
        statement = text(
            """
            INSERT INTO current_prices (
                station_id,
                fuel_type,
                service_mode,
                price,
                price_effective_at,
                source_updated_at,
                updated_at
            ) VALUES (
                :station_id,
                CAST(:fuel_type AS fuel_type),
                CAST(:service_mode AS service_mode),
                :price,
                :price_effective_at,
                :source_updated_at,
                now()
            )
            ON CONFLICT (station_id, fuel_type, service_mode) DO UPDATE
            SET
                price = EXCLUDED.price,
                price_effective_at = EXCLUDED.price_effective_at,
                source_updated_at = EXCLUDED.source_updated_at,
                updated_at = EXCLUDED.updated_at
            """
        )
        for batch in chunked(rows, BATCH_SIZE):
            self.db.execute(statement, batch)

    def _execute_current_price_updates(self, rows: list[dict[str, object]]) -> None:
        statement = text(
            """
            UPDATE current_prices
            SET
                price = :price,
                price_effective_at = :price_effective_at,
                source_updated_at = :source_updated_at,
                updated_at = now()
            WHERE id = :id
            """
        )
        for batch in chunked(rows, BATCH_SIZE):
            self.db.execute(statement, batch)

    def _execute_price_change_inserts(self, rows: list[dict[str, object]]) -> None:
        statement = text(
            """
            INSERT INTO price_changes (
                station_id,
                fuel_type,
                service_mode,
                old_price,
                new_price,
                changed_at,
                source_updated_at
            ) VALUES (
                :station_id,
                CAST(:fuel_type AS fuel_type),
                CAST(:service_mode AS service_mode),
                :old_price,
                :new_price,
                :changed_at,
                :source_updated_at
            )
            """
        )
        for batch in chunked(rows, BATCH_SIZE):
            self.db.execute(statement, batch)

    def _load_station_lookup(self) -> dict[str, int]:
        rows = self.db.execute(select(Station.ministerial_station_id, Station.id)).all()
        return {ministerial_station_id: int(station_id) for ministerial_station_id, station_id in rows}

    def _load_current_price_lookup(self) -> dict[tuple[int, FuelType, ServiceMode], CurrentPriceState]:
        rows = self.db.execute(
            select(
                CurrentPrice.id,
                CurrentPrice.station_id,
                CurrentPrice.fuel_type,
                CurrentPrice.service_mode,
                CurrentPrice.price,
            )
        ).all()
        return {
            (
                int(station_id),
                fuel_type,
                service_mode,
            ): CurrentPriceState(id=int(current_price_id), price=price)
            for current_price_id, station_id, fuel_type, service_mode, price in rows
        }

    def _log(self, message: str, **fields: object) -> None:
        if fields:
            suffix = " ".join(f"{key}={value}" for key, value in fields.items())
            print(f"[INGEST] {message} {suffix}", flush=True)
            return
        print(f"[INGEST] {message}", flush=True)


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


def chunked(items: list[dict[str, object]], size: int) -> list[list[dict[str, object]]]:
    iterator = iter(items)
    chunks: list[list[dict[str, object]]] = []
    while batch := list(islice(iterator, size)):
        chunks.append(batch)
    return chunks
