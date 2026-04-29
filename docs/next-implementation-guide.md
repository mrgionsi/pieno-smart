# PienoSmart Next Implementation Guide

## Purpose

This document is the practical reference for the next backend development phase after the initial MIMIT ingestion foundation.

It is intentionally implementation-oriented. The goal is to make the next changes predictable, reviewable, and aligned with the product direction already agreed for the MVP.

This guide reflects what is true in the codebase as of April 29, 2026:

- MIMIT current snapshot download works
- parser supports the currently observed MIMIT drift patterns
- ingestion writes to PostgreSQL/PostGIS
- `stations` current-state rows are protected by unique `ministerial_station_id`
- `current_prices` current-state rows are protected by unique `(station_id, fuel_type, service_mode)`
- ingestion performance improved from row-by-row existence checks to batched writes
- progress logging exists for live runs

The next work should focus on:

1. correctness hardening
2. ingest efficiency and idempotency clarity
3. operational observability
4. search APIs
5. recommendation logic
6. user-profile and alert features

## Current State Summary

### What Already Exists

- FastAPI app scaffold
- SQLAlchemy models
- Alembic base schema
- MIMIT dataset page client
- MIMIT station and price parsers
- normalization rules for fuel type and service mode
- ingestion service for:
  - `stations`
  - `current_prices`
  - `price_changes`
  - `sync_runs`
- parser tests
- client tests
- DB-backed ingestion integration test

### What Is Already Proven

- the station table does not duplicate `ministerial_station_id`
- the unique constraint on `stations.ministerial_station_id` is active
- repeated ingestion updates station rows instead of inserting duplicates
- the current batching approach is much faster than the initial row-by-row existence check approach

### What Is Still Not Good Enough

- counters are too coarse and can be misread
- unchanged rows are still counted as upserted
- station and price writes should distinguish:
  - inserted
  - updated
  - unchanged_skipped
  - invalid_skipped
- price ingestion still needs closer operational validation on full live runs
- search APIs are still scaffold-level only
- recommendation logic is not yet implemented
- profile, favorites, and alerts remain schema-only

## Development Principles For The Next Phase

These rules should govern the next changes.

### 1. Preserve Current-State Tables As Current-State Tables

The intent of the schema is:

- `stations`: one row per station
- `current_prices`: one row per station/fuel/service-mode combination
- `price_changes`: append-only history of actual changes
- `sync_runs`: append-only operational run log

Do not turn `stations` or `current_prices` into snapshot-history tables.

### 2. Treat MIMIT As Unstable At The File-Format Level

Observed live differences already include:

- extraction line prefix: `Estrazione del YYYY-MM-DD`
- mixed station row shapes:
  - 10 columns
  - 11 columns
  - 12 columns
- current header capitalization differences such as `idImpianto`
- row-level optional link-like fields that do not match the published header exactly

So future parser work should assume:

- headers are advisory
- row tail fields for address/geography are more reliable than middle fields
- normalization must be tolerant but explicit

### 3. Prefer Explicit Counters Over Ambiguous “Upserted”

The current logs can be confusing because `upserted` means “accepted for write processing”, not “new insert”.

The next version should report:

- `stations_seen`
- `stations_inserted`
- `stations_updated`
- `stations_unchanged_skipped`
- `stations_invalid_skipped`
- `prices_seen`
- `prices_inserted`
- `prices_updated`
- `prices_unchanged_skipped`
- `prices_station_missing_skipped`
- `price_changes_inserted`

This is one of the most valuable short-term changes because it removes ambiguity during manual validation.

### 4. Prefer Batched SQL For Ingestion Hot Paths

The initial ORM-driven approach was useful to prove correctness, but the full daily import volume makes per-row ORM reads too expensive.

For ingestion:

- prefer batched SQL writes
- preload current-state lookup tables once
- only keep ORM involvement where it adds real value

### 5. Keep Runtime APIs Independent From MIMIT

API requests must only hit PostgreSQL/PostGIS and internal services.

Do not let the mobile app depend on MIMIT availability or MIMIT page parsing at request time.

## Priority Roadmap

The next work should be implemented in this order.

### Priority A: Ingestion Correctness And Operability

1. Split counters into inserted/updated/skipped
2. Skip unchanged station updates
3. Skip unchanged current price updates
4. Persist richer `sync_runs` counters
5. Add anomaly capture for malformed or partially unsupported station rows
6. Add live-run safety controls

### Priority B: Search APIs

