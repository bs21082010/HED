from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine, SessionLocal
from .routers import alerts, beds, cadets, contacts, download, dorms, ed, sms


@asynccontextmanager
async def lifespan(app: FastAPI):
    from . import models  # noqa: F401 - register tables

    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()
app = FastAPI(
    title="Digital Dormitory Discipline & Alert System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dorms.router)
app.include_router(beds.router)
app.include_router(cadets.router)
app.include_router(alerts.router)
app.include_router(ed.router)
app.include_router(sms.router)
app.include_router(contacts.router)
app.include_router(download.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}