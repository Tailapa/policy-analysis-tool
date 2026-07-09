from app.services.source_resolver import resolve_sources


def match_source_links(source_label: str, ordered_links: list[tuple[str, str]], ptr: int) -> tuple[list[dict], int]:
    """Assign real per-citation URLs to a 'Source: X, Y' label using the
    document's embedded hyperlinks, in reading order.

    Sequential position alone isn't reliable — some links are inline org
    mentions in the body text, not the citation's own link, so the count of
    links per page doesn't always equal the count of source citations on it.
    Instead this walks forward from the current pointer looking for the next
    link whose clickable text matches this label, skipping over (and
    discarding) any non-matching ones in between — those are body-inline
    citations that don't belong to any Source: field. Falls back to the
    curated org->homepage lookup (source_resolver.py) if no match is found
    before the link list runs out, so every citation still gets *something*
    when the PDF didn't happen to hyperlink it.

    Returns (sources, new_ptr).
    """
    labels = [part.strip() for part in source_label.split(",") if part.strip()]
    if not labels:
        labels = [source_label.strip()]

    sources = []
    for label in labels:
        label_lower = label.lower()
        matched_url = None
        j = ptr
        while j < len(ordered_links):
            link_text, url = ordered_links[j]
            link_lower = link_text.lower()
            if label_lower in link_lower or link_lower in label_lower:
                matched_url = url
                ptr = j + 1
                break
            j += 1

        if matched_url is not None:
            sources.append({"label": label, "url": matched_url})
        else:
            fallback = resolve_sources(label)[0]
            sources.append(fallback)

    return sources, ptr
