"""Best-effort extraction of a financial outlay/budget figure mentioned in a
policy item's PDF-derived title/description text — e.g. "₹500 crore",
"Rs. 1,200 crore", "INR 50 lakh". Pure regex, no LLM — PDF text is the only
source. The matched currency prefix (₹/Rs./INR, in any casing) is normalized
to "Rs." in the returned string: Helvetica (reportlab's default PDF font)
has no glyph for the Unicode Rupee sign, and normalizing here keeps the web
UI and the PDF export consistent without bundling a Unicode font."""

import re

FINANCIAL_RE = re.compile(
    r"(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?\s*(?:crore|lakh|lakhs|thousand|million|billion)s?)",
    re.IGNORECASE,
)


def extract_financial_outlay(text: str) -> str | None:
    match = FINANCIAL_RE.search(text)
    if not match:
        return None
    return f"Rs. {match.group(1).strip()}"
