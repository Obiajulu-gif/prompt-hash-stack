from functools import lru_cache
from typing import Optional

from openai import OpenAI

from prompthash_api.core.config import get_settings


@lru_cache
def build_openai_client(require_api_key: bool = False) -> Optional[OpenAI]:
    """
    Build an OpenAI client against the ASI endpoint.

    The chat and prompt improver flows require an API key and will raise to
    mirror the original module-level guard. The model listing flow tolerates
    missing keys and returns None so the route can surface a helpful error.
    """
    settings = get_settings()
    api_key = settings.asi_cloud_api_key
    if require_api_key and not api_key:
        raise RuntimeError("Missing ASICLOUD API key. Please set ASICLOUD_API_KEY in your environment.")

    if not api_key:
        return None

    return OpenAI(api_key=api_key, base_url=settings.asi_base_url)

