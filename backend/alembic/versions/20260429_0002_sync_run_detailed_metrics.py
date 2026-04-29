"""Add detailed sync run ingestion metrics.

Revision ID: 20260429_0002
Revises: 20260427_0001
Create Date: 2026-04-29 11:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260429_0002"
down_revision = "20260427_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sync_runs",
        sa.Column("station_records_inserted", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "sync_runs",
        sa.Column("station_records_updated", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "sync_runs",
        sa.Column(
            "station_records_unchanged_skipped",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "sync_runs",
        sa.Column(
            "station_records_invalid_skipped",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "sync_runs",
        sa.Column("price_records_inserted", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "sync_runs",
        sa.Column("price_records_updated", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "sync_runs",
        sa.Column(
            "price_records_unchanged_skipped",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.add_column(
        "sync_runs",
        sa.Column(
            "price_records_station_missing_skipped",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("sync_runs", "price_records_station_missing_skipped")
    op.drop_column("sync_runs", "price_records_unchanged_skipped")
    op.drop_column("sync_runs", "price_records_updated")
    op.drop_column("sync_runs", "price_records_inserted")
    op.drop_column("sync_runs", "station_records_invalid_skipped")
    op.drop_column("sync_runs", "station_records_unchanged_skipped")
    op.drop_column("sync_runs", "station_records_updated")
    op.drop_column("sync_runs", "station_records_inserted")
