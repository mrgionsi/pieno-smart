# Fuel Decision Assistant

## Document Info

- Product: Fuel decision assistant for the Italian market
- Scope: Operational PRD and initial PostgreSQL/PostGIS schema
- Status: Draft for MVP planning
- Primary data source: MIMIT open data on fuel station registry and prices

## 1. Product Overview

### 1.1 Vision

Help users decide where and when to refuel in the most convenient way, using public MIMIT data enriched with a convenience-ranking engine rather than only price sorting.

### 1.2 Problem Statement

Existing products in Italy usually solve the basic use case:

- find nearby stations
- sort by price
- show map and navigation

This leaves important gaps:

- the cheapest station is not always the best option
- users have different vehicles, fuel types, and service preferences
- public price data is not true real time and needs transparency
- route-based refueling decisions are often poorly optimized

### 1.3 MVP Goal

Allow a user to find the best nearby or on-route fuel station based on real convenience, vehicle profile, and data freshness, not only on pump price.

### 1.4 Target Users

- Cost-conscious private drivers
- Daily commuters
- Light professional drivers such as agents, artisans, and local couriers

### 1.5 Value Proposition

"Not just the lowest price. The best refueling decision."

### 1.6 Out of Scope for MVP

- Full community moderation and photo verification
- Price prediction and forecasting models
- Large fleet administration
- Full EV charging integration
- Loyalty programs and commercial marketplace features

## 2. Product Requirements Document

### 2.1 Core User Stories

1. As a user, I want to see nearby stations for my fuel type so that I can choose quickly.
2. As a user, I want to sort results by real convenience so that I avoid cheap but inefficient detours.
3. As a user, I want to save my vehicle profile so the app can personalize recommendations.
4. As a user, I want to search for stations along a route so I can optimize refueling during a trip.
5. As a user, I want to see when a price was last updated so I can judge its reliability.
6. As a user, I want price alerts for areas or favorite stations so I can refuel at the right time.

### 2.2 Functional Scope

#### F1. Daily MIMIT Ingestion

The system imports:

- active station registry
- current fuel prices
- supported fuel and service modes

The system stores:

- current station data
- current price snapshot
- price changes only when a value actually changes

The system does not store:

- full daily raw snapshots in the relational database
- full historical raw replicas unless needed outside the DB for audit/debug

#### F2. Nearby Search

Users can:

- search by current location
- set a search radius
- filter by fuel type
- filter by self-service or served mode
- filter by brand and essential services
- sort by price, distance, or convenience

#### F3. Convenience Ranking

The ranking engine considers:

- station fuel price
- distance or route deviation
- estimated fuel cost to reach the station
- vehicle compatibility
- stale data penalty
- user preferences

#### F4. Vehicle Profiles

Users can save:

- fuel type
- average consumption
- optional tank capacity
- service mode preference
- preferred or excluded brands

#### F5. Route-Based Refueling

Users can:

- enter origin and destination
- see stations on or near the route
- compare stops by convenience, not just list order
- view approximate deviation cost and time

#### F6. Data Transparency

Each station result shows:

- last known price update time
- source attribution
- freshness indicator

#### F7. Alerts

Users can configure:

- price threshold alerts
- favorite station alerts
- fuel-type alerts in a selected area

### 2.3 Detailed Acceptance Criteria

#### F1. Daily MIMIT Ingestion

Acceptance criteria:

- The system can import the MIMIT station dataset at least once per day.
- The system can import the MIMIT price dataset at least once per day.
- The system can parse the current file format using the `|` field separator.
- The system updates existing stations without creating duplicates.
- The system updates current prices via upsert.
- The system writes a `price_changes` record only when a station/fuel/service price changes.
- The system logs sync status, import start time, end time, and record counts.
- The application remains functional even if MIMIT is temporarily unavailable during runtime.

#### F2. Nearby Search

Acceptance criteria:

- A user can search using latitude and longitude.
- The API returns stations within a configurable radius.
- Results can be filtered by supported fuel type.
- Results can be filtered by self-service or served mode where available.
- Results can be ordered by price ascending.
- Results can be ordered by distance ascending.
- Results can be ordered by convenience score descending.
- Each result returns station identity, coordinates, selected fuel price, service mode, and freshness metadata.

#### F3. Convenience Ranking

Acceptance criteria:

- The API computes a convenience score for each candidate station.
- The score includes a price component and a travel-cost component.
- The score applies a penalty when the price data is stale beyond a configurable threshold.
- The score can use a vehicle profile when provided.
- The API returns an explanation payload with at least one human-readable reason for the recommendation.
- If no vehicle profile is provided, the engine falls back to default assumptions.

#### F4. Vehicle Profiles

Acceptance criteria:

