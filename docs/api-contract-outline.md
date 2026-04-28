# PienoSmart API Contract Outline

## Principles

- REST API for MVP
- JSON only
- OpenAPI generated from backend models
- all station responses include freshness metadata

## Endpoints For Release 1

### `GET /stations/nearby`

Purpose:

- search stations near a point

Core query parameters:

- `lat`
- `lon`
- `radius_meters`
- `fuel_type`
- `service_mode`
- `brand`
- `sort` with values `distance`, `price`, `convenience`
- optional `vehicle_profile_id`

Response items should include:

- station id
- ministerial station id
- name
- brand
- address summary
- coordinates
- selected fuel type
- selected service mode
- current price
- source updated at
- freshness badge
- distance meters
- convenience score when requested
- explanation reasons when sorted by convenience

### `GET /stations/{id}`

Purpose:

- fetch station details and current prices

Response should include:

- station identity
- address and location
- services metadata
- all current prices
- freshness metadata

### `POST /recommendations/refuel`

Purpose:

- request ranked recommendations with an explicit scoring context

Request should allow:

- origin point
- optional destination point
- fuel type
- radius or route deviation settings
- optional vehicle profile id
- optional ad hoc profile overrides

Response should include:

- ranked stations
- score
- explanation reasons
- search context metadata

### `GET /vehicle-profiles`

- list current user vehicle profiles

### `POST /vehicle-profiles`

- create a vehicle profile

### `PATCH /vehicle-profiles/{id}`

- update a vehicle profile

### `DELETE /vehicle-profiles/{id}`

- delete a vehicle profile

## Endpoints For Release 1.1

### `GET /stations/route`

Purpose:

- search stations on or near a route

Core query parameters:

- origin
- destination
- fuel type
- max deviation meters
- service mode
- sort
- optional vehicle profile id

Response should distinguish:

- on-route candidates
- near-route candidates

### `GET /alerts`

- list alerts

### `POST /alerts`

- create an alert

### `PATCH /alerts/{id}`

- activate, deactivate, or update an alert

## Response Standards

- timestamps in ISO 8601 UTC
- prices as decimals serialized consistently
- explicit nullable fields where source data may be missing
- no hidden ranking behavior without explanation payload

## Error Standards

Use a consistent error envelope:

- `code`
- `message`
- `details`

Examples:

- invalid coordinates
- unsupported fuel type
- vehicle profile not found
- route provider unavailable
