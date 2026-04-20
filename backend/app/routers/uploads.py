import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import JSONResponse

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("")
async def upload_image(file: UploadFile):
    suffix = Path(file.filename).suffix.lower() if file.filename else ""
    mime_ok = file.content_type in ALLOWED_MIME
    ext_ok = suffix in ALLOWED_EXT
    if not (mime_ok or ext_ok):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file (mime={file.content_type}, ext={suffix})",
        )
    if not suffix:
        suffix = ".png"
    filename = f"{uuid.uuid4().hex}{suffix}"
    UPLOAD_DIR.mkdir(exist_ok=True)
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return JSONResponse({"path": f"uploads/{filename}"})