- A user can create a vehicle profile.
- A user can edit a vehicle profile.
- A user can delete a vehicle profile.
- A vehicle profile stores at minimum fuel type and average consumption.
- The recommendation API can accept a stored vehicle profile identifier.
- Incompatible stations are excluded from recommendations when the fuel type does not match the profile.

#### F5. Route-Based Refueling

Acceptance criteria:

- A user can request stations between an origin and destination.
- The system can filter stations by maximum route deviation.
- The system returns estimated deviation distance or travel cost per station.
- The system can rank route candidates by convenience score.
- The response clearly distinguishes on-route from off-route-but-near candidates.

#### F6. Data Transparency

Acceptance criteria:

- Every price result includes the last source update timestamp.
- Every result includes a freshness badge based on configurable thresholds.
- The UI can display the source as MIMIT data.
- The API returns enough metadata to explain that the data is based on daily ministerial publication rather than guaranteed real-time confirmation.

#### F7. Alerts

Acceptance criteria:

- A user can create a price threshold alert for a fuel type and area.
- A user can create an alert for a favorite station.
- A user can deactivate an alert.
- The backend evaluates alert conditions against imported current prices.
- Triggered alerts are stored with status and timestamp.

### 2.4 Non-Functional Requirements

- Nearby search should return in under 500 ms under normal MVP load for warm application state.
- The system must not depend on live MIMIT availability to serve user requests.
- The import job must be rerunnable safely.
- Data imports must be observable through structured logs and sync metadata.
- The database design must support later additions such as forecasting, community validation, and B2B reporting.

### 2.5 Product Metrics

- Search-to-navigation conversion rate
- Percentage of users who save at least one vehicle profile
- Ratio of convenience-sorted searches to price-sorted searches
- Alert subscription rate
- Alert click-through rate
- Seven-day retention for repeat users

### 2.6 Risks and Mitigations

#### Risk: Public data is not true real time

Mitigation:

- always expose freshness metadata
- message the source clearly in product copy

#### Risk: Routing can be expensive or inaccurate

Mitigation:

- keep route logic simple in MVP
- cap deviation calculations
- add provider integration behind a single service layer

#### Risk: Ranking may feel opaque

Mitigation:

- return simple ranking reasons
- expose score contributors in admin/debug tools

#### Risk: Inconsistent service metadata across stations

Mitigation:

- treat services as optional
- make the UX resilient to missing values

### 2.7 Suggested Delivery Plan

#### Sprint 1

- PostgreSQL/PostGIS schema
- MIMIT ingestion job
- station and current price persistence
- nearby search API

#### Sprint 2

- vehicle profiles
- convenience score
- station detail endpoint

#### Sprint 3

- route-based search
- alerts
- product telemetry

## 3. Technical Direction

### 3.1 Database Recommendation

Use PostgreSQL with the PostGIS extension.

Rationale:

- PostgreSQL is the system of record for stations, prices, users, and alerts.
- PostGIS adds accurate geospatial indexing and distance queries.
- This avoids adding Redis or another secondary data system in the MVP.

### 3.2 Data Retention Strategy

Persist only what the product needs:

- current station registry
- current prices
- price changes only
- user-owned data such as profiles, favorites, and alerts

Do not persist full raw daily replicas inside PostgreSQL unless needed for audit or recovery workflows.

## 4. Initial PostgreSQL/PostGIS Schema

