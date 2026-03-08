from typing import Dict, List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    sender: Optional[str] = None
    message: Optional[str] = ""
    model: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    sender: str
    total_messages: int
    history: List[Dict[str, str]]
    model: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    agent_name: str
    total_messages: int
