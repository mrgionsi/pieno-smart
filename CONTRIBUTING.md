# Contributing to PienoSmart

Thanks for contributing to PienoSmart.

This project is being developed with a software-house workflow in mind: small changes, clear scope, reviewable branches, and a stable integration path.

## Branching Strategy

- `main` must stay releasable
- `dev` is the integration branch
- all feature and fix work should branch from `dev`

Branch naming:

- `feature/mimit-parser`
- `feature/nearby-search-query`
- `fix/alembic-enum-handling`
- `docs/root-readme`

## Commit Rules

- keep commits small and coherent
- one concern per commit whenever possible
- write clear commit messages in imperative mood

Examples:

- `Add MIMIT parser for pipe-delimited feeds`
- `Wire request-scoped DB sessions into API routes`
- `Document local PostgreSQL/PostGIS setup`

## Pull Request Rules

- open pull requests into `dev`, not directly into `main`
- keep pull requests narrow enough to review quickly
- include a short summary of:
  - what changed
  - why it changed
  - how it was tested
  - any follow-up work

## Definition of Done

A task is done only when:

- implementation is complete for the agreed scope
- relevant docs are updated
- local verification has been run
- migrations are included for schema changes
- API contract docs are updated when endpoint behavior changes

## Database Rules

- all schema changes must go through Alembic
- do not make manual schema changes in shared environments
- prefer handwritten migrations over blind autogeneration
- fix broken migrations at the migration level, not by patching databases ad hoc

## Backend Code Rules

- keep route handlers thin
- keep business logic out of HTTP layer code
- keep module boundaries aligned with domain areas:
  - `ingestion`
  - `catalog`
  - `recommendation`
  - `profiles`
  - `alerts`

## Testing Rules

Add or update tests when changing:

- parsing behavior
- ingestion and upsert logic
- ranking logic
- API contracts
- bug fixes

When fixing a bug, add a regression test if practical.

## Documentation Rules

- root [README.md](/Users/gionsi/Documents/personal_projects/pieno_smart/README.md) explains the project
- [backend/README.md](/Users/gionsi/Documents/personal_projects/pieno_smart/backend/README.md) explains local setup
- [docs](/Users/gionsi/Documents/personal_projects/pieno_smart/docs) contains architecture and product documentation
- ADRs should be added for decisions with long-term architectural impact

## Security and Secrets

- never commit `.env`, `.venv`, credentials, tokens, or local dumps
- keep example config in committed example files only

## Suggested Local Workflow

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-change
```

Work in small increments, commit locally, open a pull request into `dev`, and merge only after review or self-review checklist completion.
