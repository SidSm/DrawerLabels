TYPES = [
    "bolt-socket",
    "bolt-flat",
    "bolt-pan",
    "bolt-black-socket",
    "bolt-black-flat",
    "bolt-black-pan",
    "nut",
    "locknut",
    "inserts",
    "inserts-flanged",
    "spacer-in-in",
    "spacer-in-out",
    "spacer-in-in-plastic",
    "spacer-in-out-plastic",
    "pin",
    "screw",
    "washer",
    "custom",
]

def _resolve_type_image(type_name: str) -> str:
    from pathlib import Path
    pics = Path(__file__).parent.parent / "pics"
    for ext in ("png", "jpg", "jpeg", "webp"):
        if (pics / f"{type_name}.{ext}").exists():
            return f"pics/{type_name}.{ext}"
    return f"pics/{type_name}.png"  # fallback (may 404, but shows intent)


TYPE_IMAGE: dict[str, str] = {t: _resolve_type_image(t) for t in TYPES if t != "custom"}
