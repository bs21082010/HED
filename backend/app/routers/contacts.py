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


@router.put("/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: int, payload: ContactCreate, db: Session = Depends(get_db)
):
    contact = db.get(Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    dup = db.query(Contact).filter(
        Contact.phone == payload.phone, Contact.id != contact_id
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Phone number already registered")
    for field, value in payload.model_dump().items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
