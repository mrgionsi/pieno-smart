# ADR-005: Store Compact Operational History

## Status

Accepted

## Context

PienoSmart needs current station and price state, plus enough history to explain changes and support alerts, without turning PostgreSQL into a raw file archive.

## Decision

Store:

- current station registry
- current prices
- price changes only
- user-owned data
- sync metadata

Do not store full raw daily replicas in PostgreSQL for MVP.

## Consequences

- storage remains compact
- product queries stay fast and focused
- audit or raw archival can be added later outside the main operational schema
