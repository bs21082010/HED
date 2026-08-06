from datetime import datetime, date

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class House(Base):
    __tablename__ = "houses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    dorms: Mapped[list["Dorm"]] = relationship(back_populates="house")
    cadets: Mapped[list["Cadet"]] = relationship(back_populates="house")


class Dorm(Base):
    __tablename__ = "dorms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    house_id: Mapped[int] = mapped_column(ForeignKey("houses.id"), nullable=False)
    rows: Mapped[int] = mapped_column(Integer, default=4)
    cols: Mapped[int] = mapped_column(Integer, default=6)

    house: Mapped[House] = relationship(back_populates="dorms")
    beds: Mapped[list["Bed"]] = relationship(
        back_populates="dorm", cascade="all, delete-orphan"
    )


class Cadet(Base):
    __tablename__ = "cadets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    house_id: Mapped[int] = mapped_column(ForeignKey("houses.id"), nullable=False)
    cadet_class: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    dorm_id: Mapped[int | None] = mapped_column(ForeignKey("dorms.id"), nullable=True)

    house: Mapped[House] = relationship(back_populates="cadets")
    bed: Mapped["Bed | None"] = relationship(
        back_populates="cadet", uselist=False, cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(back_populates="cadet")


class Bed(Base):
    __tablename__ = "beds"
    __table_args__ = (UniqueConstraint("dorm_id", "row", "col"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dorm_id: Mapped[int] = mapped_column(ForeignKey("dorms.id"), nullable=False)
    row: Mapped[int] = mapped_column(Integer, nullable=False)
    col: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    cadet_id: Mapped[int | None] = mapped_column(
        ForeignKey("cadets.id"), unique=True, nullable=True
    )

    dorm: Mapped[Dorm] = relationship(back_populates="beds")
    cadet: Mapped[Cadet | None] = relationship(back_populates="bed")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cadet_id: Mapped[int] = mapped_column(ForeignKey("cadets.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # warning | red
    message: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    cadet: Mapped[Cadet] = relationship(back_populates="alerts")


class EdAssignment(Base):
    __tablename__ = "ed_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), nullable=False)
    cadet_id: Mapped[int] = mapped_column(ForeignKey("cadets.id"), nullable=False)
    drill_type: Mapped[str] = mapped_column(String(10), nullable=False, default="ED")  # ED | HED
    scheduled_for: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    alert: Mapped[Alert] = relationship()
    cadet: Mapped[Cadet] = relationship()


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # supervisor | drill_instructor | admin
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
