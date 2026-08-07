from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .database import Base, engine, SessionLocal
from .routers import alerts, beds, cadets, contacts, download, dorms, ed, sms

BACKEND_DIR = Path(__file__).resolve().parents[1]
WEB_DIR = BACKEND_DIR.parent / "frontend" / "out"


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


# Static frontend (Next.js static export) served from the same origin.
if WEB_DIR.is_dir():
    if (WEB_DIR / "_next").is_dir():
        app.mount("/_next", StaticFiles(directory=WEB_DIR / "_next"), name="next_assets")

    @app.get("/", include_in_schema=False)
    def web_index():
        return FileResponse(WEB_DIR / "index.html")

    @app.get("/{path:path}", include_in_schema=False)
    def web_spa(path: str):
        candidate = (WEB_DIR / path).resolve()
        if candidate != WEB_DIR and WEB_DIR in candidate.parents:
            if candidate.is_dir() and (candidate / "index.html").is_file():
                return FileResponse(candidate / "index.html")
            if candidate.is_file():
                return FileResponse(candidate)
            html_candidate = candidate.with_suffix(".html")
            if html_candidate.is_file():
                return FileResponse(html_candidate)
        return Response(status_code=404)