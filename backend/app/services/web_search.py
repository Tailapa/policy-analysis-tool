import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SERPER_URL = "https://google.serper.dev/search"


async def serper_search(query: str, num: int = 5) -> list[dict]:
    """Best-effort web search via Serper.dev. Returns [] on a missing key or
    any failure — search grounding is an enhancement to intelligence
    generation, never a hard dependency of it."""
    settings = get_settings()
    if not settings.SERPER_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                SERPER_URL,
                headers={
                    "X-API-KEY": settings.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                json={"q": query, "num": num},
            )
            response.raise_for_status()
            data = response.json()

        return [
            {
                "title": result.get("title", ""),
                "url": result.get("link", ""),
                "snippet": result.get("snippet", ""),
            }
            for result in data.get("organic", [])[:num]
        ]
    except Exception:
        logger.exception("Serper search failed for query: %s", query)
        return []
