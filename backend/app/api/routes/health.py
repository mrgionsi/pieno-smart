from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
def db_healthcheck(db: DbSession) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
