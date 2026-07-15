FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
# libreoffice-writer: headless .docx -> .pdf conversion (services/docx_converter.py) —
# Word's native list numbering isn't exposed via python-docx's paragraph.text at all,
# so converting to PDF first and parsing that (same pipeline as native PDF uploads)
# is what actually works; see docx_converter.py's docstring for the comparison.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-writer \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local/lib/python3.11/site-packages
COPY . .
RUN useradd -m appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
