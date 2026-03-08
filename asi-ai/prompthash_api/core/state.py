import asyncio
from typing import Dict, List, Tuple


class ChatState:
    """In-memory state for chat interactions."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._conversations: Dict[str, List[Dict[str, str]]] = {}
        self._total_messages = 0

    async def get_history(self, sender: str) -> List[Dict[str, str]]:
        async with self._lock:
            # Return a shallow copy to avoid accidental mutation.
            return list(self._conversations.get(sender, []))

    async def record_exchange(self, sender: str, user_text: str, assistant_text: str) -> Tuple[List[Dict[str, str]], int]:
        async with self._lock:
            history = self._conversations.get(sender, [])
            history.append({"role": "user", "text": user_text})
            history.append({"role": "assistant", "text": assistant_text})
            # Limit to the last 10 items to mirror the previous agent behavior.
            history = history[-10:]
            self._conversations[sender] = history
            self._total_messages += 1
            return list(history), self._total_messages

    async def total_messages(self) -> int:
        async with self._lock:
            return self._total_messages


class ImproverState:
    """Tracks usage counts for the prompt improver."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._total_requests = 0

    async def increment(self) -> int:
        async with self._lock:
            self._total_requests += 1
            return self._total_requests

    async def total_requests(self) -> int:
        async with self._lock:
            return self._total_requests


class ModelState:
    """Tracks usage counts for model listing."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._total_requests = 0

    async def increment(self) -> int:
        async with self._lock:
            self._total_requests += 1
            return self._total_requests

    async def total_requests(self) -> int:
        async with self._lock:
            return self._total_requests

