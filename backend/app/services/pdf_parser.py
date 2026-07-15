import fitz

# A "line" is only merged with the pending group when their Y-ranges overlap
# by more than this fraction of the shorter line's height — chosen loosely
# since same-line runs from LibreOffice-exported PDFs share (near-)identical
# bboxes, while genuinely different lines don't overlap in Y at all.
_LINE_OVERLAP_THRESHOLD = 0.5


def _reconstruct_page_text(page) -> str:
    """pymupdf's plain get_text() joins spans into "lines" using its own
    internal line-detection, which is usually fine — except LibreOffice's
    PDF export apparently gives each differently-formatted run (bold labels,
    hyperlinked spans, plain text) within what's visually one line a
    slightly different internal grouping, causing get_text() to insert
    spurious newlines mid-line (e.g. splitting "Status: Completed | Impact
    Level: High | Source: X" into 5+ separate lines). This reconstructs
    lines directly from get_text("dict")'s per-line bboxes instead, merging
    lines whose Y-ranges substantially overlap (i.e. actually the same
    visual line) and joining them left-to-right by X position.

    Verified against both LibreOffice-converted .docx uploads (fixes
    mid-line splits without needing report_chunker.py changes) and the
    original native-PDF fixtures (produces the same chunked item counts as
    before — no regression)."""
    d = page.get_text("dict")
    out_lines: list[str] = []

    for block in d["blocks"]:
        if "lines" not in block:
            continue
        pending: list[tuple[float, float, float, str]] = []  # (y0, y1, x0, text)
        for line in block["lines"]:
            y0, y1 = line["bbox"][1], line["bbox"][3]
            text = "".join(span["text"] for span in line["spans"]).strip()
            if not text:
                continue
            x0 = line["bbox"][0]

            same_line = False
            if pending:
                py0, py1 = pending[0][0], pending[0][1]
                overlap = min(y1, py1) - max(y0, py0)
                height = min(y1 - y0, py1 - py0)
                same_line = height > 0 and overlap / height > _LINE_OVERLAP_THRESHOLD

            if same_line:
                pending.append((y0, y1, x0, text))
            else:
                if pending:
                    pending.sort(key=lambda t: t[2])
                    out_lines.append(" ".join(t[3] for t in pending))
                pending = [(y0, y1, x0, text)]
        if pending:
            pending.sort(key=lambda t: t[2])
            out_lines.append(" ".join(t[3] for t in pending))

    return "\n".join(out_lines)


def extract_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        return "\n".join(_reconstruct_page_text(page) for page in doc)
    finally:
        doc.close()


def extract_text_and_source_links(file_bytes: bytes) -> tuple[str, list[tuple[str, str]]]:
    """Same text extraction as extract_text(), plus the document's embedded
    hyperlink annotations — these reports link each source citation (and
    sometimes an inline org mention in the body) to the actual document, not
    just the org's homepage (e.g. 'SEBI' -> a specific consultation-paper PDF
    or a Drive-hosted copy, not sebi.gov.in). Plain get_text() silently
    discards these annotations, so callers that want real per-citation links
    (see source_link_matcher.py) need this instead of extract_text().

    Only links on pages that actually contain 'Status:'/'Source:' anchors are
    returned — this excludes the cover page's contributor social-media links
    and the table-of-contents' internal (non-http) navigation links, without
    needing to hardcode page numbers.

    Returns (full_text, ordered_links) where ordered_links is a list of
    (clickable_text, url) in document reading order. A link whose annotation
    rect wraps across a line break (e.g. a hyperlinked phrase that itself
    wraps) produces two adjacent identical URLs — those are deduped here.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        page_texts = []
        ordered_links: list[tuple[str, str]] = []

        for page in doc:
            text = _reconstruct_page_text(page)
            page_texts.append(text)
            if "Status:" not in text and "Source:" not in text:
                continue

            page_links = sorted(
                page.get_links(), key=lambda l: (round(l["from"].y0 / 5), l["from"].x0)
            )
            for link in page_links:
                uri = link.get("uri")
                if not uri or not uri.startswith("http"):
                    continue
                words = page.get_text("words", clip=link["from"])
                link_text = " ".join(w[4] for w in words).strip()
                if not link_text:
                    continue
                if ordered_links and ordered_links[-1][1] == uri:
                    continue  # wrapped-line duplicate of the previous link
                ordered_links.append((link_text, uri))

        return "\n".join(page_texts), ordered_links
    finally:
        doc.close()
