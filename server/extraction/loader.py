from __future__ import annotations

from io import BytesIO
from pathlib import Path

try:
    import mammoth
except ImportError:  # pragma: no cover
    mammoth = None

from server.extraction.types import DocumentPage, SourceDocument

try:
    import pymupdf
except ImportError:  # pragma: no cover
    try:
        import fitz as pymupdf
    except ImportError:  # pragma: no cover
        pymupdf = None


DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def load_source_document(file_path: Path, mime_type: str) -> SourceDocument:
    raw_bytes = file_path.read_bytes()
    text = None
    pages: list[DocumentPage] = []

    if mime_type.startswith("text/") or mime_type in {"application/json", "application/xml"}:
        text = raw_bytes.decode("utf-8", errors="replace")
    elif mime_type == "application/pdf":
        text, pages = _load_pdf_document(raw_bytes)
    elif mime_type == DOCX_MIME_TYPE:
        text = _load_docx_document(raw_bytes)

    return SourceDocument(
        path=file_path,
        mime_type=mime_type,
        file_name=file_path.name,
        raw_bytes=raw_bytes,
        text=text,
        pages=pages,
    )


def _load_pdf_document(raw_bytes: bytes) -> tuple[str | None, list[DocumentPage]]:
    if pymupdf is None:
        return (None, [])

    document = pymupdf.open(stream=raw_bytes, filetype="pdf")
    pages: list[DocumentPage] = []
    text_chunks: list[str] = []
    try:
        for index, page in enumerate(document, start=1):
            page_text = page.get_text("text")
            normalized_text = page_text.strip()
            pages.append(DocumentPage(page_number=index, text=normalized_text))
            if normalized_text:
                text_chunks.append(normalized_text)
    finally:
        document.close()

    full_text = "\n\n".join(text_chunks).strip() or None
    return (full_text, pages)


def _load_docx_document(raw_bytes: bytes) -> str | None:
    if mammoth is None:
        return None

    result = mammoth.extract_raw_text(BytesIO(raw_bytes))
    normalized_text = result.value.strip()
    return normalized_text or None
