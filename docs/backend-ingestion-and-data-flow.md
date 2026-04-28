# PienoSmart Backend Ingestion And Data Flow

## Purpose

This document explains how the backend is structured today, how MIMIT data enters the system, how it is parsed, and how it is persisted for the MVP.

## Backend Structure

The backend is organized around domain boundaries instead of one large generic service layer.

Current modules:

- `app.api`
  - FastAPI routes and request dependencies
- `app.db`
  - SQLAlchemy base, session, and DB-specific helper types
- `app.models`
  - ORM models aligned with the PostgreSQL schema
- `app.ingestion`
  - MIMIT parsing, normalization, and import orchestration
- `app.catalog`
  - will contain station search logic
- `app.recommendation`
  - will contain convenience scoring
- `app.profiles`
  - will contain vehicle profile logic
- `app.alerts`
  - will contain alert evaluation logic

## Separation Of Concerns

The backend intentionally separates three different concerns:

### 1. Parsing

Parsing converts raw MIMIT CSV text into typed Python records.

Current files:

- [backend/app/ingestion/parser.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/parser.py)
- [backend/app/ingestion/models.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/models.py)
- [backend/app/ingestion/normalize.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/normalize.py)
- [backend/app/ingestion/client.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/client.py)

### 2. Persistence

Persistence converts parsed records into database updates.

Current file:

- [backend/app/ingestion/service.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/service.py)

### 3. Runtime API

The API serves user requests from PostgreSQL/PostGIS. It does not depend on live MIMIT availability at request time.

Current files:

- [backend/app/api](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/api)

## How Data Comes From MIMIT

The upstream source is the MIMIT open dataset page for fuel station registry and published prices.

Relevant source facts confirmed from the official MIMIT page and metadata:

