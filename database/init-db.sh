#!/bin/bash
set -e

echo "Initializing PienoSmart database..."

# Enable PostGIS extension
echo "Enabling PostGIS extension..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
    CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
    CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
EOSQL

echo "PostGIS extensions enabled successfully"

# Create any additional database setup if needed
# (Add custom database initialization here if required)

echo "Database initialization completed"