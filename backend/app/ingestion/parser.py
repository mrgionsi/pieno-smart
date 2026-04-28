from __future__ import annotations

import csv
from datetime import date
from io import StringIO
import re

from app.ingestion.models import (
    ParsedPriceRow,
    ParsedStationRow,
    PriceFileParseResult,
    StationFileParseResult,
)
from app.ingestion.normalize import (
    normalize_fuel_type,
    normalize_station_id,
    normalize_text,
    parse_italian_datetime,
    parse_optional_float,
    parse_price,
    parse_service_mode,
)

STATION_HEADERS = [
    "idimpianto",
    "Gestore",
    "Bandiera",
    "Tipo Impianto",
    "Nome Impianto",
    "Link",
    "Indirizzo",
    "Comune",
    "Provincia",
    "Latitudine",
    "Longitudine",
]

STATION_HEADERS_WITH_EXTRA = [
    "idimpianto",
    "Gestore",
    "ExtraMiddleField",
    "Bandiera",
    "Tipo Impianto",
    "Nome Impianto",
    "Link",
    "Indirizzo",
    "Comune",
    "Provincia",
    "Latitudine",
    "Longitudine",
]

STATION_HEADERS_LEGACY = [
    "idimpianto",
    "Gestore",
    "Bandiera",
    "Tipo Impianto",
    "Nome Impianto",
    "Indirizzo",
    "Comune",
    "Provincia",
    "Latitudine",
    "Longitudine",
]

PRICE_HEADERS = [
    "idimpianto",
    "descCarburante",
    "prezzo",
    "isSelf",
    "dtComu",
]

EXTRACTION_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def parse_station_csv(content: str) -> StationFileParseResult:
    extraction_date, rows = _parse_rows(content)
    station_rows = [
        ParsedStationRow(
            extraction_date=extraction_date,
            ministerial_station_id=normalize_station_id(row["idimpianto"]),
            manager=normalize_text(row["Gestore"]),
            brand=normalize_text(row["Bandiera"]),
            station_type=normalize_text(row["Tipo Impianto"]),
            name=normalize_text(row["Nome Impianto"]),
            address=normalize_text(row["Indirizzo"]),
            comune=normalize_text(row["Comune"]),
            provincia=normalize_text(row["Provincia"]),
            latitude=parse_optional_float(row.get("Latitudine")),
            longitude=parse_optional_float(row.get("Longitudine")),
        )
        for row in _map_station_rows(rows)
    ]
    return StationFileParseResult(extraction_date=extraction_date, rows=station_rows)


def parse_price_csv(content: str) -> PriceFileParseResult:
    extraction_date, rows = _parse_rows(content)
    price_rows = [
        ParsedPriceRow(
            extraction_date=extraction_date,
            ministerial_station_id=normalize_station_id(row["idimpianto"]),
            fuel_description=row["descCarburante"].strip(),
            fuel_type=normalize_fuel_type(row["descCarburante"]),
            price=parse_price(row["prezzo"]),
            service_mode=parse_service_mode(row["isSelf"]),
            communicated_at=parse_italian_datetime(row.get("dtComu")),
        )
        for row in _map_rows(rows, PRICE_HEADERS)
    ]
    return PriceFileParseResult(extraction_date=extraction_date, rows=price_rows)


def _parse_rows(content: str) -> tuple[date, list[list[str]]]:
    cleaned = content.lstrip("\ufeff")
    reader = csv.reader(StringIO(cleaned), delimiter="|")
    rows = [[cell.strip() for cell in row] for row in reader if any(cell.strip() for cell in row)]
    if not rows:
        raise ValueError("Empty MIMIT file")

    extraction_date = _parse_extraction_date(rows[0])
    return extraction_date, rows[1:]


def _parse_extraction_date(row: list[str]) -> date:
    if len(row) != 1:
        raise ValueError("First row must contain the extraction date")

    value = row[0].strip()
    if not value:
        raise ValueError("Missing extraction date value")

    match = EXTRACTION_DATE_RE.search(value)
    if match is None:
        raise ValueError(f"Invalid extraction date header: {value}")

    return date.fromisoformat(match.group(1))


def _map_rows(rows: list[list[str]], expected_headers: list[str]) -> list[dict[str, str]]:
    if not rows:
        return []

    working_rows = rows
    if _is_header_row(rows[0], expected_headers):
        working_rows = rows[1:]

    mapped_rows: list[dict[str, str]] = []
    for row in working_rows:
        if len(row) != len(expected_headers):
            raise ValueError(
                f"Unexpected column count. Expected {len(expected_headers)}, got {len(row)}: {row}"
            )
        mapped_rows.append(dict(zip(expected_headers, row, strict=True)))
    return mapped_rows


def _map_station_rows(rows: list[list[str]]) -> list[dict[str, str]]:
    if not rows:
        return []

    working_rows = rows
    if (
        _is_header_row(rows[0], STATION_HEADERS)
        or _is_header_row(rows[0], STATION_HEADERS_WITH_EXTRA)
        or _is_header_row(rows[0], STATION_HEADERS_LEGACY)
    ):
        working_rows = rows[1:]

    mapped_rows: list[dict[str, str]] = []
    for row in working_rows:
        if len(row) == len(STATION_HEADERS_WITH_EXTRA):
            mapped_rows.append(dict(zip(STATION_HEADERS_WITH_EXTRA, row, strict=True)))
            continue
        if len(row) == len(STATION_HEADERS):
            mapped_rows.append(dict(zip(STATION_HEADERS, row, strict=True)))
            continue
        if len(row) == len(STATION_HEADERS_LEGACY):
            legacy_row = dict(zip(STATION_HEADERS_LEGACY, row, strict=True))
            legacy_row["Link"] = ""
            mapped_rows.append(legacy_row)
            continue
        raise ValueError(
            f"Unexpected column count. Expected {len(STATION_HEADERS_WITH_EXTRA)}, "
            f"{len(STATION_HEADERS)} or {len(STATION_HEADERS_LEGACY)}, got {len(row)}: {row}"
        )
    return mapped_rows


def _is_header_row(row: list[str], expected_headers: list[str]) -> bool:
    if len(row) != len(expected_headers):
        return False

    return [_normalize_header_name(value) for value in row] == [
        _normalize_header_name(value) for value in expected_headers
    ]


def _normalize_header_name(value: str) -> str:
    return value.strip().casefold()
