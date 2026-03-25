from __future__ import annotations

from pathlib import Path

from server.extraction.engines.deterministic import (
    DeterministicComplianceCertificateEngine,
    ExceptionAssistComplianceCertificateEngine,
)
from server.extraction.loader import DOCX_MIME_TYPE, load_source_document
from server.extraction.types import DocumentContext, ExtractionResult


def run_artifact_extraction(
    *,
    file_path: Path,
    mime_type: str,
    context: DocumentContext,
) -> ExtractionResult | None:
    source = load_source_document(file_path, mime_type)
    engine = select_extraction_engine(source.mime_type, context)
    if engine is None:
        return None
    return engine.extract(source, context)


def run_exception_assist_extraction(
    *,
    file_path: Path,
    mime_type: str,
    context: DocumentContext,
) -> ExtractionResult | None:
    source = load_source_document(file_path, mime_type)
    engine = select_exception_assist_engine(source.mime_type, context)
    if engine is None:
        return None
    return engine.extract(source, context)


def select_extraction_engine(mime_type: str, context: DocumentContext):
    if context.document_type == "compliance_certificate" and (
        mime_type.startswith("text/") or mime_type == "application/pdf" or mime_type == DOCX_MIME_TYPE
    ):
        return DeterministicComplianceCertificateEngine()
    return None


def select_exception_assist_engine(mime_type: str, context: DocumentContext):
    if context.document_type == "compliance_certificate" and (
        mime_type.startswith("text/") or mime_type == "application/pdf" or mime_type == DOCX_MIME_TYPE
    ):
        return ExceptionAssistComplianceCertificateEngine()
    return None
