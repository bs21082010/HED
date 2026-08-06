from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import SmsResultOut, SmsSendRequest
from ..services.sms import send_manual_sms

router = APIRouter(prefix="/api/sms", tags=["sms"])


@router.post("/send", response_model=SmsResultOut)
def send_sms(payload: SmsSendRequest, db: Session = Depends(get_db)):
    """Send an alert SMS to a school number. The teacher only supplies the
    phone number (and optionally an alert id); the message is built from
    database data (latest active red alert if none given)."""
    try:
        result = send_manual_sms(db, payload.phone, payload.alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SmsResultOut(**{
        "to_name": result.to_name,
        "to_phone": result.to_phone,
        "body": result.body,
        "status": result.status,
        "sent_at": result.sent_at,
    })
