import re
from datetime import date

MONTH_NUMS = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "Jun": 6, "Jul": 7, "Aug": 8,
    "Sep": 9, "Sept": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

COVER_RANGE_RE = re.compile(
    r"(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*[-–—]\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)"
)
COVER_ISSUE_RE = re.compile(r"([A-Za-z]+)\s+(\d{4})\s*\|\s*ISSUE\s+([IVXLC]+)", re.IGNORECASE)


class IssueMetaError(Exception):
    """Raised when the cover page's date range / issue label can't be
    auto-extracted and no explicit override was supplied."""


def extract_issue_meta(raw_text: str) -> tuple[str, date, date]:
    """Best-effort extraction of (label, period_start, period_end) from the
    report's cover page (e.g. '1st May - 15th May' + 'May 2026 | ISSUE I').
    Deterministic, regex-based — no LLM, consistent with backend-spec.md §1."""

    cover_text = raw_text[:3000]

    range_match = COVER_RANGE_RE.search(cover_text)
    issue_match = COVER_ISSUE_RE.search(cover_text)
    if not range_match or not issue_match:
        raise IssueMetaError(
            "Could not auto-extract the issue period/label from the document's cover page — "
            "pass label/period_start/period_end explicitly."
        )

    start_day, start_month_name, end_day, end_month_name = range_match.groups()
    month_name, year, issue_roman = issue_match.groups()

    year_int = int(year)
    start_month = MONTH_NUMS.get(start_month_name.title())
    end_month = MONTH_NUMS.get(end_month_name.title())
    if start_month is None or end_month is None:
        raise IssueMetaError(f"Unrecognized month name in cover page date range: {range_match.group(0)!r}")

    period_start = date(year_int, start_month, int(start_day))
    period_end = date(year_int, end_month, int(end_day))
    label = f"{month_name.title()} {year_int} | Issue {issue_roman.upper()}"

    return label, period_start, period_end
