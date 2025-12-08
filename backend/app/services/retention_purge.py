from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from ..db import SQLALCHEMY_AVAILABLE, SessionLocal
from ..db_models import (
    AppointmentDB,
    BusinessDB,
    ConversationDB,
    ConversationMessageDB,
    RetentionPurgeLogDB,
)
from ..metrics import metrics

logger = logging.getLogger(__name__)
_scheduler_started = False


@dataclass
class PurgeResult:
    appointments_deleted: int
    conversations_deleted: int
    conversation_messages_deleted: int
    log_id: int | None = None


def run_retention_purge(
    *,
    actor_type: str = "system",
    trigger: str = "scheduled",
    now: datetime | None = None,
) -> PurgeResult:
    """Delete old appointments/conversations per-tenant retention settings.

    This is shared by the manual admin endpoint and the scheduled background job.
    """
    if not SQLALCHEMY_AVAILABLE or SessionLocal is None:
        raise RuntimeError("Database not available for retention purge")

    session = SessionLocal()
    try:
        current_time = now or datetime.now(UTC)
        appointments_deleted = 0
        conversations_deleted = 0
        messages_deleted = 0

        businesses = session.query(BusinessDB).all()
        for row in businesses:
            # Allow tenants to disable retention purges entirely.
            if getattr(row, "retention_enabled", True) is False:
                continue

            appt_ret = getattr(row, "appointment_retention_days", None)
            if appt_ret is not None and appt_ret > 0:
                cutoff = current_time - timedelta(days=appt_ret)
                result = (
                    session.query(AppointmentDB)
                    .filter(
                        AppointmentDB.business_id == row.id,
                        AppointmentDB.start_time < cutoff,
                    )
                    .delete(synchronize_session=False)
                )
                appointments_deleted += int(result or 0)

            conv_ret = getattr(row, "conversation_retention_days", None)
            if conv_ret is not None and conv_ret > 0:
                cutoff = current_time - timedelta(days=conv_ret)
                old_convs = (
                    session.query(ConversationDB)
                    .filter(
                        ConversationDB.business_id == row.id,
                        ConversationDB.created_at < cutoff,
                    )
                    .all()
                )
                conv_ids = [c.id for c in old_convs]
                if conv_ids:
                    msg_result = (
                        session.query(ConversationMessageDB)
                        .filter(ConversationMessageDB.conversation_id.in_(conv_ids))
                        .delete(synchronize_session=False)
                    )
                    conv_result = (
                        session.query(ConversationDB)
                        .filter(ConversationDB.id.in_(conv_ids))
                        .delete(synchronize_session=False)
                    )
                    messages_deleted += int(msg_result or 0)
                    conversations_deleted += int(conv_result or 0)

        # Persist deletions before attempting to log so cleanup isn't lost if logging fails.
        session.commit()

        log_id: int | None = None
        try:
            log = RetentionPurgeLogDB(  # type: ignore[arg-type]
                actor_type=actor_type,
                trigger=trigger,
                appointments_deleted=appointments_deleted,
                conversations_deleted=conversations_deleted,
                conversation_messages_deleted=messages_deleted,
            )
            session.add(log)
            session.commit()
            session.refresh(log)
            log_id = getattr(log, "id", None)
        except Exception:
            session.rollback()
            logger.exception("retention_purge_log_failed")
            # Do not block deletion results if logging fails.

        metrics.retention_purge_runs += 1
        metrics.retention_appointments_deleted += appointments_deleted
        metrics.retention_conversations_deleted += conversations_deleted
        metrics.retention_messages_deleted += messages_deleted

        return PurgeResult(
            appointments_deleted=appointments_deleted,
            conversations_deleted=conversations_deleted,
            conversation_messages_deleted=messages_deleted,
            log_id=log_id,
        )
    except Exception:
        metrics.background_job_errors += 1
        logger.exception("retention_purge_failed")
        session.rollback()
        raise
    finally:
        session.close()


def start_retention_scheduler(interval_seconds: int) -> None:
    """Start a lightweight background scheduler for retention purges."""
    global _scheduler_started
    if _scheduler_started or interval_seconds <= 0:
        return
    if not SQLALCHEMY_AVAILABLE or SessionLocal is None:
        logger.info("retention_scheduler_not_started_db_unavailable")
        return

    _scheduler_started = True

    def _loop() -> None:
        while True:
            time.sleep(interval_seconds)
            try:
                run_retention_purge(actor_type="system", trigger="scheduled")
            except Exception:
                # Errors are already counted inside run_retention_purge; keep looping.
                logger.exception("retention_purge_job_iteration_failed")

    thread = threading.Thread(
        target=_loop, name="retention-purge-scheduler", daemon=True
    )
    thread.start()
    logger.info(
        "retention_purge_scheduler_started",
        extra={"interval_seconds": interval_seconds},
    )
