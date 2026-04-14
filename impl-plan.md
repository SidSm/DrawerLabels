# DrawerLabels — Implementation Plan

## Context

The workshop has many small parts drawers that need clear, printable labels. Today there's no system — parts are unlabeled or hand-labeled, and sourcing URLs are scattered. We want a small self-hosted web app that stores part metadata in SQLite and produces print-ready labels (40×20 mm default) with a title, type image, short description, a color corner indicator, and a QR code linking to a detail page that lists sourcing URLs.

This is a greenfield project — the repo currently contains only `plan.md`. The plan below is the full initial build.

Answers locked in with the user:
- **Auth:** none in-app (nginx handles it)
- **Custom image storage:** local `uploads/` folder, path stored in DB
- **Label size:** per-print (chosen in the print dialog, default 40×20 mm)
- **Color-square rule:** editable config file (`config/label_colors.yaml`)

## Architecture

```
DrawerLabels/
├── backend/                  FastAPI app
│   ├── app/
│   │   ├── main.py           FastAPI entrypoint, CORS, static mounts
│   │   ├── db.py             SQLite engine + session (SQLModel)
│   │   ├── models.py         Part, PartURL SQLModel tables
│   │   ├── schemas.py        Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── parts.py      CRUD for parts
│   │   │   ├── uploads.py    Custom image upload
│   │   │   ├── qr.py         QR code PNG generation
│   │   │   └── detail.py     Public HTML page served at /p/{id}
│   │   ├── color_rules.py    Load+apply config/label_colors.yaml
│   │   └── types.py          Canonical part-type list + image mapping
│   ├── pics/                 Pre-made type images (checked in)
│   ├── uploads/              Custom images (gitignored)
│   ├── config/
│   │   └── label_colors.yaml Title-prefix → color rules
│   ├── data/
│   │   └── drawerlabels.db   SQLite (gitignored)
│   └── pyproject.toml
├── frontend/                 Next.js (App Router, TypeScript)
│   ├── app/
│   │   ├── layout.tsx        Blue/orange theme
│   │   ├── page.tsx          Parts list + print selection
│   │   ├── parts/new/page.tsx    Create form
│   │   ├── parts/[id]/edit/page.tsx  Edit form
│   │   └── print/page.tsx    Canvas preview + print
│   ├── components/
│   │   ├── PartForm.tsx
│   │   ├── PartsTable.tsx
│   │   ├── TypeCombobox.tsx  Typeahead dropdown over types
│   │   ├── Label.tsx         Single-label SVG renderer
│   │   └── PaperPreview.tsx  Paper-sized canvas that tiles labels
│   ├── lib/api.ts            Typed fetch wrappers
│   └── package.json
└── plan.md
```

Detail page (`/p/{id}`) is served by the FastAPI backend as plain HTML — that way the QR code points at a single stable URL that works even if the Next.js dev server isn't running, and keeps QR payloads short.

## Data Model

```python
# backend/app/models.py
class Part(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str                    # e.g. "M3x10"
    short_description: str        # e.g. "Socket"
    type: str                     # one of TYPES (see types.py)
    custom_image_path: str | None # set only when type == "custom" or user uploaded
    created_at: datetime
    updated_at: datetime
    urls: list["PartURL"] = Relationship(back_populates="part")

class PartURL(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    part_id: int = Field(foreign_key="part.id")
    url: str
    part: Part = Relationship(back_populates="urls")
```

Color is NOT stored on the part — it is derived from the title at render time using `color_rules.py`, per the user's spec.

### `config/label_colors.yaml`

```yaml
# Rules are evaluated top-to-bottom; first matching prefix wins.
# Prefix match is case-sensitive on the title.
rules:
  - prefix: "M4"
    color: "#2e7d32"   # green
  - prefix: "M3"
    color: "#104f97ff"   # blue
  - prefix: "M2.5"
    color: "#ef6c00"   # orange
  - prefix: "M2"
    color: "#c62828"   # red
default: null          # null = no color square drawn
```

`color_rules.py` loads this on startup, re-reads on SIGHUP or on each request in dev. Note M2.5 must be checked before M2 — the loader sorts rules by prefix length descending to make ordering robust regardless of file order.

### `types.py`

