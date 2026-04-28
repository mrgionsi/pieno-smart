# ADR-003: No Redis For MVP

## Status

Accepted

## Context

The MVP workload is dominated by one daily ingestion flow and read queries over a compact operational dataset.

## Decision

Do not introduce Redis in MVP.

## Consequences

- operational complexity stays lower
- caching can be added later only if profiling shows a real need
- PostgreSQL remains the single source of truth
