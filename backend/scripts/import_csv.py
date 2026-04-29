"""Import parts + URLs from BoltNutScrewTypesList CSV. Idempotent.

Scope: Socket/Flat/Pan bolts (+ Black variants), Nut, Lock nut.
Everything else (Washer, Insert, Spacer, Screw, Pin, Rivet, connectors, etc.) is skipped.

Rules:
  Socket/Flat/Pan + empty color   -> bolt-<lower(head)>
  Socket/Flat/Pan + Black         -> bolt-black-<lower(head)>
  Nut              + empty color  -> nut,     title = Thread
  Lock nut         + empty color  -> locknut, title = Thread
Other colors (Plastic/Winged/Flanged/...) -> skip.

Usage: .venv/bin/python scripts/import_csv.py [--verbose]
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db import create_db, engine  # noqa: E402
from app.models import Part, PartURL  # noqa: E402

CSV_PATH = BACKEND_DIR.parent / "BoltNutScrewTypesList - screws.csv"

BOLT_HEADS = {"socket", "flat", "pan"}
DESC = {
    "bolt-socket": "Socket head bolt",
    "bolt-flat": "Flat head bolt",
    "bolt-pan": "Pan head bolt",
    "bolt-black-socket": "Black socket head bolt",
    "bolt-black-flat": "Black flat head bolt",
    "bolt-black-pan": "Black pan head bolt",
    "nut": "Hex nut",
    "locknut": "Lock nut",
    "spacer-in-in": "Spacer in-in",
    "spacer-in-out": "Spacer in-out",
    "spacer-in-in-plastic": "Spacer in-in plastic",
    "spacer-in-out-plastic": "Spacer in-out plastic",
}

SPACER_VARIANTS = {
    "in-in": "spacer-in-in",
    "in-out": "spacer-in-out",
    "in-in plastic": "spacer-in-in-plastic",
    "in-out plastic": "spacer-in-out-plastic",
}


def normalize_thread(raw: str) -> Optional[str]:
    """'M2,5' -> 'M2.5'; '3' -> 'M3'; 'M3' -> 'M3'. None if not a metric thread."""
    s = raw.strip().replace(",", ".")
    if not s:
        return None
    if s[0] in "Mm":
        s = s[1:]
    try:
        float(s)
    except ValueError:
        return None
    return f"M{s}"


def classify(head: str, thread_raw: str, length_raw: str, color: str) -> Optional[tuple[str, str, str]]:
    """Return (title, type, desc) or None to skip."""
    head = head.strip().lower()
    color = color.strip()

    # Spacers: color column holds the variant ('in-in', 'in-out', '... Plastic').
    if head == "spacer":
        thread = normalize_thread(thread_raw)
        if not thread:
            return None
        length_s = length_raw.strip()
        if not length_s:
            return None
        try:
            length = int(float(length_s))
        except ValueError:
            return None
        ptype = SPACER_VARIANTS.get(color.lower())
        if ptype is None:
            return None
        return f"{thread}x{length}", ptype, DESC[ptype]

    if color and color.lower() != "black":
        return None  # Plastic/Winged/Flanged/etc. out of scope this wave

    # Nuts
    if head == "nut" and not color:
        thread = normalize_thread(thread_raw)
        if not thread:
            return None
        return thread, "nut", DESC["nut"]
    if head == "lock nut" and not color:
        thread = normalize_thread(thread_raw)
        if not thread:
            return None
        return thread, "locknut", DESC["locknut"]

    # Bolts
    if head in BOLT_HEADS:
        thread = normalize_thread(thread_raw)
        if not thread:
            return None
        length_s = length_raw.strip()
        if not length_s:
            return None
        try:
            length = int(float(length_s))
        except ValueError:
            return None
        ptype = f"bolt-{'black-' if color.lower() == 'black' else ''}{head}"
        if ptype not in DESC:
            return None
        return f"{thread}x{length}", ptype, DESC[ptype]

    return None


def extract_urls(row: list[str]) -> list[str]:
    """Cols 5..10 (0-indexed) = Link TME, Link2, Link3, Link spojovaci material, + trailing."""
    urls = []
    for cell in row[5:11]:
        u = (cell or "").strip()
        if u.startswith("http"):
            urls.append(u)
    return urls


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verbose", action="store_true", help="print skipped row line numbers")
    args = ap.parse_args()

    if not CSV_PATH.exists():
        sys.exit(f"CSV missing: {CSV_PATH}")

    create_db()
    print(f"Importing from {CSV_PATH.name}")

    created = matched = url_added = url_dup = skipped = 0
    skipped_lines: list[tuple[int, str]] = []

    with CSV_PATH.open(newline="", encoding="utf-8") as fh, Session(engine) as session:
        reader = csv.reader(fh)
        header = next(reader, None)  # noqa: F841
        for line_no, row in enumerate(reader, start=2):
            if len(row) < 5 or not any(c.strip() for c in row[:5]):
                skipped += 1
                if args.verbose:
                    skipped_lines.append((line_no, "empty"))
                continue
            head, thread, length, color = row[0], row[1], row[2], row[3]
            cls = classify(head, thread, length, color)
            if cls is None:
                skipped += 1
                if args.verbose:
                    skipped_lines.append((line_no, f"{head!r},{thread!r},{length!r},{color!r}"))
                continue
            title, ptype, desc = cls

            part = session.exec(
                select(Part).where(Part.title == title, Part.type == ptype)
            ).first()
            if part is None:
                part = Part(title=title, type=ptype, short_description=desc)
                session.add(part)
                session.flush()  # assign id
                created += 1
            else:
                matched += 1

            existing = {u.url for u in part.urls}
            for url in extract_urls(row):
                if url in existing:
                    url_dup += 1
                else:
                    session.add(PartURL(part_id=part.id, url=url))
                    existing.add(url)
                    url_added += 1

        session.commit()

    print(f"  parts created   = {created}")
    print(f"  parts matched   = {matched}")
    print(f"  urls added      = {url_added}")
    print(f"  urls duplicate  = {url_dup}")
    print(f"  rows skipped    = {skipped}")
    if args.verbose and skipped_lines:
        print("  skipped detail:")
        for ln, reason in skipped_lines:
            print(f"    line {ln}: {reason}")


if __name__ == "__main__":
    main()
