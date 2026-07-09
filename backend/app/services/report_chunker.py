import re
from dataclasses import dataclass

PILLAR_HEADERS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bI\.\s+Economic Growth", re.IGNORECASE), "Economic Growth"),
    (re.compile(r"\bII\.\s+Infrastructure", re.IGNORECASE), "Infrastructure"),
    (re.compile(r"\bIII\.\s+Human Development", re.IGNORECASE), "Human Development"),
    (re.compile(r"\bIV\.\s+National Security", re.IGNORECASE), "National Security"),
    (re.compile(r"\bV\.\s+Rural", re.IGNORECASE), "Rural & Agri"),
    (re.compile(r"Annexure[^\n]{0,15}Miscellaneous", re.IGNORECASE), "Misc"),
]

SUBTYPE_HEADERS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bA\.\s+Policy Updates", re.IGNORECASE), "Policy Update"),
    (re.compile(r"\bB\.\s+Announcements", re.IGNORECASE), "Announcement"),
]

ITEM_MARKER_RE = re.compile(r"(?:\n|\A)[ \t]*(\d{1,2})\.[ \t]+")
MIN_DESCRIPTION_GAP = 40

ANCHOR_RE = re.compile(
    r"Status:\s*(?P<status>Initiated|Completed|Announced|Ongoing)"
    r"(?:\s*\|\s*Impact(?:\s*Level)?:\s*(?P<impact>High|Medium|Low))?"
    r"\s*\|\s*Source:\s*(?P<source1>[^\n]+)"
    r"|"
    r"(?:^|\n)[ \t]*Source:\s*(?P<source2>[^\n]+)",
    re.IGNORECASE,
)
# The two sample issues turn out not to follow a single fixed anchor shape:
# some "B. Announcements" items carry only a bare "Source: X" line (no
# Status/Impact assessment at all — a real editorial distinction, not a
# malformed anchor), some carry "Status: X | Source: Z" with no Impact Level,
# and Issue II uses both "Impact:" and "Impact Level:" as the label plus an
# extra status word ("Ongoing") outside the frontend's fixed 3-value enum.
# These defaults/mappings keep every real anchor line parseable while still
# failing loudly (see ChunkingError below) when no anchor exists at all.
DEFAULT_STATUS_FOR_SOURCE_ONLY = "Announced"
DEFAULT_IMPACT_FOR_SOURCE_ONLY = "Medium"
DEFAULT_IMPACT_WHEN_MISSING = "Medium"
STATUS_MAP = {
    "initiated": "Initiated",
    "completed": "Completed",
    "announced": "Announced",
    "ongoing": "Initiated",
}

TITLE_MINISTRY_SPLIT_RE = re.compile(r"\s?[-–—]\s(?!.*\s?[-–—]\s)")
PAGE_NUMBER_LINE_RE = re.compile(r"^\s*\d{1,3}\s*$", re.MULTILINE)

# A source citation occasionally wraps onto the next physical line (e.g.
# "Source: Gazette of India, Mordor\nIntelligence") — these words look like
# the start of a new paragraph, so a wrapped continuation must NOT start
# with them.
BODY_PARAGRAPH_OPENERS = (
    "The ", "A ", "An ", "This ", "It ", "Union ", "Government ",
    "Ministry ", "India", "Cabinet ", "In ",
)
MAX_WRAPPED_SOURCE_LINE_LEN = 25


class ChunkingError(Exception):
    """Raised when a chunk in the body region looks like a real item (has a
    numbered marker past the table of contents) but no Status/Impact
    Level/Source anchor line was found for it — per backend-spec.md §5 step 2,
    this must block the upload with a clear message rather than publish a
    malformed item."""


@dataclass
class ParsedItem:
    title: str
    ministry_raw: str
    pillar: str
    subtype: str
    status: str
    impact_level: str
    source_label: str
    description: str


def _normalize(text: str) -> str:
    # ​ (zero-width space) is used by the source PDF as an actual
    # separator in places (e.g. "10.​Recruitment..." with no real space) —
    # replace with a real space rather than dropping it, or markers glue to
    # their title text and fail to match.
    text = text.replace("​", " ").replace("\xa0", " ")
    text = PAGE_NUMBER_LINE_RE.sub("", text)
    return text


def _collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _extend_wrapped_source(text: str, source_end: int) -> tuple[str, int]:
    """If the line right after the source citation looks like a short
    continuation of it rather than the start of the body paragraph, fold it
    into the source label and return how far to advance the body start."""
    rest = text[source_end:]
    if not rest.startswith("\n"):
        return "", source_end
    rest = rest[1:]  # skip the newline right after "Source: ..."
    consumed = 1

    newline_pos = rest.find("\n")
    if newline_pos == -1:
        return "", source_end

    next_line = rest[:newline_pos].strip()
    if not next_line or len(next_line) > MAX_WRAPPED_SOURCE_LINE_LEN:
        return "", source_end
    if next_line.startswith(BODY_PARAGRAPH_OPENERS):
        return "", source_end
    if ANCHOR_RE.search(next_line) or ITEM_MARKER_RE.search("\n" + next_line):
        return "", source_end

    return " " + next_line, source_end + consumed + newline_pos + 1


def _nearest_preceding(headers: list[tuple[int, str]], pos: int) -> str | None:
    candidates = [h for h in headers if h[0] <= pos]
    if not candidates:
        return None
    return max(candidates, key=lambda h: h[0])[1]