1. station nearby query
2. station detail query
3. filters by fuel/service mode/brand/highway flag
4. data freshness exposure in API responses

### Priority C: Recommendation Engine V1

1. define convenience score inputs
2. implement deterministic score function
3. rank nearby stations for a vehicle profile

### Priority D: Profiles And Favorites

1. vehicle profile CRUD
2. favorites CRUD
3. tie recommendation defaults to selected profile

### Priority E: Alerts

1. alert CRUD
2. alert evaluation job
3. alert event creation

### Priority F: Route-Based Search

1. route provider abstraction
2. route corridor query
3. route-aware ranking

## Detailed Next Changes

## A1. Replace Ambiguous Counters With Real Outcome Counters

### Why

Current logs are technically correct but operationally misleading. A rerun can report tens of thousands of “upserted” rows even when most rows already existed and no duplicates were created.

### What To Change

Update `IngestionCounters` in [backend/app/ingestion/service.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/service.py).

Replace:

- `station_rows_upserted`
- `price_rows_upserted`

With:

- `station_rows_inserted`
- `station_rows_updated`
- `station_rows_unchanged_skipped`
- `station_rows_invalid_skipped`
- `price_rows_inserted`
- `price_rows_updated`
- `price_rows_unchanged_skipped`
- `price_rows_station_missing_skipped`

### How

For stations:

- load the current station state into memory before the write phase
- compare incoming station payload to the current stored values
- if the row does not materially change:
  - do not include it in the update batch
  - increment `station_rows_unchanged_skipped`
- if the station does not exist:
  - increment `station_rows_inserted`
- if it exists and values differ:
  - increment `station_rows_updated`
- if it lacks coordinates or cannot be normalized:
  - increment `station_rows_invalid_skipped`

For prices:

- preload current prices into memory
- compare incoming price/timestamp payload to the current state
- if it does not exist:
  - insert current row
  - increment `price_rows_inserted`
- if it exists and price changed:
  - update current row
  - insert `price_changes`
  - increment `price_rows_updated`
  - increment `price_change_rows_inserted`
- if it exists and only timestamp changed:
  - decide whether to refresh timestamp or skip
  - for MVP, prefer update only if timestamp changed materially
- if both price and effective timestamp are unchanged:
  - increment `price_rows_unchanged_skipped`

### Acceptance Criteria

- a rerun on the same dataset should show very low `inserted` counts
- unchanged rows should no longer be reported as “upserted”
- final `sync_runs` data should match the more granular runtime logs

## A2. Skip Unchanged Station Updates

### Why

Current station ingestion updates rows even when nothing changed. This causes unnecessary write load and makes operational counters noisy.

### What Should Count As A Station Change

Compare these fields:

- `name`
- `brand`
- `address`
- `comune`
- `provincia`
- `postal_code`
- `is_highway_station`
- `is_active`
- normalized `location`
- optionally `source_updated_at`

### Recommended Approach

Add a station-state preload:

- `ministerial_station_id`
- current persisted comparable fields

Build an in-memory comparable representation:

- normalize text before compare
- use a canonical string form for location, or compare lat/lon rounded to a fixed precision

Only write to DB if the comparable representation changed.

### Acceptance Criteria

- rerunning with the same station extraction should produce mostly `station_rows_unchanged_skipped`
- station write volume should drop materially on repeated runs

## A3. Skip Unchanged Price Updates

### Why

Price rows are numerous, and repeated updates to unchanged current prices are wasted work.

### Recommended Compare Logic

For a given `(station_id, fuel_type, service_mode)`:

- if missing:
  - insert
- if `price` differs:
  - update current row
  - insert into `price_changes`
- if `price` same but `price_effective_at` differs:
  - update only if the fresher timestamp matters to downstream logic
- if both are the same:
  - skip

For MVP, the most practical policy is:

- update on price change
- update on newer `communicated_at`
- skip otherwise

### Acceptance Criteria

- rerunning the same extraction should not create new `price_changes`
- unchanged price rows should be skipped instead of rewritten
- price-phase timing should improve further

## A4. Persist Better Sync Metrics In `sync_runs`

### Why

`sync_runs` should be the operational truth for what happened during an ingestion run.

### What To Add

Possible new columns:

- `station_records_inserted`
- `station_records_updated`
- `station_records_skipped`
- `price_records_inserted`
- `price_records_updated`
- `price_records_skipped`
- `station_records_invalid`
- `price_records_station_missing`

### How

This requires:

1. an Alembic migration
2. SQLAlchemy model update
3. ingestion service write-path update

