from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import SQLAlchemyError

from app.main import create_app
from app.db.session import SessionLocal
from app.models import AppUser, VehicleProfile

TEST_USER_EMAIL = "vehicle-crud-test@pienosmart.local"
TEST_USER_SUBJECT = "vehicle-crud-subject"
TEST_USER_HEADERS = {
    "X-Dev-User-Email": TEST_USER_EMAIL,
    "X-Dev-User-Display-Name": "Vehicle CRUD User",
    "X-Dev-User-Subject": TEST_USER_SUBJECT,
}


def _db_available() -> bool:
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return True
        finally:
            db.close()
    except SQLAlchemyError:
        return False


def test_vehicle_profile_crud_and_default_semantics() -> None:
    if not _db_available():
        pytest.skip("PostgreSQL test database is not available")

    db = SessionLocal()
    try:
        _cleanup_test_user_data(db)
        client = TestClient(create_app())

        create_first = client.post(
            "/api/vehicle-profiles",
            headers=TEST_USER_HEADERS,
            json={
                "name": "Daily Diesel",
                "fuel_type": "diesel",
                "avg_consumption_l_per_100km": "5.40",
                "tank_capacity_liters": "45.00",
                "preferred_service_mode": "self",
                "preferred_brands": ["Q8", " IP "],
                "excluded_brands": ["Pompe Bianche"],
            },
        )
        assert create_first.status_code == 201
        first_body = create_first.json()
        first_profile_id = first_body["id"]
        assert first_body["is_default"] is True
        assert first_body["preferred_brands"] == ["Q8", "IP"]

        create_second = client.post(
            "/api/vehicle-profiles",
            headers=TEST_USER_HEADERS,
            json={
                "name": "Trip GPL",
                "fuel_type": "gpl",
                "avg_consumption_l_per_100km": "8.30",
                "preferred_service_mode": "servito",
                "preferred_brands": ["Q8"],
                "excluded_brands": [],
                "is_default": True,
            },
        )
        assert create_second.status_code == 201
        second_body = create_second.json()
        second_profile_id = second_body["id"]
        assert second_body["is_default"] is True

        list_response = client.get("/api/vehicle-profiles", headers=TEST_USER_HEADERS)
        assert list_response.status_code == 200
        list_body = list_response.json()
        assert len(list_body["items"]) == 2
        assert list_body["default_vehicle_profile_id"] == second_profile_id
        first_listed = next(item for item in list_body["items"] if item["id"] == first_profile_id)
        second_listed = next(item for item in list_body["items"] if item["id"] == second_profile_id)
        assert first_listed["is_default"] is False
        assert second_listed["is_default"] is True

        update_first = client.patch(
            f"/api/vehicle-profiles/{first_profile_id}",
            headers=TEST_USER_HEADERS,
            json={
                "preferred_service_mode": "servito",
                "is_default": True,
                "preferred_brands": ["Tamoil", "Q8"],
            },
        )
        assert update_first.status_code == 200
        updated_first = update_first.json()
        assert updated_first["is_default"] is True
        assert updated_first["preferred_service_mode"] == "servito"
        assert updated_first["preferred_brands"] == ["Tamoil", "Q8"]

        delete_default = client.delete(
            f"/api/vehicle-profiles/{first_profile_id}",
            headers=TEST_USER_HEADERS,
        )
        assert delete_default.status_code == 204

        list_after_delete = client.get("/api/vehicle-profiles", headers=TEST_USER_HEADERS)
        assert list_after_delete.status_code == 200
        list_after_delete_body = list_after_delete.json()
        assert len(list_after_delete_body["items"]) == 1
        assert list_after_delete_body["default_vehicle_profile_id"] == second_profile_id
        assert list_after_delete_body["items"][0]["id"] == second_profile_id
        assert list_after_delete_body["items"][0]["is_default"] is True
    finally:
        db.rollback()
        _cleanup_test_user_data(db)
        db.close()


def test_vehicle_profile_returns_404_for_missing_profile() -> None:
    if not _db_available():
        pytest.skip("PostgreSQL test database is not available")

    db = SessionLocal()
    try:
        _cleanup_test_user_data(db)
        client = TestClient(create_app())
        client.get("/api/users/me", headers=TEST_USER_HEADERS)

        response = client.patch(
            "/api/vehicle-profiles/11111111-1111-1111-1111-111111111111",
            headers=TEST_USER_HEADERS,
            json={"name": "Missing"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Vehicle profile not found"
    finally:
        db.rollback()
        _cleanup_test_user_data(db)
        db.close()


def _cleanup_test_user_data(db) -> None:
    user = db.scalar(
        select(AppUser).where(
            (AppUser.email == TEST_USER_EMAIL)
            | (AppUser.external_auth_subject == TEST_USER_SUBJECT)
        )
    )
    if user is None:
        return

    db.execute(
        update(AppUser)
        .where(AppUser.id == user.id)
        .values(default_vehicle_profile_id=None)
    )
    db.execute(delete(VehicleProfile).where(VehicleProfile.user_id == user.id))
    db.execute(delete(AppUser).where(AppUser.id == user.id))
    db.commit()
