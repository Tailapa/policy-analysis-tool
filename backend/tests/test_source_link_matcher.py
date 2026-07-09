from app.services.pdf_parser import extract_text_and_source_links
from app.services.report_chunker import chunk_report
from app.services.source_link_matcher import match_source_links

from .conftest import ISSUE_I_PDF, ISSUE_II_PDF


def test_match_source_links_basic_sequence():
    ordered_links = [("PIB", "https://pib.gov.in/1"), ("SEBI", "https://sebi.gov.in/2")]
    sources, ptr = match_source_links("PIB", ordered_links, 0)
    assert sources == [{"label": "PIB", "url": "https://pib.gov.in/1"}]
    assert ptr == 1

    sources, ptr = match_source_links("SEBI", ordered_links, ptr)
    assert sources == [{"label": "SEBI", "url": "https://sebi.gov.in/2"}]


def test_match_source_links_skips_unrelated_inline_link():
    # A link that doesn't match the expected label (an inline body citation,
    # not the Source: line's own link) must be skipped over, not consumed.
    ordered_links = [
        ("Department of Financial Services", "https://financialservices.gov.in"),
        ("RBI", "https://rbi.org.in/press"),
    ]
    sources, ptr = match_source_links("RBI", ordered_links, 0)
    assert sources == [{"label": "RBI", "url": "https://rbi.org.in/press"}]


def test_match_source_links_falls_back_when_no_match():
    sources, ptr = match_source_links("PIB", [], 0)
    assert sources == [{"label": "PIB", "url": "https://pib.gov.in"}]


def test_real_pdf_extracts_specific_document_links_not_just_homepages():
    # Regression test: every source citation in both real sample issues must
    # resolve to a specific document/citation URL pulled from the PDF's own
    # hyperlink annotations, not merely the org's homepage.
    for pdf_path in (ISSUE_I_PDF, ISSUE_II_PDF):
        text, ordered_links = extract_text_and_source_links(pdf_path.read_bytes())
        items = chunk_report(text)

        ptr = 0
        all_sources = []
        for item in items:
            sources, ptr = match_source_links(item.source_label, ordered_links, ptr)
            all_sources.extend(sources)

        assert all(s["url"] for s in all_sources)
        # at least some citations should land on a specific document/page,
        # not just an organization's bare homepage
        specific = [s for s in all_sources if len(s["url"]) > len("https://www.sebi.gov.in")]
        assert len(specific) > len(all_sources) / 2
