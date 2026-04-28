from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import VehicleProfile

router = APIRouter()


@router.get("")
def list_vehicle_profiles(db: DbSession) -> dict[str, object]:
    profile_count = db.scalar(select(VehicleProfile.id).limit(1))
    return {"items": [], "db_ready": profile_count is not None}
