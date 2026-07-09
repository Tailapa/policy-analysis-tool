import fitz


def extract_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc)
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
            text = page.get_text()
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
