from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentAppUser, DbSession
from app.models import VehicleProfile

router = APIRouter()


@router.get("")
def list_vehicle_profiles(db: DbSession, current_user: CurrentAppUser) -> dict[str, object]:
    profile_count = db.scalar(
        select(VehicleProfile.id).where(VehicleProfile.user_id == current_user.id).limit(1)
    )
    return {
        "items": [],
        "db_ready": profile_count is not None,
        "current_user_id": str(current_user.id),
        "default_vehicle_profile_id": (
            str(current_user.default_vehicle_profile_id)
            if current_user.default_vehicle_profile_id is not None
            else None
        ),
    }
