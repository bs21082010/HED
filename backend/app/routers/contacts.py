from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Contact
from ..schemas import ContactCreate, ContactOut

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(db: Session = Depends(get_db)):
    return db.execute(select(Contact).order_by(Contact.role, Contact.name)).scalars().all()


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(payload: ContactCreate, db: Session = Depends(get_db)):
    existing = db.query(Contact).filter(Contact.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="Phone number already registered")
    contact = Contact(**payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact
