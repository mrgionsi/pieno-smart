from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from app.catalog.schemas import FreshnessStatus, NearbyStationItem
from app.models.common import FuelType, ServiceMode
from app.recommendation.scoring import rank_nearby_stations_for_convenience

ROME_TZ = ZoneInfo("Europe/Rome")


def _candidate(
    *,
    station_id: int,
    distance_meters: float,
    price: str,
    freshness_status: FreshnessStatus,
    service_mode: ServiceMode,
) -> NearbyStationItem:
    now = datetime.now(ROME_TZ)
    return NearbyStationItem(
        id=station_id,
        ministerial_station_id=str(station_id),
        name=f"Station {station_id}",
        brand="Test",
        address="Via Test",
        comune="Roma",
        provincia="RM",
        postal_code="00100",
        is_highway_station=False,
        latitude=41.9,
        longitude=12.5,
        distance_meters=distance_meters,
        selected_fuel_type=FuelType.BENZINA,
        selected_service_mode=service_mode,
        current_price=Decimal(price),
        price_effective_at=now,
        source_updated_at=now,
        freshness_status=freshness_status,
    )


def test_rank_nearby_stations_for_convenience_prefers_balanced_candidate() -> None:
    ranked = rank_nearby_stations_for_convenience(
        [
            _candidate(
                station_id=1,
                distance_meters=120.0,
                price="1.700",
                freshness_status=FreshnessStatus.FRESH,
                service_mode=ServiceMode.SELF,
            ),
            _candidate(
                station_id=2,
                distance_meters=1900.0,
                price="1.690",
                freshness_status=FreshnessStatus.STALE,
                service_mode=ServiceMode.SERVITO,
            ),
        ],
        radius_meters=2000,
        requested_service_mode=ServiceMode.SELF,
    )

    assert [item.id for item in ranked] == [1, 2]
    assert ranked[0].score is not None
    assert ranked[1].score is not None
    assert ranked[0].score > ranked[1].score
    assert "matches requested self service" in ranked[0].match_reasons


def test_rank_nearby_stations_for_convenience_filters_non_comparable_candidates() -> None:
    comparable = _candidate(
        station_id=1,
        distance_meters=120.0,
        price="1.700",
        freshness_status=FreshnessStatus.FRESH,
        service_mode=ServiceMode.SELF,
    )
    missing_price = comparable.model_copy(
        update={
            "id": 2,
            "ministerial_station_id": "2",
            "current_price": None,
            "selected_fuel_type": None,
        }
    )

    ranked = rank_nearby_stations_for_convenience(
        [comparable, missing_price],
        radius_meters=2000,
        requested_service_mode=ServiceMode.SELF,
    )

    assert [item.id for item in ranked] == [1]
