import asyncio
from typing import Dict, List, Optional

from openai import OpenAI

from prompthash_api.core.config import get_settings
from prompthash_api.core.state import ChatState
from prompthash_api.schemas.chat import ChatRequest, ChatResponse, HealthResponse


class ChatService:
    """
    Handles chat interactions against the ASI-backed OpenAI endpoint.

    Logic mirrors the original uAgent REST handlers, including history
    management, model resolution, and formatted assistant outputs.
    """

    def __init__(self, client: OpenAI, state: Optional[ChatState] = None) -> None:
        if client is None:
            raise RuntimeError("Missing ASICLOUD API key. Please set ASICLOUD_API_KEY in your environment.")
        self.client = client
        self.state = state or ChatState()
        self.settings = get_settings()

    def _build_messages(self, history: List[Dict[str, str]], user_text: str) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = [{"role": "system", "content": self.settings.system_prompt}]

        for item in history[-5:]:
            messages.append({"role": item["role"], "content": item["text"]})

        messages.append({"role": "user", "content": user_text})
        return messages

    @staticmethod
    def _format_assistant_output(raw_text: str) -> str:
        if "<think>" in raw_text and "</think>" in raw_text:
            try:
                start = raw_text.find("<think>") + len("<think>")
                end = raw_text.find("</think>")
                think_block = raw_text[start:end].strip()
                remainder = raw_text[end + len("</think>") :].strip()
                readable_remainder = remainder if remainder else "No response provided."
                return f"Think Process:\n{think_block}\n\nResponse:\n{readable_remainder}"
            except Exception:
                return raw_text
        return raw_text

    def _resolve_model(self, requested: Optional[str]) -> str:
        requested_model = (requested or "").strip()
        if requested_model:
            return requested_model
        return self.settings.chat_model

    async def _generate_response(self, history: List[Dict[str, str]], user_text: str, model: str) -> str:
        messages = self._build_messages(history, user_text)

        def _call() -> str:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                **self.settings.chat_generation_config,
            )
            return response.choices[0].message.content.strip()

        return await asyncio.to_thread(_call)

    async def chat(self, request: ChatRequest) -> ChatResponse:
        sender_id = request.sender or "rest_client"
        user_text = (request.message or "").strip()
        model_to_use = self._resolve_model(request.model)

        history = await self.state.get_history(sender_id)
        total = await self.state.total_messages()

        if not user_text:
            return ChatResponse(
                reply="",
                sender=sender_id,
                total_messages=total,
                history=history,
                model=model_to_use,
                error="Please provide a message.",
            )

        try:
            response_text = await self._generate_response(history, user_text, model_to_use)
            formatted = self._format_assistant_output(response_text)
            history, total = await self.state.record_exchange(sender_id, user_text, formatted)

            return ChatResponse(
                reply=formatted,
                sender=sender_id,
                total_messages=total,
                history=history,
                model=model_to_use,
            )
        except Exception:
            # Align with the prior behavior that returned a generic error message.
            return ChatResponse(
                reply="",
                sender=sender_id,
                total_messages=total,
                history=history,
                model=model_to_use,
                error="I hit an error while generating a response.",
            )

    async def health(self) -> HealthResponse:
        total = await self.state.total_messages()
        return HealthResponse(status="ok", agent_name=self.settings.chat_agent_name, total_messages=total)

