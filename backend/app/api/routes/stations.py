from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import Station

router = APIRouter()


@router.get("/nearby")
def list_nearby_stations(
    db: DbSession,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(5000, gt=0, le=50000),
    fuel_type: str | None = Query(None),
) -> dict[str, object]:
    station_count = db.scalar(select(Station.id).limit(1))
    return {
        "items": [],
        "db_ready": station_count is not None,
        "filters": {
            "lat": lat,
            "lon": lon,
            "radius_meters": radius_meters,
            "fuel_type": fuel_type,
        },
    }


@router.get("/{station_id}")
def get_station(station_id: int, db: DbSession) -> dict[str, object]:
    station = db.get(Station, station_id)
    return {
        "id": station_id,
        "exists": station is not None,
        "detail": "not implemented",
    }
