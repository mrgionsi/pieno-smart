# PienoSmart Database

This directory contains the database setup for the PienoSmart application, including Docker configuration and initialization scripts.

## Overview

The database uses **PostgreSQL 18 with PostGIS 3.6** for geospatial data support. The Docker image includes:

- PostGIS extensions for geospatial operations
- Database initialization scripts
- Alembic migration setup
- Health checks and optimization

## Files

- `Dockerfile` - Multi-stage build for the database image
- `init-db.sh` - Database initialization script (enables PostGIS)
- `alembic-init.sh` - Alembic migration setup script
- `.dockerignore` - Files to exclude from Docker build context

## Building the Database Image

```bash
# Build locally
docker build -t pieno-database:test .

# Run locally
docker run -d \
  --name pieno-db-test \
  -p 5432:5432 \
  pieno-database:test
```

## Database Schema

The database includes the following main components:

### Core Tables
- **Users** - User accounts and profiles
- **Vehicles** - Vehicle information and profiles
- **Stations** - Fuel station data (with geospatial coordinates)
- **Trips** - Trip records and fuel consumption
- **Alerts** - Price alerts and notifications

### Geospatial Features
- **PostGIS** enabled for location-based queries
- **Spatial indexes** on station coordinates
- **Distance calculations** for nearby stations
- **Geographic data types** for coordinates

### Alembic Migrations

Database schema changes are managed through Alembic migrations located in `../backend/alembic/versions/`.

Current migrations:
- `20260427_0001_initial_schema.py` - Initial database schema
- `20260429_0002_sync_run_detailed_metrics.py` - Sync run metrics
- `20260429_0003_user_identity_foundation.py` - User identity features

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `pienosmart` | Database name |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |

## Health Checks

The database container includes health checks that verify:
- PostgreSQL service is running
- Database is accepting connections
- PostGIS extensions are available

## Usage in CI/CD

The database image is built and deployed as part of the CI/CD pipeline:

```bash
# Image tags
ghcr.io/mrgionsi/pieno-database:latest
ghcr.io/mrgionsi/pieno-database:<branch>
ghcr.io/mrgionsi/pieno-database:<commit-sha>
```

## Local Development

For local development, use the `docker-compose.yml` in the project root:

```bash
# Start database
docker-compose up db

# Or use the CI-specific compose file
docker-compose -f docker-compose.ci.yml up db
```

## Database Connection

Backend connects using:
```
postgresql+psycopg://postgres:postgres@localhost:5432/pienosmart
```

## Backup and Restore

```bash
# Backup
docker exec pienosmart-db pg_dump -U postgres pienosmart > backup.sql

# Restore
docker exec -i pienosmart-db psql -U postgres pienosmart < backup.sql
```

## Troubleshooting

### Common Issues

1. **PostGIS not enabled**
   ```sql
   -- Check if PostGIS is enabled
   SELECT PostGIS_Version();
   ```

2. **Migration failures**
   ```bash
   # Reset migrations (CAUTION: destroys data)
   cd backend
   alembic downgrade base
   alembic upgrade head
   ```

3. **Connection issues**
   - Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
   - Check credentials in environment variables
   - Ensure database exists: `createdb pienosmart`

### Logs

```bash
# View database logs
docker logs pienosmart-db

# View migration logs
cd backend && alembic current
```

## Performance Tuning

For production deployments, consider:

- **Connection pooling** (PgBouncer)
- **Replication** for read-heavy workloads
- **Partitioning** for large trip/fuel data tables
- **Indexes** on frequently queried columns
- **VACUUM** maintenance for optimal performance

## Security

- Change default passwords in production
- Use SSL/TLS for connections
- Implement proper user roles and permissions
- Regular security updates for PostgreSQL/PostGIS