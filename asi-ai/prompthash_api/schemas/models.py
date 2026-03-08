from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ModelsResponse(BaseModel):
    models: List[str]
    model_details: Dict[str, Dict[str, Any]]
    categories: Dict[str, List[str]]
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    agent_name: str
    total_requests: int

