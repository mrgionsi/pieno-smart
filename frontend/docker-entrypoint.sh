#!/bin/sh
set -eu

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${EXPO_PUBLIC_API_BASE_URL:-/api}",
  DEV_USER_EMAIL: "${EXPO_PUBLIC_DEV_USER_EMAIL:-demo@pienosmart.local}",
  DEV_USER_DISPLAY_NAME: "${EXPO_PUBLIC_DEV_USER_DISPLAY_NAME:-Demo User}",
  DEV_USER_SUBJECT: "${EXPO_PUBLIC_DEV_USER_SUBJECT:-dev-local-user}",
  CLARITY_PROJECT_ID: "${EXPO_PUBLIC_CLARITY_PROJECT_ID:-}",
  CLARITY_REQUIRE_CONSENT: "${EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT:-true}",
};
EOF

exec nginx -g "daemon off;"
