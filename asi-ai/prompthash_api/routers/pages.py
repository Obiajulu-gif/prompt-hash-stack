from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from prompthash_api.core.config import get_settings

router = APIRouter(tags=["ui"])

# Reuse the existing template so the HTML interface remains unchanged.
templates = Jinja2Templates(directory=str(Path(__file__).resolve().parent.parent.parent / "templates"))


@router.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    settings = get_settings()
    return templates.TemplateResponse(
        "asi_chat.html",
        {
            "request": request,
            "agent_api": settings.frontend_agent_api,
            "improver_api": settings.frontend_improver_api,
            "models_api": settings.frontend_models_api,
        },
    )

