"""Provider-agnostic structured-output generation, shared by
policy_intelligence.py and policy_governance.py. Extracted so the two
frameworks' generation services don't each carry their own copy of the
empirically-validated Gemini/OpenRouter SDK workarounds.
"""

import json
import logging
from typing import TypeVar

import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def dereferenced_schema(model_cls: type[BaseModel]) -> dict:
    """google-genai==0.3.0's response_schema conversion (t_schema in
    _transformers.py) forwards Pydantic's model_json_schema() straight into
    types.Schema.model_validate() without resolving $ref/$defs — but Gemini's
    schema format has no $ref support, so any nested BaseModel fails
    validation. Pre-resolve refs into a flat dict ourselves and pass that
    (t_schema passes dicts through untouched), replicating the
    title-stripping/type-uppercasing that process_schema() would normally do
    for the Pydantic-model code path."""
    schema = model_cls.model_json_schema()
    defs = schema.get("$defs", {})

    def resolve(node):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_name = node["$ref"].split("/")[-1]
                return resolve(dict(defs[ref_name]))
            out = {}
            for key, value in node.items():
                if key in ("title", "$defs"):
                    continue
                if key == "type" and isinstance(value, str):
                    out[key] = value.upper()
                else:
                    out[key] = resolve(value)
            return out
        if isinstance(node, list):
            return [resolve(item) for item in node]
        return node

    return resolve(schema)


async def _generate_via_gemini(prompt: str, model_cls: type[T]) -> T | None:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.generate_content(
            model=settings.GEMINI_TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=dereferenced_schema(model_cls),
            ),
        )
        if result.parsed is None:
            return None
        # response_schema is a plain dict here (see dereferenced_schema), so
        # the SDK's .parsed is a raw dict (json.loads), not an instance —
        # validate it into the target model ourselves.
        return model_cls.model_validate(result.parsed)
    except Exception:
        logger.exception("Gemini structured generation call failed for %s", model_cls.__name__)
        return None


async def _generate_via_openrouter(prompt: str, model_cls: type[T]) -> T | None:
    """OpenAI-compatible chat completions call, routed through OpenRouter to
    whichever model is configured (OPENROUTER_MODEL) — works with any model
    OpenRouter hosts, not just ones with native structured-output support.
    Uses the broadly-supported json_object response format plus an inlined
    JSON Schema instruction, then validates the result server-side (same
    fallback path as Gemini's dict-schema branch above) rather than relying
    on a specific model's strict schema enforcement."""
    settings = get_settings()
    if not settings.OPENROUTER_API_KEY:
        return None

    schema_json = json.dumps(model_cls.model_json_schema())
    full_prompt = (
        f"{prompt}\n\nRespond with ONLY a single JSON object (no markdown fences, no commentary) "
        f"that validates against this JSON Schema:\n{schema_json}"
    )

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [{"role": "user", "content": full_prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        return model_cls.model_validate(json.loads(content))
    except Exception:
        logger.exception("OpenRouter structured generation call failed for %s", model_cls.__name__)
        return None


async def generate_structured(prompt: str, model_cls: type[T]) -> T | None:
    settings = get_settings()
    if settings.INTELLIGENCE_PROVIDER == "openrouter":
        return await _generate_via_openrouter(prompt, model_cls)
    return await _generate_via_gemini(prompt, model_cls)


def active_model_name() -> str:
    settings = get_settings()
    if settings.INTELLIGENCE_PROVIDER == "openrouter":
        return f"openrouter:{settings.OPENROUTER_MODEL}"
    return f"gemini:{settings.GEMINI_TEXT_MODEL}"
