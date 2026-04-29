from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.main import create_app
from app.db.session import SessionLocal
from app.models import AppUser

TEST_USER_EMAIL = "vehicle-owner-test@pienosmart.local"
TEST_USER_SUBJECT = "test-user-vehicle-owner"


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


def test_get_current_user_creates_and_reuses_dev_user() -> None:
    if not _db_available():
        pytest.skip("PostgreSQL test database is not available")

    db = SessionLocal()
    try:
        _cleanup_test_user(db)
        client = TestClient(create_app())

        response = client.get(
            "/api/users/me",
            headers={
                "X-Dev-User-Email": TEST_USER_EMAIL,
                "X-Dev-User-Display-Name": "Vehicle Owner",
                "X-Dev-User-Subject": TEST_USER_SUBJECT,
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert body["email"] == TEST_USER_EMAIL
        assert body["display_name"] == "Vehicle Owner"
        assert body["external_auth_subject"] == TEST_USER_SUBJECT
        assert body["is_active"] is True
        assert body["default_vehicle_profile_id"] is None

        first_user_id = body["id"]

        response_again = client.get(
            "/api/users/me",
            headers={
                "X-Dev-User-Email": TEST_USER_EMAIL,
                "X-Dev-User-Display-Name": "Vehicle Owner",
                "X-Dev-User-Subject": TEST_USER_SUBJECT,
            },
        )

        assert response_again.status_code == 200
        assert response_again.json()["id"] == first_user_id

        persisted_user = db.scalar(
            select(AppUser).where(AppUser.external_auth_subject == TEST_USER_SUBJECT)
        )
        assert persisted_user is not None
        assert persisted_user.email == TEST_USER_EMAIL
    finally:
        db.rollback()
        _cleanup_test_user(db)
        db.close()


def _cleanup_test_user(db) -> None:
    db.execute(
        delete(AppUser).where(
            (AppUser.email == TEST_USER_EMAIL)
            | (AppUser.external_auth_subject == TEST_USER_SUBJECT)
        )
    )
    db.commit()
