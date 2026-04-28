# PienoSmart Solution Architecture

## Overview

PienoSmart should be built as an API-first system with a mobile-first client and a compact operational data platform.

## High-Level Components

### Client

- React Native app with Expo and TypeScript
- uses device location for nearby search
- opens external navigation providers when user chooses a station

### Backend API

- FastAPI application
- exposes station search, recommendation, profiles, and alert endpoints
- contains orchestration logic only, not heavy batch scheduling

### Ingestion Worker

- Python module in the same codebase as the API
- runs as a CLI or job entrypoint
- downloads, parses, normalizes, and upserts MIMIT data

### Database

- PostgreSQL 16 with PostGIS
- stores stations, current prices, price changes, user-owned data, and sync metadata

### External Providers

- MIMIT dataset source
- route provider behind an abstraction layer
- optional later notification provider

## Logical Backend Modules

- `ingestion`
  - fetch MIMIT inputs
  - parse files
  - normalize records
  - run idempotent upserts
- `catalog`
  - nearby search
  - station detail
  - filters and sorting
- `recommendation`
  - convenience scoring
  - explanation payload
- `profiles`
  - vehicle profiles
  - favorites
- `alerts`
  - alert definitions
  - alert evaluation

## Read/Write Separation

### Write paths

- ingestion updates station and price state
- user actions update profiles, favorites, and alerts
- alert evaluation stores alert events

### Read paths

- nearby search reads from `stations` and `current_prices`
- recommendation reads search candidates plus optional profile context
- station detail reads one station plus current prices and freshness metadata

## Scheduling Model

Use an external scheduler to trigger ingestion jobs daily.

Recommended patterns:

- local/dev: manual CLI command
- production: cloud scheduler, cron, or platform scheduled job

Do not depend on an in-process scheduler inside the API service for production correctness.

## Deployment Shape

Recommended deployable units:

- `api`
- `ingestion-job`
- `postgres`

This can still live in one repository and one Python codebase.

## Key Architectural Constraints

- no dependency on live MIMIT availability during user queries
- ingestion must be rerunnable safely
- route provider logic must be isolated behind an internal interface
- convenience score logic must be testable and deterministic
