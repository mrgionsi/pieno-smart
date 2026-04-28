from __future__ import annotations

import argparse
from pathlib import Path

from app.db.session import SessionLocal
from app.ingestion.parser import parse_price_csv, parse_station_csv
from app.ingestion.service import MimitIngestionService


def main() -> None:
    args = build_parser().parse_args()
    if not args.stations_file and not args.prices_file:
        raise SystemExit("At least one of --stations-file or --prices-file is required.")

    station_data = None
    price_data = None

    if args.stations_file:
        station_data = parse_station_csv(Path(args.stations_file).read_text(encoding="utf-8"))
    if args.prices_file:
        price_data = parse_price_csv(Path(args.prices_file).read_text(encoding="utf-8"))

    db = SessionLocal()
    try:
        counters = MimitIngestionService(db).ingest(
            source_name=args.source_name,
            station_data=station_data,
            price_data=price_data,
        )
    finally:
        db.close()

    print(
        "Ingestion completed:",
        f"stations_seen={counters.station_rows_seen}",
        f"stations_upserted={counters.station_rows_upserted}",
        f"stations_skipped={counters.station_rows_skipped}",
        f"prices_seen={counters.price_rows_seen}",
        f"prices_upserted={counters.price_rows_upserted}",
        f"price_changes={counters.price_change_rows_inserted}",
        f"prices_skipped={counters.price_rows_skipped}",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run a local MIMIT ingestion from CSV files.")
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
