import asyncio
from typing import Any, Dict, List, Optional

from openai import OpenAI

from prompthash_api.core.config import get_settings
from prompthash_api.core.state import ModelState
from prompthash_api.schemas.models import HealthResponse, ModelsResponse


class ModelListService:
    """Lists ASI models and categorizes them."""

    def __init__(self, client: Optional[OpenAI], state: Optional[ModelState] = None) -> None:
        self.client = client
        self.state = state or ModelState()
        self.settings = get_settings()

    @staticmethod
    def _categorize_models(model_names: List[str], model_details: Dict[str, Dict[str, Any]]) -> Dict[str, List[str]]:
        audio_keywords = ["audio", "tts", "native-audio", "live"]
        image_keywords = ["image", "vision", "img", "photo"]
        video_keywords = ["video", "vid", "veo"]

        categories: Dict[str, List[str]] = {"text": [], "audio": [], "image": [], "video": []}
        for name in model_names:
            details = model_details.get(name, {})
            disp = (details.get("display_name") or "").lower()
            lname = name.lower()

            is_audio = any(k in lname or k in disp for k in audio_keywords)
            is_image = any(k in lname or k in disp for k in image_keywords)
            is_video = any(k in lname or k in disp for k in video_keywords)

            if is_video:
                categories["video"].append(name)
            elif is_image:
                categories["image"].append(name)
            elif is_audio:
                categories["audio"].append(name)
            else:
                categories["text"].append(name)
        return categories

    def _list_from_client(self) -> List[Any]:
        return list(self.client.models.list())

    async def list_models(self) -> ModelsResponse:
        if not self.client:
            return ModelsResponse(
                models=[],
                model_details={},
                categories={},
                error="ASICLOUD_API_KEY is not set; cannot list ASI models.",
            )
        try:
            models = await asyncio.to_thread(self._list_from_client)
            model_names: List[str] = []
            model_details: Dict[str, Dict[str, Any]] = {}
            for item in models:
                name = getattr(item, "id", None) or getattr(item, "name", None)
                if not name:
                    continue
                model_names.append(name)
                model_details[name] = {
                    "name": name,
                    "display_name": getattr(item, "display_name", None) or getattr(item, "displayName", None),
                    "description": getattr(item, "description", None),
                }

            if not model_names:
                raise RuntimeError("No models returned from ASI Cloud")

            categories = self._categorize_models(model_names, model_details)
            await self.state.increment()
            return ModelsResponse(models=model_names, model_details=model_details, categories=categories)
        except Exception:
            return ModelsResponse(models=[], model_details={}, categories={}, error="Error retrieving models from ASI")

    async def health(self) -> HealthResponse:
        total = await self.state.total_requests()
        return HealthResponse(status="ok", agent_name=self.settings.model_agent_name, total_requests=total)
