# PienoSmart Domain Data Contract

## Purpose

This document defines the meanings of core business objects so product, backend, and client use the same language.

## Station

A station is the canonical representation of one physical fuel station from MIMIT.

Required fields:

- internal id
- ministerial station id
- name if present
- brand if present
- address
- comune
- provincia
- coordinates
- active flag

Optional fields:

- postal code
- services metadata
- highway flag

## Current Price

A current price is the latest known price for:

- one station
- one fuel type
- one service mode

Uniqueness:

- `station_id`
- `fuel_type`
- `service_mode`

## Price Change

A price change is written only when the current price value changes.

It is not a full daily snapshot.

Required fields:

- station
- fuel type
- service mode
- old price
- new price
- changed at

## Fuel Type Canonical Values

Initial canonical values:

- `benzina`
- `diesel`
- `gpl`
- `metano`
- `gnl`
- `hvo`
- `altro`

Normalization rule:

- MIMIT source strings must be mapped to one canonical value before persistence
- unknown or new values must be logged and mapped conservatively

## Service Mode Canonical Values

Initial canonical values:

- `self`
- `servito`
- `unknown`

Normalization rule:

- if MIMIT service metadata is missing or ambiguous, persist `unknown`

## Vehicle Profile

A vehicle profile is the minimum personalization unit.

Required fields:

- user id
- profile name
- fuel type
- average consumption in liters per 100 km

Optional fields:

- tank capacity
- preferred service mode
- preferred brands
- excluded brands

## Freshness

Freshness describes how recent the source price update is.

Initial badge policy:

- `fresh`: last source update within 24 hours
- `aging`: more than 24 hours and up to 48 hours
- `stale`: more than 48 hours

Freshness is computed from `current_prices.source_updated_at`.

## Convenience Score

The convenience score is a ranking score, not a user-visible currency amount.

Inputs:

- station price
- distance or route deviation
- estimated cost to reach the station
- fuel compatibility with the vehicle profile
- preferred or excluded brands
- freshness penalty

Outputs:

- numeric score
- ordered recommendation rank
- explanation reasons

## Explanation Reasons

Every recommendation response should provide at least one reason.

Examples:

- lower total detour cost
- price is competitive nearby
- matches your preferred service mode
- more recent data than nearby alternatives

## Alert

An alert is a persisted user condition evaluated against current prices.

Supported initial types:

- `price_threshold`
- `favorite_station`

## Sync Run

A sync run is the operational record of one ingestion execution.

It must capture:

- source
- status
- start time
- end time
- records seen
- records upserted
- price changes inserted
- failure message if any
