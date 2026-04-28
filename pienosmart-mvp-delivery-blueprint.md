# PienoSmart MVP Delivery Blueprint

## 1. Objective

Turn the existing PRD into an executable MVP plan that covers:

- documentation structure
- solution architecture boundaries
- phased implementation
- task assignment by workstream
- delivery risks and decision gates

This document should be read together with [fuel-prd-postgres-postgis.md](/Users/gionsi/Documents/personal_projects/pieno_smart/fuel-prd-postgres-postgis.md).

## 2. Recommended MVP Shape

The MVP should be optimized around one core promise:

> help the user make a better refueling decision than a simple cheapest-price list

That means the real MVP is not "all search features", but this narrow product loop:

1. ingest reliable MIMIT data daily
2. find relevant stations nearby or along a route
3. rank them with a transparent convenience score
4. let the user save preferences and alerts
5. explain freshness and recommendation reasons clearly

## 3. Architecture Boundaries

### 3.1 Core Services

Keep the backend split into five logical modules:

- `ingestion`
  - downloads and parses MIMIT files
  - normalizes station and price records
  - runs idempotent upserts
  - records sync metadata
- `catalog`
  - station search and station detail
  - geospatial queries with PostGIS
- `recommendation`
  - convenience scoring
  - ranking explanation payload
- `user-profile`
  - vehicle profiles
  - favorites
  - alert definitions
- `alerting`
  - evaluates alerts after ingestion
  - stores alert trigger events

### 3.2 External Dependencies

For MVP, keep dependencies minimal:

- PostgreSQL + PostGIS: system of record
- MIMIT datasets: upstream batch source
- routing provider: one abstraction layer, one concrete provider
- push/email delivery for alerts: optional in first release, can start with in-app stored events only

### 3.3 Critical Principle

Do not let route search or alert delivery block the first production-capable release.

Release 1 can be:

- daily ingestion
- nearby search
- convenience ranking
- vehicle profiles
- freshness transparency

Then add:

- route-based search
- alert evaluation and delivery

## 4. Documentation Stack

Do not keep everything in one PRD. Split documentation into six artifacts:

### 4.1 Product PRD

Already mostly covered in [fuel-prd-postgres-postgis.md](/Users/gionsi/Documents/personal_projects/pieno_smart/fuel-prd-postgres-postgis.md).

Needs small refinements:

- rename product references consistently to `PienoSmart`
- mark which scope is `Release 1` vs `Release 1.1`
- define the exact freshness badge rules
- define what "convenience" means in user-facing language

### 4.2 Architecture Decision Records

Create short ADRs for decisions that should not drift:

- `ADR-001-postgres-postgis.md`
- `ADR-002-mimit-batch-upstream.md`
- `ADR-003-no-redis-for-mvp.md`
- `ADR-004-route-provider-abstraction.md`
- `ADR-005-compact-history-price-changes-only.md`

### 4.3 Domain Data Contract

Create one document describing:

- station canonical model
- fuel type normalization rules
- service mode normalization rules
- freshness calculation rules
- convenience score inputs and outputs

This prevents product, backend, and frontend from inventing different meanings.

### 4.4 API Contract

Create an OpenAPI spec for:

- `GET /stations/nearby`
- `GET /stations/{id}`
- `GET /stations/route`
- `POST /recommendations/refuel`
- `GET/POST/PATCH/DELETE /vehicle-profiles`
- `GET/POST/PATCH /alerts`

### 4.5 Runbook

Create an operations runbook for:

- manual ingestion retry
- partial import failure handling
- MIMIT format change detection
- stale data incident handling

### 4.6 Delivery Backlog

Keep one implementation backlog grouped by workstream, not by generic sprint notes.

## 5. Delivery Phases

### Phase 0. Foundations

Goal:
freeze architecture and delivery constraints before coding spreads assumptions.

Deliverables:

- PRD cleanup
- ADRs
- backlog
- API outline
- migration plan
- routing provider selection

Exit criteria:

- schema accepted
- data model accepted
- route provider strategy accepted
- release split accepted

### Phase 1. Data Platform Slice

Goal:
make MIMIT ingestion reliable and queryable.

Deliverables:

- PostgreSQL/PostGIS migrations
- station and current price schema
- price change persistence
- sync run tracking
- ingestion parser for current `|` format
- ingestion test fixtures
- admin/CLI trigger for sync job

Exit criteria:

- full import runs successfully on sample and production-like data
- rerun is idempotent
- search queries can run on loaded data

### Phase 2. Search and Recommendation Slice

Goal:
ship the first user-visible core value.

Deliverables:

- nearby search endpoint
- station detail endpoint
- convenience scoring service
- explanation payload
- freshness badge logic
- sorting and filtering

Exit criteria:

- response time target met for nearby search
- recommendation output is explainable
- no live MIMIT dependency during reads

### Phase 3. Personalization Slice

Goal:
make ranking user-specific.

Deliverables:

- vehicle profile CRUD
- favorites
- profile-aware recommendation input

Exit criteria:

- profile changes affect ranking deterministically
- incompatible stations are excluded correctly

### Phase 4. Trip and Alert Slice

Goal:
extend the core value to travel planning and re-engagement.

