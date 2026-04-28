# ADR-001: PostgreSQL And PostGIS As Primary Datastore

## Status

Accepted

## Context

PienoSmart needs:

- transactional storage for operational state
- geospatial queries for nearby search
- support for future route-adjacent queries
- a compact MVP architecture

## Decision

Use PostgreSQL 16 with the PostGIS extension as the primary and only required datastore for MVP.

## Consequences

- nearby search can be implemented directly in SQL with geospatial indexes
- no extra search or cache datastore is required for the first release
- schema, migrations, and operational ownership stay simple
