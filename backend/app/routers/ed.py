from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import EdAssignment
from ..schemas import EdAssignmentOut

router = APIRouter(prefix="/api/ed", tags=["ed"])


@router.get("", response_model=list[EdAssignmentOut])
def ed_schedule(
    scheduled_for: date | None = None,
    db: Session = Depends(get_db),
):
    q = (
        select(EdAssignment)
        .options(selectinload(EdAssignment.cadet))
        .order_by(EdAssignment.scheduled_for.desc(), EdAssignment.created_at.desc())
    )
    if scheduled_for is not None:
        q = q.where(EdAssignment.scheduled_for == scheduled_for)
    return db.execute(q).scalars().all()
