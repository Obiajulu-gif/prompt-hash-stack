from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from prompthash_api.clients.asi_client import build_openai_client
from prompthash_api.schemas.improver import HealthResponse, ImproveRequest, ImproveResponse
from prompthash_api.services.prompt_improver_service import PromptImproverService

router = APIRouter(tags=["improver"])

improver_service = PromptImproverService(client=build_openai_client(require_api_key=True))


@router.post("/improve", response_model=ImproveResponse)
async def improve_endpoint(request: ImproveRequest) -> ImproveResponse:
    """Improve prompts via REST."""
    return await improver_service.improve_prompt(request)


@router.get("/improver/health/raw", response_model=HealthResponse)
async def health_raw() -> HealthResponse:
    """Raw health payload for API clients."""
    return await improver_service.health()


@router.get("/improver/health")
async def health_proxy():
    """
    UI-friendly health that mirrors the old Flask proxy shape:
    {"ok": True, "agent": {...}} or {"ok": False, "error": "..."}.
    """
    try:
        health = await improver_service.health()
        return {"ok": True, "agent": health.dict()}
    except Exception as exc:  # pragma: no cover
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"ok": False, "error": str(exc)},
        )
