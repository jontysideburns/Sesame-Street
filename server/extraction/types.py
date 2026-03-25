from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class DocumentPage:
    page_number: int
    text: str


@dataclass(slots=True)
class SourceDocument:
    path: Path
    mime_type: str
    file_name: str
    raw_bytes: bytes | None
    text: str | None
    pages: list[DocumentPage]


@dataclass(slots=True)
class DocumentContext:
    incoming_document_id: int
    deal_id: int | None
    deal_slug: str | None
    period_label: str | None
    document_type: str | None
    matched_obligation_id: int | None


@dataclass(slots=True)
class Citation:
    kind: str
    text_snippet: str
    page_number: int | None = None
    field_key: str | None = None


@dataclass(slots=True)
class ExtractedField:
    field_key: str
    field_label: str
    proposed_value: str
    confidence: float
    citation: Citation
    rationale: str | None = None


@dataclass(slots=True)
class ExtractionResult:
    document_summary: str | None
    fields: list[ExtractedField]
    warnings: list[str]
    engine_name: str
    engine_version: str
    period_label: str | None = None
    period_confidence: float | None = None
    period_citation: Citation | None = None
    period_rationale: str | None = None
    prompt_template: str | None = None
