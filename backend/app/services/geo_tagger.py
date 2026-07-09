import json
import re
from functools import lru_cache
from pathlib import Path

GAZETTEER_PATH = Path(__file__).resolve().parent.parent / "data" / "state_gazetteer.json"


@lru_cache
def _load_gazetteer() -> dict:
    return json.loads(GAZETTEER_PATH.read_text(encoding="utf-8"))


def tag_geography(text: str) -> tuple[str, list[str], list[str]]:
    """Scan text against the state gazetteer (state/UT names, aliases, curated
    city->state list). A match tags scope='state' with the matched state(s);
    no match means 'national', full stop — no confidence scoring, no inference
    beyond an explicit gazetteer match (backend-spec.md §5 step 4).

    Returns (scope, states, matched_terms).
    """
    gazetteer = _load_gazetteer()
    matched_states: list[str] = []
    matched_terms: list[str] = []

    for state in gazetteer["states"]:
        candidates = [state["name"], *state.get("aliases", [])]
        for term in candidates:
            # Short abbreviations (UP, MP, AP, HP...) collide with common
            # English words when matched case-insensitively ("scaling up",
            # "horsepower rating") — require exact case for those, but keep
            # full names/aliases case-insensitive.
            flags = 0 if len(term) <= 3 else re.IGNORECASE
            if re.search(rf"\b{re.escape(term)}\b", text, flags):
                if state["name"] not in matched_states:
                    matched_states.append(state["name"])
                matched_terms.append(term)
                break

    for city, state_name in gazetteer["city_to_state"].items():
        if re.search(rf"\b{re.escape(city)}\b", text, re.IGNORECASE):
            if state_name not in matched_states:
                matched_states.append(state_name)
            matched_terms.append(city)

    if matched_states:
        return "state", matched_states, matched_terms
    return "national", [], []


def parse_geography_string(raw: str) -> tuple[str, list[str]]:
    """Parse the frontend's manual-entry geography string ('national' or
    'state: X' / 'state:X') into (scope, states) for the supplementary
    manual item-create endpoint."""
    raw = raw.strip()
    if raw.lower().startswith("state"):
        state_name = raw.split(":", 1)[1].strip() if ":" in raw else ""
        return "state", [state_name] if state_name else []
    return "national", []