Hardcoded canonical list matching [plan.md](plan.md):
`bolt-socket`, `bolt-flat`, `bolt-pan`, `bolt-black-socket`, `bolt-black-flat`, `bolt-black-pan`, `nut`, `locknut`, `inserts`, `inserts-flanged`, `spacer-in-in`, `spacer-in-out`, `pin`, `screw`, `washer`, `custom`.

Mapping: `TYPE_IMAGE[type] = f"pics/{type}.png"`. `custom` has no mapping — requires `custom_image_path`.

## Backend API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/parts` | List all parts (with URLs) |
| GET | `/api/parts/{id}` | Single part |
| POST | `/api/parts` | Create (multipart if custom image) |
| PUT | `/api/parts/{id}` | Update |
| DELETE | `/api/parts/{id}` | Delete |
| POST | `/api/uploads` | Upload custom image → returns path |
| GET | `/api/qr?data=...` | Returns PNG of QR code (uses `qrcode` lib) |
| GET | `/pics/{file}` | Static mount of `pics/` |
| GET | `/uploads/{file}` | Static mount of `uploads/` |
| GET | `/p/{id}` | Public HTML detail page (QR target) |

QR endpoint is generic (takes `data=`) so the frontend can also render QR codes client-side if desired — but server-side keeps things consistent between screen preview and print. The detail page URL embedded in the QR is `{PUBLIC_BASE_URL}/p/{id}`, configured via env var `PUBLIC_BASE_URL`.

## Frontend

### Landing page — [frontend/app/page.tsx](frontend/app/page.tsx)
- Table of all parts (title, description, type, URL count, actions)
- Checkbox per row → selection goes into a client-side store (Zustand or React context)
- "New part" button → `/parts/new`
- "Print selected" button → `/print` (selection carried via store or URL state)

### Part form — `PartForm.tsx`
Used by both create and edit. Fields:
- Title (text)
- Short description (text)
- Type (`TypeCombobox` — typeahead filter over the canonical list)
- URLs (dynamic list, add/remove rows)
- Custom image upload (only meaningful for `custom` type, but allowed as override for any type)

On submit, POSTs to `/api/parts` (multipart if image present) then navigates back to list.

### Label renderer — `Label.tsx`
Renders a single label as **SVG** sized in millimeters (via `viewBox` and outer width/height in `mm`). SVG is chosen over canvas because it scales crisply on print and is trivial to embed multiple times on a paper-sized preview.

Layout inside the 40×20 mm default (all values parameterized so custom sizes work):
- **Outer padding:** 1 mm
- **Top-center title:** baseline ~4 mm from top, font sized to fit width minus corner squares
- **Top corners:** 3×3 mm squares, color from color-rules API (`GET /api/color?title=...`) — null means no square
- **Middle-left image:** 12×12 mm, positioned at y=5 mm
- **Middle-center description:** left edge after image, right edge before QR, word-wrapped, font auto-shrunk to fit
- **Bottom-right QR:** **10×10 mm** at (label_w - 10 - 1, label_h - 10 - 1)

Non-interference is enforced by computing text bounds from the free rectangle `(image_right, title_bottom) → (qr_left, label_bottom)` rather than using fixed positions — that way custom label sizes don't cause overlap.

### Print page — [frontend/app/print/page.tsx](frontend/app/print/page.tsx)
- Inputs: label size (default 40×20 mm), paper size (default A4 = 210×297 mm), margins, gap between labels
- `PaperPreview.tsx` renders a paper-sized SVG and tiles the selected labels across rows/columns, computing how many fit
- "Print" button triggers `window.print()` with a `@media print` CSS rule that shows only the paper SVG at 1:1 scale
- If selection exceeds one sheet, tiles continue on additional pages (CSS `page-break-after`)

### Theme
Global CSS variables: `--color-primary: #1565c0` (blue), `--color-accent: #ef6c00` (orange). Used for buttons, links, table header, print-preview highlights.

## Key files to create