def _split_title_ministry(raw_title: str) -> tuple[str, str]:
    collapsed = _collapse_whitespace(raw_title)
    match = TITLE_MINISTRY_SPLIT_RE.search(collapsed)
    if match:
        return collapsed[: match.start()].strip(), collapsed[match.end():].strip()

    # Fallback: no dash with whitespace on either side (e.g. "...Aquaculture-Ministry
    # of Fisheries..." with no space at all around the separator). Take the LAST
    # dash-like character regardless of spacing — the ministry name is always the
    # final segment, so even if an earlier compound word (e.g. "High-Altitude")
    # also has an unspaced hyphen, it won't be the last one in the string.
    last_pos = max((collapsed.rfind(ch) for ch in "-–—"), default=-1)
    if last_pos == -1:
        return collapsed, ""
    return collapsed[:last_pos].strip(), collapsed[last_pos + 1:].strip()


def chunk_report(raw_text: str) -> list[ParsedItem]:
    text = _normalize(raw_text)

    pillar_headers = sorted(
        (m.start(), pillar) for pattern, pillar in PILLAR_HEADERS for m in pattern.finditer(text)
    )
    subtype_headers = sorted(
        (m.start(), subtype) for pattern, subtype in SUBTYPE_HEADERS for m in pattern.finditer(text)
    )
    item_markers = [(m.start(1), m.end()) for m in ITEM_MARKER_RE.finditer(text)]
    all_anchors = list(ANCHOR_RE.finditer(text))

    # Some source documents' tables of contents echo a "Source: X" line for
    # Announcement-type entries (real body items don't have this problem —
    # only the TOC preview does). A real anchor is always followed by a full
    # prose description before the next marker; a TOC echo is immediately
    # followed by the next entry's title. Filter on that gap rather than
    # trusting every regex match to be a genuine anchor.
    marker_starts = [m[0] for m in item_markers]
    anchors = []
    for a in all_anchors:
        next_marker = next((p for p in marker_starts if p >= a.end()), len(text))
        if (next_marker - a.end()) >= MIN_DESCRIPTION_GAP:
            anchors.append(a)

    if not anchors:
        raise ChunkingError("No Status/Impact Level/Source anchor lines found anywhere in the document")

    first_anchor_pos = anchors[0].start()
    body_markers = [m for m in item_markers if m[0] <= first_anchor_pos]
    if not body_markers:
        raise ChunkingError("Could not locate the numbered item marker preceding the first anchor line")
    first_item_marker_pos = body_markers[-1][0]

    preceding_subtypes = [h for h in subtype_headers if h[0] <= first_item_marker_pos]
    if not preceding_subtypes:
        raise ChunkingError("Could not locate the A./B. subsection header preceding the first item")
    first_subtype_pos = preceding_subtypes[-1][0]

    preceding_pillars = [h for h in pillar_headers if h[0] <= first_subtype_pos]
    if not preceding_pillars:
        raise ChunkingError("Could not locate the Roman-numeral pillar header preceding the first item")
    body_region_start = preceding_pillars[-1][0]

    real_markers = [m for m in item_markers if m[0] >= body_region_start]
    real_pillar_headers = [h for h in pillar_headers if h[0] >= body_region_start]
    real_subtype_headers = [h for h in subtype_headers if h[0] >= body_region_start]

    boundary_positions = sorted(
        {m[0] for m in real_markers}
        | {h[0] for h in real_pillar_headers}
        | {h[0] for h in real_subtype_headers}
        | {len(text)}
    )

    def next_boundary_after(pos: int) -> int:
        for b in boundary_positions:
            if b > pos:
                return b
        return len(text)

    items: list[ParsedItem] = []

    for idx, (marker_start, marker_end) in enumerate(real_markers):
        next_marker_start = real_markers[idx + 1][0] if idx + 1 < len(real_markers) else len(text)

        anchor = next(
            (a for a in anchors if marker_end <= a.start() < next_marker_start),
            None,
        )
        if anchor is None:
            snippet = _collapse_whitespace(text[marker_start:marker_end + 80])
            raise ChunkingError(
                f"Item marker at position {marker_start} ('{snippet}...') has no Status | Impact "
                "Level | Source anchor line before the next item — refusing to publish a malformed item."
            )

        raw_title = text[marker_end:anchor.start()]
        title, ministry_raw = _split_title_ministry(raw_title)

        pillar = _nearest_preceding(real_pillar_headers, marker_start)
        subtype = _nearest_preceding(real_subtype_headers, marker_start)
        if pillar is None or subtype is None:
            raise ChunkingError(
                f"Item '{title[:60]}' has no preceding pillar/subtype section header — document structure "
                "doesn't match the expected Roman-numeral / A.-B. layout."
            )

        if anchor.group("status"):
            status = STATUS_MAP[anchor.group("status").lower()]
            impact_level = anchor.group("impact").capitalize() if anchor.group("impact") else DEFAULT_IMPACT_WHEN_MISSING
            source_label = anchor.group("source1").strip()
        else:
            status = DEFAULT_STATUS_FOR_SOURCE_ONLY
            impact_level = DEFAULT_IMPACT_FOR_SOURCE_ONLY
            source_label = anchor.group("source2").strip()

        wrap_suffix, body_start = _extend_wrapped_source(text, anchor.end())
        source_label += wrap_suffix
        body_end = next_boundary_after(marker_start)
        description = _collapse_whitespace(text[body_start:body_end])

        items.append(
            ParsedItem(
                title=title,
                ministry_raw=ministry_raw,
                pillar=pillar,
                subtype=subtype,
                status=status,
                impact_level=impact_level,
                source_label=source_label,
                description=description,
            )
        )

    return items
