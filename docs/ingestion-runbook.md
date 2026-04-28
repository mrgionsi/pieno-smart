# PienoSmart Ingestion Runbook

## Purpose

This runbook defines how to operate the MIMIT ingestion flow in MVP.

## Normal Operation

- scheduler triggers one ingestion run per day
- ingestion writes a `sync_runs` record at start
- station import runs
- price import runs
- price changes are recorded only on value changes
- `sync_runs` is marked completed or failed

## Manual Retry Procedure

1. inspect the latest `sync_runs` record
2. verify whether failure happened during station import or price import
3. confirm MIMIT source availability and file accessibility
4. rerun the ingestion job manually
5. verify record counts and completion status

## Expected Failure Modes

### MIMIT unavailable

Response:

- mark sync run as failed
- retain previously imported current data
- do not degrade runtime station search

### Format change

Signals:

- parser errors
- unexpected column count
- unmapped fuel type or service mode values

Response:

- fail the ingestion job loudly
- record enough error context in `sync_runs.error_message`
- update parser mapping and regression fixtures before rerun

### Partial data anomalies

Examples:

- missing coordinates
- invalid prices
- duplicate ministerial ids in source

Response:

- reject invalid records where necessary
- count and log anomalies
- keep import behavior deterministic

## Operational Checks

After each production run verify:

- sync status is `completed`
- station and price counts are within expected range
- price change insert count is plausible
- no abnormal spike in stale data on the read side

## Stale Data Incident Handling

If ingestion does not complete for more than one cycle:

- continue serving existing data
- surface stale freshness badges normally
- treat this as a data freshness incident, not an API outage

## Logging Requirements

Every run should log:

- run id
- source name
- start and end time
- records seen
- records upserted
- price changes inserted
- parser version or mapping version
- failure reason if any
