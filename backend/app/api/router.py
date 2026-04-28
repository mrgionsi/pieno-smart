from fastapi import APIRouter

from app.api.routes import health, stations, vehicle_profiles

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(stations.router, prefix="/stations", tags=["stations"])
api_router.include_router(
    vehicle_profiles.router,
    prefix="/vehicle-profiles",
    tags=["vehicle-profiles"],
)
