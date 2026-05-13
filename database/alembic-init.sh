#!/bin/bash
set -e

echo "Running Alembic database migrations..."

# Wait for database to be ready using the configured init user/database.
echo "Waiting for database to be ready..."
until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"; do
    echo "Database is unavailable - sleeping"
    sleep 2
done

echo "Database is ready."

echo "Alembic migrations setup completed"
echo "Note: Migrations will be run by the application or CI/CD pipeline"
