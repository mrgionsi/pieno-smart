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

- [MVP Scope And Release Plan](./mvp-scope-and-release-plan.md)
- [Solution Architecture](./solution-architecture.md)
- [Tech Stack And Framework Choice](./tech-stack-and-framework-choice.md)
- [Domain Data Contract](./domain-data-contract.md)
- [API Contract Outline](./api-contract-outline.md)
- [Backend Ingestion And Data Flow](./backend-ingestion-and-data-flow.md)
- [Next Implementation Guide](./next-implementation-guide.md)
- [Recommendation Score V1](./recommendation-score-v1.md)
- [User And Vehicle Profile Foundation](./user-and-vehicle-profile-foundation.md)
- [Frontend UX And Visual Design](./frontend-ux-and-visual-design.md)
- [Implementation Backlog](./implementation-backlog.md)
- [Ingestion Runbook](./ingestion-runbook.md)
- [GitHub Project Setup](./github-project-setup.md)
- [ADRs](./adr)

## Existing Inputs

- [Operational PRD And Schema](../fuel-prd-postgres-postgis.md)
- [MVP Delivery Blueprint](../pienosmart-mvp-delivery-blueprint.md)