### Acceptance Criteria

- a completed run is understandable by reading one `sync_runs` row
- manual debugging no longer depends only on console output

## A5. Add Ingestion Anomaly Capture

### Why

MIMIT’s real-world file inconsistencies are already visible. If the parser only fails or silently absorbs drift, debugging will remain fragile.

### Options

For MVP, the pragmatic option is not a full anomaly table yet. Instead:

1. log anomaly summaries to console
2. store anomaly summaries in `sync_runs.error_message` or a future `warning_message`
3. optionally persist a small JSON diagnostic blob

### Recommended Examples To Capture

- unsupported row shapes
- rows skipped due to missing coordinates
- rows with suspicious extra middle fields
- rows with fuel descriptions mapped to `altro`

### Acceptance Criteria

- after a live run, you can quantify how many rows were skipped and why

## A6. Add Safe Runtime Controls To The Ingestion CLI

### Why

Manual runs are currently useful but still too opaque and too “all or nothing”.

### Add CLI Flags

Recommended additions to [backend/app/ingestion/run.py](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/app/ingestion/run.py):

- `--limit-stations N`
- `--limit-prices N`
- `--skip-stations`
- `--skip-prices`
- `--dry-run`
- `--verbose-anomalies`

### Meaning

- `--limit-*`
  useful for local debugging on full live files
- `--skip-stations`
  useful when validating only prices against an already-loaded station registry
- `--skip-prices`
  useful when diagnosing registry problems
- `--dry-run`
  parse and compute counters without DB write

### Acceptance Criteria

- a developer can test ingestion behavior without committing a full live import every time

## B1. Implement Nearby Station Search API

### Why

This is the first real user-facing value for the MVP.

### Endpoint

Recommended first endpoint:

- `GET /api/stations/nearby`

### Request Parameters

- `lat`
- `lon`
- `radius_meters`
- optional `fuel_type`
- optional `service_mode`
- optional `limit`

### Query Requirements

Use PostGIS:

- `ST_DWithin(location, point, radius_meters)`
- `ST_Distance(location, point)`

### Response Should Include

- station identity
- address/comune/provincia
- coordinates
- brand
- current price summary relevant to filters
- distance
- data freshness info

### Implementation Structure

Create:

- `app/catalog/repository.py`
- `app/catalog/service.py`
- route module under `app/api/routes/stations.py`
- response schemas under a dedicated schema module

### Acceptance Criteria

- returns nearby stations ordered by distance
- supports a radius limit
- supports fuel/service-mode filtering
- response does not depend on live MIMIT

## B2. Implement Station Detail API

### Why

The nearby search result should link to a station detail view with all relevant prices and freshness data.

### Endpoint

- `GET /api/stations/{station_id}`

### Response Should Include

- base station info
- all current prices grouped by service mode and fuel type
- latest `source_updated_at`
- optional recent price change summary

### Acceptance Criteria

- station detail can be rendered from one API response

## B3. Add Search Filters And Freshness Transparency

### Why

Product positioning is not “cheapest station”. Freshness and decision quality matter.

### Response Additions

For station cards and detail:

- `source_updated_at`
- `price_effective_at`
- derived `freshness_status`

Recommended first freshness buckets:

- `fresh`
- `stale`
- `unknown`

Define thresholds centrally in code, not inline in route handlers.

### Acceptance Criteria

- freshness is explicit in API output
- frontend can show “updated on …” without recomputing backend semantics

## C1. Implement Recommendation Score V1

### Goal

Support the core value proposition: best refueling decision, not just cheapest row.

### First Score Inputs

Use a simple transparent function first:

- current price
- distance from user
- preferred service mode match
- brand preference bonus/penalty
- freshness penalty

### First Rule Shape

Recommended pattern:

- compute estimated fuel cost from price and profile consumption
- compute detour penalty from distance
- add preference adjustments
- sort by final score ascending

### Implementation Structure

Create:

- `app/recommendation/scoring.py`
- `app/recommendation/service.py`

Keep the score deterministic and explainable.

### Acceptance Criteria

- given the same input, ranking is stable
- ranking can be explained field by field

## C2. Add Recommendation Explanation Fields

### Why

The product should communicate why a station is recommended.

### Add To Response

- `score`
- `estimated_refuel_cost`
- `distance_meters`
- `freshness_status`
- `match_reasons`

Examples of `match_reasons`:

- `lowest_cost_for_profile`
- `preferred_brand`
- `closest_option`
- `fresh_data`

