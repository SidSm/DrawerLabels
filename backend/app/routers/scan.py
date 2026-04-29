import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.models import Part

router = APIRouter(prefix="/api/scan", tags=["scan"])


class ResolveIn(BaseModel):
    payload: str


class ResolveOut(BaseModel):
    id: int
    title: str
    short_description: Optional[str]
    type: str
    urls: List[str]


class ExportIn(BaseModel):
    ids: List[int]


def _parse_id(payload: str) -> Optional[int]:
    first = payload.splitlines()[0].strip() if payload else ""
    try:
        return int(first)
    except ValueError:
        return None


@router.post("/resolve", response_model=ResolveOut)
def resolve(data: ResolveIn, session: Session = Depends(get_session)):
    part_id = _parse_id(data.payload)
    if part_id is None:
        raise HTTPException(status_code=400, detail="Payload missing numeric id")
    part = session.get(Part, part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return ResolveOut(
        id=part.id,
        title=part.title,
        short_description=part.short_description,
        type=part.type,
        urls=[u.url for u in part.urls],
    )


@router.post("/export")
def export_csv(data: ExportIn, session: Session = Depends(get_session)):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "title", "short_description", "type", "urls"])
    for pid in data.ids:
        part = session.get(Part, pid)
        if not part:
            continue
        writer.writerow([
            part.id,
            part.title,
            part.short_description,
            part.type,
            " | ".join(u.url for u in part.urls),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=shopping-list.csv"},
    )
