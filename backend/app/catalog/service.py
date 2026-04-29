from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select, text
from sqlalchemy.orm import Session, joinedload

from app.catalog.schemas import (
    NearbySort,
    NearbyStationItem,
    NearbyStationsQuery,
    StationDetailResponse,
    StationPriceItem,
    freshness_status_for,
)
from app.models import Station
from app.recommendation import rank_nearby_stations_for_convenience

ROME_TZ = ZoneInfo("Europe/Rome")


class StationCatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_nearby_stations(self, query: NearbyStationsQuery) -> list[NearbyStationItem]:
        now = datetime.now(ROME_TZ)
        require_price = (
            query.fuel_type is not None
            or query.service_mode is not None
            or query.sort in {NearbySort.PRICE, NearbySort.CONVENIENCE}
        )
        is_convenience_sort = query.sort == NearbySort.CONVENIENCE
        sql = """
            WITH search_point AS (
                SELECT ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography AS point
            )
            SELECT
                s.id,
                s.ministerial_station_id,
                s.name,
                s.brand,
                s.address,
                s.comune,
                s.provincia,
                s.postal_code,
                s.is_highway_station,
                ST_Y(s.location::geometry) AS latitude,
                ST_X(s.location::geometry) AS longitude,
                ST_Distance(s.location, sp.point) AS distance_meters,
                cp.fuel_type AS selected_fuel_type,
                cp.service_mode AS selected_service_mode,
                cp.price AS current_price,
                cp.price_effective_at,
                cp.source_updated_at
            FROM stations s
            CROSS JOIN search_point sp
            LEFT JOIN LATERAL (
                SELECT
                    c.fuel_type,
                    c.service_mode,
                    c.price,
                    c.price_effective_at,
                    c.source_updated_at
                FROM current_prices c
                WHERE c.station_id = s.id
                  AND (CAST(:fuel_type AS fuel_type) IS NULL OR c.fuel_type = CAST(:fuel_type AS fuel_type))
                  AND (
                      :is_convenience_sort IS TRUE
                      OR CAST(:service_mode AS service_mode) IS NULL
                      OR c.service_mode = CAST(:service_mode AS service_mode)
                  )
                ORDER BY
                    CASE
                        WHEN :is_convenience_sort IS TRUE
                         AND CAST(:service_mode AS service_mode) IS NOT NULL
                         AND c.service_mode = CAST(:service_mode AS service_mode)
                        THEN 0
                        ELSE 1
                    END ASC,
                    c.price ASC,
                    c.price_effective_at DESC NULLS LAST
                LIMIT 1
            ) cp ON TRUE
            WHERE s.is_active IS TRUE
              AND ST_DWithin(s.location, sp.point, :radius_meters)
              AND (CAST(:brand AS text) IS NULL OR s.brand = CAST(:brand AS text))
              AND (:require_price IS FALSE OR cp.price IS NOT NULL)
            ORDER BY
                CASE WHEN :sort = 'price' THEN cp.price END ASC NULLS LAST,
                CASE WHEN :sort = 'price' THEN ST_Distance(s.location, sp.point) END ASC,
                CASE WHEN :sort IN ('distance', 'convenience') THEN ST_Distance(s.location, sp.point) END ASC,
                s.id ASC
        """
        if not is_convenience_sort:
            sql += "\nLIMIT :limit"

        rows = self.db.execute(
            text(sql),
            {
                "lat": query.lat,
                "lon": query.lon,
                "radius_meters": query.radius_meters,
                "fuel_type": query.fuel_type.value if query.fuel_type is not None else None,
                "service_mode": query.service_mode.value if query.service_mode is not None else None,
                "brand": query.brand,
                "require_price": require_price,
                "is_convenience_sort": is_convenience_sort,
                "sort": query.sort.value,
                "limit": query.limit,
            },
        ).mappings()

        items: list[NearbyStationItem] = []
        for row in rows:
            source_updated_at = row["source_updated_at"]
            items.append(
                NearbyStationItem(
                    id=int(row["id"]),
                    ministerial_station_id=str(row["ministerial_station_id"]),
                    name=row["name"],
                    brand=row["brand"],
                    address=row["address"],
                    comune=row["comune"],
                    provincia=row["provincia"],
                    postal_code=row["postal_code"],
                    is_highway_station=row["is_highway_station"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    distance_meters=float(row["distance_meters"]),
                    selected_fuel_type=row["selected_fuel_type"],
                    selected_service_mode=row["selected_service_mode"],
                    current_price=row["current_price"],
                    price_effective_at=row["price_effective_at"],
                    source_updated_at=source_updated_at,
                    freshness_status=freshness_status_for(source_updated_at, now=now),
                )
            )

        if is_convenience_sort:
            ranked_items = rank_nearby_stations_for_convenience(
                items,
                radius_meters=query.radius_meters,
                requested_service_mode=query.service_mode,
            )
            return ranked_items[: query.limit]

        return items

    def get_station_detail(self, station_id: int) -> StationDetailResponse | None:
        now = datetime.now(ROME_TZ)
        station = (
            self.db.execute(
            select(Station)
            .options(joinedload(Station.current_prices))
            .where(Station.id == station_id, Station.is_active.is_(True))
        )
            .unique()
            .scalar_one_or_none()
        )
        if station is None:
            return None

        price_rows = sorted(
            station.current_prices,
            key=lambda item: (item.fuel_type.value, item.service_mode.value, item.price),
        )

        prices = [
            StationPriceItem(
                fuel_type=row.fuel_type,
                service_mode=row.service_mode,
                price=row.price,
                price_effective_at=row.price_effective_at,
                source_updated_at=row.source_updated_at,
                freshness_status=freshness_status_for(row.source_updated_at, now=now),
            )
            for row in price_rows
        ]

        source_updated_at = station.source_updated_at
        return StationDetailResponse(
            id=station.id,
            ministerial_station_id=station.ministerial_station_id,
            name=station.name,
            brand=station.brand,
            address=station.address,
            comune=station.comune,
            provincia=station.provincia,
            postal_code=station.postal_code,
            is_highway_station=station.is_highway_station,
            latitude=float(station.latitude),
            longitude=float(station.longitude),
            source_updated_at=source_updated_at,
            freshness_status=freshness_status_for(source_updated_at, now=now),
            prices=prices,
        )
