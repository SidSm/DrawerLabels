# DrawerLabels — Project Plan

## Overview

A simple web application for generating printable labels for small workshop drawers. Each label identifies a part with a title, short description, type, color indicator, and a QR code linking to a detail page that lists sourcing URLs.

## Stack

- **Backend:** FastAPI
- **Frontend:** Next.js
- **Database:** SQLite
- **Auth:** None in-app (handled by nginx, or optional simple password)

## Data Model

A **Part** has:
- `title` — e.g. `M3x10`
- `short_description` — e.g. `Socket`
- `type` — one of the predefined types (see below)
- `image` — either derived from `type` (mapped from `pics/` folder) or a custom upload
- `urls` — list of sourcing URLs (one or more)

### Part Types

Images for each type live in the `pics/` folder and are mapped by type name.

- `bolt-socket`
- `bolt-flat`
- `bolt-pan`
- `bolt-black-socket`
- `bolt-black-flat`
- `bolt-black-pan`
- `nut`
- `locknut`
- `inserts` (threaded)
- `inserts-flanged`
- `spacer-in-in`
- `spacer-in-out`
- `pin`
- `screw`
- `washer`
- `custom` — user uploads their own image

### Examples

| Title | Description | Type | URLs |
|---|---|---|---|
| M3x10 | Socket | `bolt-socket` | amazon.com/dp/B000000000, ebay.com/itm/1234567890 |
| M3 | washer plastic | `washer` | amazon.com/dp/B000ddd000000, ebay.com/itm/123456ddd7890 |

## Features

### Parts Management
- Landing page lists all existing parts
- Create / edit / delete parts
- Create form fields: title, description, type, color, URLs (multiple), optional custom image
- Type selector is a dropdown with type-ahead autocomplete

### Label Design
- Default size: **40 mm × 20 mm** (configurable in UI)
- Layout:
  - **Top-center:** part title
  - **Top corners:** colored squares (part color) - based on the config varible (anything title starting M4: green, M3: blue, M2.5: orange, M2: red, else transparent/no color)
  - **Middle-left:** part image (thumbnail, from type mapping or custom upload)
  - **Middle-center:** short description
  - **Bottom-right:** QR code linking to the part's detail page
- QR codes are generated on demand when the user prints
- QR code size: **10 mm × 10 mm**
- Layout elemnets dont interfere with each other 

### Part Detail Page
- Target of the QR code
- Displays all part info and sourcing URLs

### Print Workflow
- User selects parts to print from the parts list
- Selected labels populate a canvas preview
- User chooses target paper size (default **A4**)
- Visual preview shows how labels will be laid out on the chosen paper
- Print from the browser

## Open Questions / Decisions

- Auth approach: nginx basic-auth vs. in-app simple password — TBD
- Custom image storage location and naming
- Whether label size is per-print or a global setting


## App design
Use Blue and Orange colors for the UI.