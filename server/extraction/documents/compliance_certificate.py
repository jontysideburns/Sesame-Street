from __future__ import annotations

import re

from server.extraction.types import Citation, DocumentPage, ExtractedField, ExtractionResult, SourceDocument

MONTH_TO_QUARTER = {
    "january": "Q1",
    "february": "Q1",
    "march": "Q1",
    "april": "Q2",
    "may": "Q2",
    "june": "Q2",
    "july": "Q3",
    "august": "Q3",
    "september": "Q3",
    "october": "Q4",
    "november": "Q4",
    "december": "Q4",
}

PERIOD_PATTERNS = [
    re.compile(r"reporting\s+period\s*[:\-]\s*(Q[1-4])\s+([0-9]{4})", re.IGNORECASE),
    re.compile(r"period\s*[:\-]\s*(Q[1-4])\s+([0-9]{4})", re.IGNORECASE),
]

QUARTER_END_PATTERN = re.compile(
    r"(?:quarter|period)\s+ended\s+([A-Za-z]+)\s+([0-9]{1,2}),\s*([0-9]{4})",
    re.IGNORECASE,
)

FIELD_SPECS = {
    "seniorDscr": {
        "label": "Senior DSCR",
        "patterns": [
            re.compile(r"senior\s+dscr\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?)\s*x?", re.IGNORECASE),
            re.compile(r"debt\s+service\s+cover(?:age)?\s*(?:ratio)?\s*[:\-]\s*([0-9]+(?:\.[0-9]+)?)\s*x?", re.IGNORECASE),
        ],
        "formatter": lambda value: f"{float(value):.2f}x",
        "confidence": 0.92,
    },
    "cfads": {
        "label": "CFADS",
        "patterns": [
            re.compile(r"cfads\s*[:\-]\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
            re.compile(r"cash\s+flow\s+available\s+for\s+debt\s+service\s*[:\-]\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
        ],
        "formatter": lambda value: value.replace(" ", ""),
        "confidence": 0.95,
    },
    "revenue": {
        "label": "Revenue",
        "patterns": [
            re.compile(r"revenue\s*[:\-]\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
        ],
        "formatter": lambda value: value.replace(" ", ""),
        "confidence": 0.95,
    },
}

ASSIST_FIELD_SPECS = {
    "seniorDscr": {
        "label": "Senior DSCR",
        "patterns": [
            re.compile(r"(?:senior\s+)?dscr\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*x?", re.IGNORECASE),
            re.compile(
                r"(?:senior\s+)?debt\s+service\s+cover(?:age)?\s*(?:ratio)?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*x?",
                re.IGNORECASE,
            ),
        ],
        "formatter": lambda value: f"{float(value):.2f}x",
        "confidence": 0.89,
    },
    "cfads": {
        "label": "CFADS",
        "patterns": [
            re.compile(r"cfads\s*[:\-]?\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
            re.compile(
                r"cash\s+flow\s+available\s+for\s+debt\s+service\s*[:\-]?\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)",
                re.IGNORECASE,
            ),
        ],
        "formatter": lambda value: value.replace(" ", ""),
        "confidence": 0.91,
    },
    "revenue": {
        "label": "Revenue",
        "patterns": [
            re.compile(r"revenue\s*[:\-]?\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
            re.compile(r"turnover\s*[:\-]?\s*(\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?\s*[mk]?)", re.IGNORECASE),
        ],
        "formatter": lambda value: value.replace(" ", ""),
        "confidence": 0.88,
    },
}


def extract_compliance_certificate(
    source: SourceDocument,
    *,
    period_label: str | None = None,
) -> ExtractionResult:
    lines = _build_search_lines(source)
    fields: list[ExtractedField] = []
    warnings: list[str] = []
    extracted_period_label, extracted_period_confidence, extracted_period_citation = (
        _extract_period_from_lines(lines)
    )

    for field_key, spec in FIELD_SPECS.items():
        extracted = _extract_field_from_lines(lines, field_key, spec)
        if extracted is None:
            warnings.append(f"{spec['label']} was not found in the document body.")
            continue
        fields.append(extracted)

    summary_period_label = extracted_period_label or period_label
    summary = _build_summary(fields, summary_period_label)
    return ExtractionResult(
        document_summary=summary,
        fields=fields,
        warnings=warnings,
        engine_name="deterministic_compliance_certificate",
        engine_version="v1",
        period_label=extracted_period_label,
        period_confidence=extracted_period_confidence,
        period_citation=extracted_period_citation,
        period_rationale=(
            "Reporting period extracted from a matching document body line."
            if extracted_period_label
            else None
        ),
        prompt_template="compliance_certificate_content_extraction_v1",
    )


def extract_compliance_certificate_exception_assist(
    source: SourceDocument,
    *,
    period_label: str | None = None,
) -> ExtractionResult:
    lines = _build_search_lines(source)
    fields: list[ExtractedField] = []
    warnings: list[str] = []
    extracted_period_label, extracted_period_confidence, extracted_period_citation = (
        _extract_period_from_lines(lines)
    )

    for field_key, spec in ASSIST_FIELD_SPECS.items():
        extracted = _extract_field_from_lines(lines, field_key, spec)
        if extracted is None:
            warnings.append(f"{spec['label']} could not be recovered by exception assist.")
            continue
        fields.append(extracted)

    summary_period_label = extracted_period_label or period_label
    summary = _build_assist_summary(fields, summary_period_label)
    return ExtractionResult(
        document_summary=summary,
        fields=fields,
        warnings=warnings,
        engine_name="exception_assist_compliance_certificate",
        engine_version="demo-v1",
        period_label=extracted_period_label,
        period_confidence=extracted_period_confidence,
        period_citation=extracted_period_citation,
        period_rationale=(
            "Exception assist recovered the reporting period from the document body."
            if extracted_period_label
            else None
        ),
        prompt_template="exception_assist_compliance_certificate_v1",
    )


def _extract_field_from_lines(lines: list[tuple[str, int | None]], field_key: str, spec: dict) -> ExtractedField | None:
    for line, page_number in lines:
        for pattern in spec["patterns"]:
            match = pattern.search(line)
            if not match:
                continue
            raw_value = match.group(1).strip()
            proposed_value = spec["formatter"](raw_value)
            return ExtractedField(
                field_key=field_key,
                field_label=spec["label"],
                proposed_value=proposed_value,
                confidence=spec["confidence"],
                citation=Citation(
                    kind="page" if page_number is not None else "text_line",
                    text_snippet=line,
                    page_number=page_number,
                    field_key=field_key,
                ),
                rationale=f"{spec['label']} extracted from matching text line.",
            )
    return None


def _extract_period_from_lines(
    lines: list[tuple[str, int | None]],
) -> tuple[str | None, float | None, Citation | None]:
    for line, page_number in lines:
        for pattern in PERIOD_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            quarter = match.group(1).upper()
            year = match.group(2)
            return (
                f"{quarter} {year}",
                0.95,
                Citation(
                    kind="page" if page_number is not None else "text_line",
                    text_snippet=line,
                    page_number=page_number,
                    field_key="periodLabel",
                ),
            )

        match = QUARTER_END_PATTERN.search(line)
        if not match:
            continue
        month = match.group(1).lower()
        year = match.group(3)
        quarter = MONTH_TO_QUARTER.get(month)
        if quarter is None:
            continue
        return (
            f"{quarter} {year}",
            0.9,
            Citation(
                kind="page" if page_number is not None else "text_line",
                text_snippet=line,
                page_number=page_number,
                field_key="periodLabel",
            ),
        )

    return (None, None, None)


def _build_summary(fields: list[ExtractedField], period_label: str | None) -> str:
    if not fields:
        if period_label:
            return f"Compliance certificate for {period_label} was ingested, but no structured metrics were extracted from the document body."
        return "Compliance certificate was ingested, but no structured metrics were extracted from the document body."

    field_text = ", ".join(f"{field.field_label} {field.proposed_value}" for field in fields)
    if period_label:
        return f"Compliance certificate for {period_label} produced {len(fields)} extracted metric(s): {field_text}."
    return f"Compliance certificate produced {len(fields)} extracted metric(s): {field_text}."


def _build_assist_summary(fields: list[ExtractedField], period_label: str | None) -> str:
    if not fields:
        if period_label:
            return f"Exception assist reviewed the compliance certificate for {period_label}, but could not recover the missing mandatory fields."
        return "Exception assist reviewed the compliance certificate, but could not recover the missing mandatory fields."

    field_text = ", ".join(f"{field.field_label} {field.proposed_value}" for field in fields)
    if period_label:
        return f"Exception assist recovered {len(fields)} extracted metric(s) for {period_label}: {field_text}."
    return f"Exception assist recovered {len(fields)} extracted metric(s): {field_text}."


def _build_search_lines(source: SourceDocument) -> list[tuple[str, int | None]]:
    if source.pages:
        return _build_lines_from_pages(source.pages)

    text = source.text or ""
    return [(line.strip(), None) for line in text.splitlines() if line.strip()]


def _build_lines_from_pages(pages: list[DocumentPage]) -> list[tuple[str, int | None]]:
    lines: list[tuple[str, int | None]] = []
    for page in pages:
        for line in page.text.splitlines():
            normalized_line = line.strip()
            if not normalized_line:
                continue
            lines.append((normalized_line, page.page_number))
    return lines
