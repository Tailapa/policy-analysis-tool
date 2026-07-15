"""Branded PDF export via reportlab — individual policy briefs and multi-item
reports (Ministry / Regulatory Body / Drafts). Every page gets a border, the
NFPRC logo + "India Governance Watch" header, a generation-date + page-number
footer (drawn in `_decorate_page`, attached to SimpleDocTemplate.build via
onFirstPage/onLaterPages)."""

import io
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "NFPRC_logo.png"
BRAND_BLUE = colors.HexColor("#185FA5")
MUTED_BLUE = colors.HexColor("#0C447C")
RULE_GREY = colors.HexColor("#E5E7EB")

BORDER_MARGIN = 10 * mm
LEFT_RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 32 * mm
BOTTOM_MARGIN = 22 * mm

_styles = getSampleStyleSheet()
TITLE_STYLE = ParagraphStyle("ReportTitle", parent=_styles["Heading1"], fontSize=16, textColor=MUTED_BLUE, spaceAfter=4)
SUBTITLE_STYLE = ParagraphStyle("ReportSubtitle", parent=_styles["Normal"], fontSize=9.5, textColor=colors.grey, spaceAfter=6)
ITEM_TITLE_STYLE = ParagraphStyle("ItemTitle", parent=_styles["Heading2"], fontSize=12, textColor=BRAND_BLUE, spaceBefore=8, spaceAfter=4)
BODY_STYLE = ParagraphStyle("Body", parent=_styles["Normal"], fontSize=9.5, leading=13)
LABEL_STYLE = ParagraphStyle("Label", parent=_styles["Normal"], fontSize=8.5, textColor=colors.grey)
EVOLUTION_YEAR_STYLE = ParagraphStyle("EvoYear", parent=_styles["Normal"], fontSize=8, textColor=BRAND_BLUE, fontName="Helvetica-Bold")
EVOLUTION_LABEL_STYLE = ParagraphStyle("EvoLabel", parent=_styles["Normal"], fontSize=8.5, textColor=colors.black, fontName="Helvetica-Bold", spaceBefore=1, leading=10.5)
EVOLUTION_DESC_STYLE = ParagraphStyle("EvoDesc", parent=_styles["Normal"], fontSize=7.5, textColor=colors.grey, leading=9.5, spaceBefore=2)

# A stage "card" in the horizontal timeline — fixed width so we can compute
# how many fit per row and wrap the rest onto subsequent rows instead of
# overflowing the A4 page.
EVOLUTION_STAGE_WIDTH = 40 * mm


def _pdf_safe(text: str) -> str:
    """Escapes reportlab Paragraph's XML-like markup chars (a raw "&" in a
    source URL like "...&reg=3&lang=1" otherwise gets parsed as entity
    references — "&reg;" -> "®" — silently mangling the text) and swaps the
    Unicode Rupee sign for "Rs." since Helvetica, reportlab's default font,
    has no glyph for it and renders it as a missing-glyph box."""
    return escape(str(text).replace("₹", "Rs."))


def _decorate_page(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4

    canvas.setStrokeColor(BRAND_BLUE)
    canvas.setLineWidth(1)
    canvas.rect(BORDER_MARGIN, BORDER_MARGIN, width - 2 * BORDER_MARGIN, height - 2 * BORDER_MARGIN)

    if LOGO_PATH.exists():
        try:
            canvas.drawImage(
                str(LOGO_PATH),
                LEFT_RIGHT_MARGIN,
                height - 26 * mm,
                width=10 * mm,
                height=10 * mm,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pass

    canvas.setFont("Helvetica-Bold", 14)
    canvas.setFillColor(MUTED_BLUE)
    canvas.drawString(LEFT_RIGHT_MARGIN + 13 * mm, height - 20 * mm, "India Governance Watch")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawString(LEFT_RIGHT_MARGIN + 13 * mm, height - 24.5 * mm, "NFPRC Foundation")
    canvas.setLineWidth(0.5)
    canvas.setStrokeColor(RULE_GREY)
    canvas.line(LEFT_RIGHT_MARGIN, height - 27 * mm, width - LEFT_RIGHT_MARGIN, height - 27 * mm)

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    generated = datetime.now(timezone.utc).strftime("%d %b %Y")
    canvas.drawString(LEFT_RIGHT_MARGIN, 15 * mm, f"Generated {generated}")
    canvas.drawRightString(width - LEFT_RIGHT_MARGIN, 15 * mm, f"Page {canvas.getPageNumber()}")

    canvas.restoreState()


def _new_document(buffer: io.BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=LEFT_RIGHT_MARGIN,
        rightMargin=LEFT_RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title="India Governance Watch",
    )


def _linked_names(doc: dict, ministry_map: dict[str, dict]) -> str:
    ids = [str(doc["ministry_id"])] + [str(m) for m in doc.get("additional_ministry_ids", [])]
    names = [ministry_map[i]["name"] for i in ids if i in ministry_map]
    return ", ".join(names) if names else "Unknown"


def _geography_str(doc: dict) -> str:
    geo = doc.get("geography") or {}
    if geo.get("scope") == "state" and geo.get("states"):
        return f"State: {', '.join(geo['states'])}"
    return "National"


def _item_metadata_table(item_doc: dict, ministry_map: dict[str, dict]) -> Table:
    rows = [
        ("Jurisdiction", _linked_names(item_doc, ministry_map)),
        ("Geography", _geography_str(item_doc)),
        ("Theme", item_doc.get("pillar", "")),
        ("Type", item_doc.get("subtype", "")),
        ("Status", item_doc.get("status") or "Not specified"),
        ("Impact", item_doc.get("impact_level") or "Not specified"),
    ]
    if item_doc.get("financial_outlay"):
        rows.append(("Financial Outlay", item_doc["financial_outlay"]))
    if item_doc.get("tags"):
        rows.append(("Tags", ", ".join(item_doc["tags"])))
    if item_doc.get("is_draft"):
        rows.append(("Status Flag", "DRAFT — per source PDF"))

    table_data = [
        [Paragraph(f"<b>{label}</b>", LABEL_STYLE), Paragraph(_pdf_safe(value), BODY_STYLE)] for label, value in rows
    ]
    table = Table(table_data, colWidths=[32 * mm, None])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE_GREY),
            ]
        )
    )
    return table