Deliverables:

- route-based station search
- route deviation estimation
- alert CRUD
- alert evaluation after import
- alert event persistence

Exit criteria:

- route results distinguish on-route vs near-route
- alerts trigger correctly against current prices

## 6. Workstreams and Ownership

If you have a small team, assign work by workstream, not by technical layer only.

### 6.1 Product / Founder

Own:

- scope discipline
- ranking semantics
- transparency copy
- release definition
- KPI definition

Must decide early:

- exact target user for launch
- supported fuel types at launch
- whether route search is MVP or Release 1.1
- whether alerts are in-app only or also push/email

### 6.2 Solution Architect / Tech Lead

Own:

- service boundaries
- data contracts
- route provider abstraction
- non-functional requirements
- review of schema and API consistency

### 6.3 Backend Engineer

Own:

- migrations
- ingestion module
- search queries
- recommendation engine
- profile and alert APIs

### 6.4 Frontend / Mobile Engineer

Own:

- search UX
- transparency UI
- ranking explanation UI
- vehicle profile management
- favorites and alerts setup

### 6.5 QA / Product Validation

Own:

- ingestion format regression tests
- search result validation
- ranking sanity checks
- freshness messaging verification

## 7. Priority Backlog

### P0 Must Have

- PostGIS-enabled database
- station import
- current price import
- price change tracking
- sync run logging
- nearby search API
- convenience sort
- freshness metadata
- vehicle profile CRUD

### P1 Important

- station detail API
- favorites
- route search
- recommendation explanation reasons
- alert creation and evaluation

### P2 Later

- push delivery
- analytics dashboards
- station reliability scoring
- advanced route optimization

## 8. Decision Gates You Should Close Now

These are the points most likely to create churn if left open.

### Gate 1. Release split

Recommended:

- `Release 1`: nearby search, convenience ranking, vehicle profiles, freshness
- `Release 1.1`: route search and alerts

Reason:
route and alerts add integration and state complexity that can delay the first validated release.

### Gate 2. Routing provider

Recommended:

- define one internal interface now
- start with one provider implementation
- keep route geometry and deviation logic behind that boundary

Reason:
route search is the main future integration hotspot.

### Gate 3. Ranking formula versioning

Recommended:

- store ranking configuration in code plus config
- include a `score_version` in debug/admin responses

Reason:
you will tune the formula, and you need reproducibility.

### Gate 4. Freshness policy

Recommended initial policy:

- `fresh`: updated within 24h
- `aging`: 24h to 48h
- `stale`: over 48h

Reason:
this gives product and UX a concrete starting point and supports stale-data penalties.

### Gate 5. Alert delivery scope

Recommended:

- MVP stores alert triggers
- notification delivery can be deferred if needed

Reason:
the business value is in detecting opportunities first; delivery channels can follow.

## 9. Recommended Ticket Breakdown

Use epics and implementation tickets.

### Epic A. Data Ingestion

- define canonical input mapping for current MIMIT files
- create database migrations for stations, prices, price changes, sync runs
- build station import pipeline
- build price import pipeline
- implement idempotent upsert logic
- add ingestion observability and failure logging
- create regression fixtures for separator and field parsing

### Epic B. Search

- implement nearby search repository query
- add fuel and service mode filters
- add sorting by distance, price, convenience
- create station detail endpoint
- benchmark geospatial query performance

### Epic C. Recommendation

- define initial convenience formula
- implement price, travel-cost, freshness components
- add default assumptions when no profile is provided
- add explanation payload generation

### Epic D. User Data

- implement user profile schema and CRUD
- implement favorites
- wire profile input into recommendation service

### Epic E. Route

- define route provider interface
- implement route candidate extraction
- implement deviation calculation
- expose route search API contract

### Epic F. Alerts

- implement alert schema and CRUD
- evaluate alerts after each import
- persist alert events
- optionally add notification adapter

## 10. Risks to Manage Explicitly

### Product risk

Users may not understand why a higher-priced station ranks first.

Control:

- always show a short reason like "less detour" or "newer data"

### Data risk

MIMIT file structure may change again.

Control:

- keep parser versioned
- add sample-based regression tests
- fail loudly with sync run error details

### Engineering risk

Route computation can dominate complexity.

Control:

- isolate provider
- cap route corridor and result size
- keep route in Release 1.1 if needed

### Trust risk

Users may assume real-time accuracy.

Control:

- explicit freshness badge
- explicit source messaging

## 11. Immediate Next Actions

Recommended sequence for the next 7 work items:

1. Clean and rename the PRD to PienoSmart terminology.
2. Freeze the Release 1 vs Release 1.1 scope split.
3. Convert the schema section into SQL migrations.
4. Write the OpenAPI contract for nearby search, station detail, profiles, and alerts.
5. Define the first convenience-scoring formula in a small technical note.
6. Implement the ingestion module and seed the database from MIMIT.
7. Implement nearby search before route search.

## 12. Suggested Team Cadence

Weekly architecture cadence:

- Monday: scope and blockers review
- midweek: ingestion/search demo
- Friday: decision review on ranking, route, and freshness

Delivery rule:

- no new feature enters build until its acceptance criteria and API/data contract are written
