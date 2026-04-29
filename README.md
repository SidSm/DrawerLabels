# DrawerLabels

Print QR-coded labels for drawer organizers (bolts, nuts, spacers, connectors, etc.). Parts live in a SQLite DB; labels render to A4 with duplex layout (front: title + icon, back: QR code linking to part page).

## Stack

- **Backend**: FastAPI + SQLModel + SQLite (Python 3.11+)
- **Frontend**: Next.js 15 (App Router, TypeScript, Tailwind)
- **Reverse proxy**: Caddy with on-demand TLS (LAN HTTPS for phone QR scanning)
- **Container**: Docker Compose, three services

## Quick start (Docker)

```bash
docker compose up -d --build
```

Services:
- Caddy on `https://<host>:8443` (self-signed; phones must trust on first visit)
- Backend internal at `http://backend:8000`
- Frontend internal at `http://frontend:3000`

DB lives in `backend/data/drawerlabels.db` (bind-mounted, persists across rebuilds).

## Local dev (no Docker)

Backend:
```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
BACKEND_URL=http://localhost:8000 npm run dev
```

Open http://localhost:3000.

## Scripts

All run from `backend/` with the venv active (or via `docker compose exec backend python scripts/<name>.py`).

### `seed_parts.py` — bulk seed bolts/nuts/locknuts

Driven by `backend/config/seed_parts.yaml`. Generates titles like `M3x12` for every (thread, length, finish) combo. Idempotent on `(title, type)`.

```bash
python scripts/seed_parts.py
```

### `import_csv.py` — import URLs from spreadsheet

Reads `BoltNutScrewTypesList - screws.csv` at the repo root. Adds purchase-link URLs to existing parts; creates the part if missing. Scope: socket/flat/pan bolts (+ black variants), nuts, lock nuts, spacers.

```bash
python scripts/import_csv.py [--verbose]
```

### `seed_unused_pics.py` — stub parts for unused icon types

Scans `app.types.TYPES` and inserts one stub `Part` per type that has no row yet. Title and short description default to a humanized version of the slug; edit them in the UI afterwards.

```bash
python scripts/seed_unused_pics.py [--dry-run]
```

## Adding new icons

1. Drop the image into `backend/pics/<slug>.png` (or `.jpg`/`.webp`). Slug must be lowercase, hyphen-separated.
2. Add the slug to the `TYPES` list in [backend/app/types.py](backend/app/types.py).
3. (Optional) `python scripts/seed_unused_pics.py` to create a placeholder part.

## Print workflow

1. Tick parts in the table on `/`, click **Print selected** → opens `/print?ids=...`.
2. Adjust paper/label/margin/gap fields to match your sticker sheet.
3. Pick a **Printer preset** (or save your own) to compensate for vertical drift.
4. Pick **Duplex flip** (long edge = book / short edge = tablet) to match your printer.
5. **Print** → browser print dialog. Front page = titles, back page = QR codes.

### Printer presets

Store per-printer Y offsets for description text and QR code. Saved in `localStorage` under `drawerlabels.printerPresets`. Built-in: `EPSON F4F` (descYOffset −2.5 mm, qrYOffset −0.5 mm). Use the **Save** / **Delete** buttons next to the name field.

## macOS auto-start

```bash
./install-macos.sh           # install LaunchAgent + add Docker.app to Login Items
./install-macos.sh --uninstall
```

The LaunchAgent fires at login, waits for the Docker daemon, then runs `docker compose up -d`. For full power-button → app-running behavior, also enable auto-login in System Settings (see the script's printed instructions).

## LAN HTTPS / phone scanning

Caddy listens on `:8443` with on-demand self-signed certs (issued for whatever hostname the client uses). The first time a phone hits `https://<host>:8443`, accept the cert warning. After that, scanning a QR code on a printed label opens the part page.

To pick up `BACKEND_URL` rewrites in the frontend, the URL must be set at **build time** — already wired through compose's `args:` for the frontend service.

## Layout

```
backend/
  app/            FastAPI app (main, models, routers, schemas, types)
  config/         seed_parts.yaml
  data/           drawerlabels.db (now tracked)
  pics/           type icons (PNG)
  scripts/        seed/import/utility scripts
  uploads/        custom-image uploads (gitignored)
frontend/
  app/            Next.js routes (/, /print, /scan)
  components/     Label, PaperPreview, PartForm, PartsTable
  lib/api.ts      typed backend client
scripts/
  start-docker-stack.sh   launchd helper
Caddyfile
compose.yaml
install-macos.sh
BoltNutScrewTypesList - screws.csv
```
