"""Server-side shopping list. Single global list, shared across devices."""
import csv
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlmodel import Session, select

from app.db import get_session
from app.models import Part, ShoppingItem

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


class PartLite(BaseModel):
    id: int
    title: str
    short_description: Optional[str]
    type: str
    urls: List[str]


class ShoppingOut(BaseModel):
    id: int
    part_id: int
    qty: int
    created_at: datetime
    updated_at: datetime
    part: Optional[PartLite]


class AddIn(BaseModel):
    part_id: int
    qty: int = 1


class PatchIn(BaseModel):
    qty: int


def _to_out(item: ShoppingItem, part: Optional[Part]) -> ShoppingOut:
    part_lite = (
        PartLite(
            id=part.id,
            title=part.title,
            short_description=part.short_description,
            type=part.type,
            urls=[u.url for u in part.urls],
        )
        if part
        else None
    )
    return ShoppingOut(
        id=item.id,
        part_id=item.part_id,
        qty=item.qty,
        created_at=item.created_at,
        updated_at=item.updated_at,
        part=part_lite,
    )


@router.get("", response_model=List[ShoppingOut])
def list_items(session: Session = Depends(get_session)):
    items = session.exec(select(ShoppingItem).order_by(ShoppingItem.created_at)).all()
    out: List[ShoppingOut] = []
    for it in items:
        part = session.get(Part, it.part_id)
        out.append(_to_out(it, part))
    return out


@router.post("/add", response_model=ShoppingOut, status_code=201)
def add_item(data: AddIn, session: Session = Depends(get_session)):
    """Atomic upsert: insert or bump qty by data.qty. Concurrent scans converge."""
    if data.qty <= 0:
        raise HTTPException(status_code=400, detail="qty must be > 0")
    if not session.get(Part, data.part_id):
        raise HTTPException(status_code=404, detail="Part not found")

    now = datetime.utcnow()
    stmt = sqlite_insert(ShoppingItem).values(
        part_id=data.part_id, qty=data.qty, created_at=now, updated_at=now
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["part_id"],
        set_={
            "qty": ShoppingItem.qty + stmt.excluded.qty,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    session.execute(stmt)
    session.commit()

    item = session.exec(
        select(ShoppingItem).where(ShoppingItem.part_id == data.part_id)
    ).one()
    part = session.get(Part, item.part_id)
    return _to_out(item, part)


@router.patch("/{item_id}", response_model=ShoppingOut)
def patch_item(item_id: int, data: PatchIn, session: Session = Depends(get_session)):
    if data.qty <= 0:
        raise HTTPException(status_code=400, detail="qty must be > 0; use DELETE to remove")
    item = session.get(ShoppingItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.qty = data.qty
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    part = session.get(Part, item.part_id)
    return _to_out(item, part)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ShoppingItem, item_id)
    if not item:
        return
    session.delete(item)
    session.commit()


@router.post("/clear", status_code=204)
def clear(session: Session = Depends(get_session)):
    for it in session.exec(select(ShoppingItem)).all():
        session.delete(it)
    session.commit()


EXPORT_HEADER = [
    "No.", "Approved by, Date", "Approve", "Date", "Who", "Project", "Store",
    "Product Name", "Pcs", "USD", "EUR", "CZK", "Total", "Link", "Notice",
    "Priority", "Notify me", "Ordered",
]
EXPORT_PCS_DEFAULT = 100


@router.get("/export")
def export_csv(session: Session = Depends(get_session)):
    items = session.exec(select(ShoppingItem).order_by(ShoppingItem.created_at)).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(EXPORT_HEADER)
    n = 0
    for it in items:
        part = session.get(Part, it.part_id)
        if not part:
            continue
        n += 1
        product_name = part.title + (" " + part.short_description if part.short_description else "")
        link = part.urls[0].url if part.urls else ""
        row = [""] * len(EXPORT_HEADER)
        row[0] = n
        row[7] = product_name
        row[8] = EXPORT_PCS_DEFAULT
        row[13] = link
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=shopping-list.csv"},
    )
