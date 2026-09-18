"""Lightweight migrations for the local SQLite dev database.

``Base.metadata.create_all`` only creates *missing tables* — it never adds
*missing columns* to tables that already exist. So when the ORM models grow a
new column (e.g. ``Post.tags``), an existing ``portfolio.db`` goes stale and the
next query fails with ``OperationalError: no such column``.

This module reconciles the two for the SQLite dev path: for every table in the
metadata it compares the model columns against what SQLite actually has, adds
the missing ones with ``ALTER TABLE ... ADD COLUMN``, and backfills a sensible
default so existing rows stay readable.

Production Postgres is managed by Alembic, so this deliberately does nothing
for non-SQLite engines.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.sql.schema import Column

from app.database import Base


def migrate(engine: Engine) -> None:
    """Add any model columns missing from the live schema (idempotent)."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            existing = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue
                conn.execute(
                    text(
                        f'ALTER TABLE "{table.name}" ADD COLUMN '
                        f'"{column.name}" {column.type.compile(dialect=engine.dialect)}'
                    )
                )
                _backfill(conn, table.name, column)


def _backfill(conn: Connection, table_name: str, column: Column) -> None:
    """Set a scalar Python default on rows left NULL by the new column."""
    default = column.default
    if default is None or not default.is_scalar:
        return
    conn.execute(
        text(
            f'UPDATE "{table_name}" SET "{column.name}" = :value '
            f'WHERE "{column.name}" IS NULL'
        ),
        {"value": default.arg},
    )
