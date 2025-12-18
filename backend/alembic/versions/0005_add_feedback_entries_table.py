"""Add feedback_entries table for in-app feedback capture."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = "0005_add_feedback_entries_table"
down_revision = "0004_add_security_events_table"
branch_labels = None
depends_on = None


def _table_names(inspector: sa.Inspector) -> set[str]:
    return set(inspector.get_table_names())


def _index_names(inspector: sa.Inspector, table_name: str) -> set[str]:
    try:
        return {idx["name"] for idx in inspector.get_indexes(table_name)}
    except sa.exc.NoSuchTableError:
        return set()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "feedback_entries" not in _table_names(inspector):
        op.create_table(
            "feedback_entries",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("business_id", sa.String(), nullable=True),
            sa.Column(
                "source",
                sa.String(),
                nullable=False,
                server_default=sa.text("'unknown'"),
            ),
            sa.Column("category", sa.String(), nullable=True),
            sa.Column("summary", sa.String(), nullable=False),
            sa.Column("steps", sa.Text(), nullable=True),
            sa.Column("expected", sa.Text(), nullable=True),
            sa.Column("actual", sa.Text(), nullable=True),
            sa.Column("call_sid", sa.String(), nullable=True),
            sa.Column("conversation_id", sa.String(), nullable=True),
            sa.Column("session_id", sa.String(), nullable=True),
            sa.Column("request_id", sa.String(), nullable=True),
            sa.Column("url", sa.String(), nullable=True),
            sa.Column("contact", sa.String(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
        )

    indexes = _index_names(inspector, "feedback_entries")
    index_specs: list[tuple[str, list[str]]] = [
        ("ix_feedback_entries_created_at", ["created_at"]),
        ("ix_feedback_entries_business_id", ["business_id"]),
        ("ix_feedback_entries_source", ["source"]),
        ("ix_feedback_entries_category", ["category"]),
        ("ix_feedback_entries_call_sid", ["call_sid"]),
        ("ix_feedback_entries_conversation_id", ["conversation_id"]),
        ("ix_feedback_entries_session_id", ["session_id"]),
        ("ix_feedback_entries_request_id", ["request_id"]),
    ]
    for name, cols in index_specs:
        if name not in indexes:
            op.create_index(name, "feedback_entries", cols)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "feedback_entries" not in _table_names(inspector):
        return

    indexes = _index_names(inspector, "feedback_entries")
    for name in [
        "ix_feedback_entries_request_id",
        "ix_feedback_entries_session_id",
        "ix_feedback_entries_conversation_id",
        "ix_feedback_entries_call_sid",
        "ix_feedback_entries_category",
        "ix_feedback_entries_source",
        "ix_feedback_entries_business_id",
        "ix_feedback_entries_created_at",
    ]:
        if name in indexes:
            op.drop_index(name, table_name="feedback_entries")
    op.drop_table("feedback_entries")
