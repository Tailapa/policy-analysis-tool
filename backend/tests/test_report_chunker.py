import pytest

from app.services.report_chunker import ChunkingError, chunk_report
from .conftest import ISSUE_I_PDF, ISSUE_II_PDF
from app.services.pdf_parser import extract_text


def test_chunk_report_issue_i_exact_count():
    text = extract_text(ISSUE_I_PDF.read_bytes())
    items = chunk_report(text)
    assert len(items) == 54
    assert all(i.status in {"Initiated", "Completed", "Announced"} for i in items)
    assert all(i.impact_level in {"High", "Medium", "Low"} for i in items)
    assert all(i.ministry_raw for i in items)


def test_chunk_report_issue_ii_parses():
    text = extract_text(ISSUE_II_PDF.read_bytes())
    items = chunk_report(text)
    assert len(items) > 0
    assert all(i.ministry_raw for i in items)


def test_chunk_report_folds_wrapped_source_continuation():
    # Regression test: "Source: Gazette of India, Mordor" wraps onto the next
    # physical line ("Intelligence") in the real PDF — the parser must fold
    # that continuation into the source label, not leave it stuck at the
    # front of the item's description.
    text = extract_text(ISSUE_I_PDF.read_bytes())
    items = chunk_report(text)
    mordor_item = next(i for i in items if "Mordor" in i.source_label)
    assert mordor_item.source_label == "Gazette of India, Mordor Intelligence"
    assert not mordor_item.description.startswith("Intelligence")


def test_chunk_report_publishes_item_with_null_fields_when_no_anchor():
    # Real source documents occasionally contain a numbered entry (e.g. a
    # table-of-contents preview, or a bullet inside a bare list) that shares
    # the "N. " marker shape with genuine items but was never meant to carry
    # its own Status/Impact Level/Source anchor. The parser must still
    # publish it (with those three fields null) rather than dropping it or
    # failing the whole document.
    broken_text = """
    Table Of Contents
    I. Economic Growth
    A. Policy Updates
    1. Some Item - Ministry Of Finance
    8

    I. Economic Growth
    A. Policy Updates
    1. Some Item - Ministry Of Finance
    This paragraph never gets a Status/Impact Level/Source anchor line at all,
    unlike every other real item in the document, so the parser must publish
    it with null status/impact/source rather than making one up.
    2. Another Item - Ministry Of Finance
    Status: Initiated | Impact Level: High | Source: PIB
    Body text for the second item goes here and is long enough to count.
    """
    items = chunk_report(broken_text)
    assert len(items) == 2
    assert items[0].title == "Some Item"
    assert items[0].status is None
    assert items[0].impact_level is None
    assert items[0].source_label is None
    assert items[1].title == "Another Item"
    assert items[1].status == "Initiated"


def test_chunk_report_fails_loudly_when_nothing_parses():
    broken_text = """
    Table Of Contents
    I. Economic Growth
    A. Policy Updates
    1. Some Item - Ministry Of Finance
    8

    I. Economic Growth
    A. Policy Updates
    1. Some Item - Ministry Of Finance
    This paragraph never gets a Status/Impact Level/Source anchor line at all,
    so the parser must refuse to publish anything for this document.
    """
    with pytest.raises(ChunkingError):
        chunk_report(broken_text)


def test_chunk_report_truncates_second_table_of_contents_as_duplicate_copy():
    # Several real source documents bundle a second, re-exported "Print Ready
    # Version" copy of the same issue directly after the first one, rather
    # than as a separate upload. A second "Table Of Contents" heading marks
    # where the duplicate begins — only the first copy should be chunked.
    text = """
    Table Of Contents
    I. Economic Growth
    A. Policy Updates
    1. Real Item - Ministry Of Finance
    Status: Initiated | Impact Level: High | Source: PIB
    Body text for the real item goes here and is long enough to count as one.

    Table Of Contents
    I. Economic Growth
    A. Policy Updates
    1. Duplicate Item - Ministry Of Finance
    Status: Initiated | Impact Level: High | Source: PIB
    This is the duplicated second copy of the same issue and must be dropped.
    """
    items = chunk_report(text)
    assert len(items) == 1
    assert items[0].title == "Real Item"
