from decimal import Decimal
from pathlib import Path

from app.ingestion.parser import parse_price_csv, parse_station_csv
from app.models.common import FuelType, ServiceMode

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "mimit"


def test_parse_station_csv_with_header_row() -> None:
    content = """Estrazione del 2026-04-27
idimpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Link|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore Demo Srl|Q8|Stradale|Q8 Roma Centro|gestori.prezzibenzina.it|Via Roma 10|Roma|RM|41.9028|12.4964
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


def test_parse_station_csv_with_live_mimit_header_fixture() -> None:
    result = parse_station_csv(
        (FIXTURES_DIR / "anagrafica_live_sample_2026-04-27.csv").read_text(encoding="utf-8")
    )

    assert result.extraction_date.isoformat() == "2026-04-27"
    assert len(result.rows) == 18
    assert result.rows[0].ministerial_station_id == "59183"
    assert result.rows[0].comune == "AGRIGENTO"
    assert result.rows[-1].brand == "Pompe Bianche"


def test_parse_station_csv_without_link_column_still_works() -> None:
    content = """Estrazione del 2026-04-27
12345|Gestore Demo Srl|Q8|Stradale|Q8 Roma Centro|Via Roma 10|Roma|RM|41.9028|12.4964
"""

    result = parse_station_csv(content)

    assert len(result.rows) == 1
    assert result.rows[0].ministerial_station_id == "12345"


def test_parse_station_csv_with_live_12_column_row_still_works() -> None:
    content = """Estrazione del 2026-04-27
idImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
24344|START SERVICE - FOMBIO | BENZINA.IT|Pompe Bianche|Stradale|START SERVICE - FOMBIO | gestori.prezzibenzina.it|VIA BOCCASERIO 1 26861|FOMBIO|LO|45.14897884834186|9.697519249026513
"""

    result = parse_station_csv(content)

    assert len(result.rows) == 1
    assert result.rows[0].ministerial_station_id == "24344"
    assert result.rows[0].manager == "START SERVICE - FOMBIO"
    assert result.rows[0].brand == "Pompe Bianche"
    assert result.rows[0].station_type == "Stradale"
    assert result.rows[0].name == "START SERVICE - FOMBIO"
    assert result.rows[0].address == "VIA BOCCASERIO 1 26861"
    assert result.rows[0].comune == "FOMBIO"


def test_parse_price_csv_with_header_row_and_normalization() -> None:
    content = """Estrazione del 2026-04-27
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


def test_parse_price_csv_with_live_mimit_header_fixture() -> None:
    result = parse_price_csv(
        (FIXTURES_DIR / "prezzo_live_sample_2026-04-27.csv").read_text(encoding="utf-8")
    )

    assert result.extraction_date.isoformat() == "2026-04-27"
    assert len(result.rows) == 18
    assert result.rows[0].ministerial_station_id == "3464"
    assert result.rows[0].fuel_type is FuelType.BENZINA
    assert result.rows[0].service_mode is ServiceMode.SERVITO
    assert result.rows[1].service_mode is ServiceMode.SELF


def test_parse_price_csv_without_header_row() -> None:
    content = """2026-04-27
54321|HVO Diesel|1.699|1|27/04/2026 07:30:00
"""

    result = parse_price_csv(content)

    assert len(result.rows) == 1
    assert result.rows[0].ministerial_station_id == "54321"
    assert result.rows[0].fuel_type is FuelType.DIESEL


def test_parse_station_csv_rejects_wrong_column_count() -> None:
    content = """Estrazione del 2026-04-27
idimpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Link|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore Demo Srl|Q8
"""

    try:
        parse_station_csv(content)
    except ValueError as exc:
        assert "Unexpected column count" in str(exc)
    else:
        raise AssertionError("Expected parser to reject malformed station row")


def test_parse_extraction_date_accepts_prefixed_header_line() -> None:
    content = """Estrazione del 2026-04-27
54321|HVO Diesel|1.699|1|27/04/2026 07:30:00
"""

    result = parse_price_csv(content)

    assert result.extraction_date.isoformat() == "2026-04-27"
