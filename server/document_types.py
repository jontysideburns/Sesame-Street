from __future__ import annotations

from typing import TypedDict


class DocumentTypeDefinition(TypedDict):
    key: str
    label: str
    description: str
    aliases: list[str]
    inference_confidence: float
    filename_patterns: list[list[str]]
    mandatory_fields: list[str]


DOCUMENT_TYPE_DEFINITIONS: list[DocumentTypeDefinition] = [
    {
        "key": "compliance_certificate",
        "label": "Compliance Certificate",
        "description": "Signed borrower certificate confirming covenant calculations, defaults, and related compliance statements.",
        "aliases": ["certificate_bundle", "construction_certificate"],
        "inference_confidence": 0.98,
        "filename_patterns": [["compliance certificate"], ["construction certificate"]],
        "mandatory_fields": ["seniorDscr", "cfads"],
    },
    {
        "key": "management_accounts",
        "label": "Management Accounts",
        "description": "Periodic unaudited management reporting, typically monthly or quarterly financial statements and commentary.",
        "aliases": [],
        "inference_confidence": 0.96,
        "filename_patterns": [["management accounts"], ["monthly management"], ["quarterly management"]],
        "mandatory_fields": [],
    },
    {
        "key": "audited_financials",
        "label": "Audited Financial Statements",
        "description": "Annual audited financial statements, including the auditor report and supporting notes.",
        "aliases": [],
        "inference_confidence": 0.95,
        "filename_patterns": [["audited", "financial"], ["audited accounts"], ["annual audited accounts"]],
        "mandatory_fields": [],
    },
    {
        "key": "officer_certificate",
        "label": "Officer's Certificate",
        "description": "Officer or director certificate delivered with financials to confirm accuracy and required representations.",
        "aliases": [],
        "inference_confidence": 0.93,
        "filename_patterns": [["officer certificate"], ["director certificate"]],
        "mandatory_fields": [],
    },
    {
        "key": "no_default_certificate",
        "label": "No Default Certificate",
        "description": "Standalone certificate confirming no default or event of default is continuing.",
        "aliases": [],
        "inference_confidence": 0.93,
        "filename_patterns": [["no default certificate"], ["default certificate"]],
        "mandatory_fields": [],
    },
    {
        "key": "borrowing_base_certificate",
        "label": "Borrowing Base Certificate",
        "description": "Certificate supporting borrowing base availability for asset-backed or revolving facilities.",
        "aliases": [],
        "inference_confidence": 0.94,
        "filename_patterns": [["borrowing base certificate"], ["borrowing base"]],
        "mandatory_fields": [],
    },
    {
        "key": "budget_business_plan",
        "label": "Budget / Business Plan",
        "description": "Forward-looking annual budget or business plan used as the operating baseline.",
        "aliases": [],
        "inference_confidence": 0.9,
        "filename_patterns": [["business plan"], ["annual budget"], ["operating budget"], ["budget"]],
        "mandatory_fields": [],
    },
    {
        "key": "cash_flow_forecast",
        "label": "Cash Flow Forecast",
        "description": "Forward-looking cash flow or liquidity forecast for the deal or borrower group.",
        "aliases": [],
        "inference_confidence": 0.91,
        "filename_patterns": [["cash flow forecast"], ["liquidity report"], ["liquidity forecast"]],
        "mandatory_fields": [],
    },
    {
        "key": "base_case_model",
        "label": "Base Case Model",
        "description": "Updated financial model or base case projection package used for forecasting and covenant testing.",
        "aliases": [],
        "inference_confidence": 0.9,
        "filename_patterns": [["base case"], ["financial model"], ["updated financial model"]],
        "mandatory_fields": [],
    },
    {
        "key": "insurance_certificate",
        "label": "Insurance Certificate",
        "description": "Insurance certificate, broker report, or related evidence of policy coverage and renewal.",
        "aliases": ["insurance_renewal_bundle"],
        "inference_confidence": 0.82,
        "filename_patterns": [["insurance certificate"], ["broker report"], ["insurance", "renewal"]],
        "mandatory_fields": [],
    },
    {
        "key": "waiver_or_consent_request",
        "label": "Waiver or Consent Request",
        "description": "Formal waiver, consent, or amendment request requiring lender review and response.",
        "aliases": ["waiver_request", "consent_request"],
        "inference_confidence": 0.91,
        "filename_patterns": [["waiver request"], ["waiver"], ["consent request"], ["consent"], ["amendment request"]],
        "mandatory_fields": [],
    },
]

DOCUMENT_TYPES_BY_KEY = {item["key"]: item for item in DOCUMENT_TYPE_DEFINITIONS}
DOCUMENT_TYPE_ALIASES = {
    alias: item["key"]
    for item in DOCUMENT_TYPE_DEFINITIONS
    for alias in item["aliases"]
}


def standardize_document_type(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower().replace(" ", "_")
    if normalized in DOCUMENT_TYPES_BY_KEY:
        return normalized
    return DOCUMENT_TYPE_ALIASES.get(normalized)


def is_valid_document_type(value: str | None) -> bool:
    return standardize_document_type(value) is not None


def get_document_type_definition(value: str | None) -> DocumentTypeDefinition | None:
    standardized = standardize_document_type(value)
    if not standardized:
        return None
    return DOCUMENT_TYPES_BY_KEY[standardized]


def mandatory_fields_for_document_type(value: str | None) -> list[str]:
    definition = get_document_type_definition(value)
    if not definition:
        return []
    return definition["mandatory_fields"]


def missing_mandatory_fields(value: str | None, available_field_keys: set[str] | list[str]) -> list[str]:
    available = set(available_field_keys)
    return [
        field_key
        for field_key in mandatory_fields_for_document_type(value)
        if field_key not in available
    ]


def document_type_reference_data() -> list[dict[str, str]]:
    return [
        {
            "key": item["key"],
            "label": item["label"],
            "description": item["description"],
        }
        for item in DOCUMENT_TYPE_DEFINITIONS
    ]


def infer_standard_document_type(file_name: str) -> tuple[str | None, float]:
    lowered = file_name.lower()
    for item in DOCUMENT_TYPE_DEFINITIONS:
        for patterns in item["filename_patterns"]:
            if all(pattern in lowered for pattern in patterns):
                return item["key"], item["inference_confidence"]
    return None, 0.42
