from __future__ import annotations

import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentAppUser, DbSession
from app.profiles.schemas import (
    VehicleProfileCreate,
    VehicleProfileListResponse,
    VehicleProfileResponse,
    VehicleProfileUpdate,
)
from app.profiles.service import VehicleProfileService

router = APIRouter()


@router.get("", response_model=VehicleProfileListResponse)
def list_vehicle_profiles(db: DbSession, current_user: CurrentAppUser) -> VehicleProfileListResponse:
    service = VehicleProfileService(db)
    profiles = service.list_profiles(user=current_user)
    return VehicleProfileListResponse(
        items=[
            VehicleProfileResponse.model_validate(profile)
            for profile in profiles
        ],
        default_vehicle_profile_id=current_user.default_vehicle_profile_id,
    )


@router.post("", response_model=VehicleProfileResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_profile(
    payload: VehicleProfileCreate,
    db: DbSession,
    current_user: CurrentAppUser,
) -> VehicleProfileResponse:
    profile = VehicleProfileService(db).create_profile(user=current_user, payload=payload)
    return VehicleProfileResponse.model_validate(profile)


@router.patch("/{profile_id}", response_model=VehicleProfileResponse)
def update_vehicle_profile(
    profile_id: uuid.UUID,
    payload: VehicleProfileUpdate,
    db: DbSession,
    current_user: CurrentAppUser,
) -> VehicleProfileResponse:
    profile = VehicleProfileService(db).update_profile(
        user=current_user,
        profile_id=profile_id,
        payload=payload,
    )
    return VehicleProfileResponse.model_validate(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_profile(
    profile_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentAppUser,
) -> Response:
    VehicleProfileService(db).delete_profile(user=current_user, profile_id=profile_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
