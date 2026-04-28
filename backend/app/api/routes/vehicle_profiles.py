from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_vehicle_profiles() -> dict[str, list[object]]:
    return {"items": []}
