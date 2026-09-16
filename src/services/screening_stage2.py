"""
src/services/screening_stage2.py — Stage 2 (EPDS) gate
======================================================

Stage 2 runs on the shared engine in screening_instrument.py. The only thing
that is genuinely Stage 2's own is the question of who may enter it.

Stage 2 sits behind TWO gates, not one:

    1. Recorded consent  (@require_consent, as everything else does)
    2. A completed Stage 1 whose banding says `next: stage2`

The second gate matters clinically. Stage 2 is the longer instrument and is
meant to follow an indication, not to be browsable. A mother who lands on the
Stage 2 URL directly, or who completed Stage 1 in the green band, must not be
walked through ten more questions about self-harm and worthlessness because a
link was shareable.

The indication is RECOMPUTED from her Stage 1 session's own content bundle
rather than read from a flag, so republishing content later cannot retroactively
open or close the door on a screening that already happened.
"""

from __future__ import annotations

import logging
from typing import Optional

from src.models import ScreeningSession
from src.services.screening_instrument import (
    InstrumentError,
    get_latest_session,
    outcome_for_completed,
)

log = logging.getLogger(__name__)

STAGE2 = 2


class Stage2NotIndicated(InstrumentError):
    status_code = 409
    code = "stage2_not_indicated"


def latest_completed_stage1(participant_id: str) -> Optional[ScreeningSession]:
    """Her most recent COMPLETED Stage 1 session, or None."""
    return (
        ScreeningSession.query
        .filter_by(participant_id=participant_id, stage=1, status="completed")
        .order_by(ScreeningSession.completed_at.desc(),
                  ScreeningSession.id.desc())
        .first()
    )


def check_stage2_indicated(participant_id: str) -> ScreeningSession:
    """
    Returns the Stage 1 session that indicates Stage 2, or raises.

    Two distinct refusals, because they mean different things to her and the
    UI should say different things:

      stage1_required      — she has not finished Stage 1 at all
      stage2_not_indicated — she finished it, and it did not indicate Stage 2
    """
    stage1 = latest_completed_stage1(participant_id)
    if stage1 is None:
        raise InstrumentError(
            "Stage 1 must be completed first.",
            code="stage1_required",
            status_code=409,
        )

    outcome = outcome_for_completed(stage1)
    if not outcome or outcome.get("next") != "stage2":
        raise Stage2NotIndicated(
            "Stage 2 was not indicated by the Stage 1 result.",
        )

    return stage1


def stage2_already_done(participant_id: str,
                        stage1: ScreeningSession) -> Optional[ScreeningSession]:
    """
    A completed Stage 2 belonging to THIS Stage 1, if there is one.

    Matched on `preceded_by_session_id` rather than on timestamps. The explicit
    edge is why that column exists: without it, a mother who screens twice
    makes "which Stage 2 followed which Stage 1?" a guess.

    When this returns a session, the caller shows her that result again instead
    of starting a second run of the same questions.
    """
    return (
        ScreeningSession.query
        .filter_by(
            participant_id=participant_id,
            stage=STAGE2,
            status="completed",
            preceded_by_session_id=stage1.id,
        )
        .order_by(ScreeningSession.completed_at.desc())
        .first()
    )
