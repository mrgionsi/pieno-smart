from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import FuelType, ServiceMode


class NearbySort(str, Enum):
    DISTANCE = "distance"
    PRICE = "price"
    CONVENIENCE = "convenience"


class FreshnessStatus(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    UNKNOWN = "unknown"


class NearbyStationsQuery(BaseModel):
    model_config = ConfigDict(frozen=True)

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    radius_meters: int = Field(default=5000, gt=0, le=50000)
    fuel_type: FuelType | None = None
    service_mode: ServiceMode | None = None
    vehicle_profile_id: uuid.UUID | None = None
    brand: str | None = None
    sort: NearbySort = NearbySort.DISTANCE
    limit: int = Field(default=20, gt=0, le=100)

class StationBaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ministerial_station_id: str
    name: str | None
    brand: str | None
    address: str | None
    comune: str | None
    provincia: str | None
    postal_code: str | None
    is_highway_station: bool | None
    latitude: float
    longitude: float
    source_updated_at: datetime | None
    freshness_status: FreshnessStatus


class NearbyStationItem(StationBaseResponse):
    distance_meters: float
    selected_fuel_type: FuelType | None
    selected_service_mode: ServiceMode | None
    current_price: Decimal | None
    price_effective_at: datetime | None
    score: float | None = None
    match_reasons: list[str] = Field(default_factory=list)



class NearbyStationsResponse(BaseModel):
    items: list[NearbyStationItem]
    filters: NearbyStationsQuery


class StationPriceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fuel_type: FuelType
    service_mode: ServiceMode
    price: Decimal
    price_effective_at: datetime | None
    source_updated_at: datetime | None
    freshness_status: FreshnessStatus


class StationDetailResponse(StationBaseResponse):
    prices: list[StationPriceItem]



def freshness_status_for(source_updated_at: datetime | None, *, now: datetime) -> FreshnessStatus:
    if source_updated_at is None:
        return FreshnessStatus.UNKNOWN
    if now - source_updated_at <= timedelta(days=2):
        return FreshnessStatus.FRESH
    return FreshnessStatus.STALE
