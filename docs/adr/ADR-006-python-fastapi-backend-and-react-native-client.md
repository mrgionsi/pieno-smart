# ADR-006: Python FastAPI Backend And React Native Client

## Status

Accepted

## Context

The MVP needs:

- strong batch ingestion support
- fast API iteration
- explicit data contracts
- a mobile-first user experience

## Decision

Use:

- Python 3.13 + FastAPI for backend services and ingestion jobs
- Pydantic v2, SQLAlchemy 2.0, and Alembic in the backend stack
- React Native with Expo and TypeScript for the client application

## Consequences

- one backend language covers ingestion, scoring, and API logic
- OpenAPI generation becomes straightforward
- one mobile codebase can target both iOS and Android
- native-specific optimizations can be deferred until product validation
