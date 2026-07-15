"""Converts an uploaded .docx to .pdf via headless LibreOffice, so it can go
through the exact same parsing path as a native PDF upload (pdf_parser.py +
report_chunker.py) instead of a separate, weaker direct-.docx text path.

This was an empirical call, not an assumption — direct python-docx paragraph
text extraction was tested against 5 real uploaded issue .docx files and
failed to chunk *all 5*: Word's numbered-list markers ("1.", "2.", ...) are
applied by Word's list-numbering engine, not stored as literal characters in
paragraph.text, so report_chunker.py's item-marker regex never finds them.
Converting to PDF first renders those numbers into the page's actual text
layer (LibreOffice's PDF export draws the visible number), where pymupdf can
see them like it does for a native PDF. The same 5 files, converted and run
through the (fixed, see pdf_parser.py) PDF path, chunked successfully aside
from one pre-existing, format-unrelated edge case (a "bills pending in
parliament" table section with no per-item Status/Impact/Source line — a
genuine content-template mismatch, not a conversion artifact).
"""

import asyncio
import logging
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

CONVERT_TIMEOUT_SECONDS = 90


class ConversionError(Exception):
    """Raised when LibreOffice fails to convert a .docx to .pdf."""


async def convert_docx_to_pdf(file_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        src_path = tmp_path / "input.docx"
        src_path.write_bytes(file_bytes)

        process = await asyncio.create_subprocess_exec(
            "soffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmp_path),
            str(src_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=CONVERT_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            process.kill()
            raise ConversionError("Document conversion timed out")

        out_path = tmp_path / "input.pdf"
        if process.returncode != 0 or not out_path.exists():
            logger.error("soffice conversion failed: %s", stdout.decode(errors="replace"))
            raise ConversionError("Failed to convert the Word document to PDF")

        return out_path.read_bytes()
