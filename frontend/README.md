# PienoSmart Frontend

This frontend uses:

- Expo
- React Native
- Expo Router

Why this stack:

- one codebase for web now
- same codebase can later be expanded into native iOS and Android apps
- better component reuse than building a separate web-only frontend first

## Run locally

1. Copy env:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
nvm use
npm install
```

3. Start the app:

```bash
npm run web
```

The app expects the backend API at:

- `EXPO_PUBLIC_API_BASE_URL`

Default:

- local Expo web dev: `http://localhost:8000/api`
- containerized/deployed frontend: `/api`

In containerized deployments, the frontend Nginx server should proxy `/api` to the backend service.

## Session Analytics

This frontend can optionally enable Microsoft Clarity for session replay and heatmaps.

Relevant env vars:

- `EXPO_PUBLIC_CLARITY_PROJECT_ID`
- `EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT`

Important:

- the deployed frontend loads `runtime-config.js` at startup
- the container entrypoint writes that file from `EXPO_PUBLIC_*` env vars
- this means the same frontend image can be reused across environments without rebuilding for every frontend config change

Recommended setup for EU / Italy:

- keep `EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT=true`
- show the built-in consent prompt before loading Clarity
- use Clarity only for product UX improvement, not ad profiling

With this setup:

- Clarity stays disabled until the user accepts
- once accepted, the frontend grants analytics consent to Clarity
- ad storage remains denied

## Current screens

- Nearby search
- Station detail
- Vehicle profiles

## Current assumptions

- Node 22 LTS is used locally (`.nvmrc` provided)
- backend is running locally
- backend CORS allows the Expo web origin
- dev identity headers are configured through frontend env values

## Future direction

This app shell is meant to evolve into:

- web experience
- Android app
- iOS app

without replacing the core UI stack.
