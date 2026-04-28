# ADR-004: Route Provider Behind An Internal Abstraction

## Status

Accepted

## Context

Route-based search will require one or more external providers for route geometry or deviation estimates, and those providers may change.

## Decision

Define an internal route service interface before integrating any specific provider.

## Consequences

- route logic stays isolated from API handlers
- provider changes do not force domain-level rewrites
- route search can remain deferred without blocking nearby search
