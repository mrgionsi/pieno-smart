# PienoSmart Documentation Index

This folder contains the agreed MVP documentation set for PienoSmart.

## Agreed Initial Technical Direction

- Backend language: Python 3.13
- Backend framework: FastAPI
- API schema/validation: Pydantic v2
- ORM/data access: SQLAlchemy 2.0
- Migrations: Alembic
- Database: PostgreSQL 18 + PostGIS 3.6
- HTTP client for MIMIT and provider calls: `httpx`
- Background execution model: external scheduler calling idempotent CLI/app jobs
- Test framework: `pytest`
- Client application recommendation: React Native with Expo and TypeScript

## Why This Stack

- Python is a strong fit for batch ingestion, parsing, scoring logic, and geospatial backend APIs.
- FastAPI gives fast API delivery, typed contracts, and clean OpenAPI generation.
- PostgreSQL with PostGIS is already the correct system of record for nearby and route-adjacent search.
- External scheduling is more reliable than hiding cron-like behavior inside the API process.
- React Native with Expo gives the fastest path to a mobile consumer experience with location, maps, and notifications.

## Documents

- [MVP Scope And Release Plan](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/mvp-scope-and-release-plan.md)
- [Solution Architecture](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/solution-architecture.md)
- [Tech Stack And Framework Choice](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/tech-stack-and-framework-choice.md)
- [Domain Data Contract](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/domain-data-contract.md)
- [API Contract Outline](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/api-contract-outline.md)
- [Backend Ingestion And Data Flow](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/backend-ingestion-and-data-flow.md)
- [Next Implementation Guide](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/next-implementation-guide.md)
- [Recommendation Score V1](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/recommendation-score-v1.md)
- [User And Vehicle Profile Foundation](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/user-and-vehicle-profile-foundation.md)
- [Implementation Backlog](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/implementation-backlog.md)
- [Ingestion Runbook](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/ingestion-runbook.md)
- [GitHub Project Setup](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/github-project-setup.md)
- [ADRs](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/adr)

## Existing Inputs

- [Operational PRD And Schema](/Users/gionsi/Documents/personal_projects/pieno_smart/fuel-prd-postgres-postgis.md)
- [MVP Delivery Blueprint](/Users/gionsi/Documents/personal_projects/pieno_smart/pienosmart-mvp-delivery-blueprint.md)
