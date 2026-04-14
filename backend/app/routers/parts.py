from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Part, PartURL
from app.schemas import PartCreate, PartOut, PartUpdate

router = APIRouter(prefix="/api/parts", tags=["parts"])


def _set_urls(session: Session, part: Part, urls: List[str]):
    # Delete existing
    existing = session.exec(select(PartURL).where(PartURL.part_id == part.id)).all()
    for u in existing:
        session.delete(u)
    session.flush()
    for url in urls:
        session.add(PartURL(part_id=part.id, url=url))


@router.get("", response_model=List[PartOut])
def list_parts(session: Session = Depends(get_session)):
    parts = session.exec(select(Part)).all()
    return parts


@router.get("/{part_id}", response_model=PartOut)
def get_part(part_id: int, session: Session = Depends(get_session)):
    part = session.get(Part, part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part


@router.post("", response_model=PartOut, status_code=201)
def create_part(data: PartCreate, session: Session = Depends(get_session)):
    part = Part(
        title=data.title,
        short_description=data.short_description,
        type=data.type,
        custom_image_path=data.custom_image_path,
    )
    session.add(part)
    session.flush()
    _set_urls(session, part, data.urls)
    session.commit()
    session.refresh(part)
    return part


@router.put("/{part_id}", response_model=PartOut)
def update_part(part_id: int, data: PartUpdate, session: Session = Depends(get_session)):
    part = session.get(Part, part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    for field, value in data.model_dump(exclude_unset=True, exclude={"urls"}).items():
        setattr(part, field, value)
    part.updated_at = datetime.utcnow()
    if data.urls is not None:
        _set_urls(session, part, data.urls)
    session.add(part)
    session.commit()
    session.refresh(part)
    return part


@router.delete("/{part_id}", status_code=204)
def delete_part(part_id: int, session: Session = Depends(get_session)):
    part = session.get(Part, part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    for url in part.urls:
        session.delete(url)
    session.delete(part)
    session.commit()
