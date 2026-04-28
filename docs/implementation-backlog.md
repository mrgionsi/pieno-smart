# PienoSmart Implementation Backlog

## Epic 1. Platform Foundations

- create backend project structure for FastAPI, SQLAlchemy, Alembic, and tests
- provision PostgreSQL with PostGIS locally and for target environment
- create base migration with extensions and enum/reference types
- define environment config model
- add structured logging and health endpoints

## Epic 2. MIMIT Ingestion

- define canonical field mapping for current MIMIT station and price files
- implement file download client
- implement parser for `|` separator format introduced on February 10, 2026
- implement station upsert
- implement current price upsert
- implement price change detection and insert
- implement sync run lifecycle tracking
- add ingestion CLI entrypoint
- add regression fixtures for parser format changes

## Epic 3. Station Search

- implement nearby geospatial query
- add filters for fuel type, service mode, and brand
- add sorting by distance and price
- expose `GET /stations/nearby`
- expose `GET /stations/{id}`
- benchmark query performance with realistic dataset size

## Epic 4. Recommendation Engine

- define score formula v1
- implement travel-cost component
- implement freshness penalty
- implement profile compatibility and preferences
- generate explanation reasons
- expose `POST /recommendations/refuel`

## Epic 5. User Profiles

- implement vehicle profile schema and CRUD
- enforce default profile semantics per user
- wire profile selection into recommendation flow

## Epic 6. Release 1 Hardening

- add contract tests for public API
- add ingestion rerun tests
- add observability for import failures
- add seed or bootstrap scripts for local development
- write deployment notes

## Epic 7. Route Search

- define route provider interface
- implement first route provider adapter
- implement route corridor candidate retrieval
- implement deviation calculation
- expose `GET /stations/route`

## Epic 8. Alerts

- implement alert schema and CRUD
- implement post-import alert evaluation
- persist alert events
- optionally add push/email adapter

## Suggested Sequence

1. Epic 1
2. Epic 2
3. Epic 3
4. Epic 4
5. Epic 5
6. Epic 6
7. Epic 7
8. Epic 8
