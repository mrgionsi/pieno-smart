from __future__ import annotations

import uuid

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.api.deps import CurrentAppUser

router = APIRouter()


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    display_name: str | None
    external_auth_subject: str | None
    is_active: bool
    default_vehicle_profile_id: uuid.UUID | None


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user(current_user: CurrentAppUser) -> CurrentUserResponse:
    return CurrentUserResponse.model_validate(current_user)
