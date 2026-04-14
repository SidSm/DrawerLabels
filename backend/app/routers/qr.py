import io
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import qrcode

router = APIRouter(prefix="/api/qr", tags=["qr"])


@router.get("")
def generate_qr(data: str = Query(..., description="Data to encode")):
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")
