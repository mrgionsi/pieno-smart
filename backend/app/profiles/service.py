from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppUser, VehicleProfile
from app.profiles.schemas import VehicleProfileCreate, VehicleProfileUpdate


class VehicleProfileService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_profile(self, *, user: AppUser, profile_id: uuid.UUID) -> VehicleProfile:
        return self._get_user_profile(user=user, profile_id=profile_id)

    def list_profiles(self, *, user: AppUser) -> list[VehicleProfile]:
        profiles = self.db.scalars(
            select(VehicleProfile)
            .where(VehicleProfile.user_id == user.id)
            .order_by(VehicleProfile.created_at.asc(), VehicleProfile.id.asc())
        ).all()
        self._sync_default_flags(user=user, profiles=profiles)
        return profiles

    def create_profile(self, *, user: AppUser, payload: VehicleProfileCreate) -> VehicleProfile:
        profile = VehicleProfile(
            user_id=user.id,
            name=payload.name.strip(),
            fuel_type=payload.fuel_type,
            avg_consumption_l_per_100km=payload.avg_consumption_l_per_100km,
            tank_capacity_liters=payload.tank_capacity_liters,
            preferred_service_mode=payload.preferred_service_mode,
            preferred_brands=self._normalize_brands(payload.preferred_brands),
            excluded_brands=self._normalize_brands(payload.excluded_brands),
            is_default=False,
        )
        self.db.add(profile)
        self.db.flush()

        should_be_default = payload.is_default or user.default_vehicle_profile_id is None
        if should_be_default:
            user.default_vehicle_profile_id = profile.id

        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(profile)
        self._sync_default_flags(user=user, profiles=self._load_user_profiles(user=user), commit=True)
        self.db.refresh(profile)
        return profile

    def update_profile(
        self,
        *,
        user: AppUser,
        profile_id: uuid.UUID,
        payload: VehicleProfileUpdate,
    ) -> VehicleProfile:
        profile = self._get_user_profile(user=user, profile_id=profile_id)

        if payload.name is not None:
            profile.name = payload.name.strip()
        if payload.fuel_type is not None:
            profile.fuel_type = payload.fuel_type
        if payload.avg_consumption_l_per_100km is not None:
            profile.avg_consumption_l_per_100km = payload.avg_consumption_l_per_100km
        if payload.tank_capacity_liters is not None:
            profile.tank_capacity_liters = payload.tank_capacity_liters
        if payload.preferred_service_mode is not None:
            profile.preferred_service_mode = payload.preferred_service_mode
        if payload.preferred_brands is not None:
            profile.preferred_brands = self._normalize_brands(payload.preferred_brands)
        if payload.excluded_brands is not None:
            profile.excluded_brands = self._normalize_brands(payload.excluded_brands)

        if payload.is_default is True:
            user.default_vehicle_profile_id = profile.id
        elif payload.is_default is False and user.default_vehicle_profile_id == profile.id:
            replacement = self._find_replacement_default(user=user, excluding_profile_id=profile.id)
            user.default_vehicle_profile_id = replacement.id if replacement is not None else None

        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(profile)
        self._sync_default_flags(user=user, profiles=self._load_user_profiles(user=user), commit=True)
        self.db.refresh(profile)
        return profile

    def delete_profile(self, *, user: AppUser, profile_id: uuid.UUID) -> None:
        profile = self._get_user_profile(user=user, profile_id=profile_id)

        if user.default_vehicle_profile_id == profile.id:
            replacement = self._find_replacement_default(user=user, excluding_profile_id=profile.id)
            user.default_vehicle_profile_id = replacement.id if replacement is not None else None

        self.db.delete(profile)
        self.db.commit()

        remaining_profiles = self._load_user_profiles(user=user)
        self.db.refresh(user)
        self._sync_default_flags(user=user, profiles=remaining_profiles, commit=True)

    def _get_user_profile(self, *, user: AppUser, profile_id: uuid.UUID) -> VehicleProfile:
        profile = self.db.scalar(
            select(VehicleProfile).where(
                VehicleProfile.id == profile_id,
                VehicleProfile.user_id == user.id,
            )
        )
        if profile is None:
            raise HTTPException(status_code=404, detail="Vehicle profile not found")
        return profile

    def _find_replacement_default(
        self,
        *,
        user: AppUser,
        excluding_profile_id: uuid.UUID,
    ) -> VehicleProfile | None:
        return self.db.scalar(
            select(VehicleProfile)
            .where(
                VehicleProfile.user_id == user.id,
                VehicleProfile.id != excluding_profile_id,
            )
            .order_by(VehicleProfile.created_at.asc(), VehicleProfile.id.asc())
            .limit(1)
        )

    def _load_user_profiles(self, *, user: AppUser) -> list[VehicleProfile]:
        return self.db.scalars(
            select(VehicleProfile)
            .where(VehicleProfile.user_id == user.id)
            .order_by(VehicleProfile.created_at.asc(), VehicleProfile.id.asc())
        ).all()

    def _sync_default_flags(
        self,
        *,
        user: AppUser,
        profiles: list[VehicleProfile],
        commit: bool = False,
    ) -> None:
        if not profiles:
            return
        default_id = user.default_vehicle_profile_id
        changed = False
        if default_id is None and len(profiles) == 1:
            profiles[0].is_default = False
            return

        for profile in profiles:
            should_be_default = profile.id == default_id
            if profile.is_default != should_be_default:
                profile.is_default = should_be_default
                changed = True

        if commit and changed:
            self.db.commit()

    @staticmethod
    def _normalize_brands(brands: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for brand in brands:
            trimmed = brand.strip()
            if not trimmed:
                continue
            key = trimmed.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(trimmed)
        return normalized
