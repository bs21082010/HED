from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

AlertType = Literal["warning", "red"]


class HouseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str


class DormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    house_id: int
    rows: int
    cols: int
    house: HouseOut


class CadetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    house_id: int
    cadet_class: str
    dorm_id: Optional[int] = None


class CadetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    house_id: int
    cadet_class: str = ""
    dorm_id: Optional[int] = None


class BedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dorm_id: int
    row: int
    col: int
    location: str = ""
    cadet_id: Optional[int] = None


class BedUpdate(BaseModel):
    row: Optional[int] = Field(default=None, ge=1, le=50)
    col: Optional[int] = Field(default=None, ge=1, le=50)
    location: Optional[str] = Field(default=None, max_length=100)


class BedCreate(BaseModel):
    row: int = Field(ge=1, le=50)
    col: int = Field(ge=1, le=50)
    location: str = Field(default="", max_length=100)


class BedWithCadet(BaseModel):
    id: int
    row: int
    col: int
    location: str = ""
    cadet: Optional[CadetOut] = None
    status: str = "empty"  # empty | normal | warning | red


class LayoutItem(BaseModel):
    row: int = Field(ge=1, le=50)
    col: int = Field(ge=1, le=50)
    location: str = Field(default="", max_length=100)


class LayoutSubmit(BaseModel):
    rows: int = Field(ge=1, le=20)
    cols: int = Field(ge=1, le=50)
    beds: list[LayoutItem]


class DormMap(BaseModel):
    id: int
    name: str
    house: HouseOut
    rows: int
    cols: int
    beds: list[BedWithCadet]


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cadet_id: int
    type: AlertType
    message: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    cadet: Optional[CadetOut] = None


class AlertCreate(BaseModel):
    type: AlertType
    message: str = ""
    drill_type: Literal["ED", "HED"] = "ED"


class EdAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: int
    cadet_id: int
    drill_type: str
    scheduled_for: date
    created_at: datetime
    cadet: Optional[CadetOut] = None


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    role: str = Field(pattern="^(supervisor|drill_instructor|admin)$")
    phone: str = Field(min_length=5, max_length=20)


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    phone: str


class SmsLog(BaseModel):
    id: int
    alert_id: int
    to_name: str
    to_phone: str
    body: str
    status: str
    created_at: datetime


class SmsSendRequest(BaseModel):
    phone: str = Field(min_length=5, max_length=20)
    alert_id: Optional[int] = None


class SmsResultOut(BaseModel):
    to_name: str
    to_phone: str
    body: str
    status: str
    sent_at: datetime
