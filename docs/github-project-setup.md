# PienoSmart GitHub Project Setup

## Recommendation

Yes, create a GitHub Project now.

The documentation and backlog are stable enough to support it, and a project will help keep:

- Release 1 separate from Release 1.1
- backend platform work separate from product features
- architecture decisions traceable to implementation tickets

## Project Structure

Create one project named:

- `PienoSmart MVP`

Use these top-level views:

- `Backlog`
- `Release 1`
- `Release 1.1`
- `By Workstream`

## Suggested Custom Fields

- `Type`
  - Epic
  - Story
  - Task
  - Bug
- `Workstream`
  - Platform
  - Ingestion
  - Search
  - Recommendation
  - Profiles
  - Route
  - Alerts
  - Docs
- `Release`
  - Release 1
  - Release 1.1
- `Priority`
  - P0
  - P1
  - P2
- `Status`
  - Backlog
  - Ready
  - In Progress
  - Review
  - Done

## Suggested Labels

- `backend`
- `mobile`
- `database`
- `api`
- `ingestion`
- `search`
- `recommendation`
- `profiles`
- `route`
- `alerts`
- `documentation`
- `tech-debt`

## Epic Mapping

Create epics from [implementation-backlog.md](/Users/gionsi/Documents/personal_projects/pieno_smart/docs/implementation-backlog.md):

- Epic 1. Platform Foundations
- Epic 2. MIMIT Ingestion
- Epic 3. Station Search
- Epic 4. Recommendation Engine
- Epic 5. User Profiles
- Epic 6. Release 1 Hardening
- Epic 7. Route Search
- Epic 8. Alerts

## Initial Ticket Order

Open these first:

1. scaffold backend project
2. create initial Alembic migration
3. provision local PostgreSQL/PostGIS
4. implement MIMIT parser for `|` format
5. implement station upsert
6. implement current price upsert
7. expose `GET /stations/nearby`
8. define score formula v1

## Traceability Rule

For each implementation ticket, link one of:

- PRD acceptance criteria
- ADR
- API contract section
- domain data contract section

This will keep product and engineering aligned as the MVP grows.
