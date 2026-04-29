"""Create a stub Part for every type in app.types.TYPES that no Part references yet.

Idempotent: skips types already in use. One row per missing type.
Title and short_description default to a humanized version of the slug.

Usage: .venv/bin/python scripts/seed_unused_pics.py [--dry-run]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlmodel import Session, select

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db import create_db, engine  # noqa: E402
from app.models import Part  # noqa: E402
from app.types import TYPES  # noqa: E402


def humanize(slug: str) -> str:
    return slug.replace("-", " ").capitalize()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="list missing types, don't write")
    args = ap.parse_args()

    create_db()
    candidates = [t for t in TYPES if t != "custom"]

    with Session(engine) as session:
        used = set(session.exec(select(Part.type).distinct()).all())
        missing = [t for t in candidates if t not in used]

        print(f"Types total={len(candidates)} used={len(used & set(candidates))} missing={len(missing)}")
        if not missing:
            return

        added = 0
        for ptype in missing:
            title = humanize(ptype)
            print(f"  + {ptype:30s} title={title!r}")
            if args.dry_run:
                continue
            session.add(Part(title=title, short_description=title, type=ptype))
            added += 1

        if args.dry_run:
            print("(dry-run, no commit)")
        else:
            session.commit()
            print(f"Done. added={added}")


if __name__ == "__main__":
    main()
