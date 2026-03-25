from __future__ import annotations

from server.extraction.documents.compliance_certificate import (
    extract_compliance_certificate,
    extract_compliance_certificate_exception_assist,
)
from server.extraction.types import DocumentContext, ExtractionResult, SourceDocument


class DeterministicComplianceCertificateEngine:
    def extract(
        self,
        source: SourceDocument,
        context: DocumentContext,
    ) -> ExtractionResult:
        return extract_compliance_certificate(source, period_label=context.period_label)


class ExceptionAssistComplianceCertificateEngine:
    def extract(
        self,
        source: SourceDocument,
        context: DocumentContext,
    ) -> ExtractionResult:
        return extract_compliance_certificate_exception_assist(source, period_label=context.period_label)
