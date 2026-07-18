import json
from functools import lru_cache
from pathlib import Path

SOURCE_URLS_PATH = Path(__file__).resolve().parent.parent / "data" / "source_urls.json"


@lru_cache
def _load_source_urls() -> dict[str, str]:
    return json.loads(SOURCE_URLS_PATH.read_text(encoding="utf-8"))


def resolve_sources(raw_label: str) -> list[dict]:
    """The source PDFs only ever give a bare org name/abbreviation (e.g.
    'Source: IFSCA, PIB') — never a URL. Split multi-source citations on
    comma and look each one up against a curated org->homepage lookup
    (same pattern as ministries_seed.json). No match
    means url stays None — we don't fabricate links for orgs we don't know,
    consistent with the deterministic/no-LLM approach used elsewhere."""
    urls = _load_source_urls()
    labels = [part.strip() for part in raw_label.split(",") if part.strip()]
    if not labels:
        return [{"label": raw_label.strip(), "url": urls.get(raw_label.strip())}]
    return [{"label": label, "url": urls.get(label)} for label in labels]
