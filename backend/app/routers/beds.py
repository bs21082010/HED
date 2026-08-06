from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Bed, Dorm
from ..schemas import BedCreate, BedOut, BedUpdate

router = APIRouter(prefix="/api/beds", tags=["beds"])


@router.post("/dorms/{dorm_id}", response_model=BedOut, status_code=201)
def add_bed(dorm_id: int, payload: BedCreate, db: Session = Depends(get_db)):
    if db.get(Dorm, dorm_id) is None:
        raise HTTPException(status_code=404, detail="Dorm not found")
    existing = (
        db.query(Bed)
        .filter(Bed.dorm_id == dorm_id, Bed.row == payload.row, Bed.col == payload.col)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A bed already exists at that position")
    bed = Bed(dorm_id=dorm_id, **payload.model_dump())
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


@router.put("/{bed_id}", response_model=BedOut)
def update_bed(bed_id: int, payload: BedUpdate, db: Session = Depends(get_db)):
    """Move a bed to a new row/col or change its location label."""
    bed = db.get(Bed, bed_id)
    if bed is None:
        raise HTTPException(status_code=404, detail="Bed not found")

    if payload.row is not None and payload.col is not None:
        clash = (
            db.query(Bed)
            .filter(
                Bed.dorm_id == bed.dorm_id,
                Bed.row == payload.row,
                Bed.col == payload.col,
                Bed.id != bed_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Position occupied by another bed")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(bed, key, value)
    db.commit()
    db.refresh(bed)
    return bed


@router.delete("/{bed_id}", status_code=204)
def delete_bed(bed_id: int, db: Session = Depends(get_db)):
    bed = db.get(Bed, bed_id)
    if bed is None:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.cadet_id is not None:
        raise HTTPException(status_code=409, detail="Occupied bed cannot be removed")
    db.delete(bed)
    db.commit()
