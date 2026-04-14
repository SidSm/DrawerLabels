import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import JSONResponse

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("")
async def upload_image(file: UploadFile):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PNG/JPEG/WEBP/GIF allowed")
    suffix = Path(file.filename).suffix if file.filename else ".png"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = UPLOAD_DIR / filename
    UPLOAD_DIR.mkdir(exist_ok=True)
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return JSONResponse({"path": f"uploads/{filename}"})
