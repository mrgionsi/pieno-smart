#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-1}" = "1" ]; then
  echo "Running Alembic migrations..."
  attempts=0
  max_attempts="${DB_MIGRATION_MAX_ATTEMPTS:-30}"

  until alembic upgrade head; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "Alembic migrations failed after ${attempts} attempts"
      exit 1
    fi
    echo "Alembic migration attempt ${attempts} failed, retrying in 2 seconds..."
    sleep 2
  done
fi

# Start cron in the background if available
if command -v cron >/dev/null 2>&1; then
  echo "Starting cron daemon..."
  cron
fi

# Execute the main container command
exec "$@"
