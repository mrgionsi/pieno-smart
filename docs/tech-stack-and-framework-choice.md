# PienoSmart Tech Stack And Framework Choice

## Decision Summary

### Backend

- Language: Python 3.13
- Framework: FastAPI
- Validation and serialization: Pydantic v2
- ORM/data layer: SQLAlchemy 2.0
- Migrations: Alembic
- Database driver: `psycopg`
- HTTP client: `httpx`
- Testing: `pytest`

### Data

- PostgreSQL 16
- PostGIS extension

### Client

- Language: TypeScript
- Framework: React Native with Expo

## Why Python + FastAPI

This product is more data and logic heavy than frontend-framework heavy.

Python fits well because:

- ingestion and parsing are straightforward
- convenience ranking logic is easy to express and test
- geospatial query orchestration stays simple
- the ecosystem for data processing and jobs is mature

FastAPI fits well because:

- typed request and response models reduce ambiguity
- OpenAPI generation helps lock contracts early
- developer velocity is high for MVPs
- async support is available without forcing complexity everywhere

## Why Not Node/NestJS For The Backend

Node would also work, but it is not the strongest choice here.

Reasons to prefer Python:

- the ingestion job is central to the product
- data transformation and scoring are first-class concerns
- Python keeps batch, API, and future analytics-adjacent logic in one language

## Why React Native With Expo For The App

PienoSmart is primarily a location-driven consumer product.

React Native with Expo is the best default because:

- one codebase covers iOS and Android
- maps, geolocation, and notifications are well supported
- product iteration speed is higher than native-first for an MVP
- TypeScript keeps client contracts safer

## Scheduler Choice

Use an external scheduler rather than application-managed background loops.

Recommended model:

- expose a CLI job such as `python -m app.ingestion.run`
- trigger it once per day from infrastructure

This avoids hidden state and split-brain scheduling behavior across app instances.

## Package Management

Recommended:

- `uv` for Python dependency and environment management

Reason:

- fast installs
- simple lockfile workflow
- good fit for small modern Python services

## Suggested Initial Backend Structure

```text
backend/
  app/
    api/
    core/
    db/
    ingestion/
    catalog/
    recommendation/
    profiles/
    alerts/
    main.py
  migrations/
  tests/
```

## Suggested Initial Client Structure

```text
mobile/
  app/
  src/
    api/
    screens/
    components/
    features/
    hooks/
    types/
```

## Explicitly Deferred Technologies

- Redis
- Kafka or event streaming
- Elasticsearch
- microservice split
- ML infrastructure