- dataset page: [MIMIT dataset page](https://www.mimit.gov.it/it/open-data/elenco-dataset/carburanti-prezzi-praticati-e-anagrafica-degli-impianti)
- metadata PDF: [MIMIT metadata PDF](https://www.mimit.gov.it/images/stories/documenti/Metadati_prezzi_carburanti_20260128.pdf)
- daily publication cadence
- data reflects values in force at 8 AM of the previous day
- as of February 10, 2026, the field separator is `|`

The two files relevant to MVP are:

- `anagrafica_impianti_attivi.csv`
- `prezzo_alle_8.csv`

## Download Strategy

The current implementation does not hardcode the CSV file URLs.

Instead it:

1. fetches the official MIMIT dataset page
2. resolves the current links for:
   - `Prezzo alle 8 di mattina`
   - `Anagrafica degli impianti attivi`
3. downloads those CSV files
4. passes the file contents into the parser

Current implementation:

- [backend/app/ingestion/client.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/client.py)

This is a practical MVP tradeoff because the public dataset page is the stable official entrypoint, while direct file URLs may change over time.

## Current Assumed File Format

### Common File Behavior

- first row: extraction date in `YYYY-MM-DD`
- delimiter: `|`
- data rows follow after the date row
- a header row may or may not be present

### Station File

Expected columns:

- `idimpianto`
- `Gestore`
- `Bandiera`
- `Tipo Impianto`
- `Nome Impianto`
- `Indirizzo`
- `Comune`
- `Provincia`
- `Latitudine`
- `Longitudine`

### Price File

Expected columns:

- `idimpianto`
- `descCarburante`
- `prezzo`
- `isSelf`
- `dtComu`

## Parsing Rules

### Station Parsing

The parser produces a typed `ParsedStationRow` with:

- extraction date
- ministerial station id
- manager
- brand
- station type
- name
- address
- comune
- provincia
- latitude
- longitude

Current implementation notes:

- empty strings become `None`
- coordinates are parsed to floats
- the station manager is parsed but not yet persisted in the schema

### Price Parsing

The parser produces a typed `ParsedPriceRow` with:

- extraction date
- ministerial station id
- original fuel description
- normalized fuel type
- decimal price
- normalized service mode
- parsed communication timestamp

Current normalization behavior:

- `Gasolio` and `Diesel` map to `diesel`
- `Benzina` maps to `benzina`
- `GPL` maps to `gpl`
- `Metano` maps to `metano`
- `GNL` and `LNG` map to `gnl`
- `HVO` maps to `hvo`
- anything unknown maps conservatively to `altro`

Service mode mapping:

- `1` -> `self`
- `0` -> `servito`
- everything else -> `unknown`

## How Parsed Data Is Persisted

The persistence layer is handled by `MimitIngestionService`.

### Station Persistence

For each parsed station row:

1. validate that coordinates exist
2. build a PostGIS point in `SRID=4326;POINT(lon lat)` form
3. derive `postal_code` from the address when possible
4. derive `is_highway_station` from `Tipo Impianto`
5. insert or update the row in `stations`

Current limitation:

- if a station has no coordinates, it is skipped for now because the current schema requires a non-null geospatial location

### Price Persistence

For each parsed price row:

1. resolve the station by `ministerial_station_id`
2. skip the row if the station does not exist locally
3. look up an existing `current_prices` row by:
   - `station_id`
   - `fuel_type`
   - `service_mode`
4. if no current row exists, insert one
5. if a current row exists and the price changed:
   - insert a `price_changes` row
   - update the `current_prices` row
6. if a current row exists and the price did not change:
   - refresh timestamps only

## Sync Tracking

Every ingestion run creates a `sync_runs` record.

Current tracked fields:

- source name
- status
- completed time
- station rows seen
- price rows seen
- station rows upserted
- price rows upserted
- price change rows inserted
- error message if the run fails

## CLI Entry Point

The first manual ingestion entrypoint is:

- [backend/app/ingestion/run.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/run.py)

Current usage:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart/backend
source .venv/bin/activate
python -m app.ingestion.run --stations-file /path/to/anagrafica_impianti_attivi.csv --prices-file /path/to/prezzo_alle_8.csv
```

Optional:

- `--source-name mimit.manual`
- `--download-current`

## Database Objects Used By Ingestion

The ingestion flow currently writes to:

- `stations`
- `current_prices`
- `price_changes`
- `sync_runs`

It does not yet evaluate alerts or write alert events.

## What Is Already Tested

Current parser tests cover:

- pipe-delimited parsing
- optional header row behavior
- fuel type normalization
- service mode normalization
- malformed row rejection

Current service/helper tests cover:

- location WKT creation
- postal code extraction
- highway station flag derivation
- source timestamp conversion

There is also a DB-backed integration test that:

- loads representative fixture files
- runs ingestion against PostgreSQL
- verifies station inserts
- verifies current price upserts
- verifies `price_changes` creation across two price snapshots

See:

- [backend/tests/test_mimit_parser.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/tests/test_mimit_parser.py)
- [backend/tests/test_mimit_ingestion_service.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/tests/test_mimit_ingestion_service.py)
- [backend/tests/test_mimit_dataset_client.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/tests/test_mimit_dataset_client.py)
- [backend/tests/test_mimit_ingestion_integration.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/tests/test_mimit_ingestion_integration.py)

## Current Gaps And Next Steps

The ingestion stack is now at the point where parsing and first persistence logic exist, but a few things still need to happen next:

- add fixture files from real or representative MIMIT samples
- add integration tests against PostgreSQL/PostGIS
- improve anomaly handling for stations without coordinates
- persist richer station metadata if product needs it
- expose ingestion execution through a scheduler-ready command path

Integration-test note:

- the DB-backed ingestion test uses the active `DATABASE_URL`
- if the configured PostgreSQL database is not reachable, the test is skipped automatically

## Practical Mental Model

The backend data flow should be understood as:

1. MIMIT publishes two daily files
2. PienoSmart fetches those files on a schedule
3. parser converts raw CSV text into typed rows
4. normalization maps MIMIT semantics into app semantics
5. ingestion service upserts compact operational data
6. API serves users from PostgreSQL/PostGIS only
