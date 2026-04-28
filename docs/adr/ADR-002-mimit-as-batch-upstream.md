# ADR-002: Treat MIMIT As Batch Upstream

## Status

Accepted

## Context

The product relies on MIMIT open data, but user-facing search must remain available even when MIMIT is unavailable or delayed.

## Decision

Treat MIMIT as a scheduled batch upstream source, not a runtime dependency.

## Consequences

- user reads depend on local persisted data only
- ingestion must be idempotent and observable
- freshness must be explicit in user-facing responses
