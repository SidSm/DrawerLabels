from pathlib import Path

PICS_DIR = Path(__file__).parent.parent / "pics"
EXTS = ("png", "jpg", "jpeg", "webp")
EXCLUDE_STEMS = {"icons"}


def _scan_types() -> list[str]:
    seen: set[str] = set()
    for p in PICS_DIR.iterdir():
        if p.suffix.lstrip(".").lower() in EXTS and p.stem not in EXCLUDE_STEMS:
            seen.add(p.stem)
    return sorted(seen) + ["custom"]


def _resolve_type_image(type_name: str) -> str:
    for ext in EXTS:
        if (PICS_DIR / f"{type_name}.{ext}").exists():
            return f"pics/{type_name}.{ext}"
    return f"pics/{type_name}.png"  # fallback (may 404, but shows intent)


TYPES = _scan_types()
TYPE_IMAGE: dict[str, str] = {t: _resolve_type_image(t) for t in TYPES if t != "custom"}
