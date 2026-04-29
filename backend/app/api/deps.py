from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import AppUser


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def get_current_app_user(
    db: DbSession,
    x_dev_user_email: Annotated[str | None, Header(alias="X-Dev-User-Email")] = None,
    x_dev_user_display_name: Annotated[str | None, Header(alias="X-Dev-User-Display-Name")] = None,
    x_dev_user_subject: Annotated[str | None, Header(alias="X-Dev-User-Subject")] = None,
) -> AppUser:
    settings = get_settings()

    email = x_dev_user_email or settings.dev_current_user_email
    display_name = x_dev_user_display_name or settings.dev_current_user_display_name
    external_auth_subject = x_dev_user_subject or settings.dev_current_user_subject

    statement = select(AppUser)
    if external_auth_subject:
        statement = statement.where(AppUser.external_auth_subject == external_auth_subject)
    elif email:
        statement = statement.where(AppUser.email == email)
    else:
        raise HTTPException(status_code=500, detail="Current user identity is not configured")

    user = db.scalar(statement.limit(1))
    if user is None:
        user = AppUser(
            email=email,
            display_name=display_name,
            external_auth_subject=external_auth_subject,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if email and user.email is None:
            user.email = email
            updated = True
        if display_name and user.display_name is None:
            user.display_name = display_name
            updated = True
        if external_auth_subject and user.external_auth_subject is None:
            user.external_auth_subject = external_auth_subject
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Current user is inactive")
    return user


CurrentAppUser = Annotated[AppUser, Depends(get_current_app_user)]


def get_optional_current_app_user(
    db: DbSession,
    x_dev_user_email: Annotated[str | None, Header(alias="X-Dev-User-Email")] = None,
    x_dev_user_display_name: Annotated[str | None, Header(alias="X-Dev-User-Display-Name")] = None,
    x_dev_user_subject: Annotated[str | None, Header(alias="X-Dev-User-Subject")] = None,
) -> AppUser | None:
    if x_dev_user_email is None and x_dev_user_display_name is None and x_dev_user_subject is None:
        return None

    settings = get_settings()
    email = x_dev_user_email or settings.dev_current_user_email
    display_name = x_dev_user_display_name or settings.dev_current_user_display_name
    external_auth_subject = x_dev_user_subject or settings.dev_current_user_subject

    statement = select(AppUser)
    if external_auth_subject:
        statement = statement.where(AppUser.external_auth_subject == external_auth_subject)
    elif email:
        statement = statement.where(AppUser.email == email)
    else:
        return None

    user = db.scalar(statement.limit(1))
    if user is None:
        user = AppUser(
            email=email,
            display_name=display_name,
            external_auth_subject=external_auth_subject,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if email and user.email is None:
            user.email = email
            updated = True
        if display_name and user.display_name is None:
            user.display_name = display_name
            updated = True
        if external_auth_subject and user.external_auth_subject is None:
            user.external_auth_subject = external_auth_subject
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Current user is inactive")
    return user


OptionalCurrentAppUser = Annotated[AppUser | None, Depends(get_optional_current_app_user)]