**Backend**
- [backend/app/main.py](backend/app/main.py) — FastAPI, static mounts, router registration
- [backend/app/models.py](backend/app/models.py) — SQLModel tables
- [backend/app/db.py](backend/app/db.py) — engine, `get_session`, startup `create_all`
- [backend/app/routers/parts.py](backend/app/routers/parts.py) — CRUD
- [backend/app/routers/uploads.py](backend/app/routers/uploads.py) — multipart image upload to `uploads/`
- [backend/app/routers/qr.py](backend/app/routers/qr.py) — `qrcode` → PNG StreamingResponse
- [backend/app/routers/detail.py](backend/app/routers/detail.py) — Jinja template HTML at `/p/{id}`
- [backend/app/color_rules.py](backend/app/color_rules.py) — YAML loader + `color_for_title(title)`
- [backend/app/types.py](backend/app/types.py) — canonical types list + image map
- [backend/config/label_colors.yaml](backend/config/label_colors.yaml)
- [backend/pyproject.toml](backend/pyproject.toml) — deps: `fastapi`, `uvicorn`, `sqlmodel`, `qrcode[pil]`, `python-multipart`, `pyyaml`, `jinja2`

**Frontend**
- [frontend/package.json](frontend/package.json) — Next.js 15, React 19, TypeScript, Tailwind
- [frontend/app/layout.tsx](frontend/app/layout.tsx) — theme, nav
- [frontend/app/page.tsx](frontend/app/page.tsx)
- [frontend/app/parts/new/page.tsx](frontend/app/parts/new/page.tsx)
- [frontend/app/parts/[id]/edit/page.tsx](frontend/app/parts/[id]/edit/page.tsx)
- [frontend/app/print/page.tsx](frontend/app/print/page.tsx)
- [frontend/components/Label.tsx](frontend/components/Label.tsx)
- [frontend/components/PaperPreview.tsx](frontend/components/PaperPreview.tsx)
- [frontend/components/PartForm.tsx](frontend/components/PartForm.tsx)
- [frontend/components/TypeCombobox.tsx](frontend/components/TypeCombobox.tsx)
- [frontend/lib/api.ts](frontend/lib/api.ts)

**Project**
- [README.md](README.md) — setup + run instructions
- [.gitignore](.gitignore) — `backend/data/`, `backend/uploads/`, `node_modules/`, `.next/`

## Implementation order

1. **Scaffold repo** — create backend/ and frontend/ skeletons, `.gitignore`, stub README.
2. **Backend core** — SQLModel `Part`/`PartURL`, DB init, parts CRUD router, smoke-test with `curl`.
3. **Type + color rules** — `types.py`, `label_colors.yaml`, `color_rules.py`, `GET /api/color`.
4. **Upload + QR + detail** — upload router, QR router, `/p/{id}` HTML page.
5. **Frontend scaffold** — Next.js app, Tailwind, blue/orange theme, `lib/api.ts`.
6. **Parts UI** — list page, create/edit form, `TypeCombobox`.
7. **Label renderer** — `Label.tsx` SVG with parameterized layout, verify non-interference with extreme inputs.
8. **Print flow** — `PaperPreview.tsx`, print page, `@media print` CSS, `window.print()`.
9. **Seed pics** — drop placeholder PNGs into `backend/pics/` for every type (user replaces later).
10. **End-to-end pass** — create a few parts, print to PDF, verify scale and QR scanning.

## Verification

- **Backend unit check:** `curl -X POST /api/parts` with sample `M3x10 / Socket / bolt-socket` + 2 URLs; `GET /api/parts` returns it; `GET /p/1` renders HTML.
- **Color rules:** `GET /api/color?title=M3x10` → blue, `M2.5x8` → orange (not red — confirms prefix-length sort), `M2x6` → red, `foo` → null.
- **QR:** `GET /api/qr?data=http://localhost:8000/p/1` returns a valid PNG, scans to the detail URL with a phone.
- **Label layout:** render a label with a very long title and long description and verify text does not overlap image or QR at 40×20, 60×30, and 30×15 mm.
- **Print scale:** print a test sheet to PDF, open in a ruler-aware viewer, confirm a 40×20 mm label measures 40×20 mm on paper (this is the most common failure mode — CSS `mm` units must be preserved end-to-end).
- **Full flow:** create 6 parts, select 4, open print page, confirm 4 labels tile on A4 with correct spacing, print to PDF.

## Out of scope for v1

- Authentication (nginx handles it)
- Multi-user / ownership
- Label design customization beyond size
- Bulk import / CSV
- i18n

