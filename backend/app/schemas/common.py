MONTH_ABBR = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}


def format_item_date(d) -> str:
    """'16 Jun' style string the frontend's Item.date expects."""
    return f"{d.day} {MONTH_ABBR[d.month]}"


def format_date_range(start, end) -> str:
    """'16-31 May 2026' style string the frontend's Issue.dateRange expects."""
    if start.month == end.month and start.year == end.year:
        return f"{start.day}–{end.day} {MONTH_ABBR[end.month]} {end.year}"
    return f"{start.day} {MONTH_ABBR[start.month]} – {end.day} {MONTH_ABBR[end.month]} {end.year}"
