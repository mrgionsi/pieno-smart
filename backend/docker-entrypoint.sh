#!/bin/sh
set -e

# Start cron in the background if available
if command -v cron >/dev/null 2>&1; then
  echo "Starting cron daemon..."
  cron
fi

# Execute the main container command
exec "$@"
