from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/nearby")
def list_nearby_stations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(5000, gt=0, le=50000),
    fuel_type: str | None = Query(None),
) -> dict[str, object]:
    return {
        "items": [],
        "filters": {
            "lat": lat,
            "lon": lon,
            "radius_meters": radius_meters,
            "fuel_type": fuel_type,
        },
    }


@router.get("/{station_id}")
def get_station(station_id: int) -> dict[str, object]:
    return {"id": station_id, "detail": "not implemented"}
