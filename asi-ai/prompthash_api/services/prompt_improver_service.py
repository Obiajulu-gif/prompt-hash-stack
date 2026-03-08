import asyncio
from typing import Optional, Tuple

from openai import OpenAI

from prompthash_api.core.config import get_settings
from prompthash_api.core.state import ImproverState
from prompthash_api.schemas.improver import HealthResponse, ImproveRequest, ImproveResponse


class PromptImproverService:
    """Improves prompts while preserving the original uAgent REST semantics."""

    def __init__(self, client: OpenAI, state: Optional[ImproverState] = None) -> None:
        if client is None:
            raise RuntimeError("Missing ASICLOUD API key. Please set ASICLOUD_API_KEY in your environment.")
        self.client = client
        self.state = state or ImproverState()
        self.settings = get_settings()

    @staticmethod
    def _normalize_target(target: Optional[str]) -> str:
        value = (target or "text").strip().lower()
        return "image" if value == "image" else "text"

    def _build_improvement_prompt(self, prompt: str, target: str) -> str:
        target_section = (
            "Target: IMAGE prompt. Optimize for image models (describe visuals with concrete nouns/adjectives; fold style, lighting, camera, aspect ratio inline; avoid new headings).\n"
            if target == "image"
            else "Target: TEXT prompt. Optimize for clarity, structure, and implementable instructions without adding new headings.\n"
        )

        return (
            f"{target_section}"
            "Improve the following prompt according to the instructions.\n\n"
            "USER PROMPT:\n"
            f"{prompt}\n\n"
            "Return ONLY the improved prompt, nothing else."
        )

    def _improve(self, prompt: str, target: str) -> Tuple[str, str]:
        normalized_target = self._normalize_target(target)
        messages = [
            {"role": "system", "content": self.settings.improver_system_prompt},
            {"role": "user", "content": self._build_improvement_prompt(prompt, normalized_target)},
        ]

        response = self.client.chat.completions.create(
            model=self.settings.improver_model,
            messages=messages,
            **self.settings.improver_generation_config,
        )
        content = response.choices[0].message.content.strip()
        return content, normalized_target

    async def improve_prompt(self, request: ImproveRequest) -> ImproveResponse:
        user_prompt = (request.prompt or "").strip()
        target = request.target or "text"

        if not user_prompt:
            return ImproveResponse(
                response="",
                target=self._normalize_target(target),
                model=self.settings.improver_model,
                error="Please provide a prompt to improve.",
            )

        try:
            # Run the blocking OpenAI call in a thread to keep the event loop responsive.
            content, normalized_target = await asyncio.to_thread(self._improve, user_prompt, target)
            await self.state.increment()
            return ImproveResponse(
                response=content,
                target=normalized_target,
                model=self.settings.improver_model,
            )
        except Exception:
            return ImproveResponse(
                response="",
                target=self._normalize_target(target),
                model=self.settings.improver_model,
                error="Failed to improve prompt. Please try again.",
            )

    async def health(self) -> HealthResponse:
        total = await self.state.total_requests()
        return HealthResponse(status="ok", agent_name=self.settings.improver_agent_name, total_requests=total)
