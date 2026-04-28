# PienoSmart

PienoSmart is an Italian fuel price and station discovery product built around one idea:

> help the user make a better refueling decision than a simple cheapest-price list

The MVP uses MIMIT open data as a scheduled upstream source and focuses on convenience-aware station discovery rather than price sorting alone.

## Product Direction

PienoSmart is not positioned as "just the cheapest station app".

The product value is:

- nearby fuel station discovery
- route-aware station discovery
- vehicle-aware recommendations
- convenience ranking
- price freshness transparency
- basic alerting

## Current MVP Scope

Release 1 focuses on the core loop:

- MIMIT daily ingestion
- nearby station search
- station detail
- convenience ranking
- vehicle profiles
- freshness transparency

Release 1.1 extends that with:

- route-based station search
- alerts
- favorites

## Technical Direction

Current backend and data choices:

- Python 3.13
- FastAPI
- SQLAlchemy 2.0
- Alembic
- PostgreSQL 18
- PostGIS 3.6
- Dockerized local database with `postgis/postgis:18-3.6`

Core system principles:

- MIMIT is a batch upstream source, not a runtime dependency
- PostgreSQL/PostGIS is the system of record for MVP
- only compact operational data is stored
- Redis is out of scope for MVP

## Repository Structure

- [backend](/Users/gionsi/Documents/personal_projects/pieno_smart/backend)
  Python API, Alembic migrations, ORM models, and future ingestion/search logic
- [docs](/Users/gionsi/Documents/personal_projects/pieno_smart/docs)
  architecture decisions, MVP scope, contracts, and delivery documentation
- [docker-compose.yml](/Users/gionsi/Documents/personal_projects/pieno_smart/docker-compose.yml)
  local PostgreSQL 18 + PostGIS 3.6 development database
- [fuel-prd-postgres-postgis.md](/Users/gionsi/Documents/personal_projects/pieno_smart/fuel-prd-postgres-postgis.md)
  operational PRD and initial schema source document
- [pienosmart-mvp-delivery-blueprint.md](/Users/gionsi/Documents/personal_projects/pieno_smart/pienosmart-mvp-delivery-blueprint.md)
  delivery blueprint from product direction to implementation workstreams

## Start Here

If you are new to the repo, use this order:

1. Read [docs/mvp-scope-and-release-plan.md](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/mvp-scope-and-release-plan.md)
2. Read [docs/solution-architecture.md](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/solution-architecture.md)
3. Read [backend/README.md](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/README.md)
4. Review [docs/implementation-backlog.md](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/implementation-backlog.md)

## Development Setup

The backend has its own setup guide:

- [Backend README](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/README.md)

The short version is:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart
docker compose up -d db

cd /Users/gionsi/Documents/personal_projects/pieno_smart/backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Useful endpoints once the API is running:

- `GET /api/health`
- `GET /api/health/db`
- Swagger: `http://127.0.0.1:8000/docs`

## Documentation Map

Architecture and planning:

- [Docs Index](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/README.md)
- [Solution Architecture](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/solution-architecture.md)
- [Tech Stack And Framework Choice](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/tech-stack-and-framework-choice.md)
- [Backend Ingestion And Data Flow](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/backend-ingestion-and-data-flow.md)
- [Implementation Backlog](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/implementation-backlog.md)

Product and contracts:

- [MVP Scope And Release Plan](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/mvp-scope-and-release-plan.md)
- [Domain Data Contract](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/domain-data-contract.md)
- [API Contract Outline](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/api-contract-outline.md)

Operations and governance:

- [Ingestion Runbook](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/ingestion-runbook.md)
- [GitHub Project Setup](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/github-project-setup.md)
- [Architecture Decision Records](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/adr)

## Data Source

The primary upstream dataset is the MIMIT fuel station and fuel price open data dataset.

This project uses MIMIT as an upstream source for ingestion, while the application serves locally persisted data from PostgreSQL/PostGIS.

## License

Repository code is licensed under:

- [Apache License 2.0](/Users/gionsi/Documents/personal_projects/pieno_smart/LICENSE)

Upstream data licensing and attribution must be handled separately from source code licensing.