def _sources_flowables(item_doc: dict) -> list:
    sources = item_doc.get("sources") or []
    if not sources:
        return []
    flow = [Spacer(1, 6), Paragraph("<b>Sources Cited</b>", LABEL_STYLE)]
    for source in sources:
        label = _pdf_safe(source.get("label", ""))
        url = _pdf_safe(source.get("url") or "")
        text = f"{label} — {url}" if url else label
        flow.append(Paragraph(f"&bull; {text}", BODY_STYLE))
    return flow


def _evolution_flowables(item_doc: dict) -> list:
    """Horizontal timeline of a policy's genealogy (see policy_evolution.py)
    — a row of stage cards (year/month + label + description), wrapping onto
    a new row of cards rather than overflowing the page width, followed by
    the synthesis paragraph. Omitted entirely when the item has no evolution
    (no qualifying earlier-issue relatives were found)."""
    evolution = item_doc.get("evolution")
    stages = (evolution or {}).get("stages") or []
    if not stages:
        return []

    available_width = A4[0] - 2 * LEFT_RIGHT_MARGIN
    per_row = max(1, int(available_width // EVOLUTION_STAGE_WIDTH))

    flow: list = [
        Spacer(1, 10),
        Paragraph("<b>Policy Evolution</b>", LABEL_STYLE),
    ]
    if evolution.get("theme_label"):
        flow.append(Paragraph(_pdf_safe(evolution["theme_label"]), BODY_STYLE))
    flow.append(Spacer(1, 4))

    def stage_cell(stage: dict) -> list:
        return [
            Paragraph(_pdf_safe(stage.get("year", "")), EVOLUTION_YEAR_STYLE),
            Paragraph(_pdf_safe(stage.get("label", "")), EVOLUTION_LABEL_STYLE),
            Paragraph(_pdf_safe(stage.get("description", "")), EVOLUTION_DESC_STYLE),
        ]

    for i in range(0, len(stages), per_row):
        row_stages = stages[i : i + per_row]
        row_cells = [stage_cell(s) for s in row_stages]
        table = Table([row_cells], colWidths=[EVOLUTION_STAGE_WIDTH] * len(row_cells))
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOX", (0, 0), (-1, -1), 0.4, RULE_GREY),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, RULE_GREY),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        flow.append(table)
        flow.append(Spacer(1, 2))

    if evolution.get("synthesis"):
        flow.append(Spacer(1, 4))
        flow.append(Paragraph("<b>Synthesis</b>", LABEL_STYLE))
        flow.append(Paragraph(_pdf_safe(evolution["synthesis"]), BODY_STYLE))

    return flow


def generate_item_pdf(item_doc: dict, ministry_map: dict[str, dict]) -> bytes:
    buffer = io.BytesIO()
    doc = _new_document(buffer)

    flow = [
        Paragraph("Policy Brief", SUBTITLE_STYLE),
        Paragraph(_pdf_safe(item_doc["title"]), ITEM_TITLE_STYLE),
        Paragraph(_pdf_safe(item_doc.get("description", "")), BODY_STYLE),
        Spacer(1, 8),
        _item_metadata_table(item_doc, ministry_map),
    ]
    flow.extend(_sources_flowables(item_doc))
    flow.extend(_evolution_flowables(item_doc))

    doc.build(flow, onFirstPage=_decorate_page, onLaterPages=_decorate_page)
    return buffer.getvalue()


def generate_items_report_pdf(
    items: list[dict], ministry_map: dict[str, dict], title: str, subtitle: str | None = None
) -> bytes:
    buffer = io.BytesIO()
    doc = _new_document(buffer)

    flow: list = [Paragraph(_pdf_safe(title), TITLE_STYLE)]
    if subtitle:
        flow.append(Paragraph(_pdf_safe(subtitle), SUBTITLE_STYLE))
    count_label = f"{len(items)} {'item' if len(items) == 1 else 'items'}"
    flow.append(Paragraph(count_label, SUBTITLE_STYLE))
    flow.append(Spacer(1, 4))

    for item_doc in items:
        flow.append(HRFlowable(width="100%", thickness=0.5, color=RULE_GREY, spaceBefore=8, spaceAfter=6))
        flow.append(Paragraph(_pdf_safe(item_doc["title"]), ITEM_TITLE_STYLE))
        flow.append(Paragraph(_pdf_safe(item_doc.get("description", "")), BODY_STYLE))
        flow.append(Spacer(1, 4))
        flow.append(_item_metadata_table(item_doc, ministry_map))

    doc.build(flow, onFirstPage=_decorate_page, onLaterPages=_decorate_page)
    return buffer.getvalue()
