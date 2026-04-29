import os
import signal
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse

from app.db import create_db
from app.color_rules import color_for_title, reload as reload_colors
from app.routers import parts, uploads, qr, detail, scan, shopping

BASE_DIR = Path(__file__).parent.parent

app = FastAPI(title="DrawerLabels")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parts.router)
app.include_router(uploads.router)
app.include_router(qr.router)
app.include_router(detail.router)
app.include_router(scan.router)
app.include_router(shopping.router)

app.mount("/pics", StaticFiles(directory=str(BASE_DIR / "pics")), name="pics")
app.mount("/uploads", StaticFiles(directory=str(BASE_DIR / "uploads")), name="uploads")


@app.on_event("startup")
def on_startup():
    (BASE_DIR / "data").mkdir(exist_ok=True)
    (BASE_DIR / "uploads").mkdir(exist_ok=True)
    create_db()


@app.get("/api/color")
def get_color(title: str = Query(...)):
    color = color_for_title(title)
    return JSONResponse({"color": color})


@app.get("/api/types")
def get_types():
    from app.types import TYPES
    return TYPES


@app.get("/api/type-image/{type_name}")
def type_image(type_name: str):
    from app.types import TYPES
    if type_name not in TYPES or type_name == "custom":
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    pics = BASE_DIR / "pics"
    for ext in ("png", "jpg", "jpeg", "webp"):
        path = pics / f"{type_name}.{ext}"
        if path.exists():
            return FileResponse(path)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Image not found")


# Reload color rules on SIGHUP (production use)
try:
    signal.signal(signal.SIGHUP, lambda *_: reload_colors())
except (OSError, ValueError):
    pass
