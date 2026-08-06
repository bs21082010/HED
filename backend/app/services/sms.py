import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal
from ..models import Alert, Cadet, Contact, Dorm, EdAssignment

logger = logging.getLogger("sms")


@dataclass
class SmsResult:
    to_name: str
    to_phone: str
    body: str
    status: str
    sent_at: datetime


class SmsProvider(ABC):
    @abstractmethod
    def send(self, to_name: str, to_phone: str, body: str) -> SmsResult: ...


class MockSmsProvider(SmsProvider):
    """Logs SMS to console and to an outbox file. Safe default for development."""

    def send(self, to_name: str, to_phone: str, body: str) -> SmsResult:
        line = f"[{datetime.now().isoformat(timespec='seconds')}] SMS -> {to_name} <{to_phone}>: {body}"
        logger.info(line)
        with open("sms_outbox.log", "a", encoding="utf-8") as f:
            f.write(line + "\n")
        return SmsResult(
            to_name=to_name,
            to_phone=to_phone,
            body=body,
            status="sent(mock)",
            sent_at=datetime.now(),
        )


class TwilioSmsProvider(SmsProvider):
    def __init__(self) -> None:
        from twilio.rest import Client

        settings = get_settings()
        if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
            raise RuntimeError(
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER must be set "
                "when SMS_PROVIDER=twilio"
            )
        self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self.from_number = settings.twilio_from_number

    def send(self, to_name: str, to_phone: str, body: str) -> SmsResult:
        message = self.client.messages.create(
            body=body, from_=self.from_number, to=to_phone
        )
        logger.info("Twilio SMS %s -> %s: %s", message.sid, to_phone, body)
        return SmsResult(
            to_name=to_name,
            to_phone=to_phone,
            body=body,
            status=message.status,
            sent_at=datetime.now(),
        )


def get_provider() -> SmsProvider:
    provider_name = get_settings().sms_provider.lower()
    if provider_name == "twilio":
        return TwilioSmsProvider()
    return MockSmsProvider()


def send_manual_sms(db: Session, phone: str, alert_id: int | None = None) -> SmsResult:
    """Send an SMS to a school number. Message content is pulled from the
    database: the given alert, or the latest active red alert.
    """
    alert = db.get(Alert, alert_id) if alert_id else None
    if alert is None:
        alert = (
            db.query(Alert)
            .filter(Alert.resolved_at.is_(None))
            .order_by(Alert.created_at.desc(), Alert.id.desc())
            .first()
        )
    if alert is None:
        raise ValueError("No active red alerts found to report")

    cadet = db.get(Cadet, alert.cadet_id)
    if cadet is None:
        raise ValueError("Alert references a missing cadet")
    dorm = db.get(Dorm, cadet.dorm_id) if cadet.dorm_id else None

    body = build_alert_message(alert, cadet, dorm, drill_type_for_alert(db, alert))
    contact = db.query(Contact).filter(Contact.phone == phone).first()
    to_name = contact.name if contact else "School"
    return get_provider().send(to_name, phone, body)


def build_alert_message(alert: Alert, cadet: Cadet, dorm: Dorm | None, drill_type: str = "ED") -> str:
    parts = [f"RED ALERT: Cadet {cadet.name}"]
    if dorm:
        parts.append(f"Dorm {dorm.name}")
    parts.append(f"{drill_type} assigned on {alert.created_at.strftime('%d %b %Y, %H:%M')}")
    if alert.message:
        parts.append(f"Reason: {alert.message}")
    return ". ".join(parts) + "."


def drill_type_for_alert(db: Session, alert: Alert) -> str:
    ed = db.query(EdAssignment).filter(EdAssignment.alert_id == alert.id).first()
    return ed.drill_type if ed else "ED"


def notify_red_alert(alert_id: int) -> list[SmsResult]:
    """Send red-alert SMS to all contacts whose role is in SMS_NOTIFY_ROLES.

    Opens its own session because it runs as a background task after the
    request session has closed.
    """
    settings = get_settings()
    with SessionLocal() as db:
        alert = db.get(Alert, alert_id)
        if alert is None:
            return []
        return _send_for_alert(db, alert)


def _send_for_alert(db: Session, alert: Alert) -> list[SmsResult]:
    settings = get_settings()
    cadet = db.get(Cadet, alert.cadet_id)
    if cadet is None:
        return []
    dorm = db.get(Dorm, cadet.dorm_id) if cadet.dorm_id else None

    body = build_alert_message(alert, cadet, dorm, drill_type_for_alert(db, alert))
    contacts = (
        db.query(Contact)
        .filter(Contact.role.in_(settings.notify_role_list))
        .all()
    )
    if not contacts:
        logger.warning("No SMS contacts configured for roles %s", settings.notify_role_list)

    provider = get_provider()
    results: list[SmsResult] = []
    for contact in contacts:
        try:
            results.append(provider.send(contact.name, contact.phone, body))
        except Exception:  # noqa: BLE001 - never let SMS failure break the alert flow
            logger.exception("SMS failed for %s <%s>", contact.name, contact.phone)
    return results