### Acceptance Criteria

- frontend can render recommendation reasoning without recomputing logic

## D1. Implement Vehicle Profile CRUD

### Why

Vehicle profiles are required for personalized convenience ranking.

### Endpoints

- `GET /api/vehicle-profiles`
- `POST /api/vehicle-profiles`
- `PATCH /api/vehicle-profiles/{id}`
- `DELETE /api/vehicle-profiles/{id}`

### Validation Rules

- `fuel_type` required
- `avg_consumption_l_per_100km > 0`
- optional tank capacity positive
- brand arrays normalized and deduplicated

### Acceptance Criteria

- one user can manage multiple profiles
- one profile can be marked default

## D2. Implement Favorites CRUD

### Endpoints

- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{station_id}`

### Acceptance Criteria

- a user can store favorite stations
- favorites can be joined back into nearby search responses

## E1. Implement Alert CRUD

### First Supported Alert Type

For MVP, start with:

- `price_threshold`

### Endpoints

- `GET /api/alerts`
- `POST /api/alerts`
- `PATCH /api/alerts/{id}`
- `DELETE /api/alerts/{id}`

### Acceptance Criteria

- users can define threshold rules for a fuel type and optional station scope

## E2. Implement Alert Evaluation Job

### Why

The schema exists, but no alert behavior exists yet.

### Execution Model

Use an external scheduler calling a CLI or job entrypoint, similar to ingestion.

### Logic

For each active alert:

- evaluate against `current_prices`
- if newly matched:
  - create `alert_events`

Do not build notification delivery yet if that creates too much scope. Event creation is enough for backend MVP validation.

### Acceptance Criteria

- an alert run can create `alert_events`
- duplicate re-triggering is controlled

## F1. Route-Based Search

### Why

This is important, but it should stay after nearby search and recommendation are solid.

### Required Pieces

- route provider abstraction
- route geometry input
- corridor-based PostGIS query
- recommendation scoring aware of route deviation

### Recommendation

Do not implement direct provider coupling inside the station search route.

Keep an abstraction layer so route provider choice remains replaceable.

## Suggested Technical Refactors

These are not product features, but they will make the next work safer.

### Refactor 1: Extract Ingestion SQL Helpers

Move batching SQL from `MimitIngestionService` into dedicated helper functions or repository objects.

Suggested modules:

- `app/ingestion/station_repository.py`
- `app/ingestion/price_repository.py`

This reduces the chance that `service.py` becomes the permanent dumping ground.

### Refactor 2: Separate Runtime Schemas From ORM Models

If not already done during API work, add explicit Pydantic schema modules for:

- station search responses
- station detail responses
- vehicle profiles
- favorites
- alerts

### Refactor 3: Add Shared Error Contract

Define one consistent API error shape before the public endpoints multiply.

## Recommended Immediate Tickets

If you want to continue development in the right order, the next implementation tickets should be:

1. `Refine ingestion counters and sync_runs metrics`
2. `Skip unchanged station updates`
3. `Skip unchanged current price updates`
4. `Add ingestion CLI dry-run and row-limit controls`
5. `Implement nearby station search query`
6. `Implement station detail endpoint`
7. `Expose freshness metadata in station responses`
8. `Implement recommendation score v1`
9. `Implement vehicle profile CRUD`
10. `Implement favorites CRUD`

## Definition Of Done For Each Next Change

Each change should only be considered done if:

- code is implemented
- tests are added or updated
- runtime logs or docs are updated if behavior changed
- schema changes go through Alembic
- API contract docs are updated for user-facing changes

## Practical Validation Checklist

Use this checklist during development.

### For Ingestion Changes

- run parser tests
- run client tests
- run DB-backed ingestion integration test
- run a partial live import with row limits
- run a full live import
- verify:
  - `stations` unique count
  - `current_prices` unique composite count
  - no unexpected `price_changes`
  - `sync_runs` metrics look sane

### For Search Changes

- test nearby query with a known city center
- verify distance ordering
- verify fuel/service-mode filters
- verify rows with stale prices are surfaced correctly

### For Recommendation Changes

- test deterministic ordering with fixed fixtures
- verify explanation fields
- validate a few scenarios manually

## Final Recommendation

The most important next engineering move is not a new endpoint.

It is to finish the ingestion layer so it becomes:

- clearly idempotent
- clearly measurable
- operationally trustworthy
- fast enough for daily runs

Once that is in place, the nearby search and recommendation APIs become much easier to build with confidence.
