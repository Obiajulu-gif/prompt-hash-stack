from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from prompthash_api.clients.asi_client import build_openai_client
from prompthash_api.schemas.chat import ChatRequest, ChatResponse, HealthResponse
from prompthash_api.services.chat_service import ChatService

router = APIRouter(tags=["chat"])

# Instantiate service once so in-memory state mirrors prior agent storage.
chat_service = ChatService(client=build_openai_client(require_api_key=True))


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """Handle chat messages via REST."""
    return await chat_service.chat(request)


@router.get("/health/raw", response_model=HealthResponse)
async def health_raw() -> HealthResponse:
    """Raw health payload for API clients."""
    return await chat_service.health()


@router.get("/health")
async def health_proxy():
    """
    UI-friendly health that mirrors the old Flask proxy shape:
    {"ok": True, "agent": {...}} or {"ok": False, "error": "..."}.
    """
    try:
        health = await chat_service.health()
        return {"ok": True, "agent": health.dict()}
    except Exception as exc:  # pragma: no cover - defensive parity with prior proxy
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"ok": False, "error": str(exc)},
        )
