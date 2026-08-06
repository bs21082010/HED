from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Alert, Bed, Cadet, Dorm
from ..schemas import BedWithCadet, CadetOut, DormMap, DormOut, LayoutSubmit

router = APIRouter(prefix="/api/dorms", tags=["dorms"])


@router.get("", response_model=list[DormOut])
def list_dorms(db: Session = Depends(get_db)):
    return (
        db.execute(select(Dorm).options(selectinload(Dorm.house)).order_by(Dorm.name))
        .scalars()
        .all()
    )


@router.get("/{dorm_id}", response_model=DormMap)
def get_dorm_map(dorm_id: int, db: Session = Depends(get_db)):
    dorm = db.get(Dorm, dorm_id)
    if dorm is None:
        raise HTTPException(status_code=404, detail="Dorm not found")

    beds = (
        db.execute(
            select(Bed)
            .where(Bed.dorm_id == dorm_id)
            .options(selectinload(Bed.cadet))
            .order_by(Bed.row, Bed.col)
        )
        .scalars()
        .all()
    )

    cadet_ids = [b.cadet_id for b in beds if b.cadet_id]
    unresolved = {}
    if cadet_ids:
        rows = db.execute(
            select(Alert)
            .where(Alert.cadet_id.in_(cadet_ids), Alert.resolved_at.is_(None))
            .order_by(Alert.created_at.desc(), Alert.id.desc())
        ).scalars()
        for alert in rows:
            unresolved.setdefault(alert.cadet_id, alert)

    def status_for(bed: Bed) -> str:
        if bed.cadet_id is None:
            return "empty"
        alert = unresolved.get(bed.cadet_id)
        return alert.type if alert else "normal"

    beds_out = [
        BedWithCadet(
            id=bed.id,
            row=bed.row,
            col=bed.col,
            location=bed.location,
            cadet=CadetOut.model_validate(bed.cadet) if bed.cadet else None,
            status=status_for(bed),
        )
        for bed in beds
    ]

    return DormMap(
        id=dorm.id,
        name=dorm.name,
        house=dorm.house,
        rows=dorm.rows,
        cols=dorm.cols,
        beds=beds_out,
    )


@router.post("/{dorm_id}/layout", response_model=DormMap)
def submit_layout(dorm_id: int, payload: LayoutSubmit, db: Session = Depends(get_db)):
    """Replace the dorm's bed layout with a scanned/edited one.

    Beds matching an existing (row, col) keep their cadet and get the new
    location label. Positions that no longer exist are removed (cadets are
    unassigned but kept). New positions create empty beds.
    """
    dorm = db.get(Dorm, dorm_id)
    if dorm is None:
        raise HTTPException(status_code=404, detail="Dorm not found")

    seen = set()
    for item in payload.beds:
        key = (item.row, item.col)
        if key in seen:
            raise HTTPException(status_code=400, detail=f"Duplicate bed position {key}")
        seen.add(key)

    existing = db.query(Bed).filter(Bed.dorm_id == dorm_id).all()
    existing_by_pos = {(b.row, b.col): b for b in existing}

    for item in payload.beds:
        bed = existing_by_pos.pop((item.row, item.col), None)
        if bed is not None:
            bed.location = item.location
        else:
            db.add(Bed(dorm_id=dorm_id, row=item.row, col=item.col, location=item.location))

    for bed in existing_by_pos.values():
        if bed.cadet_id is not None:
            cadet = db.get(Cadet, bed.cadet_id)
            if cadet:
                cadet.dorm_id = None
        db.delete(bed)

    dorm.rows = payload.rows
    dorm.cols = payload.cols
    db.commit()
    return get_dorm_map(dorm_id, db)
