import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from openai import OpenAI
from uagents import Agent, Context, Model

load_dotenv()


class ModelsResponse(Model):
    models: List[str]
    model_details: Dict[str, Dict[str, Any]]
    categories: Dict[str, List[str]]
    error: Optional[str] = None


class HealthResponse(Model):
    status: str
    agent_name: str
    total_requests: int


agent = Agent(
    name="prompthash_model_agent",
    seed="prompthash_model_agent_seed_phrase",
    port=int(os.getenv("MODEL_AGENT_PORT", "8012")),
    mailbox=True,
)

ASI_CLOUD_API_KEY = os.getenv("ASICLOUD_API_KEY")
ASI_BASE_URL = os.getenv("ASICLOUD_BASE_URL", "https://inference.asicloud.cudos.org/v1")

client: Optional[OpenAI] = None
if ASI_CLOUD_API_KEY:
    client = OpenAI(api_key=ASI_CLOUD_API_KEY, base_url=ASI_BASE_URL)


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


@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.storage.set("total_requests", 0)
    ctx.logger.info(f"Model list agent started at {agent.address}")


@agent.on_event("shutdown")
async def shutdown(ctx: Context):
    ctx.logger.info("Shutting down model list agent")


@agent.on_rest_get("/models", ModelsResponse)
async def get_models(ctx: Context) -> ModelsResponse:
    total = ctx.storage.get("total_requests") or 0
    if not client:
        ctx.logger.error("ASICLOUD_API_KEY is not set; cannot list ASI models")
        return ModelsResponse(
            models=[],
            model_details={},
            categories={},
            error="ASICLOUD_API_KEY is not set; cannot list ASI models.",
        )
    try:
        models = list(client.models.list())
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

        categories = _categorize_models(model_names, model_details)
        ctx.storage.set("total_requests", total + 1)
        return ModelsResponse(models=model_names, model_details=model_details, categories=categories)
    except Exception as exc:
        ctx.logger.error(f"Error retrieving models: {exc}")
        return ModelsResponse(models=[], model_details={}, categories={}, error="Error retrieving models from ASI")


@agent.on_rest_get("/health", HealthResponse)
async def health(ctx: Context) -> HealthResponse:
    total = ctx.storage.get("total_requests") or 0
    return HealthResponse(status="ok", agent_name=agent.name, total_requests=total)


if __name__ == "__main__":
    agent.run()
