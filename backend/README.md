# PienoSmart Backend

## Stack

- Python 3.13
- FastAPI
- SQLAlchemy 2.0
- Alembic
- PostgreSQL 18 + PostGIS 3.6

## Prerequisites

- Python 3.13 installed locally
- Docker installed locally
- Docker Compose available

## Development Setup

All commands below assume you are in:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart/backend
```

### 1. Create the virtual environment

Create a local `.venv`:

```bash
python3.13 -m venv .venv
```

### 2. Install dependencies

Activate the environment:

```bash
source .venv/bin/activate
```

Install runtime dependencies:

```bash
pip install -e .
```

### 3. Optional development dependencies

Install development tools if needed:

```bash
pip install pytest pytest-asyncio ruff
```

### 4. Start the local database

Start PostgreSQL 18 with PostGIS 3.6 from the repository root:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart
docker compose up -d db
```

Return to the backend directory:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart/backend
```

The local container is configured as:

- host: `127.0.0.1`
- port: `5432`
- database: `pienosmart`
- user: `postgres`
- password: `postgres`

### 5. Configure environment variables

Copy the example file if needed:

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to your actual database. Example:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/pienosmart
API_HOST=127.0.0.1
API_PORT=8000
APP_ENV=local
```

Config note:

- the backend resolves `.env` from the `backend/` directory itself
- this means commands behave consistently whether you launch them from the repo root or from `backend/`

### 6. Run database migrations

Apply the initial schema and extensions:

```bash
alembic upgrade head
```

### 7. Start the API

Run the development server with auto-reload:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 8. Verify the app is running

Health endpoint:

```bash
curl http://127.0.0.1:8000/api/health
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## Alembic Workflow

Show current migration version:

```bash
alembic current
```

Show migration history:

```bash
alembic history
```

Create a new migration:

```bash
alembic revision -m "describe schema change"
```

Apply all pending migrations:

```bash
alembic upgrade head
```

Roll back one migration:

```bash
alembic downgrade -1
```

For this project, prefer handwritten migrations over blind autogeneration because the schema includes PostGIS types, enums, and operational constraints.

## Common Development Commands

Run the app:

```bash
uvicorn app.main:app --reload
```

Run tests:

```bash
pytest
```

Run only ingestion-related tests:

```bash
pytest tests/test_mimit_parser.py tests/test_mimit_ingestion_service.py tests/test_mimit_dataset_client.py
```

Run the DB-backed ingestion integration test:

```bash
pytest tests/test_mimit_ingestion_integration.py
```

Note:

- the integration test uses the active `DATABASE_URL`
- it is skipped automatically if PostgreSQL is not reachable
- for local Docker-based execution, make sure `.env` points to `127.0.0.1:5432`

Run Ruff:

```bash
ruff check .
```

Run the future ingestion entrypoint:

```bash
python -m app.ingestion.run
```

## Docker Commands

Start the database:

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart
docker compose up -d db
```

Check container status:

```bash
docker compose ps
```

View database logs:

```bash
docker compose logs db
```

Stop the database:

```bash
docker compose stop db
```

Stop and remove the container:

```bash
docker compose down
```

## Troubleshooting

### `alembic upgrade head` fails on `postgis`

Cause:

- the database container is not running
- `DATABASE_URL` points to the wrong database
- you are not using the PostGIS image

Resolution:

- verify `docker compose up -d db` completed successfully
- verify the container image is `postgis/postgis:18-3.6`
- rerun the migration

### Connection/authentication errors

Check:

- host
- port
- username
- password in `DATABASE_URL`
- whether the `db` container is healthy

### API starts but queries are not implemented

Current status:

- health endpoint is implemented
- station and vehicle profile endpoints are scaffolds only

## Initial Commands Summary

```bash
cd /Users/gionsi/Documents/personal_projects/pieno_smart
docker compose up -d db
cd /Users/gionsi/Documents/personal_projects/pieno_smart/backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
