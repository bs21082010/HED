from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["download"])

APK_PATH = Path(__file__).resolve().parents[2] / "HED.apk"


@router.get("/apk")
def download_apk():
    if not APK_PATH.exists():
        return {"error": "HED.apk not found on server"}
    return FileResponse(
        APK_PATH,
        media_type="application/vnd.android.package-archive",
        filename="HED.apk",
    )