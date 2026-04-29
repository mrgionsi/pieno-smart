from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal

from app.catalog.schemas import FreshnessStatus, NearbyStationItem
from app.models.common import ServiceMode

PRICE_WEIGHT = 45.0
DISTANCE_WEIGHT = 30.0
FRESHNESS_WEIGHTS = {
    FreshnessStatus.FRESH: 15.0,
    FreshnessStatus.STALE: 5.0,
    FreshnessStatus.UNKNOWN: 0.0,
}
SERVICE_MODE_MATCH_WEIGHT = 10.0
EQUAL_PRICE_NEUTRAL_SCORE = 30.0


def rank_nearby_stations_for_convenience(
    candidates: Sequence[NearbyStationItem],
    *,
    radius_meters: int,
    requested_service_mode: ServiceMode | None,
) -> list[NearbyStationItem]:
    comparable_candidates = [
        candidate
        for candidate in candidates
        if candidate.current_price is not None and candidate.selected_fuel_type is not None
    ]
    if not comparable_candidates:
        return []

    prices = [candidate.current_price for candidate in comparable_candidates if candidate.current_price is not None]
    min_price = min(prices)
    max_price = max(prices)

    ranked: list[NearbyStationItem] = []
    for candidate in comparable_candidates:
        score = round(
            _price_component(candidate.current_price, min_price=min_price, max_price=max_price)
            + _distance_component(candidate.distance_meters, radius_meters=radius_meters)
            + _freshness_component(candidate.freshness_status)
            + _service_mode_component(
                selected_service_mode=candidate.selected_service_mode,
                requested_service_mode=requested_service_mode,
            ),
            2,
        )
        reasons = _match_reasons(
            candidate,
            min_price=min_price,
            requested_service_mode=requested_service_mode,
            radius_meters=radius_meters,
        )
        ranked.append(
            candidate.model_copy(
                update={
                    "score": score,
                    "match_reasons": reasons,
                }
            )
        )

    ranked.sort(
        key=lambda item: (
            -(item.score or 0.0),
            item.distance_meters,
            item.current_price if item.current_price is not None else Decimal("999999"),
            item.id,
        )
    )
    return ranked


def _price_component(price: Decimal | None, *, min_price: Decimal, max_price: Decimal) -> float:
    if price is None:
        return 0.0
    if min_price == max_price:
        return EQUAL_PRICE_NEUTRAL_SCORE
    normalized = float((max_price - price) / (max_price - min_price))
    return PRICE_WEIGHT * normalized


def _distance_component(distance_meters: float, *, radius_meters: int) -> float:
    if radius_meters <= 0:
        return 0.0
    normalized = max(0.0, 1.0 - (distance_meters / float(radius_meters)))
    return DISTANCE_WEIGHT * normalized


def _freshness_component(status: FreshnessStatus) -> float:
    return FRESHNESS_WEIGHTS[status]


def _service_mode_component(
    *,
    selected_service_mode: ServiceMode | None,
    requested_service_mode: ServiceMode | None,
) -> float:
    if requested_service_mode is None:
        return 0.0
    if selected_service_mode == requested_service_mode:
        return SERVICE_MODE_MATCH_WEIGHT
    return 0.0


def _match_reasons(
    candidate: NearbyStationItem,
    *,
    min_price: Decimal,
    requested_service_mode: ServiceMode | None,
    radius_meters: int,
) -> list[str]:
    reasons: list[str] = []

    if candidate.current_price == min_price:
        reasons.append("competitive price nearby")

    if candidate.distance_meters <= max(500.0, radius_meters * 0.2):
        reasons.append("very close to your location")

    if requested_service_mode is not None and candidate.selected_service_mode == requested_service_mode:
        if requested_service_mode == ServiceMode.SELF:
            reasons.append("matches requested self service")
        elif requested_service_mode == ServiceMode.SERVITO:
            reasons.append("matches requested serviced fuel")

    if candidate.freshness_status == FreshnessStatus.FRESH:
        reasons.append("fresh price data")
    elif candidate.freshness_status == FreshnessStatus.STALE:
        reasons.append("price data may be outdated")

    return reasons[:3]
