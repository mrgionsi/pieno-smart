import uuid

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import DbSession, OptionalCurrentAppUser
from app.catalog.schemas import (
    NearbySort,
    NearbyStationsQuery,
    NearbyStationsResponse,
    StationDetailResponse,
)
from app.catalog.service import StationCatalogService
from app.models.common import FuelType, ServiceMode
from app.profiles.service import VehicleProfileService

router = APIRouter()


@router.get("/nearby", response_model=NearbyStationsResponse)
def list_nearby_stations(
    db: DbSession,
    current_user: OptionalCurrentAppUser,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(5000, gt=0, le=50000),
    fuel_type: FuelType | None = Query(None),
    service_mode: ServiceMode | None = Query(None),
    vehicle_profile_id: uuid.UUID | None = Query(None),
    brand: str | None = Query(None),
    sort: NearbySort = Query(NearbySort.DISTANCE),
    limit: int = Query(20, gt=0, le=100),
) -> NearbyStationsResponse:
    selected_profile = None
    if vehicle_profile_id is not None:
        if current_user is None:
            raise HTTPException(
                status_code=401,
                detail="Authentication is required when vehicle_profile_id is provided",
            )
        selected_profile = VehicleProfileService(db).get_profile(
            user=current_user,
            profile_id=vehicle_profile_id,
        )

    effective_fuel_type = fuel_type or (selected_profile.fuel_type if selected_profile is not None else None)
    effective_service_mode = service_mode or (
        selected_profile.preferred_service_mode
        if selected_profile is not None
        else None
    )

    if sort == NearbySort.CONVENIENCE and effective_fuel_type is None:
        raise HTTPException(
            status_code=422,
            detail="fuel_type or vehicle_profile_id is required when sort=convenience",
        )

    filters = NearbyStationsQuery(
        lat=lat,
        lon=lon,
        radius_meters=radius_meters,
        fuel_type=effective_fuel_type,
        service_mode=effective_service_mode,
        vehicle_profile_id=vehicle_profile_id,
        brand=brand,
        sort=sort,
        limit=limit,
    )
    items = StationCatalogService(db).list_nearby_stations(filters)
    return NearbyStationsResponse(items=items, filters=filters)


@router.get("/{station_id}", response_model=StationDetailResponse)
def get_station(station_id: int, db: DbSession) -> StationDetailResponse:
    station = StationCatalogService(db).get_station_detail(station_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Station not found")
    return station
