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

- `/api`

In containerized deployments, the frontend Nginx server should proxy `/api` to the backend service.

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
