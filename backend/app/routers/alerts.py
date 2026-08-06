from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Alert, Bed, Cadet, EdAssignment
from ..schemas import AlertCreate, AlertOut
from ..services.sms import notify_red_alert

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(
    dorm_id: int | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = (
        select(Alert)
        .options(selectinload(Alert.cadet))
        .order_by(Alert.created_at.desc())
        .limit(limit)
    )
    if dorm_id is not None:
        q = q.join(Cadet).where(Cadet.dorm_id == dorm_id)
    return db.execute(q).scalars().all()


@router.post("/beds/{bed_id}/alerts", response_model=AlertOut, status_code=201)
def raise_alert(
    bed_id: int,
    payload: AlertCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Single source of truth for click logic: warning (single click) / red (double click)."""
    bed = db.get(Bed, bed_id)
    if bed is None:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.cadet_id is None:
        raise HTTPException(status_code=409, detail="Bed is unoccupied")

    cadet = db.get(Cadet, bed.cadet_id)
    message = payload.message or (
        "Improper layout / untidy bunk"
        if payload.type == "warning"
        else "Severe indiscipline - Extra Drill assigned"
    )

    alert = Alert(cadet_id=cadet.id, type=payload.type, message=message)
    db.add(alert)
    db.flush()

    if payload.type == "red":
        db.add(
            EdAssignment(
                alert_id=alert.id,
                cadet_id=cadet.id,
                drill_type=payload.drill_type,
                scheduled_for=date.today(),
            )
        )
        background.add_task(notify_red_alert, alert.id)

    db.commit()
    db.refresh(alert)
    return alert


@router.post("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.resolved_at is None:
        from datetime import datetime

        alert.resolved_at = datetime.now()
        db.commit()
    db.refresh(alert)
    return alert
