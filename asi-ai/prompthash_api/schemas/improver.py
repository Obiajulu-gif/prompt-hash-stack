from typing import Optional

from pydantic import BaseModel


class ImproveRequest(BaseModel):
    prompt: Optional[str] = ""
    target: Optional[str] = None


class ImproveResponse(BaseModel):
    response: str
    target: str
    model: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    agent_name: str
    total_requests: int
