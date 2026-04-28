# PienoSmart MVP Scope And Release Plan

## Product Positioning

PienoSmart should launch as a refueling decision product, not a generic price list.

Core promise:

> not just the cheapest station, but the best refueling decision

## Release Split

### Release 1

Release 1 should validate the product promise with the smallest coherent scope:

- daily MIMIT ingestion
- nearby station search
- convenience ranking
- vehicle profiles
- freshness transparency
- station detail

### Release 1.1

Release 1.1 should extend the product after the core loop is working:

- route-based station search
- basic alerts
- favorites

## Why This Split

- nearby search is the fastest path to real user value
- route search adds external dependency complexity
- alerts add state, timing, and notification complexity
- the ranking engine and freshness UX are the actual differentiators and should ship first

## MVP Success Criteria

The MVP is successful if a user can:

- open the app and find nearby stations for their fuel type
- understand why one result is recommended
- trust the freshness of the data shown
- save a vehicle profile and see better recommendations

## Non-Goals For Initial Release

- full route optimization
- push notification delivery guarantees
- full admin backoffice
- forecasting or price prediction
- station crowdsourcing or moderation

## Product Decisions Frozen By This Document

- MIMIT is a batch upstream source, not a runtime dependency
- PostgreSQL with PostGIS is the only required data system for MVP
- Redis is out of scope for MVP
- current operational data is stored, not full raw daily replicas in PostgreSQL
