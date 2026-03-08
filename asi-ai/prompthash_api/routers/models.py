from fastapi import APIRouter

from prompthash_api.clients.asi_client import build_openai_client
from prompthash_api.schemas.models import HealthResponse, ModelsResponse
from prompthash_api.services.model_list_service import ModelListService

router = APIRouter(tags=["models"])

model_service = ModelListService(client=build_openai_client())


@router.get("/models", response_model=ModelsResponse)
async def models_endpoint() -> ModelsResponse:
    """List available ASI models."""
    return await model_service.list_models()


@router.get("/models/health", response_model=HealthResponse)
async def health_endpoint() -> HealthResponse:
    """Health check aligned with the model agent."""
    return await model_service.health()

