"""Seed Parts table from config/seed_parts.yaml. Idempotent: skips existing (title,type)."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

import yaml
from sqlmodel import Session, select

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db import create_db, engine  # noqa: E402
from app.models import Part  # noqa: E402

CONFIG_PATH = BACKEND_DIR / "config" / "seed_parts.yaml"

FINISH_LABEL = {
    "socket": "Socket head",
    "black-socket": "Black socket",
    "flat": "Flat head",
    "pan": "Pan head",
}


def bolt_rows(cfg: dict) -> Iterable[tuple[str, str, str]]:
    finishes = cfg["bolts"]["finishes"]
    sizes = cfg["bolts"]["sizes"]
    for finish in finishes:
        ptype = f"bolt-{finish}"
        desc = FINISH_LABEL.get(finish, finish.replace("-", " ").capitalize())
        for thread, lengths in sizes.items():
            for length in lengths:
                title = f"{thread}x{length}"
                yield title, ptype, desc


def nut_rows(cfg: dict) -> Iterable[tuple[str, str, str]]:
    for thread in cfg["nuts"]["sizes"]:
        yield thread, "nut", "Hex nut"


def locknut_rows(cfg: dict) -> Iterable[tuple[str, str, str]]:
    for thread in cfg["locknuts"]["sizes"]:
        yield thread, "locknut", "Lock nut"


def seed(session: Session, rows: Iterable[tuple[str, str, str]], category: str) -> tuple[int, int]:
    added = skipped = 0
    for title, ptype, desc in rows:
        exists = session.exec(
            select(Part).where(Part.title == title, Part.type == ptype)
        ).first()
        if exists:
            skipped += 1
            continue
        session.add(Part(title=title, short_description=desc, type=ptype))
        added += 1
    session.commit()
    print(f"  {category:10s} added={added:4d} skipped={skipped:4d}")
    return added, skipped


def main() -> None:
    if not CONFIG_PATH.exists():
        sys.exit(f"Config missing: {CONFIG_PATH}")
    cfg = yaml.safe_load(CONFIG_PATH.read_text())

    create_db()
    print(f"Seeding from {CONFIG_PATH.relative_to(BACKEND_DIR)}")
    with Session(engine) as session:
        total_added = total_skipped = 0
        for category, rows in (
            ("bolts", bolt_rows(cfg)),
            ("nuts", nut_rows(cfg)),
            ("locknuts", locknut_rows(cfg)),
        ):
            a, s = seed(session, rows, category)
            total_added += a
            total_skipped += s
        print(f"Done. total added={total_added} skipped={total_skipped}")


if __name__ == "__main__":
    main()
