from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Bed, Cadet
from ..schemas import CadetCreate, CadetOut

router = APIRouter(prefix="/api/cadets", tags=["cadets"])


@router.get("", response_model=list[CadetOut])
def list_cadets(db: Session = Depends(get_db)):
    return db.execute(select(Cadet).order_by(Cadet.name)).scalars().all()


@router.post("", response_model=CadetOut, status_code=201)
def create_cadet(payload: CadetCreate, db: Session = Depends(get_db)):
    cadet = Cadet(**payload.model_dump())
    db.add(cadet)
    db.commit()
    db.refresh(cadet)
    return cadet


@router.put("/{cadet_id}/bed/{bed_id}", response_model=CadetOut)
def assign_bed(cadet_id: int, bed_id: int, db: Session = Depends(get_db)):
    cadet = db.get(Cadet, cadet_id)
    bed = db.get(Bed, bed_id)
    if cadet is None:
        raise HTTPException(status_code=404, detail="Cadet not found")
    if bed is None:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.cadet_id is not None and bed.cadet_id != cadet_id:
        raise HTTPException(status_code=409, detail="Bed already occupied")

    previous = (
        db.query(Bed).filter(Bed.cadet_id == cadet_id, Bed.id != bed_id).all()
    )
    for old in previous:
        old.cadet_id = None

    bed.cadet_id = cadet_id
    cadet.dorm_id = bed.dorm_id
    db.commit()
    db.refresh(cadet)
    return cadet
