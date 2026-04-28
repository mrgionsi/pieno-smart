from __future__ import annotations

from datetime import datetime

from sqlalchemy import TIMESTAMP, BigInteger, Index, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import SyncStatus, sync_status_enum


class SyncRun(Base):
    __tablename__ = "sync_runs"
    __table_args__ = (Index("idx_sync_runs_started_at", "started_at"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SyncStatus] = mapped_column(sync_status_enum, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    station_records_seen: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    price_records_seen: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    station_records_upserted: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    price_records_upserted: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    price_change_records_inserted: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    error_message: Mapped[str | None] = mapped_column(Text)
