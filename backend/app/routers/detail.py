from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlmodel import Session

from app.db import get_session
from app.models import Part

router = APIRouter(tags=["detail"])


@router.get("/p/{part_id}", response_class=HTMLResponse)
def part_detail(part_id: int, request: Request, session: Session = Depends(get_session)):
    part = session.get(Part, part_id)
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    urls_html = "".join(
        f'<li><a href="{u.url}" target="_blank" rel="noopener">{u.url}</a></li>'
        for u in part.urls
    )
    urls_section = f"<ul>{urls_html}</ul>" if part.urls else "<p>No sourcing URLs.</p>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{part.title}</title>
<style>
  body {{ font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; color: #111; }}
  h1 {{ color: #1565c0; }}
  .type {{ color: #ef6c00; font-weight: bold; }}
  a {{ color: #1565c0; }}
</style>
</head>
<body>
<h1>{part.title}</h1>
<p>{part.short_description}</p>
<p>Type: <span class="type">{part.type}</span></p>
<h2>Sourcing</h2>
{urls_section}
</body>
</html>"""
    return HTMLResponse(content=html)