### 4.1 Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 4.2 Reference Types

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuel_type') THEN
    CREATE TYPE fuel_type AS ENUM (
      'benzina',
      'diesel',
      'gpl',
      'metano',
      'gnl',
      'hvo',
      'altro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_mode') THEN
    CREATE TYPE service_mode AS ENUM (
      'self',
      'servito',
      'unknown'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM (
      'price_threshold',
      'favorite_station'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
    CREATE TYPE sync_status AS ENUM (
      'started',
      'completed',
      'failed'
    );
  END IF;
END $$;
```

### 4.3 Users

If authentication already exists elsewhere, adapt this table to the existing identity model.

```sql
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.4 Stations

```sql
CREATE TABLE IF NOT EXISTS stations (
  id BIGSERIAL PRIMARY KEY,
  ministerial_station_id TEXT NOT NULL UNIQUE,
  name TEXT,
  brand TEXT,
  address TEXT,
  comune TEXT,
  provincia TEXT,
  postal_code TEXT,
  is_highway_station BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  services_json JSONB,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stations_location
  ON stations
  USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_stations_comune
  ON stations (comune);

CREATE INDEX IF NOT EXISTS idx_stations_brand
  ON stations (brand);
```

### 4.5 Current Prices

One current row per station, fuel type, and service mode.

```sql
CREATE TABLE IF NOT EXISTS current_prices (
  id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type fuel_type NOT NULL,
  service_mode service_mode NOT NULL DEFAULT 'unknown',
  price NUMERIC(6, 3) NOT NULL CHECK (price > 0),
  price_effective_at TIMESTAMPTZ,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (station_id, fuel_type, service_mode)
);

CREATE INDEX IF NOT EXISTS idx_current_prices_station
  ON current_prices (station_id);

CREATE INDEX IF NOT EXISTS idx_current_prices_lookup
  ON current_prices (fuel_type, service_mode, price);
```

### 4.6 Price Changes

Persist only actual changes rather than full daily snapshots.

```sql
CREATE TABLE IF NOT EXISTS price_changes (
  id BIGSERIAL PRIMARY KEY,
  station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type fuel_type NOT NULL,
  service_mode service_mode NOT NULL DEFAULT 'unknown',
  old_price NUMERIC(6, 3),
  new_price NUMERIC(6, 3) NOT NULL CHECK (new_price > 0),
  changed_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_changes_station_time
  ON price_changes (station_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_changes_fuel_time
  ON price_changes (fuel_type, changed_at DESC);
```

### 4.7 Vehicle Profiles

```sql
CREATE TABLE IF NOT EXISTS vehicle_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel_type fuel_type NOT NULL,
  avg_consumption_l_per_100km NUMERIC(5, 2) NOT NULL CHECK (avg_consumption_l_per_100km > 0),
  tank_capacity_liters NUMERIC(5, 2),
  preferred_service_mode service_mode NOT NULL DEFAULT 'self',
  preferred_brands TEXT[] NOT NULL DEFAULT '{}',
  excluded_brands TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user
  ON vehicle_profiles (user_id);
```

### 4.8 Favorites

```sql
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  station_id BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);
```

### 4.9 Alerts

For area-based alerts, store either a center point and radius or a named area reference. For MVP, a center point plus radius is enough.

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  vehicle_profile_id UUID REFERENCES vehicle_profiles(id) ON DELETE SET NULL,
  station_id BIGINT REFERENCES stations(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  fuel_type fuel_type,
  threshold_price NUMERIC(6, 3),
  center GEOGRAPHY(Point, 4326),
  radius_meters INTEGER CHECK (radius_meters > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user
  ON alerts (user_id);

CREATE INDEX IF NOT EXISTS idx_alerts_center
  ON alerts
  USING GIST (center);
```

### 4.10 Alert Events

Store triggers separately so alert history is inspectable.

```sql
CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  station_id BIGINT REFERENCES stations(id) ON DELETE SET NULL,
  current_price_id BIGINT REFERENCES current_prices(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_alert_events_alert_time
  ON alert_events (alert_id, triggered_at DESC);
```

### 4.11 Sync Runs

Track operational health of scheduled imports.

```sql
CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  status sync_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  station_records_seen INTEGER NOT NULL DEFAULT 0,
  price_records_seen INTEGER NOT NULL DEFAULT 0,
  station_records_upserted INTEGER NOT NULL DEFAULT 0,
  price_records_upserted INTEGER NOT NULL DEFAULT 0,
  price_change_records_inserted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at
  ON sync_runs (started_at DESC);
```

### 4.12 Example Nearby Query

```sql
SELECT
  s.id,
  s.ministerial_station_id,
  s.brand,
  s.address,
  s.comune,
  cp.fuel_type,
  cp.service_mode,
  cp.price,
  cp.source_updated_at,
  ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
  ) AS distance_meters
FROM stations s
JOIN current_prices cp ON cp.station_id = s.id
WHERE cp.fuel_type = :fuel_type
  AND ST_DWithin(
    s.location,
    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
    :radius_meters
  )
ORDER BY distance_meters ASC, cp.price ASC
LIMIT 50;
```

### 4.13 Example Upsert Strategy

Suggested ingestion logic:

1. Upsert station by `ministerial_station_id`.
2. Find existing current price by `(station_id, fuel_type, service_mode)`.
3. If no current row exists, insert it.
4. If current row exists and price changed:
   - insert into `price_changes`
   - update `current_prices`
5. If current row exists and price did not change:
   - update freshness timestamps only if needed

### 4.14 Suggested Future Extensions

Reserve later additions for:

- reliability scores per station/fuel/service
- route-search cache tables or materialized views
- forecasting tables for modeled price trends
- B2B policy and reporting entities

## 5. API Surface Recommendation

Suggested MVP endpoints:

- `GET /stations/nearby`
- `GET /stations/{id}`
- `GET /stations/route`
- `POST /recommendations/refuel`
- `GET /vehicle-profiles`
- `POST /vehicle-profiles`
- `GET /alerts`
- `POST /alerts`

## 6. Implementation Notes

- Keep the import layer isolated from product logic.
- Treat MIMIT as the upstream source, not as a runtime dependency.
- Persist compact operational data, not full raw copies.
- Use PostgreSQL as the only database in MVP.
- Add Redis only later if query volume or ranking cost justifies it.
