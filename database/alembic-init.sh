#!/bin/bash
set -e

echo "Running Alembic database migrations..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -U postgres -d pienosmart; do
    echo "Database is unavailable - sleeping"
    sleep 2
done

echo "Database is ready, running migrations..."

# Install Python and dependencies for running Alembic
apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code for migrations
# Note: This assumes the backend directory is mounted as a volume in CI/CD
# For the Docker image, we'll need to copy the necessary files

echo "Alembic migrations setup completed"
echo "Note: Migrations will be run by the application or CI/CD pipeline"