from __future__ import annotations

import argparse
from pathlib import Path
from time import perf_counter

from app.db.session import SessionLocal
from app.ingestion.client import MimitDatasetClient
from app.ingestion.parser import parse_price_csv, parse_station_csv
from app.ingestion.service import MimitIngestionService


def main() -> None:
    started_at = perf_counter()
    args = build_parser().parse_args()
    station_data = None
    price_data = None
    source_name = args.source_name

    if args.download_current:
        _log("Starting live MIMIT download")
        client = MimitDatasetClient()
        try:
            payload = client.download_current_snapshot()
        finally:
            client.close()
        _log("Download completed, parsing station CSV")
        station_data = parse_station_csv(payload.stations_content)
        _log(
            "Station CSV parsed",
            extraction_date=station_data.extraction_date.isoformat(),
            rows=len(station_data.rows),
        )
        _log("Parsing price CSV")
        price_data = parse_price_csv(payload.prices_content)
        _log(
            "Price CSV parsed",
            extraction_date=price_data.extraction_date.isoformat(),
            rows=len(price_data.rows),
        )
        source_name = "mimit.current-page"
    else:
        if not args.stations_file and not args.prices_file:
            raise SystemExit(
                "Provide --download-current or at least one of --stations-file / --prices-file."
            )
        if args.stations_file:
            _log("Parsing station CSV from file", path=args.stations_file)
            station_data = parse_station_csv(Path(args.stations_file).read_text(encoding="utf-8"))
            _log(
                "Station CSV parsed",
                extraction_date=station_data.extraction_date.isoformat(),
                rows=len(station_data.rows),
            )
        if args.prices_file:
            _log("Parsing price CSV from file", path=args.prices_file)
            price_data = parse_price_csv(Path(args.prices_file).read_text(encoding="utf-8"))
            _log(
                "Price CSV parsed",
                extraction_date=price_data.extraction_date.isoformat(),
                rows=len(price_data.rows),
            )

    _log("Starting database ingestion", source_name=source_name)
    db = SessionLocal()
    try:
        counters = MimitIngestionService(db).ingest(
            source_name=source_name,
            station_data=station_data,
            price_data=price_data,
        )
    finally:
        db.close()

    _log(
        "Ingestion completed",
        stations_seen=counters.station_rows_seen,
        stations_inserted=counters.station_rows_inserted,
        stations_updated=counters.station_rows_updated,
        stations_unchanged_skipped=counters.station_rows_unchanged_skipped,
        stations_invalid_skipped=counters.station_rows_invalid_skipped,
        prices_seen=counters.price_rows_seen,
        prices_inserted=counters.price_rows_inserted,
        prices_updated=counters.price_rows_updated,
        prices_unchanged_skipped=counters.price_rows_unchanged_skipped,
        price_changes=counters.price_change_rows_inserted,
        prices_station_missing_skipped=counters.price_rows_station_missing_skipped,
        elapsed_seconds=f"{perf_counter() - started_at:.2f}",
    )


def _log(message: str, **fields: object) -> None:
    if fields:
        suffix = " ".join(f"{key}={value}" for key, value in fields.items())
        print(f"[INGEST] {message} {suffix}", flush=True)
        return
    print(f"[INGEST] {message}", flush=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run a local MIMIT ingestion from CSV files.")
    parser.add_argument(
        "--download-current",
        action="store_true",
        help="Download the current MIMIT station and price CSV files from the official dataset page.",
    )
    parser.add_argument("--stations-file", help="Path to anagrafica_impianti_attivi.csv")
    parser.add_argument("--prices-file", help="Path to prezzo_alle_8.csv")
    parser.add_argument(
        "--source-name",
        default="mimit.manual",
        help="Logical source name written to sync_runs",
    )
    return parser


if __name__ == "__main__":
    main()
