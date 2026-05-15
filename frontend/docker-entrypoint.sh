#!/bin/sh
set -eu

jq -n \
  --arg api_base_url "${EXPO_PUBLIC_API_BASE_URL:-/api}" \
  --arg dev_user_email "${EXPO_PUBLIC_DEV_USER_EMAIL:-}" \
  --arg dev_user_display_name "${EXPO_PUBLIC_DEV_USER_DISPLAY_NAME:-}" \
  --arg dev_user_subject "${EXPO_PUBLIC_DEV_USER_SUBJECT:-}" \
  --arg clarity_project_id "${EXPO_PUBLIC_CLARITY_PROJECT_ID:-}" \
  --arg clarity_require_consent "${EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT:-true}" \
  '{
    API_BASE_URL: $api_base_url,
    DEV_USER_EMAIL: $dev_user_email,
    DEV_USER_DISPLAY_NAME: $dev_user_display_name,
    DEV_USER_SUBJECT: $dev_user_subject,
    CLARITY_PROJECT_ID: $clarity_project_id,
    CLARITY_REQUIRE_CONSENT: $clarity_require_consent
  }' | awk '{print "window.__APP_CONFIG__ = " $0 ";"}' > /usr/share/nginx/html/runtime-config.js

exec nginx -g "daemon off;"
