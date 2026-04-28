from decimal import Decimal

from app.ingestion.parser import parse_price_csv, parse_station_csv
from app.models.common import FuelType, ServiceMode


def test_parse_station_csv_with_header_row() -> None:
    content = """2026-04-27
idimpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore Demo Srl|Q8|Stradale|Q8 Roma Centro|Via Roma 10|Roma|RM|41.9028|12.4964
"""

    result = parse_station_csv(content)

    assert result.extraction_date.isoformat() == "2026-04-27"
    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.ministerial_station_id == "12345"
    assert row.brand == "Q8"
    assert row.station_type == "Stradale"
    assert row.latitude == 41.9028
    assert row.longitude == 12.4964


def test_parse_price_csv_with_header_row_and_normalization() -> None:
    content = """2026-04-27
idimpianto|descCarburante|prezzo|isSelf|dtComu
12345|Gasolio Speciale|1.739|1|27/04/2026 07:45:00
12345|Benzina|1.819|0|27/04/2026 07:40:00
"""

    result = parse_price_csv(content)

    assert result.extraction_date.isoformat() == "2026-04-27"
    assert len(result.rows) == 2

    diesel_row = result.rows[0]
    assert diesel_row.fuel_type is FuelType.DIESEL
    assert diesel_row.price == Decimal("1.739")
    assert diesel_row.service_mode is ServiceMode.SELF
    assert diesel_row.communicated_at is not None

    benzina_row = result.rows[1]
    assert benzina_row.fuel_type is FuelType.BENZINA
    assert benzina_row.service_mode is ServiceMode.SERVITO


def test_parse_price_csv_without_header_row() -> None:
    content = """2026-04-27
54321|HVO Diesel|1.699|1|27/04/2026 07:30:00
"""

    result = parse_price_csv(content)

    assert len(result.rows) == 1
    assert result.rows[0].ministerial_station_id == "54321"
    assert result.rows[0].fuel_type is FuelType.DIESEL


def test_parse_station_csv_rejects_wrong_column_count() -> None:
    content = """2026-04-27
idimpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore Demo Srl|Q8
"""

    try:
        parse_station_csv(content)
    except ValueError as exc:
        assert "Unexpected column count" in str(exc)
    else:
        raise AssertionError("Expected parser to reject malformed station row")
