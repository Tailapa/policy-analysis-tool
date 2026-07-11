"""Shared two-step (plan queries, then search) research phase, used by both
policy_intelligence.py and policy_governance.py to ground their prompts in
current, specific facts via Serper — see policy_intelligence.py's original
design notes for why this is one-round-only rather than a full agentic tool
loop (combining Gemini's response_schema with tools crashes the SDK's
.text/.parsed derivation, and replaying a function_call for a second round
hits a hard thought_signature requirement that isn't reliably reproducible).
"""

import json
import logging

import httpx

from app.core.config import get_settings
from app.services.web_search import serper_search

logger = logging.getLogger(__name__)

MAX_SEARCH_QUERIES = 3


async def _plan_searches_gemini(prompt: str) -> list[str]:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return []

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        search_tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="web_search",
                    description="Search the live web for current, specific information relevant to "
                    "analyzing this policy.",
                    parameters={
                        "type": "OBJECT",
                        "properties": {"query": {"type": "STRING"}},
                        "required": ["query"],
                    },
                )
            ]
        )
        result = client.models.generate_content(
            model=settings.GEMINI_TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[search_tool]),
        )
        if not result.candidates:
            return []
        parts = result.candidates[0].content.parts or []
        queries: list[str] = []
        for part in parts:
            if not part.function_call:
                continue
            arg = part.function_call.args.get("query")
            if not arg:
                continue
            # Usually one string per function_call part, but the model
            # sometimes bundles several query strings into a single call's
            # arg as a list instead of making separate calls — flatten
            # either shape into individual query strings.
            if isinstance(arg, list):
                queries.extend(str(q) for q in arg if q)
            else:
                queries.append(str(arg))
        return queries[:MAX_SEARCH_QUERIES]
    except Exception:
        logger.exception("Gemini search-planning call failed")
        return []


async def _plan_searches_openrouter(prompt: str) -> list[str]:
    settings = get_settings()
    if not settings.OPENROUTER_API_KEY:
        return []

    tools = [
        {
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Search the live web for current, specific information relevant to "
                "analyzing this policy.",
                "parameters": {
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"],
                },
            },
        }
    ]

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "tools": tools,
                    "tool_choice": "auto",
                },
            )
            response.raise_for_status()
            data = response.json()

        tool_calls = data["choices"][0]["message"].get("tool_calls") or []
        queries: list[str] = []
        for call in tool_calls[:MAX_SEARCH_QUERIES]:
            args = json.loads(call["function"]["arguments"])
            arg = args.get("query")
            if not arg:
                continue
            if isinstance(arg, list):
                queries.extend(str(q) for q in arg if q)
            else:
                queries.append(str(arg))
        return queries[:MAX_SEARCH_QUERIES]
    except Exception:
        logger.exception("OpenRouter search-planning call failed")
        return []


async def run_research_phase(planning_prompt: str) -> list[dict]:
    """Returns [{"query": str, "results": [{"title", "url", "snippet"}, ...]}, ...].
    No-ops to [] if SERPER_API_KEY is unset — the whole research step is an
    optional enhancement, never a hard dependency of generation. Callers
    build `planning_prompt` themselves (see build_research_planning_prompt /
    build_governance_research_planning_prompt) since what belongs in it
    varies per framework."""
    settings = get_settings()
    if not settings.SERPER_API_KEY:
        return []

    if settings.INTELLIGENCE_PROVIDER == "openrouter":
        queries = await _plan_searches_openrouter(planning_prompt)
    else:
        queries = await _plan_searches_gemini(planning_prompt)

    records = []
    for query in queries:
        results = await serper_search(query)
        if results:
            records.append({"query": query, "results": results})
    return records


def format_research_context(records: list[dict]) -> str:
    if not records:
        return ""
    lines = ["WEB RESEARCH FINDINGS (ground specific names, figures, and current facts in these):"]
    for record in records:
        lines.append(f'\nSearch: "{record["query"]}"')
        for result in record["results"]:
            lines.append(f"- {result['title']}: {result['snippet']} ({result['url']})")
    return "\n".join(lines)
