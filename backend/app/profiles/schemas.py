from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import FuelType, ServiceMode


class VehicleProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    fuel_type: FuelType
    avg_consumption_l_per_100km: Decimal = Field(gt=0)
    tank_capacity_liters: Decimal | None = Field(default=None, gt=0)
    preferred_service_mode: ServiceMode = ServiceMode.SELF
    preferred_brands: list[str] = Field(default_factory=list)
    excluded_brands: list[str] = Field(default_factory=list)
    is_default: bool = False


class VehicleProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    fuel_type: FuelType | None = None
    avg_consumption_l_per_100km: Decimal | None = Field(default=None, gt=0)
    tank_capacity_liters: Decimal | None = Field(default=None, gt=0)
    preferred_service_mode: ServiceMode | None = None
    preferred_brands: list[str] | None = None
    excluded_brands: list[str] | None = None
    is_default: bool | None = None


class VehicleProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    fuel_type: FuelType
    avg_consumption_l_per_100km: Decimal
    tank_capacity_liters: Decimal | None
    preferred_service_mode: ServiceMode
    preferred_brands: list[str]
    excluded_brands: list[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime


class VehicleProfileListResponse(BaseModel):
    items: list[VehicleProfileResponse]
    default_vehicle_profile_id: uuid.UUID | None
