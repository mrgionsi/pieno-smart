from __future__ import annotations

import argparse

from app.jobs.ingestion.runner import run_ingestion


def main() -> None:
    args = build_parser().parse_args()
    run_ingestion(
        download_current=args.download_current,
        stations_file=args.stations_file,
        prices_file=args.prices_file,
        source_name=args.source_name,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the autonomous MIMIT ingestion job from downloaded or local CSV files."
    )
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
