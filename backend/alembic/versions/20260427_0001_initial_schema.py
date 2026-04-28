"""Initial PienoSmart schema.

Revision ID: 20260427_0001
Revises:
Create Date: 2026-04-27 18:50:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260427_0001"
down_revision = None
branch_labels = None
depends_on = None


fuel_type_enum = postgresql.ENUM(
    "benzina",
    "diesel",
    "gpl",
    "metano",
    "gnl",
    "hvo",
    "altro",
    name="fuel_type",
    create_type=False,
)

service_mode_enum = postgresql.ENUM(
    "self",
    "servito",
    "unknown",
    name="service_mode",
    create_type=False,
)

alert_type_enum = postgresql.ENUM(
    "price_threshold",
    "favorite_station",
    name="alert_type",
    create_type=False,
)

sync_status_enum = postgresql.ENUM(
    "started",
    "completed",
    "failed",
    name="sync_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    fuel_type_enum.create(op.get_bind(), checkfirst=True)
    service_mode_enum.create(op.get_bind(), checkfirst=True)
    alert_type_enum.create(op.get_bind(), checkfirst=True)
    sync_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "app_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "stations",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("ministerial_station_id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("comune", sa.Text(), nullable=True),
        sa.Column("provincia", sa.Text(), nullable=True),
        sa.Column("postal_code", sa.Text(), nullable=True),
        sa.Column("is_highway_station", sa.Boolean(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("services_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("location", sa.Text(), nullable=False),
        sa.Column("source_updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("ministerial_station_id"),
    )
    op.execute(
        "ALTER TABLE stations ALTER COLUMN location TYPE geography(Point, 4326) "
        "USING ST_GeogFromText(location)"
    )
    op.create_index("idx_stations_location", "stations", ["location"], unique=False, postgresql_using="gist")
    op.create_index("idx_stations_comune", "stations", ["comune"], unique=False)
    op.create_index("idx_stations_brand", "stations", ["brand"], unique=False)

    op.create_table(
        "current_prices",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("station_id", sa.BigInteger(), sa.ForeignKey("stations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fuel_type", fuel_type_enum, nullable=False),
        sa.Column("service_mode", service_mode_enum, nullable=False, server_default=sa.text("'unknown'")),
        sa.Column("price", sa.Numeric(6, 3), nullable=False),
        sa.Column("price_effective_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("source_updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("price > 0", name="ck_current_prices_price_positive"),
        sa.UniqueConstraint("station_id", "fuel_type", "service_mode"),
    )
    op.create_index("idx_current_prices_station", "current_prices", ["station_id"], unique=False)
    op.create_index(
        "idx_current_prices_lookup",
        "current_prices",
        ["fuel_type", "service_mode", "price"],
        unique=False,
    )

    op.create_table(
        "price_changes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("station_id", sa.BigInteger(), sa.ForeignKey("stations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fuel_type", fuel_type_enum, nullable=False),
        sa.Column("service_mode", service_mode_enum, nullable=False, server_default=sa.text("'unknown'")),
        sa.Column("old_price", sa.Numeric(6, 3), nullable=True),
        sa.Column("new_price", sa.Numeric(6, 3), nullable=False),
        sa.Column("changed_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("source_updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("new_price > 0", name="ck_price_changes_new_price_positive"),
    )
    op.create_index(
        "idx_price_changes_station_time",
        "price_changes",
        ["station_id", sa.text("changed_at DESC")],
        unique=False,
    )
    op.create_index(
        "idx_price_changes_fuel_time",
        "price_changes",
        ["fuel_type", sa.text("changed_at DESC")],
        unique=False,
    )

    op.create_table(
        "vehicle_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("fuel_type", fuel_type_enum, nullable=False),
        sa.Column("avg_consumption_l_per_100km", sa.Numeric(5, 2), nullable=False),
        sa.Column("tank_capacity_liters", sa.Numeric(5, 2), nullable=True),
        sa.Column("preferred_service_mode", service_mode_enum, nullable=False, server_default=sa.text("'self'")),
        sa.Column("preferred_brands", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("excluded_brands", postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "avg_consumption_l_per_100km > 0",
            name="ck_vehicle_profiles_avg_consumption_positive",
        ),
    )
    op.create_index("idx_vehicle_profiles_user", "vehicle_profiles", ["user_id"], unique=False)

    op.create_table(
        "favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("station_id", sa.BigInteger(), sa.ForeignKey("stations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "station_id"),
    )

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vehicle_profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicle_profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("station_id", sa.BigInteger(), sa.ForeignKey("stations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("alert_type", alert_type_enum, nullable=False),
        sa.Column("fuel_type", fuel_type_enum, nullable=True),
        sa.Column("threshold_price", sa.Numeric(6, 3), nullable=True),
        sa.Column("center", sa.Text(), nullable=True),
        sa.Column("radius_meters", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("radius_meters > 0", name="ck_alerts_radius_positive"),
    )
    op.execute(
        "ALTER TABLE alerts ALTER COLUMN center TYPE geography(Point, 4326) "
        "USING CASE WHEN center IS NULL THEN NULL ELSE ST_GeogFromText(center) END"
    )
    op.create_index("idx_alerts_user", "alerts", ["user_id"], unique=False)
    op.create_index("idx_alerts_center", "alerts", ["center"], unique=False, postgresql_using="gist")

    op.create_table(
        "alert_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("station_id", sa.BigInteger(), sa.ForeignKey("stations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("current_price_id", sa.BigInteger(), sa.ForeignKey("current_prices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("triggered_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'pending'")),
    )
    op.create_index(
        "idx_alert_events_alert_time",
        "alert_events",
        ["alert_id", sa.text("triggered_at DESC")],
        unique=False,
    )

    op.create_table(
        "sync_runs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source_name", sa.Text(), nullable=False),
        sa.Column("status", sync_status_enum, nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("station_records_seen", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("price_records_seen", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("station_records_upserted", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("price_records_upserted", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("price_change_records_inserted", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("idx_sync_runs_started_at", "sync_runs", ["started_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_sync_runs_started_at", table_name="sync_runs")
    op.drop_table("sync_runs")

    op.drop_index("idx_alert_events_alert_time", table_name="alert_events")
    op.drop_table("alert_events")

    op.drop_index("idx_alerts_center", table_name="alerts")
    op.drop_index("idx_alerts_user", table_name="alerts")
    op.drop_table("alerts")

    op.drop_table("favorites")

    op.drop_index("idx_vehicle_profiles_user", table_name="vehicle_profiles")
    op.drop_table("vehicle_profiles")

    op.drop_index("idx_price_changes_fuel_time", table_name="price_changes")
    op.drop_index("idx_price_changes_station_time", table_name="price_changes")
    op.drop_table("price_changes")

    op.drop_index("idx_current_prices_lookup", table_name="current_prices")
    op.drop_index("idx_current_prices_station", table_name="current_prices")
    op.drop_table("current_prices")

    op.drop_index("idx_stations_brand", table_name="stations")
    op.drop_index("idx_stations_comune", table_name="stations")
    op.drop_index("idx_stations_location", table_name="stations")
    op.drop_table("stations")

    op.drop_table("app_users")

    sync_status_enum.drop(op.get_bind(), checkfirst=True)
    alert_type_enum.drop(op.get_bind(), checkfirst=True)
    service_mode_enum.drop(op.get_bind(), checkfirst=True)
    fuel_type_enum.drop(op.get_bind(), checkfirst=True)
