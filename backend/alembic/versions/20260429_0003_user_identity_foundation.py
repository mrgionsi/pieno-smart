"""Add user identity foundation and default vehicle profile pointer.

Revision ID: 20260429_0003
Revises: 20260429_0002
Create Date: 2026-04-29 23:15:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260429_0003"
down_revision = "20260429_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("app_users", sa.Column("display_name", sa.Text(), nullable=True))
    op.add_column("app_users", sa.Column("external_auth_subject", sa.Text(), nullable=True))
    op.add_column(
        "app_users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "app_users",
        sa.Column("default_vehicle_profile_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_app_users_external_auth_subject",
        "app_users",
        ["external_auth_subject"],
    )
    op.create_foreign_key(
        "fk_app_users_default_vehicle_profile_id",
        "app_users",
        "vehicle_profiles",
        ["default_vehicle_profile_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_app_users_default_vehicle_profile", "app_users", ["default_vehicle_profile_id"])


def downgrade() -> None:
    op.drop_index("idx_app_users_default_vehicle_profile", table_name="app_users")
    op.drop_constraint("fk_app_users_default_vehicle_profile_id", "app_users", type_="foreignkey")
    op.drop_constraint("uq_app_users_external_auth_subject", "app_users", type_="unique")
    op.drop_column("app_users", "default_vehicle_profile_id")
    op.drop_column("app_users", "is_active")
    op.drop_column("app_users", "external_auth_subject")
    op.drop_column("app_users", "display_name")
