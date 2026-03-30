from __future__ import annotations

import base64
import hashlib
import json
import logging
import mimetypes
import re
import threading
import uuid as uuid_mod
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from server.artifacts import (
    build_artifact_file_response,
    load_visible_artifact,
)
from server.config import CORS_ORIGIN, INTAKE_DIRECTORY, INTAKE_POLL_SECONDS
from server.database import get_connection
from server.document_types import (
    document_type_reference_data,
    get_document_type_definition,
    infer_standard_document_type,
    is_valid_document_type,
    mandatory_fields_for_document_type,
    missing_mandatory_fields,
    standardize_document_type,
)
from server.extraction import (
    DocumentContext,
    ExtractionResult,
    run_artifact_extraction,
    run_exception_assist_extraction,
)

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

logger = logging.getLogger("sesame.intake")

app = FastAPI(title="Sesame Street Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTAKE_WATCH_STATE = {
    "directory": INTAKE_DIRECTORY,
    "pollSeconds": INTAKE_POLL_SECONDS,
    "lastScanAt": None,
    "lastError": None,
    "trackedFiles": 0,
    "newFilesInLastScan": 0,
}
INTAKE_WATCH_STOP = threading.Event()
INTAKE_WATCH_THREAD: threading.Thread | None = None


def as_number(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def dashboard_forecast_snapshot(summary):
    if not summary:
        return None, 0, None

    monitoring = next(
        (scenario for scenario in summary["scenarios"] if scenario["isMonitoring"]),
        None,
    )
    monitoring_metrics = monitoring["metrics"] if monitoring else {}
    forecasted_dscr = (
        as_number(monitoring_metrics.get("seniorDscr"))
        if monitoring_metrics.get("seniorDscr") is not None
        else None
    )
    summary_text = (
        f"{summary['activeMonitoringCaseName']} · {summary['scenarioCount']} active scenarios"
    )
    return forecasted_dscr, int(summary["scenarioCount"]), summary_text


def log_intake_stage(
    stage: str,
    *,
    incoming_document_id: int,
    file_name: str,
    source_channel: str,
    stage_status: str = "in_progress",
    deal_slug: str | None = None,
    document_type: str | None = None,
    period_label: str | None = None,
    confidence: float | None = None,
    summary: str | None = None,
):
    fields = [
        f"document_id={incoming_document_id}",
        f"stage={stage}",
        f"status={stage_status}",
        f"file={file_name}",
        f"source={source_channel}",
    ]
    if deal_slug:
        fields.append(f"deal={deal_slug}")
    if document_type:
        fields.append(f"type={document_type}")
    if period_label:
        fields.append(f"period={period_label}")
    if confidence is not None:
        fields.append(f"confidence={confidence:.2f}")
    if summary:
        fields.append(f"summary={summary}")
    logger.info("intake_pipeline %s", " ".join(fields))


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def parse_optional_date(value: str | None, *, field_name: str = "date"):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}. Expected YYYY-MM-DD.",
        ) from exc


def portfolio_covenant_status(
    current_value: float | None,
    threshold_lockup: float | None,
    threshold_trigger: float | None,
):
    if current_value is None:
        return "not_assessed"
    if threshold_trigger is not None and current_value < threshold_trigger:
        return "trigger_event"
    if threshold_lockup is not None and current_value < threshold_lockup:
        return "lock_up_risk"
    return "performing"


def portfolio_headroom_pct(current_value: float | None, threshold_lockup: float | None):
    if current_value is None or threshold_lockup in (None, 0):
        return None
    return round(((current_value - threshold_lockup) / threshold_lockup) * 100, 1)


PERMISSION_LABELS = {
    "view_portfolio": "View portfolio",
    "view_deal": "View deal",
    "view_reports": "View reports",
    "view_activity": "View activity",
    "generate_reports": "Generate reports",
    "review_reports": "Review reports",
    "approve_reports": "Approve reports",
    "release_reports": "Release reports",
    "decide_requests": "Decide borrower requests",
    "capture_snapshots": "Capture snapshots",
}


def sort_key_for_obligation_status(status: str):
    priority = {
        "overdue": 0,
        "late_within_grace": 1,
        "approaching": 2,
        "pending_review": 3,
        "fulfilled": 4,
    }
    return priority.get(status, 9)


class TriageRequest(BaseModel):
    action: str
    dealSlug: str | None = None


class OnboardingWorkflowCreateRequest(BaseModel):
    workflowType: str
    workflowStatus: str
    organisationId: int | None = None
    ownerId: int | None = None
    accountId: int | None = None
    dealId: int | None = None
    holdingId: int | None = None
    proposedOrganisationName: str = ""
    proposedOwnerName: str = ""
    proposedAccountName: str = ""
    proposedDealName: str = ""
    proposedHoldingAmount: int | None = None
    ownerName: str
    targetGoLiveDate: str
    summary: str


class DemoClockUpdateRequest(BaseModel):
    currentDemoDate: str
    updatedBy: str
    clockLabel: str | None = None


class IntakeSubmitRequest(BaseModel):
    fileName: str
    contentBase64: str
    dealSlug: str | None = None
    documentType: str | None = None
    sourceChannel: str | None = None
    sender: str | None = None
    subject: str | None = None
    periodLabel: str | None = None


class BorrowerRequestDecisionRequest(BaseModel):
    decisionStatus: str
    decisionSummary: str
    decisionRationale: str
    decidedBy: str
    effectiveFrom: str
    expiresOn: str | None = None


class ForecastVersionActivateRequest(BaseModel):
    activatedBy: str


class MemoPackCreateRequest(BaseModel):
    packKind: str
    generatedBy: str
    borrowerRequestId: int | None = None
    organisationId: int | None = None
    ownerId: int | None = None
    accountId: int | None = None


class ReportExportCreateRequest(BaseModel):
    reportKind: str
    generatedBy: str
    sourceDomain: str | None = None
    organisationId: int | None = None
    ownerId: int | None = None
    accountId: int | None = None


class ReportExportWorkflowRequest(BaseModel):
    actorName: str
    note: str | None = None


class ReportScheduleRunRequest(BaseModel):
    triggeredBy: str


class TopsheetSnapshotCaptureRequest(BaseModel):
    snapshotLabel: str
    snapshotType: str = "manual"
    capturedBy: str
    summary: str | None = None


class SnapshotRecomputeRequest(BaseModel):
    recomputedBy: str


class NotificationDeliveryStateRequest(BaseModel):
    state: str


class NotificationPreferenceUpdateRequest(BaseModel):
    subscriberTeam: str
    inAppEnabled: bool
    digestEnabled: bool
    digestFrequency: str
    escalationOnly: bool
    immediateEnabled: bool
    defaultChannel: str = "in_app"


class NotificationSubscriptionUpdateRequest(BaseModel):
    active: bool
    deliveryFrequency: str
    onlyEscalations: bool


class ProposalUpdateRequest(BaseModel):
    proposedValue: str | None = None
    targetPeriodKey: str | None = None
    dealSlug: str | None = None
    updatedBy: str


class IntakeBatchApprovalRequest(BaseModel):
    approvedBy: str


class ExceptionAssistRequest(BaseModel):
    invokedBy: str


PERIOD_EDITABLE_PROPOSAL_TYPES = {
    "period_match",
    "document_registration",
    "obligation_match",
    "metric_extraction",
}


def append_note(existing: str, addition: str):
    if not existing:
        return addition
    return f"{existing} {addition}"


def format_mandatory_field_list(field_keys: list[str]) -> str:
    return ", ".join(metric_label(field_key) for field_key in field_keys)


def missing_mandatory_fields_for_document(
    conn,
    incoming_document_id: int,
    *,
    document_type: str | None = None,
):
    resolved_document_type = standardize_document_type(document_type)
    if resolved_document_type is None:
        row = conn.execute(
            """
            SELECT document_type
            FROM incoming_documents
            WHERE id = %s
            """,
            (incoming_document_id,),
        ).fetchone()
        resolved_document_type = standardize_document_type(row["document_type"]) if row else None

    mandatory_fields = mandatory_fields_for_document_type(resolved_document_type)
    if not mandatory_fields:
        return []

    field_rows = conn.execute(
        """
        SELECT DISTINCT field_key
        FROM incoming_document_proposals
        WHERE incoming_document_id = %s
          AND proposal_type = 'metric_extraction'
          AND field_key IS NOT NULL
          AND proposal_status <> 'rejected'
          AND routing_decision IN ('auto_commit', 'review')
        """,
        (incoming_document_id,),
    ).fetchall()
    available_field_keys = {
        row["field_key"]
        for row in field_rows
        if row["field_key"]
    }
    return missing_mandatory_fields(resolved_document_type, available_field_keys)


def json_hash(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def normalize_period_key(value: str):
    return value.strip().lower().replace(" ", "-")


def period_label_from_key(value: str):
    normalized = normalize_period_key(value)
    match = re.fullmatch(r"q([1-4])-(20\d{2})", normalized)
    if match:
        return f"Q{match.group(1)} {match.group(2)}"
    return value.strip()


def proposal_supports_target_period(proposal_type: str) -> bool:
    return proposal_type in PERIOD_EDITABLE_PROPOSAL_TYPES


def slugify(value: str):
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "new-deal"


def assessment_component_status(score: int):
    if score >= 80:
        return "strong"
    if score >= 60:
        return "stable"
    if score >= 40:
        return "pressure"
    return "stressed"


def trend_severity_rank(severity: str):
    priority = {
        "alert": 0,
        "concern": 1,
        "watch": 2,
        "stable": 3,
    }
    return priority.get(severity, 9)


def risk_severity_rank(severity: str):
    priority = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }
    return priority.get(severity, 9)


def distribution_status_rank(status: str):
    priority = {
        "blocked": 0,
        "restricted": 1,
        "review_required": 2,
        "allowed": 3,
    }
    return priority.get(status, 9)


def work_priority_rank(priority: str):
    order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
    }
    return order.get(priority, 9)


def work_status_rank(status: str):
    order = {
        "blocked": 0,
        "in_progress": 1,
        "new": 2,
        "resolved": 3,
    }
    return order.get(status, 9)


INTAKE_NORMALIZED_STAGES = [
    "arrived",
    "fingerprinted",
    "classified",
    "matched",
    "validated",
    "exception",
    "review",
    "committed",
    "closed",
    "failed",
]


def review_metric_key(field_name: str):
    if field_name == "senior_dscr":
        return "seniorDscr"
    return field_name


def end_of_day(value, hour: int = 17):
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.replace(hour=hour, minute=0, second=0, microsecond=0)


def to_utc_datetime(value: date | datetime):
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def load_demo_clock(conn):
    row = conn.execute(
        """
        SELECT id, current_demo_date, clock_label, updated_by, updated_at
        FROM demo_clock
        ORDER BY id
        LIMIT 1
        """
    ).fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="Demo clock not configured")
    current_demo_date = row["current_demo_date"]
    return {
        "id": int(row["id"]),
        "currentDemoDate": current_demo_date.isoformat(),
        "clockLabel": row["clock_label"],
        "updatedBy": row["updated_by"],
        "updatedAt": row["updated_at"].isoformat(),
        "_date": current_demo_date,
    }


def cycle_status_rank(status: str):
    order = {
        "blocked": 0,
        "overdue": 1,
        "due_today": 2,
        "ready": 3,
        "due_soon": 4,
        "in_progress": 5,
        "pending": 6,
        "waiting_on_dependency": 7,
        "completed": 8,
    }
    return order.get(status, 9)


def build_cycle_readiness(conn, deal_id: int, cycle_start_date: date, demo_date: date):
    package_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM incoming_documents
        WHERE deal_id = %s
          AND received_at::date <= %s
        """,
        (deal_id, demo_date),
    ).fetchone()
    pending_review_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM review_items
        WHERE deal_id = %s
          AND status = 'pending'
        """,
        (deal_id,),
    ).fetchone()
    unresolved_request_row = conn.execute(
        """
        SELECT
          COUNT(*)::int AS total_open,
          COUNT(*) FILTER (WHERE priority = 'high')::int AS high_priority_open
        FROM borrower_requests
        WHERE deal_id = %s
          AND request_status NOT IN ('approved', 'approved_with_conditions', 'declined', 'closed')
        """,
        (deal_id,),
    ).fetchone()
    risk_row = conn.execute(
        """
        SELECT
          COUNT(*)::int AS total_open,
          COUNT(*) FILTER (WHERE severity = 'high')::int AS high_severity_open
        FROM risk_register_entries
        WHERE deal_id = %s
          AND status <> 'resolved'
        """,
        (deal_id,),
    ).fetchone()
    snapshot_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM deal_topsheet_snapshots
        WHERE deal_id = %s
          AND captured_at::date >= %s
        """,
        (deal_id, cycle_start_date),
    ).fetchone()
    released_report_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM report_exports
        WHERE deal_id = %s
          AND release_status = 'released'
          AND generated_at::date >= %s
        """,
        (deal_id, cycle_start_date),
    ).fetchone()
    overdue_task_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM workflow_tasks
        WHERE deal_id = %s
          AND task_status <> 'resolved'
          AND due_at::date < %s
        """,
        (deal_id, demo_date),
    ).fetchone()
    open_case_row = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM compliance_cases
        WHERE deal_id = %s
          AND status NOT IN ('resolved', 'closed')
        """,
        (deal_id,),
    ).fetchone()

    has_package = int(package_row["count"]) > 0
    pending_reviews = int(pending_review_row["count"])
    open_requests = int(unresolved_request_row["total_open"])
    open_high_priority_requests = int(unresolved_request_row["high_priority_open"])
    open_high_risks = int(risk_row["high_severity_open"])
    open_cases = int(open_case_row["count"])
    overdue_tasks = int(overdue_task_row["count"])
    snapshots_captured = int(snapshot_row["count"])
    released_reports = int(released_report_row["count"])
    review_ready = has_package and pending_reviews == 0
    committee_ready = (
        review_ready
        and open_high_priority_requests == 0
        and open_high_risks == 0
        and open_cases == 0
    )
    release_ready = committee_ready and overdue_tasks == 0 and snapshots_captured > 0
    return {
        "hasPackage": has_package,
        "pendingReviews": pending_reviews,
        "openRequests": open_requests,
        "openHighPriorityRequests": open_high_priority_requests,
        "openHighRisks": open_high_risks,
        "openCases": open_cases,
        "overdueTasks": overdue_tasks,
        "snapshotsCaptured": snapshots_captured,
        "releasedReports": released_reports,
        "reviewReady": review_ready,
        "committeeReady": committee_ready,
        "releaseReady": release_ready,
    }


def derive_cycle_event_status(row, readiness: dict, demo_date: date):
    if row["completed_at"]:
        return "completed"

    scheduled_date = row["scheduled_for"].date()
    days_to_due = (scheduled_date - demo_date).days
    event_key = row["event_key"]

    if event_key == "package_expected":
        if readiness["hasPackage"]:
            return "completed"
        if days_to_due < 0:
            return "overdue"
        if days_to_due == 0:
            return "due_today"
        if days_to_due <= 3:
            return "due_soon"
        return "pending"

    if event_key == "internal_review":
        if readiness["reviewReady"] and days_to_due <= 0:
            return "completed"
        if readiness["reviewReady"]:
            return "ready"
        if not readiness["hasPackage"]:
            return "waiting_on_dependency"
        if readiness["pendingReviews"] > 0 and days_to_due < 0:
            return "overdue"
        if readiness["pendingReviews"] > 0 and days_to_due <= 0:
            return "in_progress"
        if readiness["pendingReviews"] > 0 and days_to_due <= 2:
            return "due_soon"
        return "pending"

    if event_key == "committee_readiness":
        if readiness["committeeReady"]:
            return "ready"
        if not readiness["reviewReady"] or readiness["openHighPriorityRequests"] > 0:
            return "blocked"
        if readiness["openHighRisks"] > 0 or readiness["openCases"] > 0:
            return "blocked"
        if days_to_due < 0:
            return "overdue"
        if days_to_due == 0:
            return "due_today"
        if days_to_due <= 3:
            return "due_soon"
        return "pending"

    if event_key == "report_release":
        if readiness["releasedReports"] > 0:
            return "completed"
        if not readiness["releaseReady"]:
            return "waiting_on_dependency"
        if days_to_due < 0:
            return "overdue"
        if days_to_due <= 0:
            return "ready"
        if days_to_due <= 3:
            return "due_soon"
        return "pending"

    return row["event_status"]


def derive_cycle_status(cycle_row, event_rows, readiness: dict):
    statuses = [item["status"] for item in event_rows]
    if cycle_row["completed_at"]:
        return "complete"
    if all(status == "completed" for status in statuses):
        return "complete"
    if any(status == "blocked" for status in statuses):
        return "blocked"
    if any(status == "overdue" for status in statuses):
        return "overdue"
    if any(status == "ready" for status in statuses):
        return "ready_for_release"
    if readiness["hasPackage"]:
        return "in_review" if not readiness["reviewReady"] else "in_progress"
    return "awaiting_package"


def serialize_cycle_event(row, status: str):
    return {
        "id": int(row["id"]),
        "eventKey": row["event_key"],
        "eventLabel": row["event_label"],
        "stageKey": row["stage_key"],
        "status": status,
        "scheduledFor": row["scheduled_for"].isoformat(),
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
        "ownerName": row["owner_name"],
        "dependencyKey": row["dependency_key"],
        "sourceEntityType": row["source_entity_type"],
        "sourceEntityId": row["source_entity_id"],
        "detailText": row["detail_text"],
    }


def load_monitoring_cycles(
    conn,
    *,
    demo_date: date,
    deal_ids: list[int] | None = None,
):
    params = []
    query = """
        SELECT mc.*, d.slug AS deal_slug, d.name AS deal_name, d.grade, d.watchlist
        FROM monitoring_cycles mc
        JOIN deals d ON d.id = mc.deal_id
    """
    if deal_ids:
        query += f" WHERE mc.deal_id IN ({sql_placeholders(deal_ids)})"
        params.extend(deal_ids)
    query += " ORDER BY mc.report_release_date, d.name"
    cycle_rows = conn.execute(query, tuple(params)).fetchall()
    if not cycle_rows:
        return []

    cycle_ids = [int(row["id"]) for row in cycle_rows]
    event_rows = conn.execute(
        f"""
        SELECT *
        FROM monitoring_cycle_events
        WHERE monitoring_cycle_id IN ({sql_placeholders(cycle_ids)})
        ORDER BY scheduled_for, id
        """,
        tuple(cycle_ids),
    ).fetchall()

    serialized = []
    for cycle_row in cycle_rows:
        cycle_event_rows = [
            row
            for row in event_rows
            if int(row["monitoring_cycle_id"]) == int(cycle_row["id"])
        ]
        readiness = build_cycle_readiness(
            conn,
            int(cycle_row["deal_id"]),
            cycle_row["start_date"],
            demo_date,
        )
        events = [
            serialize_cycle_event(row, derive_cycle_event_status(row, readiness, demo_date))
            for row in cycle_event_rows
        ]
        status = derive_cycle_status(cycle_row, events, readiness)
        serialized.append(
            {
                "id": int(cycle_row["id"]),
                "dealId": int(cycle_row["deal_id"]),
                "dealSlug": cycle_row["deal_slug"],
                "dealName": cycle_row["deal_name"],
                "dealGrade": cycle_row["grade"],
                "watchlist": cycle_row["watchlist"],
                "cycleKey": cycle_row["cycle_key"],
                "cycleLabel": cycle_row["cycle_label"],
                "cycleType": cycle_row["cycle_type"],
                "cycleStatus": status,
                "ownerName": cycle_row["owner_name"],
                "startDate": cycle_row["start_date"].isoformat(),
                "packageDueDate": cycle_row["package_due_date"].isoformat(),
                "internalReviewDueDate": cycle_row["internal_review_due_date"].isoformat(),
                "committeeDate": cycle_row["committee_date"].isoformat(),
                "reportReleaseDate": cycle_row["report_release_date"].isoformat(),
                "summary": cycle_row["summary"],
                "completedAt": (
                    cycle_row["completed_at"].isoformat()
                    if cycle_row["completed_at"]
                    else None
                ),
                "readiness": readiness,
                "events": events,
            }
        )
    return serialized


def build_cycle_alerts(cycles: list[dict]):
    alerts = []
    for cycle in cycles:
        for event in cycle["events"]:
            if event["status"] not in {"overdue", "blocked", "due_today", "ready"}:
                continue
            priority = "high" if event["status"] in {"overdue", "blocked"} else "medium"
            alerts.append(
                {
                    "id": f"cycle-{cycle['id']}-{event['eventKey']}",
                    "dealSlug": cycle["dealSlug"],
                    "dealName": cycle["dealName"],
                    "priority": priority,
                    "title": event["eventLabel"],
                    "summary": event["detailText"] or cycle["summary"],
                    "status": event["status"],
                    "scheduledFor": event["scheduledFor"],
                }
            )
    alerts.sort(
        key=lambda item: (
            cycle_status_rank(item["status"]),
            item["scheduledFor"],
            item["dealName"],
        )
    )
    return alerts


def file_sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_file_text(value: str):
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def allocate_intake_file_path(intake_path: Path, file_name: str):
    candidate_name = Path(file_name).name.strip()
    if not candidate_name:
        candidate_name = "incoming-document.bin"
    stem = Path(candidate_name).stem
    suffix = Path(candidate_name).suffix
    candidate = intake_path / candidate_name
    counter = 1
    while candidate.exists():
        candidate = intake_path / f"{stem}-{counter}{suffix}"
        counter += 1
    return candidate


def infer_period_label(file_name: str):
    match = re.search(r"(Q[1-4])[\s_-]?(20\d{2})", file_name, re.IGNORECASE)
    if not match:
        return None, None
    quarter = match.group(1).upper()
    year = match.group(2)
    return f"{quarter} {year}", 0.96


def infer_document_type(file_name: str):
    lowered = file_name.lower()
    rules = [
        ("compliance_certificate", 0.98, ["compliance certificate"]),
        ("management_accounts", 0.96, ["management accounts"]),
        ("audited_financials", 0.95, ["audited", "financial"]),
        ("waiver_request", 0.91, ["waiver"]),
        ("consent_request", 0.91, ["consent"]),
        ("insurance_renewal_bundle", 0.68, ["insurance", "renewal"]),
        ("construction_certificate", 0.88, ["construction certificate"]),
    ]
    for document_type, confidence, patterns in rules:
        if all(pattern in lowered for pattern in patterns):
            return document_type, confidence
    if "certificate" in lowered:
        return "certificate_bundle", 0.74
    return None, 0.42


def match_deal_from_file_name(conn, file_name: str):
    normalized = normalize_file_text(file_name)
    deal_rows = conn.execute(
        """
        SELECT id, slug, name
        FROM deals
        ORDER BY id
        """
    ).fetchall()

    best_match = None
    best_score = 0.0
    best_term = None

    for row in deal_rows:
        candidate_terms = {
            row["slug"].lower(),
            normalize_file_text(row["slug"]),
            normalize_file_text(row["name"]),
            normalize_file_text(row["name"].split()[0]),
        }
        for term in candidate_terms:
            if not term:
                continue
            if term in normalized:
                score = 0.99 if term == row["slug"].lower() else 0.82 + min(len(term), 16) / 100
                if score > best_score:
                    best_match = row
                    best_score = score
                    best_term = term

    if not best_match:
        return None, None, None
    return int(best_match["id"]), best_match["slug"], min(best_score, 0.99)


def select_intake_obligation(conn, deal_id: int, document_type: str | None):
    if document_type in {"compliance_certificate", "construction_certificate"}:
        row = conn.execute(
            """
            SELECT id, title
            FROM obligations
            WHERE deal_id = %s
              AND status IN ('overdue', 'approaching', 'late_within_grace')
            ORDER BY due_date, id
            LIMIT 1
            """,
            (deal_id,),
        ).fetchone()
        if row:
            return int(row["id"])
    return None


def create_processing_run(
    conn,
    incoming_document_id: int,
    stage_name: str,
    stage_status: str,
    processor_type: str,
    started_at: datetime,
    completed_at: datetime | None,
    confidence: float | None,
    summary: str,
):
    row = conn.execute(
        """
        INSERT INTO document_processing_runs (
          incoming_document_id,
          stage_name,
          stage_status,
          processor_type,
          started_at,
          completed_at,
          confidence,
          summary
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            incoming_document_id,
            stage_name,
            stage_status,
            processor_type,
            started_at,
            completed_at,
            confidence,
            summary,
        ),
    ).fetchone()
    return int(row["id"])


def create_document_proposal(
    conn,
    incoming_document_id: int,
    proposal_type: str,
    field_key: str | None,
    field_label: str,
    proposed_value: str,
    confidence: float | None,
    citation_reference: str | None,
    proposal_status: str,
    created_by: str,
    created_at: datetime,
    target_entity_type: str = "document_metadata",
    target_metric_key: str | None = None,
    target_period_key: str | None = None,
    validation_status: str = "not_validated",
    validation_summary: str = "",
    validation_messages: list[dict] | None = None,
    routing_decision: str = "triage",
    commit_action: str = "none",
    committed_entity_type: str | None = None,
    committed_entity_id: int | None = None,
    committed_at: datetime | None = None,
    committed_by: str | None = None,
):
    row = conn.execute(
        """
        INSERT INTO incoming_document_proposals (
          incoming_document_id,
          proposal_type,
          field_key,
          field_label,
          proposed_value,
          confidence,
          citation_reference,
          proposal_status,
          target_entity_type,
          target_metric_key,
          target_period_key,
          validation_status,
          validation_summary,
          validation_messages,
          routing_decision,
          commit_action,
          committed_entity_type,
          committed_entity_id,
          committed_at,
          committed_by,
          created_by,
          created_at
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s,
          %s, %s
        )
        RETURNING id
        """,
        (
            incoming_document_id,
            proposal_type,
            field_key,
            field_label,
            proposed_value,
            confidence,
            citation_reference,
            proposal_status,
            target_entity_type,
            target_metric_key,
            target_period_key,
            validation_status,
            validation_summary,
            json.dumps(validation_messages or []),
            routing_decision,
            commit_action,
            committed_entity_type,
            committed_entity_id,
            committed_at,
            committed_by,
            created_by,
            created_at,
        ),
    ).fetchone()
    return int(row["id"])


def record_ai_audit_log(
    conn,
    *,
    incoming_document_id: int | None,
    processing_run_id: int | None,
    proposal_id: int | None,
    ai_stage: str,
    actor_label: str,
    model_name: str,
    model_version: str,
    prompt_template: str,
    confidence: float | None,
    summary: str,
    retrieved_context: list[dict] | None = None,
    tool_calls: list[dict] | None = None,
    created_at: datetime | None = None,
):
    row = conn.execute(
        """
        INSERT INTO ai_audit_logs (
          incoming_document_id,
          processing_run_id,
          proposal_id,
          ai_stage,
          actor_label,
          model_name,
          model_version,
          prompt_template,
          retrieved_context,
          tool_calls,
          confidence,
          summary,
          created_at
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s
        )
        RETURNING id
        """,
        (
            incoming_document_id,
            processing_run_id,
            proposal_id,
            ai_stage,
            actor_label,
            model_name,
            model_version,
            prompt_template,
            json.dumps(retrieved_context or []),
            json.dumps(tool_calls or []),
            confidence,
            summary,
            created_at or datetime.now(timezone.utc),
        ),
    ).fetchone()
    return int(row["id"])


def create_evidence_citation(
    conn,
    *,
    incoming_document_id: int | None = None,
    canonical_document_id: int | None = None,
    proposal_id: int | None = None,
    review_item_id: int | None = None,
    citation_label: str,
    citation_kind: str,
    page_number: int | None = None,
    table_label: str | None = None,
    cell_reference: str | None = None,
    bounding_box: dict | None = None,
    field_key: str | None = None,
    text_snippet: str,
):
    row = conn.execute(
        """
        INSERT INTO evidence_citations (
          incoming_document_id,
          canonical_document_id,
          proposal_id,
          review_item_id,
          citation_label,
          citation_kind,
          page_number,
          table_label,
          cell_reference,
          bounding_box,
          field_key,
          text_snippet
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s
        )
        RETURNING id
        """,
        (
            incoming_document_id,
            canonical_document_id,
            proposal_id,
            review_item_id,
            citation_label,
            citation_kind,
            page_number,
            table_label,
            cell_reference,
            json.dumps(bounding_box or {}),
            field_key,
            text_snippet,
        ),
    ).fetchone()
    return int(row["id"])


def load_intake_ai_audit_logs(conn, incoming_document_ids: list[int]):
    if not incoming_document_ids:
        return []
    placeholders = sql_placeholders(incoming_document_ids)
    return conn.execute(
        f"""
        SELECT *
        FROM ai_audit_logs
        WHERE incoming_document_id IN ({placeholders})
        ORDER BY created_at DESC, id DESC
        """,
        tuple(incoming_document_ids),
    ).fetchall()


def load_intake_evidence_citations(conn, incoming_document_ids: list[int]):
    if not incoming_document_ids:
        return []
    placeholders = sql_placeholders(incoming_document_ids)
    return conn.execute(
        f"""
        SELECT *
        FROM evidence_citations
        WHERE incoming_document_id IN ({placeholders})
        ORDER BY page_number NULLS LAST, id ASC
        """,
        tuple(incoming_document_ids),
    ).fetchall()


def serialize_ai_audit_log(row):
    return {
        "id": int(row["id"]),
        "processingRunId": (
            int(row["processing_run_id"]) if row["processing_run_id"] is not None else None
        ),
        "proposalId": int(row["proposal_id"]) if row["proposal_id"] is not None else None,
        "aiStage": row["ai_stage"],
        "actorLabel": row["actor_label"],
        "modelName": row["model_name"],
        "modelVersion": row["model_version"],
        "promptTemplate": row["prompt_template"],
        "retrievedContext": row["retrieved_context"],
        "toolCalls": row["tool_calls"],
        "confidence": as_number(row["confidence"]),
        "summary": row["summary"],
        "createdAt": row["created_at"].isoformat(),
    }


def serialize_evidence_citation(row):
    return {
        "id": int(row["id"]),
        "incomingDocumentId": (
            int(row["incoming_document_id"])
            if row["incoming_document_id"] is not None
            else None
        ),
        "canonicalDocumentId": (
            int(row["canonical_document_id"])
            if row["canonical_document_id"] is not None
            else None
        ),
        "proposalId": int(row["proposal_id"]) if row["proposal_id"] is not None else None,
        "reviewItemId": int(row["review_item_id"]) if row["review_item_id"] is not None else None,
        "citationLabel": row["citation_label"],
        "citationKind": row["citation_kind"],
        "pageNumber": int(row["page_number"]) if row["page_number"] else None,
        "tableLabel": row["table_label"],
        "cellReference": row["cell_reference"],
        "boundingBox": row["bounding_box"],
        "fieldKey": row["field_key"],
        "textSnippet": row["text_snippet"],
        "createdAt": row["created_at"].isoformat(),
    }


def record_snapshot_provenance(
    conn,
    *,
    snapshot_id: int,
    provenance_kind: str,
    source_entity_type: str,
    source_entity_id: int | None,
    source_label: str,
    payload: dict | None = None,
    source_event_id: int | None = None,
    created_at: datetime | None = None,
):
    conn.execute(
        """
        INSERT INTO topsheet_snapshot_provenance (
          snapshot_id,
          provenance_kind,
          source_entity_type,
          source_entity_id,
          source_label,
          source_event_id,
          payload,
          created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
        """,
        (
            snapshot_id,
            provenance_kind,
            source_entity_type,
            source_entity_id,
            source_label,
            source_event_id,
            json.dumps(payload or {}),
            created_at or datetime.now(timezone.utc),
        ),
    )


def load_snapshot_provenance(conn, snapshot_ids: list[int]):
    if not snapshot_ids:
        return []
    placeholders = sql_placeholders(snapshot_ids)
    return conn.execute(
        f"""
        SELECT tsp.*
        FROM topsheet_snapshot_provenance tsp
        WHERE tsp.snapshot_id IN ({placeholders})
        ORDER BY tsp.created_at DESC, tsp.id DESC
        """,
        tuple(snapshot_ids),
    ).fetchall()


def load_snapshot_recomputations(conn, snapshot_ids: list[int]):
    if not snapshot_ids:
        return []
    placeholders = sql_placeholders(snapshot_ids)
    return conn.execute(
        f"""
        SELECT *
        FROM snapshot_recomputations
        WHERE snapshot_id IN ({placeholders})
        ORDER BY recomputed_at DESC, id DESC
        """,
        tuple(snapshot_ids),
    ).fetchall()


def normalized_intake_stage(row, stage_timeline):
    current_stage = row["current_stage"]
    processing_status = row["processing_status"]
    classification_status = row["classification_status"]

    if processing_status == "committed" or current_stage == "committed":
        return "committed"

    if current_stage == "closed":
        return "closed"

    if processing_status == "exception" or current_stage == "exception":
        return "exception"

    if (
        any(item["stageStatus"] == "failed" for item in stage_timeline)
        or classification_status == "needs_triage"
    ):
        return "failed"

    if current_stage == "review" or processing_status == "in_review":
        return "review"

    if any(item["stageName"] == "validation" for item in stage_timeline):
        return "validated"

    if any(item["stageName"] == "matching" for item in stage_timeline):
        return "matched"

    if any(
        item["stageName"] == "classification" and item["stageStatus"] == "completed"
        for item in stage_timeline
    ):
        return "classified"

    if row["fingerprinted_at"]:
        return "fingerprinted"

    return "arrived"


def intake_summary_text(
    deal_slug: str | None,
    document_type: str | None,
    period_label: str | None,
):
    parts = []
    if document_type:
        parts.append(document_type.replace("_", " "))
    if deal_slug:
        parts.append(f"for {deal_slug.replace('-', ' ')}")
    if period_label:
        parts.append(period_label)
    return " ".join(parts) if parts else "Unclassified intake document"


EXTRACTABLE_DOCUMENT_TYPES = {
    "compliance_certificate": ["seniorDscr", "cfads", "revenue"],
    "management_accounts": ["revenue", "ebitda", "cfads", "seniorDscr"],
    "audited_financials": ["revenue", "ebitda", "cfads", "seniorDscr"],
}


METRIC_LABELS = {
    "revenue": "Revenue",
    "ebitda": "EBITDA",
    "cfads": "CFADS",
    "seniorDscr": "Senior DSCR",
    "leasedCapacityPct": "Leased capacity",
    "constructionCompletionPct": "Construction completion",
}


def metric_label(metric_key: str):
    return METRIC_LABELS.get(metric_key, metric_key.replace("_", " "))


def format_metric_value(metric_key: str, value: float):
    if metric_key == "seniorDscr":
        return f"{value:.2f}x"
    if metric_key.endswith("Pct"):
        return f"{round(value, 1):g}%"
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}m"
    if abs(value) >= 1_000:
        return f"${value / 1_000:.1f}k"
    return f"${value:,.0f}"


def parse_metric_value(metric_key: str, value: str):
    normalized = value.strip().lower()
    multiplier = 1.0
    if normalized.endswith("m"):
        multiplier = 1_000_000
        normalized = normalized[:-1]
    elif normalized.endswith("k"):
        multiplier = 1_000
        normalized = normalized[:-1]
    cleaned = normalized.replace("$", "").replace(",", "").replace("x", "").replace("%", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned) * multiplier
    except ValueError:
        return None


def period_end_for_label(period_label: str, fallback_date: date):
    match = re.fullmatch(r"Q([1-4])\s+(20\d{2})", period_label.strip(), re.IGNORECASE)
    if not match:
        return fallback_date
    quarter = int(match.group(1))
    year = int(match.group(2))
    month_day = {
        1: (3, 31),
        2: (6, 30),
        3: (9, 30),
        4: (12, 31),
    }
    month, day = month_day[quarter]
    return date(year, month, day)


def load_latest_period_row(conn, deal_id: int):
    return conn.execute(
        """
        SELECT *
        FROM financial_periods
        WHERE deal_id = %s
        ORDER BY period_end DESC, id DESC
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()


def load_period_row_by_key(conn, deal_id: int, period_key: str):
    return conn.execute(
        """
        SELECT *
        FROM financial_periods
        WHERE deal_id = %s AND period_key = %s
        LIMIT 1
        """,
        (deal_id, period_key),
    ).fetchone()


def synthesized_metric_value(metric_key: str, base_value: float, file_name: str):
    seed = int(hashlib.sha256(f"{file_name}:{metric_key}".encode("utf-8")).hexdigest()[:8], 16)
    offset = (seed % 5) - 2
    if metric_key == "seniorDscr":
        return round(max(base_value + (offset * 0.03), 0.9), 2)
    if metric_key.endswith("Pct"):
        return round(min(max(base_value + (offset * 1.5), 0), 100), 1)
    return round(max(base_value + (offset * 250_000), 100_000), 2)


def build_metric_extraction_spec(field, *, period_label: str | None):
    return {
        "proposalType": "metric_extraction",
        "fieldKey": field.field_key,
        "fieldLabel": field.field_label,
        "proposedValue": field.proposed_value,
        "confidence": field.confidence,
        "citationReference": field.citation.kind,
        "citationKind": field.citation.kind,
        "citationPageNumber": field.citation.page_number,
        "targetEntityType": "financial_period",
        "targetMetricKey": field.field_key,
        "targetPeriodKey": normalize_period_key(period_label) if period_label else None,
        "commitAction": "upsert_period_metric",
        "textSnippet": field.citation.text_snippet,
        "rationale": field.rationale,
    }


def build_extraction_proposal_specs(
    conn,
    *,
    incoming_document_id: int,
    deal_id: int | None,
    matched_obligation_id: int | None,
    document_type: str | None,
    period_label: str | None,
    file_name: str,
    extraction_result: ExtractionResult | None = None,
):
    specs = [
        {
            "proposalType": "document_registration",
            "fieldKey": "canonicalDocument",
            "fieldLabel": "Canonical document record",
            "proposedValue": file_name,
            "confidence": 0.99 if deal_id else 0.0,
            "citationReference": "watcher",
            "targetEntityType": "document",
            "targetMetricKey": None,
            "targetPeriodKey": normalize_period_key(period_label) if period_label else None,
            "commitAction": "ensure_canonical_document",
            "textSnippet": f"{file_name} should be promoted into the canonical document register.",
        }
    ]

    if matched_obligation_id:
        obligation = conn.execute(
            """
            SELECT title
            FROM obligations
            WHERE id = %s
            """,
            (matched_obligation_id,),
        ).fetchone()
        specs.append(
            {
                "proposalType": "obligation_match",
                "fieldKey": "matchedObligation",
                "fieldLabel": "Matched obligation",
                "proposedValue": obligation["title"] if obligation else "Matched obligation",
                "confidence": 0.96,
                "citationReference": "filename",
                "targetEntityType": "obligation_fulfilment",
                "targetMetricKey": None,
                "targetPeriodKey": normalize_period_key(period_label) if period_label else None,
                "commitAction": "upsert_obligation_fulfilment",
                "textSnippet": f"{file_name} is matched to the due monitoring obligation.",
            }
        )

    if extraction_result is not None:
        for field in extraction_result.fields:
            specs.append(build_metric_extraction_spec(field, period_label=period_label))
        return specs

    if not deal_id or not document_type or not period_label:
        return specs

    target_period_key = normalize_period_key(period_label)
    period_row = load_period_row_by_key(conn, deal_id, target_period_key) or load_latest_period_row(
        conn, deal_id
    )
    deal_row = conn.execute(
        "SELECT metrics FROM deals WHERE id = %s",
        (deal_id,),
    ).fetchone()
    reported_metrics = (period_row["reported_metrics"] if period_row else {}) or {}
    expected_metrics = (period_row["expected_metrics"] if period_row else {}) or {}
    deal_metrics = (deal_row["metrics"] if deal_row else {}) or {}

    for metric_key in EXTRACTABLE_DOCUMENT_TYPES.get(document_type, []):
        base_value = reported_metrics.get(metric_key)
        if base_value is None:
            base_value = expected_metrics.get(metric_key)
        if base_value is None:
            base_value = deal_metrics.get(metric_key)
        if base_value is None:
            base_value = 1.3 if metric_key == "seniorDscr" else 10_000_000
        synthesized_value = synthesized_metric_value(metric_key, float(base_value), file_name)
        specs.append(
            {
                "proposalType": "metric_extraction",
                "fieldKey": metric_key,
                "fieldLabel": metric_label(metric_key),
                "proposedValue": format_metric_value(metric_key, synthesized_value),
                "confidence": 0.95 if metric_key != "seniorDscr" else 0.92,
                "citationReference": "page_1",
                "targetEntityType": "financial_period",
                "targetMetricKey": metric_key,
                "targetPeriodKey": target_period_key,
                "commitAction": "upsert_period_metric",
                "textSnippet": f"{metric_label(metric_key)} was extracted from {file_name}.",
            }
        )
    return specs


def validate_proposal_spec(conn, *, deal_id: int | None, spec: dict):
    messages = []
    if spec["proposalType"] == "document_registration":
        if not deal_id:
            return ("failed", "Cannot create a canonical document until the intake item is matched to a deal.", [{"code": "missing_deal"}], "triage")
        return ("valid", "Canonical document can be created immediately.", [], "auto_commit")

    if spec["proposalType"] == "obligation_match":
        if not deal_id:
            return ("failed", "Obligation fulfilment cannot be recorded before the document is matched to a deal.", [{"code": "missing_deal"}], "triage")
        return ("valid", "Matched obligation can be fulfilled from this intake package.", [], "auto_commit")

    if spec["proposalType"] == "metric_extraction":
        if not deal_id:
            return ("failed", "Metric extraction needs a matched deal before it can be validated.", [{"code": "missing_deal"}], "triage")
        if not spec["targetPeriodKey"]:
            return ("failed", "Metric extraction needs a reporting period before it can be committed.", [{"code": "missing_period"}], "triage")
        proposed_numeric = parse_metric_value(spec["fieldKey"], spec["proposedValue"])
        if proposed_numeric is None:
            return ("failed", "The extracted metric value could not be parsed into a canonical number.", [{"code": "invalid_value"}], "triage")

        baseline_period = load_period_row_by_key(conn, deal_id, spec["targetPeriodKey"]) or load_latest_period_row(
            conn, deal_id
        )
        expected_value = None
        prior_value = None
        if baseline_period:
            reported_metrics = (baseline_period["reported_metrics"] or {})
            expected_metrics = (baseline_period["expected_metrics"] or {})
            prior_value = reported_metrics.get(spec["targetMetricKey"])
            expected_value = expected_metrics.get(spec["targetMetricKey"], prior_value)
        if expected_value is None:
            expected_value = proposed_numeric

        tolerance_pct = 3.0 if spec["fieldKey"] == "seniorDscr" else 5.0
        variance_pct = (
            abs((proposed_numeric - float(expected_value)) / float(expected_value) * 100)
            if expected_value not in (None, 0)
            else 0
        )
        messages.append(
            {
                "code": "variance_check",
                "expectedValue": expected_value,
                "priorValue": prior_value,
                "variancePct": round(variance_pct, 2),
                "tolerancePct": tolerance_pct,
            }
        )
        if spec["confidence"] is None or spec["confidence"] < 0.75:
            return ("failed", "Confidence is too low for this extracted metric to flow downstream.", messages, "triage")
        if variance_pct >= tolerance_pct or spec["confidence"] < 0.93:
            return ("valid_with_attention", "Metric extracted cleanly but requires reviewer approval before commit.", messages, "review")
        return ("valid", "Metric passes validation and can be committed automatically.", messages, "auto_commit")

    return ("valid", "Proposal is informational only.", [], "auto_commit")


def update_document_proposal_state(
    conn,
    proposal_id: int,
    *,
    proposal_status: str,
    validation_status: str,
    validation_summary: str,
    validation_messages: list[dict],
    routing_decision: str,
):
    conn.execute(
        """
        UPDATE incoming_document_proposals
        SET proposal_status = %s,
            validation_status = %s,
            validation_summary = %s,
            validation_messages = %s::jsonb,
            routing_decision = %s
        WHERE id = %s
        """,
        (
            proposal_status,
            validation_status,
            validation_summary,
            json.dumps(validation_messages),
            routing_decision,
            proposal_id,
        ),
    )


def ensure_canonical_document_for_intake(conn, incoming_document_id: int, actor_name: str):
    row = conn.execute(
        """
        SELECT
          doc.id,
          doc.deal_id,
          doc.canonical_document_id,
          doc.file_name,
          doc.document_type,
          doc.period_label,
          doc.received_at,
          doc.notes
        FROM incoming_documents doc
        WHERE doc.id = %s
        FOR UPDATE
        """,
        (incoming_document_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Incoming document not found")
    if row["canonical_document_id"]:
        return int(row["canonical_document_id"])

    document_row = conn.execute(
        """
        INSERT INTO documents (
          deal_id,
          document_type,
          document_name,
          period_label,
          status,
          received_at,
          evidence_page,
          snippet
        ) VALUES (%s, %s, %s, %s, 'ingested', %s, 1, %s)
        RETURNING id
        """,
        (
            row["deal_id"],
            row["document_type"] or "incoming_document",
            row["file_name"],
            row["period_label"] or "Unassigned",
            row["received_at"],
            f"Canonical document created from intake by {actor_name}.",
        ),
    ).fetchone()
    canonical_document_id = int(document_row["id"])
    conn.execute(
        """
        UPDATE incoming_documents
        SET canonical_document_id = %s,
            last_updated_at = NOW(),
            notes = %s
        WHERE id = %s
        """,
        (
            canonical_document_id,
            append_note(row["notes"], f"Canonical document created by {actor_name}."),
            incoming_document_id,
        ),
    )
    create_evidence_citation(
        conn,
        incoming_document_id=incoming_document_id,
        canonical_document_id=canonical_document_id,
        citation_label="Canonical document record",
        citation_kind="system_record",
        field_key="canonicalDocument",
        text_snippet=f"{row['file_name']} was promoted into the canonical document register.",
    )
    return canonical_document_id


def ensure_financial_period_for_intake(
    conn,
    *,
    deal_id: int,
    period_label: str,
    canonical_document_id: int,
    summary: str,
):
    period_key = normalize_period_key(period_label)
    row = load_period_row_by_key(conn, deal_id, period_key)
    if row:
        conn.execute(
            """
            UPDATE financial_periods
            SET source_document_id = %s,
                summary = %s
            WHERE id = %s
            """,
            (canonical_document_id, summary, int(row["id"])),
        )
        refreshed = load_period_row_by_key(conn, deal_id, period_key)
        return int(refreshed["id"]), refreshed

    latest_period = load_latest_period_row(conn, deal_id)
    expected_metrics = {}
    if latest_period and latest_period["expected_metrics"]:
        expected_metrics = latest_period["expected_metrics"]
    elif latest_period and latest_period["reported_metrics"]:
        expected_metrics = latest_period["reported_metrics"]
    period_end = period_end_for_label(period_label, date.today())
    inserted = conn.execute(
        """
        INSERT INTO financial_periods (
          deal_id,
          period_key,
          period_label,
          period_end,
          source_document_id,
          status,
          summary,
          reported_metrics,
          expected_metrics
        ) VALUES (%s, %s, %s, %s, %s, 'under_review', %s, %s::jsonb, %s::jsonb)
        RETURNING *
        """,
        (
            deal_id,
            period_key,
            period_label,
            period_end,
            canonical_document_id,
            summary,
            json.dumps({}),
            json.dumps(expected_metrics),
        ),
    ).fetchone()
    return int(inserted["id"]), inserted


def upsert_financial_variance(
    conn,
    *,
    financial_period_id: int,
    metric_key: str,
    reported_value: float,
    expected_value: float | None,
):
    expected = float(expected_value) if expected_value is not None else reported_value
    variance_value = round(reported_value - expected, 2)
    variance_pct = round((variance_value / expected * 100), 2) if expected not in (0, None) else 0
    direction = "flat"
    if variance_value > 0:
        direction = "up"
    elif variance_value < 0:
        direction = "down"
    materiality = "major" if abs(variance_pct) >= 8 else "moderate" if abs(variance_pct) >= 4 else "minor"
    existing = conn.execute(
        """
        SELECT id
        FROM financial_variances
        WHERE financial_period_id = %s AND metric_key = %s
        LIMIT 1
        """,
        (financial_period_id, metric_key),
    ).fetchone()
    commentary = f"{metric_label(metric_key)} updated from document extraction."
    if existing:
        conn.execute(
            """
            UPDATE financial_variances
            SET metric_label = %s,
                reported_value = %s,
                expected_value = %s,
                variance_value = %s,
                variance_pct = %s,
                direction = %s,
                materiality = %s,
                commentary = %s
            WHERE id = %s
            """,
            (
                metric_label(metric_key),
                reported_value,
                expected,
                variance_value,
                variance_pct,
                direction,
                materiality,
                commentary,
                int(existing["id"]),
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO financial_variances (
              financial_period_id,
              metric_key,
              metric_label,
              reported_value,
              expected_value,
              variance_value,
              variance_pct,
              direction,
              materiality,
              commentary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                financial_period_id,
                metric_key,
                metric_label(metric_key),
                reported_value,
                expected,
                variance_value,
                variance_pct,
                direction,
                materiality,
                commentary,
            ),
        )


def upsert_ratio_reconciliation(
    conn,
    *,
    deal_id: int,
    financial_period_id: int,
    source_document_id: int,
    metric_key: str,
    borrower_reported_value: float,
    review_item_id: int | None,
    reconciliation_status: str,
):
    platform_row = conn.execute(
        """
        SELECT current_value
        FROM covenants
        WHERE deal_id = %s AND LOWER(name) LIKE '%%dscr%%'
        ORDER BY id
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()
    platform_value = float(platform_row["current_value"]) if platform_row else round(borrower_reported_value - 0.03, 4)
    variance_value = round(borrower_reported_value - platform_value, 4)
    variance_pct = round((variance_value / platform_value * 100), 2) if platform_value else 0
    existing = conn.execute(
        """
        SELECT id
        FROM ratio_reconciliations
        WHERE deal_id = %s
          AND financial_period_id = %s
          AND metric_key = %s
        LIMIT 1
        """,
        (deal_id, financial_period_id, metric_key),
    ).fetchone()
    explanation = "Borrower-reported ratio was compared with the platform-computed value during intake extraction."
    params = (
        source_document_id,
        review_item_id,
        metric_label(metric_key),
        borrower_reported_value,
        platform_value,
        variance_value,
        variance_pct,
        reconciliation_status,
        explanation,
    )
    if existing:
        conn.execute(
            """
            UPDATE ratio_reconciliations
            SET source_document_id = %s,
                review_item_id = %s,
                metric_label = %s,
                borrower_reported_value = %s,
                platform_computed_value = %s,
                variance_value = %s,
                variance_pct = %s,
                reconciliation_status = %s,
                explanation = %s
            WHERE id = %s
            """,
            (*params, int(existing["id"])),
        )
        return int(existing["id"])
    row = conn.execute(
        """
        INSERT INTO ratio_reconciliations (
          deal_id,
          financial_period_id,
          source_document_id,
          review_item_id,
          metric_key,
          metric_label,
          borrower_reported_value,
          platform_computed_value,
          variance_value,
          variance_pct,
          tolerance_pct,
          reconciliation_status,
          explanation
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 3.0, %s, %s)
        RETURNING id
        """,
        (
            deal_id,
            financial_period_id,
            source_document_id,
            review_item_id,
            metric_key,
            metric_label(metric_key),
            borrower_reported_value,
            platform_value,
            variance_value,
            variance_pct,
            reconciliation_status,
            explanation,
        ),
    ).fetchone()
    return int(row["id"])


def create_review_item_from_proposal(conn, proposal_id: int):
    existing = conn.execute(
        """
        SELECT id
        FROM review_items
        WHERE proposal_id = %s
        LIMIT 1
        """,
        (proposal_id,),
    ).fetchone()
    if existing:
        return int(existing["id"])

    row = conn.execute(
        """
        SELECT
          proposal.*,
          doc.deal_id,
          doc.id AS incoming_document_id,
          doc.file_name,
          doc.received_at,
          doc.period_label,
          doc.notes,
          d.name AS deal_name,
          d.slug AS deal_slug
        FROM incoming_document_proposals proposal
        JOIN incoming_documents doc ON doc.id = proposal.incoming_document_id
        JOIN deals d ON d.id = doc.deal_id
        WHERE proposal.id = %s
        """,
        (proposal_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")

    messages = row["validation_messages"] or []
    prior_value = "No prior value"
    for message in messages:
        if message.get("priorValue") is not None:
            prior_value = format_metric_value(row["target_metric_key"], float(message["priorValue"]))
            break
    page_number = 1
    snippet = row["validation_summary"] or row["notes"]
    review_type = "ratio_reconciliation" if row["target_metric_key"] == "seniorDscr" else "metric_extraction"
    if existing:
        conn.execute(
            """
            UPDATE review_items
            SET proposal_type = %s,
                field_name = %s,
                proposed_value = %s,
                confidence = %s,
                prior_value = %s,
                status = 'pending',
                reason = %s,
                owner_name = 'Review - Tier 2',
                due_at = %s,
                sla_due_at = %s,
                document_name = %s,
                page_number = %s,
                snippet = %s
            WHERE id = %s
            """,
            (
                review_type,
                row["field_key"] or row["target_metric_key"] or row["field_label"],
                row["proposed_value"],
                row["confidence"] or 0.8,
                prior_value,
                row["validation_summary"] or "Extracted fact requires review.",
                row["received_at"] + timedelta(days=1),
                row["received_at"] + timedelta(days=2),
                row["file_name"],
                page_number,
                snippet,
                int(existing["id"]),
            ),
        )
        review_id = int(existing["id"])
    else:
        inserted = conn.execute(
            """
            INSERT INTO review_items (
              deal_id,
              incoming_document_id,
              proposal_id,
              proposal_type,
              field_name,
              proposed_value,
              confidence,
              prior_value,
              status,
              reason,
              owner_name,
              due_at,
              sla_due_at,
              document_name,
              page_number,
              snippet
            ) VALUES (
              %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, 'Review - Tier 2',
              %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                row["deal_id"],
                row["incoming_document_id"],
                proposal_id,
                review_type,
                row["field_key"] or row["target_metric_key"] or row["field_label"],
                row["proposed_value"],
                row["confidence"] or 0.8,
                prior_value,
                row["validation_summary"] or "Extracted fact requires review.",
                row["received_at"] + timedelta(days=1),
                row["received_at"] + timedelta(days=2),
                row["file_name"],
                page_number,
                snippet,
            ),
        ).fetchone()
        review_id = int(inserted["id"])
    if row["target_metric_key"] == "seniorDscr":
        canonical_document_id = ensure_canonical_document_for_intake(
            conn,
            int(row["incoming_document_id"]),
            "review_router",
        )
        financial_period_id, _ = ensure_financial_period_for_intake(
            conn,
            deal_id=int(row["deal_id"]),
            period_label=row["period_label"] or "Unassigned",
            canonical_document_id=canonical_document_id,
            summary=f"{row['file_name']} is supplying extracted metrics pending review.",
        )
        proposed_numeric = parse_metric_value(row["target_metric_key"], row["proposed_value"]) or 0
        upsert_ratio_reconciliation(
            conn,
            deal_id=int(row["deal_id"]),
            financial_period_id=financial_period_id,
            source_document_id=canonical_document_id,
            metric_key=row["target_metric_key"],
            borrower_reported_value=proposed_numeric,
            review_item_id=review_id,
            reconciliation_status="pending",
        )
    sync_review_task(conn, review_id)
    return review_id


def close_review_item_for_proposal(conn, proposal_id: int, reason: str):
    review_row = conn.execute(
        """
        SELECT id
        FROM review_items
        WHERE proposal_id = %s AND status = 'pending'
        LIMIT 1
        """,
        (proposal_id,),
    ).fetchone()
    if not review_row:
        return
    conn.execute(
        """
        UPDATE review_items
        SET status = 'approved',
            reason = %s
        WHERE id = %s
        """,
        (reason, int(review_row["id"])),
    )
    sync_review_task(conn, int(review_row["id"]))


def commit_document_proposal(conn, proposal_id: int, actor_name: str):
    proposal = conn.execute(
        """
        SELECT
          proposal.*,
          doc.deal_id,
          doc.matched_obligation_id,
          doc.canonical_document_id,
          doc.file_name,
          doc.period_label,
          doc.received_at,
          doc.notes
        FROM incoming_document_proposals proposal
        JOIN incoming_documents doc ON doc.id = proposal.incoming_document_id
        WHERE proposal.id = %s
        FOR UPDATE
        """,
        (proposal_id,),
    ).fetchone()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal["committed_at"]:
        return {
            "incomingDocumentId": int(proposal["incoming_document_id"]),
            "committedEntityType": proposal["committed_entity_type"],
            "committedEntityId": proposal["committed_entity_id"],
        }

    incoming_document_id = int(proposal["incoming_document_id"])
    canonical_document_id = ensure_canonical_document_for_intake(conn, incoming_document_id, actor_name)
    committed_entity_type = "document"
    committed_entity_id = canonical_document_id

    if proposal["commit_action"] == "upsert_period_metric":
        financial_period_id, financial_period = ensure_financial_period_for_intake(
            conn,
            deal_id=int(proposal["deal_id"]),
            period_label=proposal["period_label"] or "Unassigned",
            canonical_document_id=canonical_document_id,
            summary=f"{proposal['file_name']} supplied extracted metrics committed by {actor_name}.",
        )
        reported_metrics = dict(financial_period["reported_metrics"] or {})
        expected_metrics = dict(financial_period["expected_metrics"] or {})
        metric_key = proposal["target_metric_key"]
        proposed_numeric = parse_metric_value(metric_key, proposal["proposed_value"]) or 0
        reported_metrics[metric_key] = proposed_numeric
        conn.execute(
            """
            UPDATE financial_periods
            SET reported_metrics = %s::jsonb,
                status = 'approved',
                summary = %s
            WHERE id = %s
            """,
            (
                json.dumps(reported_metrics),
                f"{proposal['period_label']} updated from extraction proposals committed by {actor_name}.",
                financial_period_id,
            ),
        )
        upsert_financial_variance(
            conn,
            financial_period_id=financial_period_id,
            metric_key=metric_key,
            reported_value=proposed_numeric,
            expected_value=expected_metrics.get(metric_key),
        )
        if metric_key == "seniorDscr":
            conn.execute(
                """
                UPDATE covenants
                SET current_value = %s,
                    headroom_pct = ROUND((((%s)::numeric - threshold_lockup) / threshold_lockup) * 100, 2),
                    status = CASE
                      WHEN %s <= threshold_trigger THEN 'trigger_event'
                      WHEN %s <= threshold_lockup THEN 'lock_up'
                      ELSE 'performing'
                    END
                WHERE deal_id = %s
                  AND LOWER(name) LIKE '%%dscr%%'
                """,
                (
                    proposed_numeric,
                    proposed_numeric,
                    proposed_numeric,
                    proposed_numeric,
                    proposal["deal_id"],
                ),
            )
            review_row = conn.execute(
                "SELECT id FROM review_items WHERE proposal_id = %s LIMIT 1",
                (proposal_id,),
            ).fetchone()
            upsert_ratio_reconciliation(
                conn,
                deal_id=int(proposal["deal_id"]),
                financial_period_id=financial_period_id,
                source_document_id=canonical_document_id,
                metric_key=metric_key,
                borrower_reported_value=proposed_numeric,
                review_item_id=int(review_row["id"]) if review_row else None,
                reconciliation_status="approved",
            )
        committed_entity_type = "financial_period"
        committed_entity_id = financial_period_id

    if proposal["commit_action"] == "upsert_obligation_fulfilment" and proposal["matched_obligation_id"]:
        fulfilment = conn.execute(
            """
            SELECT id
            FROM obligation_fulfilments
            WHERE obligation_id = %s AND incoming_document_id = %s
            LIMIT 1
            """,
            (proposal["matched_obligation_id"], incoming_document_id),
        ).fetchone()
        if fulfilment:
            conn.execute(
                """
                UPDATE obligation_fulfilments
                SET received_at = %s,
                    status = 'fulfilled',
                    days_late = 0,
                    matched_by = %s,
                    notes = %s
                WHERE id = %s
                """,
                (
                    proposal["received_at"],
                    actor_name,
                    f"Fulfilment committed from intake extraction by {actor_name}.",
                    int(fulfilment["id"]),
                ),
            )
            committed_entity_id = int(fulfilment["id"])
        else:
            obligation = conn.execute(
                """
                SELECT due_date
                FROM obligations
                WHERE id = %s
                """,
                (proposal["matched_obligation_id"],),
            ).fetchone()
            inserted = conn.execute(
                """
                INSERT INTO obligation_fulfilments (
                  obligation_id,
                  incoming_document_id,
                  due_date,
                  received_at,
                  status,
                  days_late,
                  matched_by,
                  notes
                ) VALUES (%s, %s, %s, %s, 'fulfilled', 0, %s, %s)
                RETURNING id
                """,
                (
                    proposal["matched_obligation_id"],
                    incoming_document_id,
                    obligation["due_date"],
                    proposal["received_at"],
                    actor_name,
                    f"Fulfilment committed from intake extraction by {actor_name}.",
                ),
            ).fetchone()
            committed_entity_id = int(inserted["id"])
        committed_entity_type = "obligation_fulfilment"

    conn.execute(
        """
        UPDATE incoming_document_proposals
        SET proposal_status = 'accepted',
            committed_entity_type = %s,
            committed_entity_id = %s,
            committed_at = NOW(),
            committed_by = %s
        WHERE id = %s
        """,
        (
            committed_entity_type,
            committed_entity_id,
            actor_name,
            proposal_id,
        ),
    )
    return {
        "incomingDocumentId": incoming_document_id,
        "committedEntityType": committed_entity_type,
        "committedEntityId": committed_entity_id,
    }


def build_proposal_impact_preview(conn, proposal_row):
    if "file_name" not in proposal_row:
        enriched_row = conn.execute(
            """
            SELECT
              proposal.*,
              doc.deal_id,
              doc.matched_obligation_id,
              doc.canonical_document_id,
              doc.file_name,
              doc.period_label,
              doc.received_at,
              doc.notes
            FROM incoming_document_proposals proposal
            JOIN incoming_documents doc ON doc.id = proposal.incoming_document_id
            WHERE proposal.id = %s
            LIMIT 1
            """,
            (int(proposal_row["id"]),),
        ).fetchone()
        if enriched_row:
            proposal_row = enriched_row

    preview = []

    if proposal_row["commit_action"] == "ensure_canonical_document":
        preview.append(
            {
                "label": "Canonical document",
                "beforeValue": (
                    f"Document #{proposal_row['canonical_document_id']}"
                    if proposal_row["canonical_document_id"]
                    else "Not yet created"
                ),
                "afterValue": proposal_row["file_name"],
                "impactSummary": "Creates or links the canonical document record for this intake item.",
            }
        )

    if proposal_row["commit_action"] == "upsert_obligation_fulfilment":
        fulfilment = None
        if proposal_row["matched_obligation_id"]:
            fulfilment = conn.execute(
                """
                SELECT status, days_late
                FROM obligation_fulfilments
                WHERE obligation_id = %s AND incoming_document_id = %s
                LIMIT 1
                """,
                (
                    proposal_row["matched_obligation_id"],
                    proposal_row["incoming_document_id"],
                ),
            ).fetchone()
        preview.append(
            {
                "label": "Obligation fulfilment",
                "beforeValue": (
                    f"{fulfilment['status']} ({fulfilment['days_late']} days late)"
                    if fulfilment
                    else "No fulfilment recorded"
                ),
                "afterValue": "fulfilled",
                "impactSummary": "Marks the matched compliance obligation as fulfilled from this package.",
            }
        )

    if proposal_row["commit_action"] == "upsert_period_metric":
        period_row = None
        if proposal_row["deal_id"] and proposal_row["target_period_key"]:
            period_row = load_period_row_by_key(
                conn, int(proposal_row["deal_id"]), proposal_row["target_period_key"]
            ) or load_latest_period_row(conn, int(proposal_row["deal_id"]))
        metric_key = proposal_row["target_metric_key"]
        before_value = None
        expected_value = None
        if period_row:
            before_value = (period_row["reported_metrics"] or {}).get(metric_key)
            expected_value = (period_row["expected_metrics"] or {}).get(metric_key)
        proposed_numeric = parse_metric_value(metric_key, proposal_row["proposed_value"])
        preview.append(
            {
                "label": f"{metric_label(metric_key)} in financial period",
                "beforeValue": (
                    format_metric_value(metric_key, float(before_value))
                    if before_value is not None
                    else "No reported value"
                ),
                "afterValue": (
                    format_metric_value(metric_key, float(proposed_numeric))
                    if proposed_numeric is not None
                    else proposal_row["proposed_value"]
                ),
                "impactSummary": (
                    f"Updates {proposal_row['target_period_key']} and recomputes variance commentary."
                ),
            }
        )
        if expected_value is not None and proposed_numeric is not None:
            variance_pct = (
                round(((proposed_numeric - float(expected_value)) / float(expected_value)) * 100, 2)
                if float(expected_value) != 0
                else 0
            )
            preview.append(
                {
                    "label": "Variance versus expected",
                    "beforeValue": "Based on current reported metric",
                    "afterValue": f"{variance_pct}%",
                    "impactSummary": "Recomputes the reported-versus-expected variance for the selected period.",
                }
            )
        if metric_key == "seniorDscr" and proposed_numeric is not None and proposal_row["deal_id"]:
            covenant = conn.execute(
                """
                SELECT current_value, threshold_lockup, threshold_trigger, status
                FROM covenants
                WHERE deal_id = %s AND LOWER(name) LIKE '%%dscr%%'
                ORDER BY id
                LIMIT 1
                """,
                (proposal_row["deal_id"],),
            ).fetchone()
            if covenant:
                after_status = "performing"
                if proposed_numeric <= float(covenant["threshold_trigger"]):
                    after_status = "trigger_event"
                elif proposed_numeric <= float(covenant["threshold_lockup"]):
                    after_status = "lock_up"
                preview.append(
                    {
                        "label": "Covenant posture",
                        "beforeValue": (
                            f"{format_metric_value(metric_key, float(covenant['current_value']))} · {covenant['status']}"
                        ),
                        "afterValue": f"{format_metric_value(metric_key, proposed_numeric)} · {after_status}",
                        "impactSummary": "If approved, the DSCR covenant and related reconciliation state will update.",
                    }
                )

    return preview


def finalize_intake_document(conn, incoming_document_id: int, actor_name: str, note: str):
    document = conn.execute(
        """
        SELECT document_type
        FROM incoming_documents
        WHERE id = %s
        FOR UPDATE
        """,
        (incoming_document_id,),
    ).fetchone()
    if not document:
        raise HTTPException(status_code=404, detail="Incoming document not found")

    pending_reviews = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM review_items
        WHERE incoming_document_id = %s
          AND status = 'pending'
        """,
        (incoming_document_id,),
    ).fetchone()
    open_triage = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM incoming_document_proposals
        WHERE incoming_document_id = %s
          AND routing_decision = 'triage'
          AND proposal_status NOT IN ('accepted', 'rejected')
        """,
        (incoming_document_id,),
    ).fetchone()
    missing_required_fields = missing_mandatory_fields_for_document(
        conn,
        incoming_document_id,
        document_type=document["document_type"],
    )
    if missing_required_fields:
        conn.execute(
            """
            UPDATE incoming_documents
            SET processing_status = 'exception',
                current_stage = 'exception',
                review_tier = 'tier_2',
                last_updated_at = NOW(),
                notes = %s
            WHERE id = %s
            """,
            (
                append_note(
                    note,
                    f"Mandatory fields still missing: {format_mandatory_field_list(missing_required_fields)}.",
                ),
                incoming_document_id,
            ),
        )
        return "exception"
    if int(open_triage["count"]) > 0:
        conn.execute(
            """
            UPDATE incoming_documents
            SET processing_status = 'exception',
                current_stage = 'exception',
                review_tier = 'tier_2',
                last_updated_at = NOW(),
                notes = %s
            WHERE id = %s
            """,
            (
                append_note(note, "Deterministic validation could not fully process the document. Manual exception assist is required."),
                incoming_document_id,
            ),
        )
        return "exception"
    if int(pending_reviews["count"]) > 0:
        conn.execute(
            """
            UPDATE incoming_documents
            SET processing_status = 'in_review',
                current_stage = 'review',
                review_tier = 'tier_2',
                last_updated_at = NOW(),
                notes = %s
            WHERE id = %s
            """,
            (append_note(note, "Awaiting review approval before commit."), incoming_document_id),
        )
        return "review"
    conn.execute(
        """
        UPDATE incoming_documents
        SET processing_status = 'committed',
            current_stage = 'committed',
            review_tier = 'tier_1',
            last_updated_at = NOW(),
            notes = %s
        WHERE id = %s
        """,
        (append_note(note, f"Validated proposals committed by {actor_name}."), incoming_document_id),
    )
    return "committed"


def ingest_directory_file(conn, file_path: Path, *, submission: dict | None = None):
    submission = submission or {}
    stat = file_path.stat()
    checksum = file_sha256(file_path)
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"

    existing = conn.execute(
        """
        SELECT id
        FROM incoming_documents
        WHERE intake_source_path = %s
           OR checksum = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (str(file_path), checksum),
    ).fetchone()
    if existing:
        return None

    if submission.get("dealId") and submission.get("dealSlug"):
        deal_id = submission["dealId"]
        deal_slug = submission["dealSlug"]
        deal_confidence = submission.get("dealConfidence", 0.99)
    else:
        deal_id, deal_slug, deal_confidence = match_deal_from_file_name(conn, file_path.name)

    if submission.get("documentType"):
        document_type = standardize_document_type(submission["documentType"])
        if not document_type:
            raise HTTPException(status_code=400, detail="documentType must be a supported standard document type")
        type_confidence = submission.get("documentTypeConfidence", 0.99)
    else:
        document_type, type_confidence = infer_document_type(file_path.name)

    if submission.get("periodLabel"):
        period_label = submission["periodLabel"]
        period_confidence = submission.get("periodConfidence", 0.99)
    else:
        period_label, period_confidence = infer_period_label(file_path.name)

    overall_confidence = max(
        min(
            max(filter(None, [deal_confidence, type_confidence, period_confidence]), default=0.0),
            0.99,
        ),
        0.35,
    )

    matched_obligation_id = (
        select_intake_obligation(conn, deal_id, document_type) if deal_id else None
    )
    classification_status = "matched" if deal_id and document_type else "needs_triage"

    if deal_id and document_type and overall_confidence >= 0.94:
        processing_status = "committed"
        current_stage = "committed"
        review_tier = "tier_1"
    elif deal_id and document_type and overall_confidence >= 0.74:
        processing_status = "in_review"
        current_stage = "review"
        review_tier = "tier_2"
    else:
        processing_status = "awaiting_classification"
        current_stage = "classification"
        review_tier = "tier_2"

    received_at = datetime.now(timezone.utc)
    fingerprinted_at = received_at + timedelta(seconds=1)
    source_channel = submission.get("sourceChannel") or "directory_watch"
    sender = submission.get("sender") or (
        "watched-directory" if source_channel == "directory_watch" else "cli"
    )
    subject = submission.get("subject") or (
        f"Watched intake file: {file_path.name}"
        if source_channel == "directory_watch"
        else f"CLI intake submission: {file_path.name}"
    )
    note = submission.get("note") or (
        f"Directory watcher observed {file_path.name} and created the intake record."
        if source_channel == "directory_watch"
        else f"CLI submitted {file_path.name} into intake."
    )

    incoming_row = conn.execute(
        """
        INSERT INTO incoming_documents (
          deal_id,
          matched_obligation_id,
          canonical_document_id,
          intake_source_path,
          raw_storage_status,
          directory_observed_at,
          fingerprinted_at,
          source_channel,
          sender,
          subject,
          file_name,
          file_size_bytes,
          checksum,
          mime_type,
          period_label,
          document_type,
          classification_status,
          processing_status,
          current_stage,
          review_tier,
          confidence,
          received_at,
          last_updated_at,
          notes
        ) VALUES (
          %s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING id
        """,
        (
            deal_id,
            matched_obligation_id,
            str(file_path),
            "retained",
            received_at,
            fingerprinted_at,
            source_channel,
            sender,
            subject,
            file_path.name,
            stat.st_size,
            checksum,
            mime_type,
            period_label,
            document_type,
            classification_status,
            processing_status,
            current_stage,
            review_tier,
            overall_confidence,
            received_at,
            received_at,
            note,
        ),
    ).fetchone()
    incoming_document_id = int(incoming_row["id"])
    log_intake_stage(
        "arrived",
        incoming_document_id=incoming_document_id,
        file_name=file_path.name,
        source_channel=source_channel,
        stage_status="completed",
        deal_slug=deal_slug,
        document_type=document_type,
        period_label=period_label,
        confidence=overall_confidence,
        summary="Incoming document record created.",
    )

    receipt_run_id = create_processing_run(
        conn,
        incoming_document_id,
        "receipt",
        "completed",
        "directory_watcher" if source_channel == "directory_watch" else "intake_submit",
        received_at,
        fingerprinted_at,
        None,
        (
            "File detected in watched directory, fingerprinted, and retained in raw storage."
            if source_channel == "directory_watch"
            else "File submitted through the intake API, fingerprinted, and retained in raw storage."
        ),
    )
    log_intake_stage(
        "fingerprinted",
        incoming_document_id=incoming_document_id,
        file_name=file_path.name,
        source_channel=source_channel,
        stage_status="completed",
        deal_slug=deal_slug,
        document_type=document_type,
        period_label=period_label,
        confidence=overall_confidence,
        summary="Raw file fingerprinted and retained.",
    )

    extraction_result = run_artifact_extraction(
        file_path=file_path,
        mime_type=mime_type,
        context=DocumentContext(
            incoming_document_id=incoming_document_id,
            deal_id=deal_id,
            deal_slug=deal_slug,
            period_label=period_label,
            document_type=document_type,
            matched_obligation_id=matched_obligation_id,
        ),
    )
    if extraction_result and extraction_result.period_label:
        period_label = extraction_result.period_label
        period_confidence = extraction_result.period_confidence or period_confidence
        conn.execute(
            """
            UPDATE incoming_documents
            SET period_label = %s,
                last_updated_at = %s
            WHERE id = %s
            """,
            (period_label, received_at, incoming_document_id),
        )

    classification_summary = intake_summary_text(deal_slug, document_type, period_label)
    classification_completed_at = fingerprinted_at + timedelta(seconds=2)
    classification_status_for_run = "completed" if document_type else "failed"
    classification_run_id = create_processing_run(
        conn,
        incoming_document_id,
        "classification",
        classification_status_for_run,
        "classification_agent",
        fingerprinted_at,
        classification_completed_at,
        overall_confidence,
        classification_summary,
    )
    classification_ai_log_id = record_ai_audit_log(
        conn,
        incoming_document_id=incoming_document_id,
        processing_run_id=classification_run_id,
        proposal_id=None,
        ai_stage="classification",
        actor_label="classification_agent",
        model_name="sesame-intake-classifier",
        model_version="demo-v1",
        prompt_template="watched_directory_classification_v1",
        confidence=overall_confidence,
        summary=classification_summary,
        retrieved_context=[
            {"kind": "filename", "value": file_path.name},
            {"kind": "subject", "value": subject},
        ],
        tool_calls=[{"tool": "deal_slug_matcher", "status": "completed"}],
        created_at=classification_completed_at,
    )

    metadata_proposal_status = "accepted" if overall_confidence >= 0.74 else "pending_review"
    if document_type:
        proposal_id = create_document_proposal(
            conn,
            incoming_document_id,
            "document_type",
            "documentType",
            "Document type",
            document_type,
            type_confidence,
            "filename",
            metadata_proposal_status,
            "classification_agent",
            classification_completed_at,
            validation_status="valid" if document_type else "failed",
            validation_summary="Document type was extracted from the filename cue.",
            routing_decision="review" if overall_confidence < 0.74 else "auto_commit",
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=classification_run_id,
            proposal_id=proposal_id,
            ai_stage="field_extraction",
            actor_label="classification_agent",
            model_name="sesame-intake-classifier",
            model_version="demo-v1",
            prompt_template="document_type_proposal_v1",
            confidence=type_confidence,
            summary=f"Proposed document type {document_type}.",
            retrieved_context=[{"kind": "filename", "value": file_path.name}],
            created_at=classification_completed_at,
        )
        create_evidence_citation(
            conn,
            incoming_document_id=incoming_document_id,
            proposal_id=proposal_id,
            citation_label="Filename classification cue",
            citation_kind="filename",
            field_key="documentType",
            text_snippet=file_path.name,
        )
    if deal_slug:
        proposal_id = create_document_proposal(
            conn,
            incoming_document_id,
            "deal_match",
            "dealSlug",
            "Matched deal",
            deal_slug,
            deal_confidence,
            "filename",
            metadata_proposal_status,
            "classification_agent",
            classification_completed_at,
            validation_status="valid",
            validation_summary=f"Matched to {deal_slug} from the filename cue.",
            routing_decision="auto_commit" if deal_confidence and deal_confidence >= 0.8 else "review",
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=classification_run_id,
            proposal_id=proposal_id,
            ai_stage="deal_matching",
            actor_label="matching_agent",
            model_name="sesame-deal-matcher",
            model_version="demo-v1",
            prompt_template="deal_match_from_filename_v1",
            confidence=deal_confidence,
            summary=f"Matched intake file to {deal_slug}.",
            retrieved_context=[{"kind": "filename", "value": file_path.name}],
            tool_calls=[{"tool": "slugify_match", "status": "completed"}],
            created_at=classification_completed_at,
        )
        create_evidence_citation(
            conn,
            incoming_document_id=incoming_document_id,
            proposal_id=proposal_id,
            citation_label="Filename deal cue",
            citation_kind="filename",
            field_key="dealSlug",
            text_snippet=file_path.name,
        )
    if period_label:
        period_from_document = bool(
            extraction_result
            and extraction_result.period_label
            and extraction_result.period_label == period_label
            and extraction_result.period_citation
        )
        proposal_id = create_document_proposal(
            conn,
            incoming_document_id,
            "period_match",
            "periodLabel",
            "Reporting period",
            period_label,
            extraction_result.period_confidence if period_from_document else period_confidence,
            extraction_result.period_citation.kind if period_from_document else "filename",
            metadata_proposal_status,
            "classification_agent",
            classification_completed_at,
            validation_status="valid",
            validation_summary=(
                extraction_result.period_rationale
                if period_from_document
                else f"Reporting period {period_label} was inferred from the filename cue."
            ),
            routing_decision=(
                "auto_commit"
                if (extraction_result.period_confidence if period_from_document else period_confidence)
                and (extraction_result.period_confidence if period_from_document else period_confidence) >= 0.8
                else "review"
            ),
        )
        create_evidence_citation(
            conn,
            incoming_document_id=incoming_document_id,
            proposal_id=proposal_id,
            citation_label="Document period cue" if period_from_document else "Filename period cue",
            citation_kind=extraction_result.period_citation.kind if period_from_document else "filename",
            field_key="periodLabel",
            text_snippet=(
                extraction_result.period_citation.text_snippet
                if period_from_document
                else file_path.name
            ),
        )
    package_summary = (
        extraction_result.document_summary
        if extraction_result and extraction_result.document_summary
        else intake_summary_text(deal_slug, document_type, period_label)
    )

    summary_proposal_id = create_document_proposal(
        conn,
        incoming_document_id,
        "package_summary",
        None,
        "Package summary",
        package_summary,
        overall_confidence,
        "watcher",
        metadata_proposal_status,
        "narrative_agent",
        classification_completed_at,
        validation_status="valid",
        validation_summary=(
            "Package summary generated from document content and intake classification cues."
            if extraction_result
            else "Package summary generated from intake classification cues."
        ),
        routing_decision="auto_commit" if overall_confidence >= 0.74 else "review",
    )
    record_ai_audit_log(
        conn,
        incoming_document_id=incoming_document_id,
        processing_run_id=classification_run_id,
        proposal_id=summary_proposal_id,
        ai_stage="narrative_summary",
        actor_label="narrative_agent",
        model_name="sesame-narrative-summarizer",
        model_version="demo-v1",
        prompt_template="watched_directory_summary_v1",
        confidence=overall_confidence,
        summary="Generated intake package summary.",
        retrieved_context=[
            {"kind": "filename", "value": file_path.name},
            {"kind": "classification", "value": document_type or "unclassified"},
            {"kind": "engine", "value": extraction_result.engine_name if extraction_result else "filename_only"},
        ],
        created_at=classification_completed_at,
    )
    log_intake_stage(
        "classified",
        incoming_document_id=incoming_document_id,
        file_name=file_path.name,
        source_channel=source_channel,
        stage_status=classification_status_for_run,
        deal_slug=deal_slug,
        document_type=document_type,
        period_label=period_label,
        confidence=overall_confidence,
        summary=classification_summary,
    )
    create_evidence_citation(
        conn,
        incoming_document_id=incoming_document_id,
        proposal_id=summary_proposal_id,
        citation_label="Summary source cue",
        citation_kind=(
            extraction_result.period_citation.kind
            if extraction_result and extraction_result.period_citation
            else "subject"
        ),
        field_key="packageSummary",
        text_snippet=(
            extraction_result.period_citation.text_snippet
            if extraction_result and extraction_result.period_citation
            else subject
        ),
    )

    if deal_id:
        matching_completed_at = classification_completed_at + timedelta(seconds=1)
        matching_run_id = create_processing_run(
            conn,
            incoming_document_id,
            "matching",
            "completed",
            "matching_agent",
            classification_completed_at,
            matching_completed_at,
            deal_confidence,
            f"Matched to {deal_slug}.",
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=matching_run_id,
            proposal_id=None,
            ai_stage="matching_confirmation",
            actor_label="matching_agent",
            model_name="sesame-deal-matcher",
            model_version="demo-v1",
            prompt_template="watched_directory_match_confirmation_v1",
            confidence=deal_confidence,
            summary=f"Confirmed match to {deal_slug}.",
            retrieved_context=[{"kind": "dealSlug", "value": deal_slug}],
            created_at=matching_completed_at,
        )
        log_intake_stage(
            "matched",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="completed",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=deal_confidence,
            summary=f"Matched to {deal_slug}.",
        )
    else:
        matching_completed_at = classification_completed_at
        log_intake_stage(
            "failed",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="failed",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=overall_confidence,
            summary="Document could not be matched to a deal.",
        )

    extracted_field_keys = (
        {field.field_key for field in extraction_result.fields}
        if extraction_result is not None
        else set()
    )
    missing_required_fields_after_deterministic = missing_mandatory_fields(
        document_type,
        extracted_field_keys,
    )
    extraction_specs = build_extraction_proposal_specs(
        conn,
        incoming_document_id=incoming_document_id,
        deal_id=deal_id,
        matched_obligation_id=matched_obligation_id,
        document_type=document_type,
        period_label=period_label,
        file_name=file_path.name,
        extraction_result=extraction_result,
    )
    validation_started_at = matching_completed_at + timedelta(seconds=1)
    validation_completed_at = validation_started_at + timedelta(seconds=1)
    auto_commit_proposal_ids = []
    review_proposal_ids = []
    triage_proposal_ids = []

    for spec in extraction_specs:
        validation_status, validation_summary, validation_messages, routing_decision = (
            validate_proposal_spec(conn, deal_id=deal_id, spec=spec)
        )
        if missing_required_fields_after_deterministic and routing_decision == "auto_commit":
            validation_status = "valid_with_attention"
            validation_summary = (
                "Deterministic processing did not capture all mandatory fields, so this proposal is held for review until exception assist completes."
            )
            validation_messages = list(validation_messages) + [
                {
                    "code": "mandatory_fields_missing",
                    "missingFields": missing_required_fields_after_deterministic,
                }
            ]
            routing_decision = "review"
        proposal_status = (
            "accepted"
            if routing_decision == "auto_commit"
            else "pending_review"
            if routing_decision == "review"
            else "pending_triage"
        )
        proposal_id = create_document_proposal(
            conn,
            incoming_document_id,
            spec["proposalType"],
            spec["fieldKey"],
            spec["fieldLabel"],
            spec["proposedValue"],
            spec["confidence"],
            spec["citationReference"],
            proposal_status,
            "extraction_agent",
            validation_completed_at,
            target_entity_type=spec["targetEntityType"],
            target_metric_key=spec["targetMetricKey"],
            target_period_key=spec["targetPeriodKey"],
            validation_status=validation_status,
            validation_summary=validation_summary,
            validation_messages=validation_messages,
            routing_decision=routing_decision,
            commit_action=spec["commitAction"],
        )
        create_evidence_citation(
            conn,
            incoming_document_id=incoming_document_id,
            proposal_id=proposal_id,
            citation_label=f"{spec['fieldLabel']} evidence",
            citation_kind=spec.get("citationKind", "page"),
            page_number=spec.get("citationPageNumber", 1),
            field_key=spec["targetMetricKey"] or spec["fieldKey"],
            text_snippet=spec["textSnippet"],
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=None,
            proposal_id=proposal_id,
            ai_stage="field_extraction",
            actor_label="extraction_agent",
            model_name=extraction_result.engine_name if extraction_result else "sesame-extraction-engine",
            model_version=extraction_result.engine_version if extraction_result else "demo-v1",
            prompt_template=extraction_result.prompt_template if extraction_result else "watched_directory_extraction_v1",
            confidence=spec["confidence"],
            summary=spec.get("rationale") or validation_summary,
            retrieved_context=[
                {"kind": "filename", "value": file_path.name},
                {"kind": "periodLabel", "value": period_label},
            ],
            tool_calls=[{"tool": spec["commitAction"], "status": routing_decision}],
            created_at=validation_completed_at,
        )

        if routing_decision == "auto_commit":
            auto_commit_proposal_ids.append(proposal_id)
        elif routing_decision == "review":
            review_proposal_ids.append(proposal_id)
        else:
            triage_proposal_ids.append(proposal_id)

    validation_status_for_run = (
        "failed"
        if triage_proposal_ids
        else "review_required"
        if review_proposal_ids
        else "completed"
    )
    validation_summary = (
        f"Validated {len(extraction_specs)} proposal(s): "
        f"{len(auto_commit_proposal_ids)} auto-commit, "
        f"{len(review_proposal_ids)} review, "
        f"{len(triage_proposal_ids)} triage."
    )
    validation_run_id = create_processing_run(
        conn,
        incoming_document_id,
        "validation",
        validation_status_for_run,
        "validation_router",
        validation_started_at,
        validation_completed_at,
        overall_confidence,
        validation_summary,
    )
    record_ai_audit_log(
        conn,
        incoming_document_id=incoming_document_id,
        processing_run_id=validation_run_id,
        proposal_id=None,
        ai_stage="validation_routing",
        actor_label="validation_router",
        model_name="sesame-validation-router",
        model_version="demo-v1",
        prompt_template="watched_directory_validation_v2",
        confidence=overall_confidence,
        summary=validation_summary,
        tool_calls=[
            {"tool": "auto_commit", "count": len(auto_commit_proposal_ids)},
            {"tool": "review_queue", "count": len(review_proposal_ids)},
            {"tool": "triage", "count": len(triage_proposal_ids)},
        ],
        created_at=validation_completed_at,
    )
    log_intake_stage(
        "validated",
        incoming_document_id=incoming_document_id,
        file_name=file_path.name,
        source_channel=source_channel,
        stage_status=validation_status_for_run,
        deal_slug=deal_slug,
        document_type=document_type,
        period_label=period_label,
        confidence=overall_confidence,
        summary=validation_summary,
    )

    commit_completed_at = None
    if auto_commit_proposal_ids:
        for proposal_id in auto_commit_proposal_ids:
            commit_document_proposal(conn, proposal_id, "auto_commit")
        commit_completed_at = validation_completed_at + timedelta(seconds=1)
        commit_run_id = create_processing_run(
            conn,
            incoming_document_id,
            "commit",
            "completed",
            "auto_commit",
            validation_completed_at,
            commit_completed_at,
            overall_confidence,
            f"Committed {len(auto_commit_proposal_ids)} validated proposal(s) into canonical records.",
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=commit_run_id,
            proposal_id=None,
            ai_stage="commit_decision",
            actor_label="auto_commit",
            model_name="sesame-validation-router",
            model_version="demo-v1",
            prompt_template="watched_directory_commit_router_v2",
            confidence=overall_confidence,
            summary=f"Committed {len(auto_commit_proposal_ids)} validated proposal(s).",
            tool_calls=[{"tool": "proposal_commit", "count": len(auto_commit_proposal_ids)}],
            created_at=commit_completed_at,
        )
        log_intake_stage(
            "committed",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="completed",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=overall_confidence,
            summary=f"Committed {len(auto_commit_proposal_ids)} proposal(s) into canonical state.",
        )

    if review_proposal_ids:
        for proposal_id in review_proposal_ids:
            create_review_item_from_proposal(conn, proposal_id)
        review_started_at = (commit_completed_at or validation_completed_at) + timedelta(seconds=1)
        review_run_id = create_processing_run(
            conn,
            incoming_document_id,
            "review",
            "in_progress",
            "ham_queue",
            review_started_at,
            None,
            None,
            f"Routed {len(review_proposal_ids)} extracted fact proposal(s) to the review queue.",
        )
        record_ai_audit_log(
            conn,
            incoming_document_id=incoming_document_id,
            processing_run_id=review_run_id,
            proposal_id=None,
            ai_stage="review_routing",
            actor_label="review_router",
            model_name="sesame-validation-router",
            model_version="demo-v1",
            prompt_template="watched_directory_review_router_v2",
            confidence=overall_confidence,
            summary=f"Queued {len(review_proposal_ids)} extracted fact proposal(s) for human review.",
            tool_calls=[{"tool": "review_queue", "status": "queued", "count": len(review_proposal_ids)}],
            created_at=review_started_at,
        )
        log_intake_stage(
            "review",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="in_progress",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=overall_confidence,
            summary=f"Queued {len(review_proposal_ids)} proposal(s) for review.",
        )

    current_stage = finalize_intake_document(
        conn,
        incoming_document_id,
        "auto_commit" if auto_commit_proposal_ids else "validation_router",
        note,
    )
    processing_status = current_stage if current_stage != "triage" else "awaiting_classification"
    if current_stage == "review":
        processing_status = "in_review"
    elif current_stage == "committed":
        processing_status = "committed"
    elif current_stage == "exception":
        log_intake_stage(
            "exception",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="in_progress",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=overall_confidence,
            summary=(
                f"Exception queue awaiting manual AI assist; missing mandatory fields: {format_mandatory_field_list(missing_required_fields_after_deterministic)}."
                if missing_required_fields_after_deterministic
                else "Exception queue awaiting manual AI assist after deterministic validation."
            ),
        )
    elif current_stage == "triage":
        current_stage = "classification"
        log_intake_stage(
            "failed",
            incoming_document_id=incoming_document_id,
            file_name=file_path.name,
            source_channel=source_channel,
            stage_status="failed",
            deal_slug=deal_slug,
            document_type=document_type,
            period_label=period_label,
            confidence=overall_confidence,
            summary="Validation produced triage-required proposals.",
        )

    record_activity_event(
        conn,
        source_domain="intake",
        event_family="ai_ingestion",
        event_type="incoming_document_processed",
        entity_type="incoming_document",
        entity_id=incoming_document_id,
        source_event_id=None,
        deal_id=deal_id,
        actor_name="Watched directory agents" if source_channel == "directory_watch" else "CLI intake",
        actor_type="agent" if source_channel == "directory_watch" else "user",
        audit_how="agent_pipeline" if source_channel == "directory_watch" else "manual_submit",
        ai_audit_log_id=classification_ai_log_id,
        title=f"{file_path.name} ingested",
        summary=f"Document moved through intake and is currently in {current_stage.replace('_', ' ')}.",
        before_state={"pipelineStage": "arrived"},
        after_state={
            "pipelineStage": current_stage,
            "classificationStatus": classification_status,
            "processingStatus": processing_status,
        },
        deep_link="/intake",
        created_at=received_at,
    )

    return incoming_document_id


def scan_intake_directory_once():
    intake_path = Path(INTAKE_DIRECTORY)
    intake_path.mkdir(parents=True, exist_ok=True)
    new_files = 0
    tracked_files = 0

    with get_connection() as conn:
        for file_path in sorted(intake_path.iterdir()):
            if not file_path.is_file():
                continue
            tracked_files += 1
            if ingest_directory_file(conn, file_path) is not None:
                new_files += 1
        conn.commit()

    INTAKE_WATCH_STATE["lastScanAt"] = iso_now()
    INTAKE_WATCH_STATE["lastError"] = None
    INTAKE_WATCH_STATE["trackedFiles"] = tracked_files
    INTAKE_WATCH_STATE["newFilesInLastScan"] = new_files


def intake_watch_loop():
    while not INTAKE_WATCH_STOP.is_set():
        try:
            scan_intake_directory_once()
        except Exception as exc:
            INTAKE_WATCH_STATE["lastScanAt"] = iso_now()
            INTAKE_WATCH_STATE["lastError"] = str(exc)
        INTAKE_WATCH_STOP.wait(INTAKE_POLL_SECONDS)


@app.on_event("startup")
def start_intake_watcher():
    global INTAKE_WATCH_THREAD

    Path(INTAKE_DIRECTORY).mkdir(parents=True, exist_ok=True)
    if INTAKE_WATCH_THREAD and INTAKE_WATCH_THREAD.is_alive():
        return

    INTAKE_WATCH_STOP.clear()
    INTAKE_WATCH_THREAD = threading.Thread(
        target=intake_watch_loop,
        name="intake-watcher",
        daemon=True,
    )
    INTAKE_WATCH_THREAD.start()


@app.on_event("shutdown")
def stop_intake_watcher():
    INTAKE_WATCH_STOP.set()
    if INTAKE_WATCH_THREAD and INTAKE_WATCH_THREAD.is_alive():
        INTAKE_WATCH_THREAD.join(timeout=2)


def serialize_workflow_task(row):
    return {
        "id": int(row["id"]),
        "sourceDomain": row["source_domain"],
        "sourceEntityType": row["source_entity_type"],
        "sourceEntityId": int(row["source_entity_id"]),
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "dealName": row["deal_name"],
        "dealSlug": row["deal_slug"],
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "organisationName": row["organisation_name"],
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "ownerName": row["owner_name"],
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "accountName": row["account_name"],
        "title": row["title"],
        "summary": row["summary"],
        "taskStatus": row["task_status"],
        "priority": row["priority"],
        "assigneeName": row["assignee_name"],
        "assigneeTeam": row["assignee_team"],
        "queueName": row["queue_name"],
        "dueAt": row["due_at"].isoformat(),
        "slaDueAt": row["sla_due_at"].isoformat(),
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
        "escalationLevel": row["escalation_level"],
        "escalationStatus": row["escalation_status"],
        "blockedReason": row["blocked_reason"],
        "deepLink": row["deep_link"],
        "contextPayload": row["context_payload"],
    }


def serialize_notification_delivery(row):
    return {
        "id": int(row["id"]),
        "deliveryChannel": row["delivery_channel"],
        "deliveryFrequency": row["delivery_frequency"],
        "deliveryStatus": row["delivery_status"],
        "deliveredAt": row["delivered_at"].isoformat(),
        "seenAt": row["seen_at"].isoformat() if row["seen_at"] else None,
        "acknowledgedAt": row["acknowledged_at"].isoformat()
        if row["acknowledged_at"]
        else None,
        "dismissedAt": row["dismissed_at"].isoformat() if row["dismissed_at"] else None,
        "event": {
            "id": int(row["event_id"]),
            "sourceDomain": row["source_domain"],
            "sourceEntityType": row["source_entity_type"],
            "sourceEntityId": int(row["source_entity_id"]),
            "eventType": row["event_type"],
            "severity": row["severity"],
            "dealName": row["deal_name"],
            "dealSlug": row["deal_slug"],
            "title": row["title"],
            "summary": row["summary"],
            "deepLink": row["deep_link"],
            "createdAt": row["created_at"].isoformat(),
            "payload": row["payload"],
        },
    }


def serialize_activity_event(row):
    return {
        "id": int(row["id"]),
        "sourceDomain": row["source_domain"],
        "eventFamily": row["event_family"],
        "eventType": row["event_type"],
        "entityType": row["entity_type"],
        "entityId": int(row["entity_id"]) if row["entity_id"] is not None else None,
        "sourceEventId": (
            int(row["source_event_id"]) if row["source_event_id"] is not None else None
        ),
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "dealName": row["deal_name"],
        "dealSlug": row["deal_slug"],
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "organisationName": row["organisation_name"],
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "ownerName": row["owner_name"],
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "accountName": row["account_name"],
        "actorName": row["actor_name"],
        "actorType": row["actor_type"],
        "auditHow": row["audit_how"],
        "aiAuditLogId": (
            int(row["ai_audit_log_id"]) if row["ai_audit_log_id"] is not None else None
        ),
        "title": row["title"],
        "summary": row["summary"],
        "beforeState": row["before_state"],
        "afterState": row["after_state"],
        "deepLink": row["deep_link"],
        "createdAt": row["created_at"].isoformat(),
    }


def record_activity_event(
    conn,
    *,
    source_domain: str,
    event_type: str,
    entity_type: str,
    entity_id: int | None,
    actor_name: str,
    title: str,
    summary: str,
    deep_link: str,
    event_family: str = "workflow",
    source_event_id: int | None = None,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    actor_type: str = "user",
    audit_how: str = "manual",
    ai_audit_log_id: int | None = None,
    before_state: dict | None = None,
    after_state: dict | None = None,
    created_at: datetime | None = None,
):
    event = conn.execute(
        """
        INSERT INTO activity_events (
          source_domain,
          event_family,
          event_type,
          entity_type,
          entity_id,
          source_event_id,
          deal_id,
          organisation_id,
          owner_id,
          account_id,
          actor_name,
          actor_type,
          audit_how,
          ai_audit_log_id,
          title,
          summary,
          before_state,
          after_state,
          deep_link,
          created_at
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s
        )
        RETURNING id
        """,
        (
            source_domain,
            event_family,
            event_type,
            entity_type,
            entity_id,
            source_event_id,
            deal_id,
            organisation_id,
            owner_id,
            account_id,
            actor_name,
            actor_type,
            audit_how,
            ai_audit_log_id,
            title,
            summary,
            json.dumps(before_state or {}),
            json.dumps(after_state or {}),
            deep_link,
            created_at or datetime.now(timezone.utc),
        ),
    ).fetchone()
    return int(event["id"])


def permission_flags(permission_keys: set[str]):
    return {
        "canViewPortfolio": "view_portfolio" in permission_keys,
        "canViewDeal": "view_deal" in permission_keys,
        "canViewReports": "view_reports" in permission_keys,
        "canViewActivity": "view_activity" in permission_keys,
        "canGenerateReports": "generate_reports" in permission_keys,
        "canReviewReports": "review_reports" in permission_keys,
        "canApproveReports": "approve_reports" in permission_keys,
        "canReleaseReports": "release_reports" in permission_keys,
        "canDecideRequests": "decide_requests" in permission_keys,
        "canCaptureSnapshots": "capture_snapshots" in permission_keys,
    }


def sql_placeholders(values):
    return ",".join(["%s"] * len(values))


def expand_platform_client_access(conn, platform_client_id: int, access: dict):
    organisation_rows = conn.execute(
        """
        SELECT id
        FROM organisations
        WHERE platform_client_id = %s
        """,
        (platform_client_id,),
    ).fetchall()
    for row in organisation_rows:
        expand_organisation_access(conn, int(row["id"]), access)
    access["platformClientIds"].add(platform_client_id)
    access["platformWide"] = True


def expand_organisation_access(conn, organisation_id: int, access: dict):
    access["organisationIds"].add(organisation_id)

    owner_rows = conn.execute(
        """
        SELECT id
        FROM portfolio_owners
        WHERE organisation_id = %s
        """,
        (organisation_id,),
    ).fetchall()
    for row in owner_rows:
        expand_owner_access(conn, int(row["id"]), access)


def expand_owner_access(conn, owner_id: int, access: dict):
    owner_row = conn.execute(
        """
        SELECT organisation_id
        FROM portfolio_owners
        WHERE id = %s
        """,
        (owner_id,),
    ).fetchone()
    if not owner_row:
        return

    access["ownerIds"].add(owner_id)
    access["organisationIds"].add(int(owner_row["organisation_id"]))

    account_rows = conn.execute(
        """
        SELECT id
        FROM accounts
        WHERE portfolio_owner_id = %s
        """,
        (owner_id,),
    ).fetchall()
    for row in account_rows:
        expand_account_access(conn, int(row["id"]), access)


def expand_account_access(conn, account_id: int, access: dict):
    account_row = conn.execute(
        """
        SELECT
          a.id,
          a.portfolio_owner_id,
          po.organisation_id
        FROM accounts a
        JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
        WHERE a.id = %s
        """,
        (account_id,),
    ).fetchone()
    if not account_row:
        return

    access["accountIds"].add(account_id)
    access["ownerIds"].add(int(account_row["portfolio_owner_id"]))
    access["organisationIds"].add(int(account_row["organisation_id"]))

    deal_rows = conn.execute(
        """
        SELECT DISTINCT deal_id
        FROM holdings
        WHERE account_id = %s
          AND status = 'active'
        """,
        (account_id,),
    ).fetchall()
    for row in deal_rows:
        access["dealIds"].add(int(row["deal_id"]))


def expand_deal_access(conn, deal_id: int, access: dict):
    access["dealIds"].add(deal_id)
    holding_rows = conn.execute(
        """
        SELECT DISTINCT
          a.id AS account_id,
          po.id AS owner_id,
          o.id AS organisation_id,
          o.platform_client_id
        FROM holdings h
        JOIN accounts a ON a.id = h.account_id
        JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
        JOIN organisations o ON o.id = po.organisation_id
        WHERE h.deal_id = %s
          AND h.status = 'active'
        """,
        (deal_id,),
    ).fetchall()
    for row in holding_rows:
        access["accountIds"].add(int(row["account_id"]))
        access["ownerIds"].add(int(row["owner_id"]))
        access["organisationIds"].add(int(row["organisation_id"]))
        access["platformClientIds"].add(int(row["platform_client_id"]))


def build_viewer_access(conn, user_id: int):
    access = {
        "platformClientIds": set(),
        "organisationIds": set(),
        "ownerIds": set(),
        "accountIds": set(),
        "dealIds": set(),
        "platformWide": False,
    }
    entitlement_rows = conn.execute(
        """
        SELECT *
        FROM app_entitlements
        WHERE user_id = %s
        ORDER BY id
        """,
        (user_id,),
    ).fetchall()

    for row in entitlement_rows:
        scope = row["entitlement_scope"]
        if scope == "platform_client" and row["platform_client_id"]:
            expand_platform_client_access(conn, int(row["platform_client_id"]), access)
        elif scope == "organisation" and row["organisation_id"]:
            expand_organisation_access(conn, int(row["organisation_id"]), access)
        elif scope == "owner" and row["owner_id"]:
            expand_owner_access(conn, int(row["owner_id"]), access)
        elif scope == "account" and row["account_id"]:
            expand_account_access(conn, int(row["account_id"]), access)
        elif scope == "deal" and row["deal_id"]:
            expand_deal_access(conn, int(row["deal_id"]), access)

    return access, entitlement_rows


def serialize_viewer(viewer_context: dict):
    return {
        "displayName": viewer_context["displayName"],
        "teamName": viewer_context["teamName"],
        "roleNames": viewer_context["roleNames"],
        "permissionKeys": sorted(viewer_context["permissionKeys"]),
        "permissions": permission_flags(viewer_context["permissionKeys"]),
        "entitlementSummaries": viewer_context["entitlementSummaries"],
    }


def load_viewer_context(conn, viewer_name: str | None = None):
    if viewer_name:
        user_row = conn.execute(
            """
            SELECT *
            FROM app_users
            WHERE display_name = %s
              AND status = 'active'
            """,
            (viewer_name,),
        ).fetchone()
    else:
        user_row = None

    if not user_row:
        user_row = conn.execute(
            """
            SELECT *
            FROM app_users
            WHERE status = 'active'
            ORDER BY is_default DESC, id
            LIMIT 1
            """
        ).fetchone()

    if not user_row:
        raise HTTPException(status_code=500, detail="No active viewers configured")

    role_rows = conn.execute(
        """
        SELECT r.role_key, r.role_name
        FROM app_user_roles ur
        JOIN app_roles r ON r.id = ur.role_id
        WHERE ur.user_id = %s
        ORDER BY r.role_name
        """,
        (int(user_row["id"]),),
    ).fetchall()
    permission_rows = conn.execute(
        """
        SELECT DISTINCT rp.permission_key
        FROM app_user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = %s
        ORDER BY rp.permission_key
        """,
        (int(user_row["id"]),),
    ).fetchall()
    access, entitlement_rows = build_viewer_access(conn, int(user_row["id"]))

    return {
        "userId": int(user_row["id"]),
        "displayName": user_row["display_name"],
        "teamName": user_row["team_name"],
        "roleNames": [row["role_name"] for row in role_rows],
        "permissionKeys": {row["permission_key"] for row in permission_rows},
        "entitlementSummaries": [
            row["entitlement_summary"] for row in entitlement_rows
        ],
        "access": access,
    }


def record_permission_denial(
    conn,
    viewer_context: dict,
    *,
    permission_key: str,
    title: str,
    summary: str,
    deep_link: str,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    record_activity_event(
        conn,
        source_domain="entitlements",
        event_type="permission_denied",
        entity_type="permission_check",
        entity_id=None,
        deal_id=deal_id,
        organisation_id=organisation_id,
        owner_id=owner_id,
        account_id=account_id,
        actor_name=viewer_context["displayName"],
        title=title,
        summary=summary,
        before_state={"permissionKey": permission_key},
        after_state={"result": "denied"},
        deep_link=deep_link,
    )


def ensure_permission(
    conn,
    viewer_context: dict,
    permission_key: str,
    *,
    title: str,
    summary: str,
    deep_link: str,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    if permission_key in viewer_context["permissionKeys"]:
        return

    record_permission_denial(
        conn,
        viewer_context,
        permission_key=permission_key,
        title=title,
        summary=summary,
        deep_link=deep_link,
        deal_id=deal_id,
        organisation_id=organisation_id,
        owner_id=owner_id,
        account_id=account_id,
    )
    conn.commit()
    raise HTTPException(
        status_code=403,
        detail=f"{viewer_context['displayName']} does not have {PERMISSION_LABELS.get(permission_key, permission_key).lower()} permission.",
    )


def ensure_access_to_deal(conn, viewer_context: dict, deal_id: int, *, deep_link: str):
    if deal_id in viewer_context["access"]["dealIds"]:
        return

    record_permission_denial(
        conn,
        viewer_context,
        permission_key="view_deal",
        title="Deal access denied",
        summary="The selected viewer is not entitled to the requested deal scope.",
        deep_link=deep_link,
        deal_id=deal_id,
    )
    conn.commit()
    raise HTTPException(status_code=403, detail="Viewer is not entitled to this deal")


def ensure_access_to_scope(
    conn,
    viewer_context: dict,
    *,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    deep_link: str,
):
    if organisation_id is not None and organisation_id not in viewer_context["access"]["organisationIds"]:
        record_permission_denial(
            conn,
            viewer_context,
            permission_key="view_portfolio",
            title="Portfolio scope denied",
            summary="The selected viewer is not entitled to the requested organisation scope.",
            deep_link=deep_link,
            organisation_id=organisation_id,
        )
        conn.commit()
        raise HTTPException(status_code=403, detail="Viewer is not entitled to this organisation")
    if owner_id is not None and owner_id not in viewer_context["access"]["ownerIds"]:
        record_permission_denial(
            conn,
            viewer_context,
            permission_key="view_portfolio",
            title="Portfolio scope denied",
            summary="The selected viewer is not entitled to the requested owner scope.",
            deep_link=deep_link,
            owner_id=owner_id,
        )
        conn.commit()
        raise HTTPException(status_code=403, detail="Viewer is not entitled to this owner")
    if account_id is not None and account_id not in viewer_context["access"]["accountIds"]:
        record_permission_denial(
            conn,
            viewer_context,
            permission_key="view_portfolio",
            title="Portfolio scope denied",
            summary="The selected viewer is not entitled to the requested account scope.",
            deep_link=deep_link,
            account_id=account_id,
        )
        conn.commit()
        raise HTTPException(status_code=403, detail="Viewer is not entitled to this account")


def viewer_can_see_report(viewer_context: dict, report: dict):
    access = viewer_context["access"]
    if report["dealId"] and report["dealId"] in access["dealIds"]:
        return True
    if report["accountId"] and report["accountId"] in access["accountIds"]:
        return True
    if report["ownerId"] and report["ownerId"] in access["ownerIds"]:
        return True
    if report["organisationId"] and report["organisationId"] in access["organisationIds"]:
        return True
    return access["platformWide"] and not any(
        [report["dealId"], report["organisationId"], report["ownerId"], report["accountId"]]
    )


def viewer_can_see_scoped_item(
    viewer_context: dict,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    access = viewer_context["access"]
    if deal_id and deal_id in access["dealIds"]:
        return True
    if account_id and account_id in access["accountIds"]:
        return True
    if owner_id and owner_id in access["ownerIds"]:
        return True
    if organisation_id and organisation_id in access["organisationIds"]:
        return True
    return access["platformWide"] and not any(
        [deal_id, organisation_id, owner_id, account_id]
    )


def ensure_visible_scoped_item(
    conn,
    viewer_context: dict,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    deep_link: str,
    title: str,
    summary: str,
):
    if viewer_can_see_scoped_item(
        viewer_context,
        deal_id=deal_id,
        organisation_id=organisation_id,
        owner_id=owner_id,
        account_id=account_id,
    ):
        return

    record_permission_denial(
        conn,
        viewer_context,
        permission_key="view_reports",
        title=title,
        summary=summary,
        deep_link=deep_link,
        deal_id=deal_id,
        organisation_id=organisation_id,
        owner_id=owner_id,
        account_id=account_id,
    )
    conn.commit()
    raise HTTPException(status_code=403, detail="Viewer is not entitled to this report scope")


def viewer_can_see_activity(viewer_context: dict, event: dict):
    access = viewer_context["access"]
    if event["dealId"] and event["dealId"] in access["dealIds"]:
        return True
    if event["accountId"] and event["accountId"] in access["accountIds"]:
        return True
    if event["ownerId"] and event["ownerId"] in access["ownerIds"]:
        return True
    if event["organisationId"] and event["organisationId"] in access["organisationIds"]:
        return True
    return access["platformWide"] and not any(
        [event["dealId"], event["organisationId"], event["ownerId"], event["accountId"]]
    )


def load_viewer_directory(conn, viewer_name: str | None = None):
    active_viewer = load_viewer_context(conn, viewer_name)
    user_rows = conn.execute(
        """
        SELECT
          u.id,
          u.display_name,
          u.team_name,
          u.is_default,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.role_name), NULL) AS role_names
        FROM app_users u
        LEFT JOIN app_user_roles ur ON ur.user_id = u.id
        LEFT JOIN app_roles r ON r.id = ur.role_id
        WHERE u.status = 'active'
        GROUP BY u.id
        ORDER BY u.is_default DESC, u.display_name
        """
    ).fetchall()
    return {
        "defaultViewerName": next(
            (row["display_name"] for row in user_rows if row["is_default"]),
            active_viewer["displayName"],
        ),
        "activeViewer": serialize_viewer(active_viewer),
        "viewers": [
            {
                "displayName": row["display_name"],
                "teamName": row["team_name"],
                "roleNames": list(row["role_names"] or []),
                "isDefault": row["is_default"],
            }
            for row in user_rows
        ],
    }


def notification_severity_matches(severity: str, threshold: str):
    return work_priority_rank(severity) <= work_priority_rank(threshold)


def notification_event_type_for_task(task):
    if task["task_status"] == "resolved":
        return "task_resolved"
    if task["escalation_status"] == "overdue":
        return "task_overdue"
    if task["escalation_status"] == "escalated":
        return "task_escalated"
    if task["task_status"] == "new":
        return "task_assigned"
    if task["escalation_status"] == "approaching_due":
        return "task_due_soon"
    return "task_updated"


def sync_notifications_for_task(conn, workflow_task_id: int):
    task = conn.execute(
        """
        SELECT *
        FROM workflow_tasks
        WHERE id = %s
        """,
        (workflow_task_id,),
    ).fetchone()

    if not task:
        return

    event_type = notification_event_type_for_task(task)
    event_key = f"{task['source_entity_type']}:{task['source_entity_id']}:{event_type}"
    event = conn.execute(
        """
        INSERT INTO notification_events (
          event_key,
          source_domain,
          source_entity_type,
          source_entity_id,
          workflow_task_id,
          event_type,
          severity,
          deal_id,
          organisation_id,
          owner_id,
          account_id,
          title,
          summary,
          deep_link,
          payload,
          created_at
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW()
        )
        ON CONFLICT (event_key) DO UPDATE
        SET
          workflow_task_id = EXCLUDED.workflow_task_id,
          severity = EXCLUDED.severity,
          deal_id = EXCLUDED.deal_id,
          organisation_id = EXCLUDED.organisation_id,
          owner_id = EXCLUDED.owner_id,
          account_id = EXCLUDED.account_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          deep_link = EXCLUDED.deep_link,
          payload = EXCLUDED.payload,
          created_at = NOW()
        RETURNING id
        """,
        (
            event_key,
            task["source_domain"],
            task["source_entity_type"],
            int(task["source_entity_id"]),
            workflow_task_id,
            event_type,
            task["priority"],
            task["deal_id"],
            task["organisation_id"],
            task["owner_id"],
            task["account_id"],
            task["title"],
            task["summary"],
            task["deep_link"],
            json.dumps(task["context_payload"]),
        ),
    ).fetchone()

    preference_rows = conn.execute(
        """
        SELECT *
        FROM notification_preferences
        """
    ).fetchall()
    preferences_by_name = {
        row["subscriber_name"]: row for row in preference_rows
    }
    subscription_rows = conn.execute(
        """
        SELECT *
        FROM notification_subscriptions
        WHERE active = TRUE
        ORDER BY id
        """
    ).fetchall()

    recipients = {}
    assignee_pref = preferences_by_name.get(task["assignee_name"])
    if assignee_pref and assignee_pref["in_app_enabled"]:
        recipients[task["assignee_name"]] = {
            "subscriber_name": task["assignee_name"],
            "subscriber_team": task["assignee_team"],
            "delivery_frequency": (
                "immediate"
                if assignee_pref["immediate_enabled"]
                else "daily_digest"
                if assignee_pref["digest_enabled"]
                else "immediate"
            ),
            "only_escalations": assignee_pref["escalation_only"],
            "severity_threshold": "low",
        }

    for subscription in subscription_rows:
        if subscription["source_domain"] and subscription["source_domain"] != task["source_domain"]:
            continue
        if subscription["deal_id"] and subscription["deal_id"] != task["deal_id"]:
            continue
        if subscription["organisation_id"] and subscription["organisation_id"] != task["organisation_id"]:
            continue
        if subscription["owner_id"] and subscription["owner_id"] != task["owner_id"]:
            continue
        if subscription["account_id"] and subscription["account_id"] != task["account_id"]:
            continue
        if not notification_severity_matches(task["priority"], subscription["severity_threshold"]):
            continue
        if subscription["only_escalations"] and event_type not in ("task_overdue", "task_escalated"):
            continue
        recipients[subscription["subscriber_name"]] = {
            "subscriber_name": subscription["subscriber_name"],
            "subscriber_team": subscription["subscriber_team"],
            "delivery_frequency": subscription["delivery_frequency"],
            "only_escalations": subscription["only_escalations"],
            "severity_threshold": subscription["severity_threshold"],
        }

    for recipient in recipients.values():
        preference = preferences_by_name.get(recipient["subscriber_name"])
        if recipient["only_escalations"] and event_type not in ("task_overdue", "task_escalated"):
            continue
        if preference and not preference["in_app_enabled"]:
            continue

        delivery = conn.execute(
            """
            INSERT INTO notification_deliveries (
              notification_event_id,
              subscriber_name,
              subscriber_team,
              delivery_channel,
              delivery_frequency,
              delivery_status,
              delivered_at
            ) VALUES (%s, %s, %s, 'in_app', %s, 'new', NOW())
            ON CONFLICT (notification_event_id, subscriber_name, delivery_channel) DO UPDATE
            SET
              subscriber_team = EXCLUDED.subscriber_team,
              delivery_frequency = EXCLUDED.delivery_frequency,
              delivered_at = NOW(),
              delivery_status = CASE
                WHEN notification_deliveries.delivery_status = 'dismissed' THEN 'dismissed'
                ELSE 'new'
              END,
              seen_at = CASE
                WHEN notification_deliveries.delivery_status = 'dismissed' THEN notification_deliveries.seen_at
                ELSE NULL
              END,
              acknowledged_at = CASE
                WHEN notification_deliveries.delivery_status = 'dismissed' THEN notification_deliveries.acknowledged_at
                ELSE NULL
              END,
              dismissed_at = notification_deliveries.dismissed_at
            RETURNING id
            """,
            (
                int(event["id"]),
                recipient["subscriber_name"],
                recipient["subscriber_team"],
                recipient["delivery_frequency"],
            ),
        ).fetchone()

        if recipient["delivery_frequency"] == "daily_digest":
            digest_label = f"{datetime.now(timezone.utc).date().isoformat()} {recipient['subscriber_team'].lower()} digest"
            digest = conn.execute(
                """
                SELECT id
                FROM notification_digests
                WHERE subscriber_name = %s
                  AND digest_label = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (recipient["subscriber_name"], digest_label),
            ).fetchone()
            if not digest:
                digest = conn.execute(
                    """
                    INSERT INTO notification_digests (
                      subscriber_name,
                      subscriber_team,
                      digest_label,
                      digest_frequency,
                      delivery_channel,
                      digest_status,
                      item_count,
                      summary,
                      generated_at
                    ) VALUES (%s, %s, %s, %s, 'in_app', 'queued', 0, %s, NOW())
                    RETURNING id
                    """,
                    (
                        recipient["subscriber_name"],
                        recipient["subscriber_team"],
                        digest_label,
                        "daily",
                        f"Digest for {recipient['subscriber_name']}.",
                    ),
                ).fetchone()
            conn.execute(
                """
                INSERT INTO notification_digest_items (
                  notification_digest_id,
                  notification_delivery_id
                ) VALUES (%s, %s)
                ON CONFLICT (notification_digest_id, notification_delivery_id) DO NOTHING
                """,
                (int(digest["id"]), int(delivery["id"])),
            )
            count_row = conn.execute(
                """
                SELECT COUNT(*)::int AS count
                FROM notification_digest_items
                WHERE notification_digest_id = %s
                """,
                (int(digest["id"]),),
            ).fetchone()
            conn.execute(
                """
                UPDATE notification_digests
                SET item_count = %s,
                    summary = %s
                WHERE id = %s
                """,
                (
                    int(count_row["count"]),
                    f"{count_row['count']} queued item(s) for {recipient['subscriber_name']}.",
                    int(digest["id"]),
                ),
            )


def upsert_workflow_task(conn, payload):
    task_row = conn.execute(
        """
        INSERT INTO workflow_tasks (
          source_domain,
          source_entity_type,
          source_entity_id,
          deal_id,
          organisation_id,
          owner_id,
          account_id,
          title,
          summary,
          task_status,
          priority,
          assignee_name,
          assignee_team,
          queue_name,
          due_at,
          sla_due_at,
          completed_at,
          escalation_level,
          escalation_status,
          blocked_reason,
          deep_link,
          context_payload
        ) VALUES (
          %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s, %s, %s, %s::jsonb
        )
        ON CONFLICT (source_entity_type, source_entity_id) DO UPDATE
        SET
          source_domain = EXCLUDED.source_domain,
          deal_id = EXCLUDED.deal_id,
          organisation_id = EXCLUDED.organisation_id,
          owner_id = EXCLUDED.owner_id,
          account_id = EXCLUDED.account_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          task_status = EXCLUDED.task_status,
          priority = EXCLUDED.priority,
          assignee_name = EXCLUDED.assignee_name,
          assignee_team = EXCLUDED.assignee_team,
          queue_name = EXCLUDED.queue_name,
          due_at = EXCLUDED.due_at,
          sla_due_at = EXCLUDED.sla_due_at,
          completed_at = EXCLUDED.completed_at,
          escalation_level = EXCLUDED.escalation_level,
          escalation_status = EXCLUDED.escalation_status,
          blocked_reason = EXCLUDED.blocked_reason,
          deep_link = EXCLUDED.deep_link,
          context_payload = EXCLUDED.context_payload
        RETURNING id
        """,
        (
            payload["source_domain"],
            payload["source_entity_type"],
            payload["source_entity_id"],
            payload.get("deal_id"),
            payload.get("organisation_id"),
            payload.get("owner_id"),
            payload.get("account_id"),
            payload["title"],
            payload["summary"],
            payload["task_status"],
            payload["priority"],
            payload["assignee_name"],
            payload["assignee_team"],
            payload["queue_name"],
            payload["due_at"],
            payload["sla_due_at"],
            payload.get("completed_at"),
            payload["escalation_level"],
            payload["escalation_status"],
            payload.get("blocked_reason", ""),
            payload["deep_link"],
            json.dumps(payload.get("context_payload", {})),
        ),
    ).fetchone()
    sync_notifications_for_task(conn, int(task_row["id"]))


def sync_review_task(conn, review_id: int):
    row = conn.execute(
        """
        SELECT
          r.*,
          d.slug AS deal_slug,
          d.name AS deal_name
        FROM review_items r
        JOIN deals d ON d.id = r.deal_id
        WHERE r.id = %s
        """,
        (review_id,),
    ).fetchone()

    if not row:
        return

    task_status = "resolved" if row["status"] == "approved" else "new"
    escalation_status = (
        "resolved"
        if task_status == "resolved"
        else "escalated"
        if row["proposal_type"] == "ratio_reconciliation"
        else "approaching_due"
    )
    upsert_workflow_task(
        conn,
        {
            "source_domain": "review",
            "source_entity_type": "review_item",
            "source_entity_id": int(row["id"]),
            "deal_id": int(row["deal_id"]),
            "title": f"Review {row['field_name'].replace('_', ' ')} for {row['deal_name']}",
            "summary": row["reason"],
            "task_status": task_status,
            "priority": "high" if row["proposal_type"] == "ratio_reconciliation" else "medium",
            "assignee_name": row["owner_name"],
            "assignee_team": "Credit Review",
            "queue_name": "Tier 2 review",
            "due_at": row["due_at"],
            "sla_due_at": row["sla_due_at"],
            "completed_at": datetime.now(timezone.utc) if task_status == "resolved" else None,
            "escalation_level": "pm" if row["proposal_type"] == "ratio_reconciliation" else "ham",
            "escalation_status": escalation_status,
            "blocked_reason": "",
            "deep_link": (
                f"/deals/{row['deal_slug']}/periods/latest#"
                f"{'reconciliation' if row['proposal_type'] == 'ratio_reconciliation' else 'variance'}-"
                f"{review_metric_key(row['field_name'])}"
            ),
            "context_payload": {
                "proposalType": row["proposal_type"],
                "fieldName": row["field_name"],
                "documentName": row["document_name"],
                "confidence": as_number(row["confidence"]),
            },
        },
    )


def sync_compliance_case_task(conn, case_id: int):
    row = conn.execute(
        """
        SELECT
          c.*,
          d.slug AS deal_slug,
          d.name AS deal_name
        FROM compliance_cases c
        LEFT JOIN deals d ON d.id = c.deal_id
        WHERE c.id = %s
        """,
        (case_id,),
    ).fetchone()

    if not row:
        return

    task_status_map = {
        "open": "new",
        "in_progress": "in_progress",
        "pending_review": "in_progress",
        "monitoring": "in_progress",
        "resolved": "resolved",
    }
    escalation_status = "resolved"
    if row["status"] != "resolved":
        if row["case_type"] == "overdue_obligation":
            escalation_status = "overdue"
        elif row["severity"] == "high":
            escalation_status = "escalated"
        elif row["status"] == "pending_review":
            escalation_status = "approaching_due"
        else:
            escalation_status = "on_track"

    upsert_workflow_task(
        conn,
        {
            "source_domain": "compliance",
            "source_entity_type": "compliance_case",
            "source_entity_id": int(row["id"]),
            "deal_id": int(row["deal_id"]) if row["deal_id"] else None,
            "title": row["title"],
            "summary": row["summary"],
            "task_status": task_status_map.get(row["status"], "new"),
            "priority": row["severity"],
            "assignee_name": row["owner_name"],
            "assignee_team": "Compliance",
            "queue_name": "Compliance exceptions",
            "due_at": row["sla_due_at"],
            "sla_due_at": row["sla_due_at"],
            "completed_at": row["closed_at"],
            "escalation_level": "pm" if row["severity"] == "high" else "ham",
            "escalation_status": escalation_status,
            "blocked_reason": row["resolution_note"] if row["status"] == "resolved" else "",
            "deep_link": (
                f"/deals/{row['deal_slug']}" if row["deal_slug"] else "/compliance/exceptions"
            ),
            "context_payload": {
                "caseType": row["case_type"],
                "severity": row["severity"],
                "status": row["status"],
            },
        },
    )


def sync_risk_task(conn, risk_id: int):
    row = conn.execute(
        """
        SELECT
          r.*,
          d.slug AS deal_slug,
          d.name AS deal_name
        FROM risk_register_entries r
        JOIN deals d ON d.id = r.deal_id
        WHERE r.id = %s
        """,
        (risk_id,),
    ).fetchone()

    if not row:
        return

    task_status = "resolved" if row["status"] == "resolved" else "in_progress"
    escalation_status = "resolved"
    if task_status != "resolved":
        escalation_status = "escalated" if row["severity"] == "high" else "on_track"

    due_at = end_of_day(row["next_review_date"])
    upsert_workflow_task(
        conn,
        {
            "source_domain": "risk",
            "source_entity_type": "risk_register_entry",
            "source_entity_id": int(row["id"]),
            "deal_id": int(row["deal_id"]),
            "title": row["title"],
            "summary": row["summary"],
            "task_status": task_status,
            "priority": row["severity"],
            "assignee_name": row["owner_name"],
            "assignee_team": "Portfolio Management",
            "queue_name": "Risk register",
            "due_at": due_at,
            "sla_due_at": due_at,
            "completed_at": row["closed_at"],
            "escalation_level": "pm" if row["severity"] == "high" else "ham",
            "escalation_status": escalation_status,
            "blocked_reason": "",
            "deep_link": f"/deals/{row['deal_slug']}/risk",
            "context_payload": {
                "riskCategory": row["risk_category"],
                "severity": row["severity"],
                "nextReviewDate": row["next_review_date"].isoformat(),
            },
        },
    )


def sync_borrower_request_task(conn, request_id: int):
    row = conn.execute(
        """
        SELECT
          br.*,
          d.slug AS deal_slug,
          d.name AS deal_name
        FROM borrower_requests br
        JOIN deals d ON d.id = br.deal_id
        WHERE br.id = %s
        """,
        (request_id,),
    ).fetchone()

    if not row:
        return

    resolved_statuses = {"approved", "approved_with_conditions", "declined", "closed"}
    task_status = "resolved" if row["request_status"] in resolved_statuses else "in_progress"
    escalation_status = (
        "resolved"
        if task_status == "resolved"
        else "escalated"
        if row["priority"] == "high"
        else "on_track"
    )

    upsert_workflow_task(
        conn,
        {
            "source_domain": "borrower_requests",
            "source_entity_type": "borrower_request",
            "source_entity_id": int(row["id"]),
            "deal_id": int(row["deal_id"]),
            "title": row["title"],
            "summary": row["summary"],
            "task_status": task_status,
            "priority": row["priority"],
            "assignee_name": row["owner_name"],
            "assignee_team": "Portfolio Management",
            "queue_name": "Consents and waivers",
            "due_at": end_of_day(row["due_date"]),
            "sla_due_at": row["sla_due_at"],
            "completed_at": datetime.now(timezone.utc) if task_status == "resolved" else None,
            "escalation_level": "committee" if row["priority"] == "high" else "pm",
            "escalation_status": escalation_status,
            "blocked_reason": "",
            "deep_link": f"/deals/{row['deal_slug']}/requests",
            "context_payload": {
                "requestType": row["request_type"],
                "requestStatus": row["request_status"],
                "requestedAction": row["requested_action"],
            },
        },
    )


def sync_onboarding_task_entry(conn, task_id: int):
    row = conn.execute(
        """
        SELECT
          ot.*,
          ow.workflow_status,
          ow.organisation_id,
          ow.owner_id,
          ow.account_id,
          ow.deal_id,
          d.slug AS deal_slug,
          d.name AS deal_name
        FROM onboarding_tasks ot
        JOIN onboarding_workflows ow ON ow.id = ot.workflow_id
        LEFT JOIN deals d ON d.id = ow.deal_id
        WHERE ot.id = %s
        """,
        (task_id,),
    ).fetchone()

    if not row:
        return

    task_status_map = {
        "pending": "new",
        "in_progress": "in_progress",
        "completed": "resolved",
    }
    due_at = end_of_day(row["due_date"])
    escalation_status = "resolved"
    if row["status"] != "completed":
        if row["workflow_status"] == "pending_committee":
            escalation_status = "escalated"
        elif row["status"] == "in_progress":
            escalation_status = "approaching_due"
        else:
            escalation_status = "on_track"

    upsert_workflow_task(
        conn,
        {
            "source_domain": "configuration",
            "source_entity_type": "onboarding_task",
            "source_entity_id": int(row["id"]),
            "deal_id": int(row["deal_id"]) if row["deal_id"] else None,
            "organisation_id": int(row["organisation_id"]) if row["organisation_id"] else None,
            "owner_id": int(row["owner_id"]) if row["owner_id"] else None,
            "account_id": int(row["account_id"]) if row["account_id"] else None,
            "title": row["title"],
            "summary": row["notes"],
            "task_status": task_status_map.get(row["status"], "new"),
            "priority": "high" if row["workflow_status"] == "pending_committee" else "medium",
            "assignee_name": row["owner_name"],
            "assignee_team": "Configuration",
            "queue_name": "Onboarding",
            "due_at": due_at,
            "sla_due_at": due_at,
            "completed_at": datetime.now(timezone.utc) if row["status"] == "completed" else None,
            "escalation_level": "committee" if row["workflow_status"] == "pending_committee" else "ham",
            "escalation_status": escalation_status,
            "blocked_reason": "",
            "deep_link": "/configuration",
            "context_payload": {
                "workflowStatus": row["workflow_status"],
                "taskType": row["task_type"],
                "dealName": row["deal_name"],
            },
        },
    )


def sync_onboarding_workflow_tasks(conn, workflow_id: int):
    task_rows = conn.execute(
        "SELECT id FROM onboarding_tasks WHERE workflow_id = %s ORDER BY id",
        (workflow_id,),
    ).fetchall()
    for task_row in task_rows:
        sync_onboarding_task_entry(conn, int(task_row["id"]))


def serialize_source_document(row):
    if not row:
        return None

    return {
        "id": str(row["id"]),
        "documentType": row["document_type"],
        "documentName": row["document_name"],
        "periodLabel": row["period_label"],
        "status": row["status"],
        "receivedAt": row["received_at"].isoformat(),
        "evidencePage": row["evidence_page"],
        "snippet": row["snippet"],
    }


def serialize_distribution_assessment(row):
    if not row:
        return None

    return {
        "id": int(row["id"]),
        "periodKey": row["period_key"],
        "periodLabel": row["period_label"],
        "periodEnd": row["period_end"].isoformat(),
        "assessedAt": row["assessed_at"].isoformat(),
        "status": row["distribution_status"],
        "lockupState": row["lockup_state"],
        "blockerCount": int(row["blocker_count"]),
        "distributionCapacity": as_number(row["distribution_capacity"]),
        "cashTrapAmount": as_number(row["cash_trap_amount"]),
        "summary": row["summary"],
        "rationale": row["rationale"],
        "failedConditions": row["failed_conditions"],
        "requiredActions": row["required_actions"],
    }


def serialize_grade_override(row):
    if not row:
        return None

    return {
        "id": int(row["id"]),
        "previousGrade": row["previous_grade"],
        "overrideGrade": row["override_grade"],
        "status": row["override_status"],
        "rationale": row["rationale"],
        "ownerName": row["owner_name"],
        "expiresOn": row["expires_on"].isoformat(),
        "decidedAt": row["decided_at"].isoformat(),
        "impactSummary": row["impact_summary"],
    }


def serialize_document_supersession(row):
    if not row:
        return None

    return {
        "id": int(row["id"]),
        "periodLabel": row["period_label"],
        "supersessionReason": row["supersession_reason"],
        "impactSummary": row["impact_summary"],
        "affectedObjects": row["affected_objects"],
        "downstreamRecomputed": row["downstream_recomputed"],
        "effectiveAt": row["effective_at"].isoformat(),
        "supersededDocument": {
            "id": int(row["superseded_document_id"]),
            "documentName": row["superseded_document_name"],
            "documentType": row["superseded_document_type"],
        },
        "supersedingDocument": {
            "id": int(row["superseding_document_id"]),
            "documentName": row["superseding_document_name"],
            "documentType": row["superseding_document_type"],
        },
    }


def serialize_risk_entry(row):
    if not row:
        return None

    return {
        "id": int(row["id"]),
        "riskCategory": row["risk_category"],
        "severity": row["severity"],
        "probability": row["probability"],
        "impact": row["impact"],
        "status": row["status"],
        "ownerName": row["owner_name"],
        "title": row["title"],
        "summary": row["summary"],
        "mitigant": row["mitigant"],
        "nextReviewDate": row["next_review_date"].isoformat(),
        "openedAt": row["opened_at"].isoformat(),
        "closedAt": row["closed_at"].isoformat() if row["closed_at"] else None,
        "trendRecordId": int(row["trend_record_id"]) if row["trend_record_id"] else None,
        "complianceCaseId": int(row["compliance_case_id"])
        if row["compliance_case_id"]
        else None,
        "ratioReconciliationId": int(row["ratio_reconciliation_id"])
        if row["ratio_reconciliation_id"]
        else None,
        "sourceDocument": {
            "id": int(row["source_document_id"]),
            "documentName": row["source_document_name"],
            "documentType": row["source_document_type"],
        }
        if row["source_document_id"]
        else None,
    }


def serialize_borrower_request_vote(row):
    return {
        "id": int(row["id"]),
        "accountId": int(row["account_id"]),
        "accountName": row["account_name"],
        "voteStatus": row["vote_status"],
        "voterName": row["voter_name"],
        "rationale": row["rationale"],
        "decidedAt": row["decided_at"].isoformat(),
    }


def serialize_borrower_request_decision(row):
    return {
        "id": int(row["id"]),
        "decisionStatus": row["decision_status"],
        "decisionSummary": row["decision_summary"],
        "decisionRationale": row["decision_rationale"],
        "decidedBy": row["decided_by"],
        "effectiveFrom": row["effective_from"].isoformat(),
        "expiresOn": row["expires_on"].isoformat() if row["expires_on"] else None,
        "relatedGradeOverrideId": int(row["related_grade_override_id"])
        if row["related_grade_override_id"]
        else None,
        "activatedDistributionStatus": row["activated_distribution_status"],
        "decisionOutcome": row["decision_outcome"],
        "decidedAt": row["decided_at"].isoformat(),
    }


def serialize_amendment_rule_version(row):
    return {
        "id": int(row["id"]),
        "ruleDomain": row["rule_domain"],
        "ruleType": row["rule_type"],
        "targetEntityType": row["target_entity_type"],
        "targetEntityId": int(row["target_entity_id"])
        if row["target_entity_id"]
        else None,
        "targetLabel": row["target_label"],
        "versionLabel": row["version_label"],
        "changeSummary": row["change_summary"],
        "effectiveFrom": row["effective_from"].isoformat(),
        "effectiveTo": row["effective_to"].isoformat() if row["effective_to"] else None,
        "isActive": bool(row["is_active"]),
        "previousValue": row["previous_value"],
        "updatedValue": row["updated_value"],
    }


def serialize_amendment_change_impact(row):
    return {
        "id": int(row["id"]),
        "impactType": row["impact_type"],
        "targetEntityType": row["target_entity_type"],
        "targetEntityId": int(row["target_entity_id"])
        if row["target_entity_id"]
        else None,
        "targetLabel": row["target_label"],
        "impactSummary": row["impact_summary"],
        "beforeState": row["before_state"],
        "afterState": row["after_state"],
        "recomputedAt": row["recomputed_at"].isoformat(),
    }


def serialize_forecast_refresh_impact(row):
    return {
        "id": int(row["id"]),
        "impactType": row["impact_type"],
        "targetEntityType": row["target_entity_type"],
        "targetEntityId": int(row["target_entity_id"])
        if row["target_entity_id"]
        else None,
        "impactSummary": row["impact_summary"],
        "beforeState": row["before_state"],
        "afterState": row["after_state"],
        "recomputedAt": row["refreshed_at"].isoformat(),
    }


def serialize_deal_amendment(row, rule_versions, change_impacts):
    return {
        "id": int(row["id"]),
        "borrowerRequestId": int(row["borrower_request_id"])
        if row["borrower_request_id"]
        else None,
        "borrowerRequestDecisionId": int(row["borrower_request_decision_id"])
        if row["borrower_request_decision_id"]
        else None,
        "amendmentType": row["amendment_type"],
        "amendmentStatus": row["amendment_status"],
        "title": row["title"],
        "summary": row["summary"],
        "sourceDomain": row["source_domain"],
        "effectiveFrom": row["effective_from"].isoformat(),
        "effectiveTo": row["effective_to"].isoformat() if row["effective_to"] else None,
        "createdBy": row["created_by"],
        "createdAt": row["created_at"].isoformat(),
        "ruleVersions": [serialize_amendment_rule_version(item) for item in rule_versions],
        "changeImpacts": [
            serialize_amendment_change_impact(item) for item in change_impacts
        ],
    }


def serialize_forecast_case_period(row):
    return {
        "id": int(row["id"]),
        "financialPeriodId": int(row["financial_period_id"])
        if row["financial_period_id"]
        else None,
        "periodKey": row["period_key"],
        "periodLabel": row["period_label"],
        "scenarioMetrics": row["scenario_metrics"],
        "scenarioSummary": row["scenario_summary"],
    }


def serialize_forecast_case_version(row, period_rows, impact_rows):
    return {
        "id": int(row["id"]),
        "versionNumber": int(row["version_number"]),
        "versionLabel": row["version_label"],
        "versionStatus": row["version_status"],
        "sourceDomain": row["source_domain"],
        "summary": row["summary"],
        "effectiveFrom": row["effective_from"].isoformat(),
        "activatedAt": row["activated_at"].isoformat() if row["activated_at"] else None,
        "isActive": bool(row["is_active"]),
        "periods": [serialize_forecast_case_period(item) for item in period_rows],
        "refreshImpacts": [serialize_forecast_refresh_impact(item) for item in impact_rows],
    }


def serialize_forecast_case(row, versions):
    return {
        "id": int(row["id"]),
        "caseKey": row["case_key"],
        "caseName": row["case_name"],
        "caseType": row["case_type"],
        "drivesMonitoring": bool(row["drives_monitoring"]),
        "ownerName": row["owner_name"],
        "summary": row["summary"],
        "createdAt": row["created_at"].isoformat(),
        "versions": versions,
    }


def serialize_memo_pack_section(row):
    return {
        "id": int(row["id"]),
        "sectionKey": row["section_key"],
        "sectionTitle": row["section_title"],
        "displayOrder": int(row["display_order"]),
        "summary": row["summary"],
        "sectionPayload": row["section_payload"],
    }


def serialize_memo_pack(row, sections):
    return {
        "id": int(row["id"]),
        "packScope": row["pack_scope"],
        "packKind": row["pack_kind"],
        "packStatus": row["pack_status"],
        "title": row["title"],
        "summary": row["summary"],
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "dealSlug": row["deal_slug"],
        "dealName": row["deal_name"],
        "borrowerRequestId": int(row["borrower_request_id"])
        if row["borrower_request_id"]
        else None,
        "borrowerRequestTitle": row["borrower_request_title"],
        "financialPeriodId": int(row["financial_period_id"])
        if row["financial_period_id"]
        else None,
        "assessmentId": int(row["assessment_id"]) if row["assessment_id"] else None,
        "distributionAssessmentId": int(row["distribution_assessment_id"])
        if row["distribution_assessment_id"]
        else None,
        "snapshotId": int(row["snapshot_id"]) if row["snapshot_id"] else None,
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "organisationName": row["organisation_name"],
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "ownerName": row["owner_name"],
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "accountName": row["account_name"],
        "generatedBy": row["generated_by"],
        "generatedAt": row["generated_at"].isoformat(),
        "sections": [serialize_memo_pack_section(item) for item in sections],
    }


def serialize_report_export_section(row):
    return {
        "id": int(row["id"]),
        "sectionKey": row["section_key"],
        "sectionTitle": row["section_title"],
        "displayOrder": int(row["display_order"]),
        "summary": row["summary"],
        "sectionPayload": row["section_payload"],
    }


def serialize_report_export(row, sections):
    return {
        "id": int(row["id"]),
        "exportScope": row["export_scope"],
        "reportKind": row["report_kind"],
        "exportStatus": row["export_status"],
        "reviewStatus": row["review_status"],
        "releaseStatus": row["release_status"],
        "exportFormat": row["export_format"],
        "title": row["title"],
        "summary": row["summary"],
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "dealSlug": row["deal_slug"],
        "dealName": row["deal_name"],
        "financialPeriodId": int(row["financial_period_id"])
        if row["financial_period_id"]
        else None,
        "assessmentId": int(row["assessment_id"]) if row["assessment_id"] else None,
        "snapshotId": int(row["snapshot_id"]) if row["snapshot_id"] else None,
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "organisationName": row["organisation_name"],
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "ownerName": row["owner_name"],
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "accountName": row["account_name"],
        "activitySourceDomain": row["activity_source_domain"],
        "reportScheduleId": int(row["report_schedule_id"]) if row["report_schedule_id"] else None,
        "reviewedBy": row["reviewed_by"],
        "approvedBy": row["approved_by"],
        "releasedBy": row["released_by"],
        "reviewedAt": row["reviewed_at"].isoformat() if row["reviewed_at"] else None,
        "approvedAt": row["approved_at"].isoformat() if row["approved_at"] else None,
        "releasedAt": row["released_at"].isoformat() if row["released_at"] else None,
        "generatedBy": row["generated_by"],
        "generatedAt": row["generated_at"].isoformat(),
        "sections": [serialize_report_export_section(item) for item in sections],
    }


def serialize_report_schedule_recipient(row):
    return {
        "id": int(row["id"]),
        "recipientName": row["recipient_name"],
        "recipientType": row["recipient_type"],
        "deliveryChannel": row["delivery_channel"],
        "destination": row["destination"],
        "active": row["active"],
    }


def serialize_report_schedule(row, recipients):
    return {
        "id": int(row["id"]),
        "scheduleScope": row["schedule_scope"],
        "reportKind": row["report_kind"],
        "cadence": row["cadence"],
        "scheduleStatus": row["schedule_status"],
        "scheduleLabel": row["schedule_label"],
        "ownerName": row["owner_name"],
        "reviewerName": row["reviewer_name"],
        "approverName": row["approver_name"],
        "releaseChannel": row["release_channel"],
        "distributionMode": row["distribution_mode"],
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "dealName": row["deal_name"],
        "dealSlug": row["deal_slug"],
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "organisationName": row["organisation_name"],
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "ownerDisplayName": row["owner_display_name"],
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "accountName": row["account_name"],
        "activitySourceDomain": row["activity_source_domain"],
        "nextRunAt": row["next_run_at"].isoformat(),
        "lastRunAt": row["last_run_at"].isoformat() if row["last_run_at"] else None,
        "staleAfterDays": int(row["stale_after_days"]),
        "notes": row["notes"],
        "recipients": [serialize_report_schedule_recipient(item) for item in recipients],
    }


def serialize_report_generation_run(row):
    return {
        "id": int(row["id"]),
        "reportScheduleId": int(row["report_schedule_id"]) if row["report_schedule_id"] else None,
        "reportExportId": int(row["report_export_id"]) if row["report_export_id"] else None,
        "runStatus": row["run_status"],
        "triggerMode": row["trigger_mode"],
        "triggerSummary": row["trigger_summary"],
        "startedAt": row["started_at"].isoformat(),
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
        "reviewStatus": row["review_status"],
        "releaseStatus": row["release_status"],
    }


def serialize_report_delivery_log(row):
    return {
        "id": int(row["id"]),
        "reportExportId": int(row["report_export_id"]),
        "reportScheduleId": int(row["report_schedule_id"]) if row["report_schedule_id"] else None,
        "recipientName": row["recipient_name"],
        "recipientType": row["recipient_type"],
        "deliveryChannel": row["delivery_channel"],
        "destination": row["destination"],
        "deliveryStatus": row["delivery_status"],
        "deliveredAt": row["delivered_at"].isoformat() if row["delivered_at"] else None,
        "openedAt": row["opened_at"].isoformat() if row["opened_at"] else None,
        "acknowledgedAt": row["acknowledged_at"].isoformat() if row["acknowledged_at"] else None,
        "failureReason": row["failure_reason"],
        "title": row["title"],
    }


def serialize_report_delivery_exception(row):
    return {
        "id": int(row["id"]),
        "reportScheduleId": int(row["report_schedule_id"]) if row["report_schedule_id"] else None,
        "reportExportId": int(row["report_export_id"]) if row["report_export_id"] else None,
        "exceptionType": row["exception_type"],
        "severity": row["severity"],
        "status": row["status"],
        "title": row["title"],
        "summary": row["summary"],
        "ownerName": row["owner_name"],
        "raisedAt": row["raised_at"].isoformat(),
        "resolvedAt": row["resolved_at"].isoformat() if row["resolved_at"] else None,
    }


def variance_materiality(metric_key: str, variance_value: float, variance_pct: float):
    if metric_key == "seniorDscr":
        absolute = abs(variance_value)
        if absolute >= 0.10:
            return "critical"
        if absolute >= 0.05:
            return "material"
        if absolute >= 0.02:
            return "notable"
        return "minor"

    if metric_key.endswith("Pct"):
        absolute = abs(variance_value)
        if absolute >= 6:
            return "critical"
        if absolute >= 3:
            return "material"
        if absolute >= 1:
            return "notable"
        return "minor"

    absolute = abs(variance_pct)
    if absolute >= 10:
        return "critical"
    if absolute >= 5:
        return "material"
    if absolute >= 2:
        return "notable"
    return "minor"


def variance_direction(variance_value: float):
    if variance_value > 0:
        return "up"
    if variance_value < 0:
        return "down"
    return "flat"


def build_variance_commentary(
    metric_label: str,
    direction: str,
    materiality: str,
    case_name: str,
    version_label: str,
):
    direction_copy = (
        "is above"
        if direction == "up"
        else "is below"
        if direction == "down"
        else "is in line with"
    )
    materiality_copy = {
        "critical": "a critical break",
        "material": "a material miss",
        "notable": "a notable move",
        "minor": "a minor movement",
    }[materiality]
    return (
        f"{metric_label} {direction_copy} the active {case_name} ({version_label}), "
        f"creating {materiality_copy} versus the current monitoring baseline."
    )


def forecast_variance_score(variances):
    penalties = {
        "critical": 35,
        "material": 22,
        "notable": 10,
        "minor": 3,
    }
    if not variances:
        return 80
    average_penalty = sum(penalties[item["materiality"]] for item in variances) / len(variances)
    return max(0, min(100, round(100 - average_penalty, 2)))


def grade_from_score(score: float):
    if score >= 85:
        return "1 - Outperforming"
    if score >= 60:
        return "2 - In Line"
    if score >= 40:
        return "3 - Underperforming"
    return "4 - Stressed"


def monitoring_posture_from_score(score: float):
    if score < 45:
        return ("watchlist", "escalate_to_pm", "pm")
    if score < 70:
        return ("enhanced_monitoring", "monitor", "ham")
    return ("standard", "no_change", "none")


def active_forecast_versions(case_rows, version_rows):
    return {
        int(case["id"]): next(
            (
                version
                for version in version_rows
                if int(version["forecast_case_id"]) == int(case["id"])
                and version["is_active"]
            ),
            None,
        )
        for case in case_rows
    }


def load_forecast_cases(conn, deal_id: int):
    case_rows = conn.execute(
        """
        SELECT *
        FROM forecast_cases
        WHERE deal_id = %s
        ORDER BY CASE case_type
          WHEN 'base' THEN 0
          WHEN 'management' THEN 1
          WHEN 'downside' THEN 2
          ELSE 3
        END, id
        """,
        (deal_id,),
    ).fetchall()

    version_rows = conn.execute(
        """
        SELECT v.*, c.deal_id
        FROM forecast_case_versions v
        JOIN forecast_cases c ON c.id = v.forecast_case_id
        WHERE c.deal_id = %s
        ORDER BY v.is_active DESC, v.version_number DESC, v.id DESC
        """,
        (deal_id,),
    ).fetchall()

    period_rows = conn.execute(
        """
        SELECT p.*
        FROM forecast_case_periods p
        JOIN forecast_case_versions v ON v.id = p.forecast_case_version_id
        JOIN forecast_cases c ON c.id = v.forecast_case_id
        WHERE c.deal_id = %s
        ORDER BY p.period_label DESC, p.id DESC
        """,
        (deal_id,),
    ).fetchall()

    impact_rows = conn.execute(
        """
        SELECT *
        FROM forecast_refresh_impacts
        WHERE deal_id = %s
        ORDER BY refreshed_at DESC, id DESC
        """,
        (deal_id,),
    ).fetchall()

    return [
        serialize_forecast_case(
            case,
            [
                serialize_forecast_case_version(
                    version,
                    [
                        period
                        for period in period_rows
                        if int(period["forecast_case_version_id"]) == int(version["id"])
                    ],
                    [
                        impact
                        for impact in impact_rows
                        if int(impact["forecast_case_version_id"]) == int(version["id"])
                    ],
                )
                for version in version_rows
                if int(version["forecast_case_id"]) == int(case["id"])
            ],
        )
        for case in case_rows
    ]


def build_forecast_summary(conn, deal_id: int, period_key: str):
    case_rows = conn.execute(
        "SELECT * FROM forecast_cases WHERE deal_id = %s ORDER BY id",
        (deal_id,),
    ).fetchall()
    if not case_rows:
        return None

    version_rows = conn.execute(
        """
        SELECT v.*, c.case_name, c.case_type, c.drives_monitoring
        FROM forecast_case_versions v
        JOIN forecast_cases c ON c.id = v.forecast_case_id
        WHERE c.deal_id = %s AND v.is_active = TRUE
        ORDER BY c.id
        """,
        (deal_id,),
    ).fetchall()

    period_rows = conn.execute(
        """
        SELECT p.*, v.version_label, c.case_name, c.case_type, c.drives_monitoring
        FROM forecast_case_periods p
        JOIN forecast_case_versions v ON v.id = p.forecast_case_version_id
        JOIN forecast_cases c ON c.id = v.forecast_case_id
        WHERE c.deal_id = %s
          AND v.is_active = TRUE
          AND p.period_key = %s
        ORDER BY c.id
        """,
        (deal_id, period_key),
    ).fetchall()

    refresh_row = conn.execute(
        """
        SELECT refreshed_at
        FROM forecast_refresh_impacts
        WHERE deal_id = %s
        ORDER BY refreshed_at DESC, id DESC
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()

    monitoring_period = next(
        (row for row in period_rows if row["drives_monitoring"]),
        None,
    )
    if not monitoring_period:
        return None

    monitoring_metrics = monitoring_period["scenario_metrics"]
    scenarios = []
    for row in period_rows:
        delta = {}
        for metric_key in ("revenue", "ebitda", "cfads", "seniorDscr"):
            if metric_key in row["scenario_metrics"] and metric_key in monitoring_metrics:
                delta[metric_key] = as_number(row["scenario_metrics"][metric_key]) - as_number(
                    monitoring_metrics[metric_key]
                )
        scenarios.append(
            {
                "caseName": row["case_name"],
                "caseType": row["case_type"],
                "versionLabel": row["version_label"],
                "isMonitoring": bool(row["drives_monitoring"]),
                "scenarioSummary": row["scenario_summary"],
                "metrics": row["scenario_metrics"],
                "deltaToMonitoring": delta,
            }
        )

    return {
        "activeMonitoringCaseName": monitoring_period["case_name"],
        "activeMonitoringVersionLabel": monitoring_period["version_label"],
        "scenarioCount": len(period_rows),
        "latestRefreshAt": refresh_row["refreshed_at"].isoformat() if refresh_row else None,
        "scenarios": scenarios,
    }


def recompute_monitoring_case(conn, deal_id: int, forecast_case, forecast_version):
    version_periods = conn.execute(
        """
        SELECT *
        FROM forecast_case_periods
        WHERE forecast_case_version_id = %s
        ORDER BY id
        """,
        (int(forecast_version["id"]),),
    ).fetchall()

    impacts = []
    for version_period in version_periods:
        financial_period = conn.execute(
            """
            SELECT *
            FROM financial_periods
            WHERE id = %s
            """,
            (version_period["financial_period_id"],),
        ).fetchone()
        if not financial_period:
            continue

        expected_metrics = version_period["scenario_metrics"]
        reported_metrics = financial_period["reported_metrics"]
        before_expected = financial_period["expected_metrics"]

        conn.execute(
            """
            UPDATE financial_periods
            SET expected_metrics = %s::jsonb
            WHERE id = %s
            """,
            (json.dumps(expected_metrics), int(financial_period["id"])),
        )
        impacts.append(
            {
                "impact_type": "monitoring_case_activation",
                "target_entity_type": "financial_period",
                "target_entity_id": int(financial_period["id"]),
                "impact_summary": (
                    f"Expected metrics were refreshed from the active {forecast_case['case_name']} "
                    f"({forecast_version['version_label']})."
                ),
                "before_state": {"expectedMetrics": before_expected},
                "after_state": {"expectedMetrics": expected_metrics},
            }
        )

        variance_rows = conn.execute(
            """
            SELECT *
            FROM financial_variances
            WHERE financial_period_id = %s
            ORDER BY id
            """,
            (int(financial_period["id"]),),
        ).fetchall()

        before_variances = [
            {
                "metricKey": row["metric_key"],
                "expectedValue": as_number(row["expected_value"]),
                "materiality": row["materiality"],
                "commentary": row["commentary"],
            }
            for row in variance_rows
        ]
        recalculated_variances = []
        for row in variance_rows:
            metric_key = row["metric_key"]
            expected_value = as_number(expected_metrics.get(metric_key, row["expected_value"]))
            reported_value = as_number(reported_metrics.get(metric_key, row["reported_value"]))
            variance_value = round(reported_value - expected_value, 2)
            variance_pct = round((variance_value / expected_value) * 100, 2) if expected_value else 0
            direction = variance_direction(variance_value)
            materiality = variance_materiality(metric_key, variance_value, variance_pct)
            commentary = build_variance_commentary(
                row["metric_label"],
                direction,
                materiality,
                forecast_case["case_name"],
                forecast_version["version_label"],
            )
            conn.execute(
                """
                UPDATE financial_variances
                SET expected_value = %s,
                    variance_value = %s,
                    variance_pct = %s,
                    direction = %s,
                    materiality = %s,
                    commentary = %s
                WHERE id = %s
                """,
                (
                    expected_value,
                    variance_value,
                    variance_pct,
                    direction,
                    materiality,
                    commentary,
                    int(row["id"]),
                ),
            )
            recalculated_variances.append(
                {
                    "metricKey": metric_key,
                    "expectedValue": expected_value,
                    "materiality": materiality,
                    "commentary": commentary,
                }
            )

        impacts.append(
            {
                "impact_type": "variance_refresh",
                "target_entity_type": "financial_period",
                "target_entity_id": int(financial_period["id"]),
                "impact_summary": (
                    f"Variance commentary and materiality were recalculated against "
                    f"{forecast_case['case_name']} ({forecast_version['version_label']})."
                ),
                "before_state": {"variances": before_variances},
                "after_state": {"variances": recalculated_variances},
            }
        )

        assessment = conn.execute(
            """
            SELECT *
            FROM deal_assessments
            WHERE deal_id = %s AND financial_period_id = %s
            """,
            (deal_id, int(financial_period["id"])),
        ).fetchone()
        if assessment:
            before_assessment = {
                "grade": assessment["grade"],
                "overallScore": as_number(assessment["overall_score"]),
                "varianceScore": int(assessment["variance_score"]),
                "watchlistStatus": assessment["watchlist_status"],
                "summary": assessment["summary"],
            }
            variance_score = forecast_variance_score(recalculated_variances)
            overall_score = round(
                int(assessment["covenant_score"]) * 0.4
                + variance_score * 0.2
                + int(assessment["trend_score"]) * 0.2
                + int(assessment["compliance_score"]) * 0.2,
                2,
            )
            grade = grade_from_score(overall_score)
            watchlist_status, recommendation, escalation = monitoring_posture_from_score(
                overall_score
            )
            summary = (
                f"{forecast_case['case_name']} ({forecast_version['version_label']}) is now "
                f"the active monitoring baseline. {financial_period['period_label']} is being "
                f"assessed against that case, leaving the deal at {grade.lower()} with "
                f"{watchlist_status.replace('_', ' ')} posture."
            )
            conn.execute(
                """
                UPDATE deal_assessments
                SET grade = %s,
                    overall_score = %s,
                    variance_score = %s,
                    watchlist_status = %s,
                    watchlist_recommendation = %s,
                    escalation_level = %s,
                    summary = %s
                WHERE id = %s
                """,
                (
                    grade,
                    overall_score,
                    round(variance_score),
                    watchlist_status,
                    recommendation,
                    escalation,
                    summary,
                    int(assessment["id"]),
                ),
            )
            impacts.append(
                {
                    "impact_type": "assessment_refresh",
                    "target_entity_type": "deal_assessment",
                    "target_entity_id": int(assessment["id"]),
                    "impact_summary": (
                        f"Assessment scoring and summary were refreshed from the active "
                        f"{forecast_case['case_name']}."
                    ),
                    "before_state": before_assessment,
                    "after_state": {
                        "grade": grade,
                        "overallScore": overall_score,
                        "varianceScore": round(variance_score),
                        "watchlistStatus": watchlist_status,
                        "summary": summary,
                    },
                }
            )

            risk_rows = conn.execute(
                """
                SELECT *
                FROM risk_register_entries
                WHERE deal_id = %s
                  AND status <> 'resolved'
                  AND (
                    assessment_id = %s OR
                    risk_category IN ('financial_performance', 'leasing', 'construction')
                  )
                ORDER BY id
                """,
                (deal_id, int(assessment["id"])),
            ).fetchall()
            critical_count = sum(
                1 for item in recalculated_variances if item["materiality"] == "critical"
            )
            for risk_row in risk_rows:
                before_risk = {
                    "status": risk_row["status"],
                    "summary": risk_row["summary"],
                    "mitigant": risk_row["mitigant"],
                }
                next_status = "open" if critical_count > 0 or overall_score < 50 else "monitoring"
                next_summary = (
                    f"{risk_row['title']} is being monitored against {forecast_case['case_name']} "
                    f"({forecast_version['version_label']}); current period variances remain the "
                    f"anchor of this risk view."
                )
                next_mitigant = append_note(
                    risk_row["mitigant"],
                    f"Validate the next package against {forecast_case['case_name']} ({forecast_version['version_label']}).",
                )
                conn.execute(
                    """
                    UPDATE risk_register_entries
                    SET status = %s,
                        summary = %s,
                        mitigant = %s
                    WHERE id = %s
                    """,
                    (next_status, next_summary, next_mitigant, int(risk_row["id"])),
                )
                impacts.append(
                    {
                        "impact_type": "risk_refresh",
                        "target_entity_type": "risk_register_entry",
                        "target_entity_id": int(risk_row["id"]),
                        "impact_summary": (
                            f"Risk narrative was refreshed against the active {forecast_case['case_name']}."
                        ),
                        "before_state": before_risk,
                        "after_state": {
                            "status": next_status,
                            "summary": next_summary,
                            "mitigant": next_mitigant,
                        },
                    }
                )

    return impacts


def load_memo_packs(conn, deal_id: int | None = None, organisation_id: int | None = None, owner_id: int | None = None, account_id: int | None = None, portfolio_only: bool = False):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("mp.deal_id = %s")
        params.append(deal_id)
    if portfolio_only:
        conditions.append("mp.pack_scope = 'portfolio'")
    if organisation_id is not None:
        conditions.append("COALESCE(mp.organisation_id, %s) = %s")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("COALESCE(mp.owner_id, %s) = %s")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("COALESCE(mp.account_id, %s) = %s")
        params.extend([account_id, account_id])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    pack_rows = conn.execute(
        f"""
        SELECT
          mp.*,
          d.slug AS deal_slug,
          d.name AS deal_name,
          br.title AS borrower_request_title,
          o.name AS organisation_name,
          po.name AS owner_name,
          a.name AS account_name
        FROM memo_packs mp
        LEFT JOIN deals d ON d.id = mp.deal_id
        LEFT JOIN borrower_requests br ON br.id = mp.borrower_request_id
        LEFT JOIN organisations o ON o.id = mp.organisation_id
        LEFT JOIN portfolio_owners po ON po.id = mp.owner_id
        LEFT JOIN accounts a ON a.id = mp.account_id
        {where_clause}
        ORDER BY mp.generated_at DESC, mp.id DESC
        """,
        tuple(params),
    ).fetchall()

    if not pack_rows:
        return []

    pack_ids = tuple(int(row["id"]) for row in pack_rows)
    section_rows = conn.execute(
        f"""
        SELECT *
        FROM memo_pack_sections
        WHERE memo_pack_id IN ({','.join(['%s'] * len(pack_ids))})
        ORDER BY display_order, id
        """,
        pack_ids,
    ).fetchall()

    return [
        serialize_memo_pack(
            pack,
            [
                row
                for row in section_rows
                if int(row["memo_pack_id"]) == int(pack["id"])
            ],
        )
        for pack in pack_rows
    ]


def insert_memo_pack(conn, payload, sections):
    pack = conn.execute(
        """
        INSERT INTO memo_packs (
          pack_scope,
          pack_kind,
          pack_status,
          title,
          summary,
          deal_id,
          borrower_request_id,
          financial_period_id,
          assessment_id,
          distribution_assessment_id,
          snapshot_id,
          organisation_id,
          owner_id,
          account_id,
          generated_by,
          generated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id
        """,
        (
            payload["pack_scope"],
            payload["pack_kind"],
            payload["pack_status"],
            payload["title"],
            payload["summary"],
            payload.get("deal_id"),
            payload.get("borrower_request_id"),
            payload.get("financial_period_id"),
            payload.get("assessment_id"),
            payload.get("distribution_assessment_id"),
            payload.get("snapshot_id"),
            payload.get("organisation_id"),
            payload.get("owner_id"),
            payload.get("account_id"),
            payload["generated_by"],
        ),
    ).fetchone()

    for index, section in enumerate(sections, start=1):
        conn.execute(
            """
            INSERT INTO memo_pack_sections (
              memo_pack_id,
              section_key,
              section_title,
              display_order,
              summary,
              section_payload
            ) VALUES (%s, %s, %s, %s, %s, %s::jsonb)
            """,
            (
                int(pack["id"]),
                section["section_key"],
                section["section_title"],
                index,
                section["summary"],
                json.dumps(section["section_payload"]),
            ),
        )

    return int(pack["id"])


def generate_deal_memo_pack(conn, deal_slug: str, pack_kind: str, generated_by: str, borrower_request_id: int | None = None):
    deal = conn.execute(
        "SELECT id, slug, name FROM deals WHERE slug = %s",
        (deal_slug,),
    ).fetchone()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    latest_period = conn.execute(
        """
        SELECT *
        FROM financial_periods
        WHERE deal_id = %s
        ORDER BY period_end DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    assessment = conn.execute(
        """
        SELECT *
        FROM deal_assessments
        WHERE deal_id = %s
        ORDER BY assessment_date DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    distribution = conn.execute(
        """
        SELECT *
        FROM distribution_assessments
        WHERE deal_id = %s
        ORDER BY assessed_at DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    latest_snapshot = conn.execute(
        """
        SELECT id, snapshot_label
        FROM deal_topsheet_snapshots
        WHERE deal_id = %s
        ORDER BY captured_at DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    snapshot_payload = build_snapshot_payload(conn, int(deal["id"]))
    forecast_summary = build_forecast_summary(conn, int(deal["id"]), latest_period["period_key"]) if latest_period else None
    amendment_count = conn.execute(
        "SELECT COUNT(*)::int AS count FROM deal_amendments WHERE deal_id = %s",
        (deal["id"],),
    ).fetchone()["count"]
    risk_counts = conn.execute(
        """
        SELECT
          COUNT(*) FILTER (WHERE status <> 'resolved')::int AS open_count,
          COUNT(*) FILTER (WHERE severity = 'high' AND status <> 'resolved')::int AS high_count
        FROM risk_register_entries
        WHERE deal_id = %s
        """,
        (deal["id"],),
    ).fetchone()

    if pack_kind == "deal_committee":
        sections = [
            {
                "section_key": "deal_overview",
                "section_title": "Deal overview",
                "summary": "TopSheet view for the current monitored state.",
                "section_payload": {
                    **snapshot_payload,
                    "snapshotLabel": latest_snapshot["snapshot_label"] if latest_snapshot else None,
                },
            },
            {
                "section_key": "period_view",
                "section_title": "Latest period",
                "summary": "Most recent period actuals versus the active monitoring case.",
                "section_payload": {
                    "periodLabel": latest_period["period_label"] if latest_period else None,
                    "reportedMetrics": latest_period["reported_metrics"] if latest_period else {},
                    "expectedMetrics": latest_period["expected_metrics"] if latest_period else {},
                },
            },
            {
                "section_key": "risks_and_actions",
                "section_title": "Risk and actions",
                "summary": "Open risk posture, distribution status, and active amendment controls.",
                "section_payload": {
                    "openRisks": int(risk_counts["open_count"]),
                    "highSeverityRisks": int(risk_counts["high_count"]),
                    "distributionStatus": distribution["distribution_status"] if distribution else None,
                    "activeAmendments": int(amendment_count),
                },
            },
            {
                "section_key": "forecast_context",
                "section_title": "Forecast context",
                "summary": "Active monitoring case and scenario context for committee use.",
                "section_payload": forecast_summary or {},
            },
        ]
        pack_id = insert_memo_pack(
            conn,
            {
                "pack_scope": "deal",
                "pack_kind": "deal_committee",
                "pack_status": "generated",
                "title": f"{deal['name']} committee pack",
                "summary": "Generated from the current TopSheet, latest period, active risks, distribution posture, and forecast baseline.",
                "deal_id": int(deal["id"]),
                "borrower_request_id": None,
                "financial_period_id": int(latest_period["id"]) if latest_period else None,
                "assessment_id": int(assessment["id"]) if assessment else None,
                "distribution_assessment_id": int(distribution["id"]) if distribution else None,
                "snapshot_id": int(latest_snapshot["id"]) if latest_snapshot else None,
                "organisation_id": None,
                "owner_id": None,
                "account_id": None,
                "generated_by": generated_by,
            },
            sections,
        )
        return pack_id

    if pack_kind != "borrower_request_decision" or borrower_request_id is None:
        raise HTTPException(status_code=400, detail="Unsupported deal pack kind")

    request_row = conn.execute(
        """
        SELECT *
        FROM borrower_requests
        WHERE id = %s AND deal_id = %s
        """,
        (borrower_request_id, deal["id"]),
    ).fetchone()
    if not request_row:
        raise HTTPException(status_code=404, detail="Borrower request not found")

    vote_rows = conn.execute(
        """
        SELECT vote_status
        FROM borrower_request_votes
        WHERE borrower_request_id = %s
        """,
        (borrower_request_id,),
    ).fetchall()
    decision_row = conn.execute(
        """
        SELECT *
        FROM borrower_request_decisions
        WHERE borrower_request_id = %s
        ORDER BY decided_at DESC, id DESC
        LIMIT 1
        """,
        (borrower_request_id,),
    ).fetchone()
    amendment_rows = conn.execute(
        """
        SELECT *
        FROM deal_amendments
        WHERE borrower_request_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (borrower_request_id,),
    ).fetchall()
    impact_count = conn.execute(
        """
        SELECT COUNT(*)::int AS count
        FROM amendment_change_impacts aci
        JOIN deal_amendments da ON da.id = aci.amendment_id
        WHERE da.borrower_request_id = %s
        """,
        (borrower_request_id,),
    ).fetchone()["count"]
    sections = [
        {
            "section_key": "request_summary",
            "section_title": "Borrower request summary",
            "summary": "Borrower ask and requested action.",
            "section_payload": {
                "requestType": request_row["request_type"],
                "priority": request_row["priority"],
                "requestedAction": request_row["requested_action"],
                "dueDate": request_row["due_date"].isoformat(),
            },
        },
        {
            "section_key": "voting_position",
            "section_title": "Voting position",
            "summary": "Account-level voting position for the decision.",
            "section_payload": {
                "totalVotes": len(vote_rows),
                "support": sum(1 for row in vote_rows if row["vote_status"] == "support"),
                "supportWithConditions": sum(1 for row in vote_rows if row["vote_status"] == "support_with_conditions"),
                "oppose": sum(1 for row in vote_rows if row["vote_status"] == "oppose"),
            },
        },
        {
            "section_key": "decision_and_amendment",
            "section_title": "Decision and amendment",
            "summary": "Latest committee decision and linked amendment objects.",
            "section_payload": {
                "decisionStatus": decision_row["decision_status"] if decision_row else None,
                "decisionSummary": decision_row["decision_summary"] if decision_row else None,
                "amendmentCount": len(amendment_rows),
                "amendmentTitles": [row["title"] for row in amendment_rows],
            },
        },
        {
            "section_key": "downstream_impacts",
            "section_title": "Downstream impacts",
            "summary": "Objects refreshed or constrained by the decision.",
            "section_payload": {
                "distributionStatus": distribution["distribution_status"] if distribution else None,
                "recomputedObjects": int(impact_count),
                "snapshotLabel": latest_snapshot["snapshot_label"] if latest_snapshot else None,
            },
        },
    ]
    return insert_memo_pack(
        conn,
        {
            "pack_scope": "deal",
            "pack_kind": "borrower_request_decision",
            "pack_status": "generated",
            "title": f"{request_row['title']} pack",
            "summary": "Generated consent / waiver decision pack from the current request, voting, amendment, and downstream monitoring state.",
            "deal_id": int(deal["id"]),
            "borrower_request_id": borrower_request_id,
            "financial_period_id": int(latest_period["id"]) if latest_period else None,
            "assessment_id": int(assessment["id"]) if assessment else None,
            "distribution_assessment_id": int(distribution["id"]) if distribution else None,
            "snapshot_id": int(latest_snapshot["id"]) if latest_snapshot else None,
            "organisation_id": None,
            "owner_id": None,
            "account_id": None,
            "generated_by": generated_by,
        },
        sections,
    )


def generate_portfolio_memo_pack(conn, generated_by: str, organisation_id: int | None = None, owner_id: int | None = None, account_id: int | None = None):
    scope = resolve_portfolio_scope(conn, organisation_id, owner_id, account_id)
    summary = conn.execute(
        """
        WITH scoped_holdings AS (
          SELECT h.deal_id, h.current_amount
          FROM holdings h
          JOIN accounts a ON a.id = h.account_id
          JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
          JOIN organisations o ON o.id = po.organisation_id
          WHERE h.status = 'active'
            AND (%s::int IS NULL OR o.id = %s::int)
            AND (%s::int IS NULL OR po.id = %s::int)
            AND (%s::int IS NULL OR a.id = %s::int)
        ),
        latest_distribution AS (
          SELECT DISTINCT ON (da.deal_id)
            da.deal_id,
            da.distribution_status
          FROM distribution_assessments da
          ORDER BY da.deal_id, da.assessed_at DESC, da.id DESC
        )
        SELECT
          COUNT(DISTINCT sh.deal_id)::int AS deal_count,
          COUNT(DISTINCT CASE WHEN d.watchlist THEN sh.deal_id END)::int AS watchlist_count,
          COUNT(DISTINCT CASE WHEN ld.distribution_status = 'blocked' THEN sh.deal_id END)::int AS blocked_distributions,
          COALESCE(SUM(sh.current_amount), 0)::bigint AS exposure
        FROM scoped_holdings sh
        JOIN deals d ON d.id = sh.deal_id
        LEFT JOIN latest_distribution ld ON ld.deal_id = sh.deal_id
        """,
        (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
    ).fetchone()
    top_watchlist = conn.execute(
        """
        WITH scoped_holdings AS (
          SELECT h.deal_id, SUM(h.current_amount)::bigint AS exposure
          FROM holdings h
          JOIN accounts a ON a.id = h.account_id
          JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
          JOIN organisations o ON o.id = po.organisation_id
          WHERE h.status = 'active'
            AND (%s::int IS NULL OR o.id = %s::int)
            AND (%s::int IS NULL OR po.id = %s::int)
            AND (%s::int IS NULL OR a.id = %s::int)
          GROUP BY h.deal_id
        )
        SELECT d.slug, d.name, d.grade, sh.exposure
        FROM scoped_holdings sh
        JOIN deals d ON d.id = sh.deal_id
        WHERE d.watchlist
        ORDER BY sh.exposure DESC
        LIMIT 5
        """,
        (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
    ).fetchall()
    top_risks = conn.execute(
        """
        WITH scoped_holdings AS (
          SELECT h.deal_id, SUM(h.current_amount)::bigint AS exposure
          FROM holdings h
          JOIN accounts a ON a.id = h.account_id
          JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
          JOIN organisations o ON o.id = po.organisation_id
          WHERE h.status = 'active'
            AND (%s::int IS NULL OR o.id = %s::int)
            AND (%s::int IS NULL OR po.id = %s::int)
            AND (%s::int IS NULL OR a.id = %s::int)
          GROUP BY h.deal_id
        )
        SELECT r.title, r.severity, d.name AS deal_name, sh.exposure
        FROM risk_register_entries r
        JOIN deals d ON d.id = r.deal_id
        JOIN scoped_holdings sh ON sh.deal_id = r.deal_id
        WHERE r.status <> 'resolved'
        ORDER BY CASE r.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, sh.exposure DESC
        LIMIT 5
        """,
        (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
    ).fetchall()
    sections = [
        {
            "section_key": "watchlist_summary",
            "section_title": "Watchlist summary",
            "summary": "Current watchlist concentration and blocked distribution posture for the scoped portfolio.",
            "section_payload": {
                "scopeTitle": scope["title"],
                "dealCount": int(summary["deal_count"]),
                "watchlistCount": int(summary["watchlist_count"]),
                "blockedDistributions": int(summary["blocked_distributions"]),
                "exposure": int(summary["exposure"]),
            },
        },
        {
            "section_key": "committee_focus",
            "section_title": "Committee focus",
            "summary": "Highest-priority watchlist names in the current scope.",
            "section_payload": {
                "deals": [
                    {
                        "name": row["name"],
                        "slug": row["slug"],
                        "grade": row["grade"],
                        "exposure": int(row["exposure"]),
                    }
                    for row in top_watchlist
                ]
            },
        },
        {
            "section_key": "portfolio_actions",
            "section_title": "Portfolio actions",
            "summary": "High-severity risks requiring near-term committee attention.",
            "section_payload": {
                "risks": [
                    {
                        "title": row["title"],
                        "severity": row["severity"],
                        "dealName": row["deal_name"],
                        "exposure": int(row["exposure"]),
                    }
                    for row in top_risks
                ]
            },
        },
    ]
    return insert_memo_pack(
        conn,
        {
            "pack_scope": "portfolio",
            "pack_kind": "watchlist_committee",
            "pack_status": "generated",
            "title": f"{scope['title']} watchlist committee pack",
            "summary": "Generated portfolio watchlist pack covering scoped watchlist names, blocked distributions, and high-severity risks.",
            "deal_id": None,
            "borrower_request_id": None,
            "financial_period_id": None,
            "assessment_id": None,
            "distribution_assessment_id": None,
            "snapshot_id": None,
            "organisation_id": organisation_id,
            "owner_id": owner_id,
            "account_id": account_id,
            "generated_by": generated_by,
        },
        sections,
    )


def load_activity_events(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    source_domain: str | None = None,
    limit: int = 20,
):
    if deal_id is not None:
        return conn.execute(
            """
            SELECT
              ae.*,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.name AS organisation_name,
              po.name AS owner_name,
              a.name AS account_name
            FROM activity_events ae
            LEFT JOIN deals d ON d.id = ae.deal_id
            LEFT JOIN organisations o ON o.id = ae.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = ae.owner_id
            LEFT JOIN accounts a ON a.id = ae.account_id
            WHERE ae.deal_id = %s
              AND (%s::text IS NULL OR ae.source_domain = %s::text)
            ORDER BY ae.created_at DESC, ae.id DESC
            LIMIT %s
            """,
            (deal_id, source_domain, source_domain, limit),
        ).fetchall()

    return conn.execute(
        """
        WITH scoped_deals AS (
          SELECT DISTINCT h.deal_id
          FROM holdings h
          JOIN accounts a ON a.id = h.account_id
          JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
          JOIN organisations o ON o.id = po.organisation_id
          WHERE h.status = 'active'
            AND (%s::int IS NULL OR o.id = %s::int)
            AND (%s::int IS NULL OR po.id = %s::int)
            AND (%s::int IS NULL OR a.id = %s::int)
        )
        SELECT
          ae.*,
          d.name AS deal_name,
          d.slug AS deal_slug,
          o.name AS organisation_name,
          po.name AS owner_name,
          a.name AS account_name
        FROM activity_events ae
        LEFT JOIN deals d ON d.id = ae.deal_id
        LEFT JOIN organisations o ON o.id = ae.organisation_id
        LEFT JOIN portfolio_owners po ON po.id = ae.owner_id
        LEFT JOIN accounts a ON a.id = ae.account_id
        LEFT JOIN scoped_deals sd ON sd.deal_id = ae.deal_id
        WHERE (%s::text IS NULL OR ae.source_domain = %s::text)
          AND (
            (%s::int IS NULL AND %s::int IS NULL AND %s::int IS NULL)
            OR sd.deal_id IS NOT NULL
            OR (%s::int IS NOT NULL AND ae.organisation_id = %s::int)
            OR (%s::int IS NOT NULL AND ae.owner_id = %s::int)
            OR (%s::int IS NOT NULL AND ae.account_id = %s::int)
          )
        ORDER BY ae.created_at DESC, ae.id DESC
        LIMIT %s
        """,
        (
            organisation_id,
            organisation_id,
            owner_id,
            owner_id,
            account_id,
            account_id,
            source_domain,
            source_domain,
            organisation_id,
            owner_id,
            account_id,
            organisation_id,
            organisation_id,
            owner_id,
            owner_id,
            account_id,
            account_id,
            limit,
        ),
    ).fetchall()


def load_report_exports(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    source_domain: str | None = None,
):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("re.deal_id = %s")
        params.append(deal_id)
    if organisation_id is not None:
        conditions.append("COALESCE(re.organisation_id, %s) = %s")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("COALESCE(re.owner_id, %s) = %s")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("COALESCE(re.account_id, %s) = %s")
        params.extend([account_id, account_id])
    if source_domain is not None:
        conditions.append("COALESCE(re.activity_source_domain, %s) = %s")
        params.extend([source_domain, source_domain])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    export_rows = conn.execute(
        f"""
        SELECT
          re.*,
          d.slug AS deal_slug,
          d.name AS deal_name,
          o.name AS organisation_name,
          po.name AS owner_name,
          a.name AS account_name
        FROM report_exports re
        LEFT JOIN deals d ON d.id = re.deal_id
        LEFT JOIN organisations o ON o.id = re.organisation_id
        LEFT JOIN portfolio_owners po ON po.id = re.owner_id
        LEFT JOIN accounts a ON a.id = re.account_id
        {where_clause}
        ORDER BY re.generated_at DESC, re.id DESC
        """,
        tuple(params),
    ).fetchall()

    if not export_rows:
        return []

    export_ids = tuple(int(row["id"]) for row in export_rows)
    section_rows = conn.execute(
        f"""
        SELECT *
        FROM report_export_sections
        WHERE report_export_id IN ({','.join(['%s'] * len(export_ids))})
        ORDER BY display_order, id
        """,
        export_ids,
    ).fetchall()

    return [
        serialize_report_export(
            export_row,
            [
                row
                for row in section_rows
                if int(row["report_export_id"]) == int(export_row["id"])
            ],
        )
        for export_row in export_rows
    ]


def insert_report_export(conn, payload, sections):
    export_row = conn.execute(
        """
        INSERT INTO report_exports (
          export_scope,
          report_kind,
          export_status,
          review_status,
          release_status,
          export_format,
          title,
          summary,
          deal_id,
          financial_period_id,
          assessment_id,
          snapshot_id,
          report_schedule_id,
          organisation_id,
          owner_id,
          account_id,
          activity_source_domain,
          reviewed_by,
          approved_by,
          released_by,
          reviewed_at,
          approved_at,
          released_at,
          generated_by,
          generated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id
        """,
        (
            payload["export_scope"],
            payload["report_kind"],
            payload["export_status"],
            payload.get("review_status", "pending_review"),
            payload.get("release_status", "draft"),
            payload["export_format"],
            payload["title"],
            payload["summary"],
            payload.get("deal_id"),
            payload.get("financial_period_id"),
            payload.get("assessment_id"),
            payload.get("snapshot_id"),
            payload.get("report_schedule_id"),
            payload.get("organisation_id"),
            payload.get("owner_id"),
            payload.get("account_id"),
            payload.get("activity_source_domain"),
            payload.get("reviewed_by"),
            payload.get("approved_by"),
            payload.get("released_by"),
            payload.get("reviewed_at"),
            payload.get("approved_at"),
            payload.get("released_at"),
            payload["generated_by"],
        ),
    ).fetchone()

    for index, section in enumerate(sections, start=1):
        conn.execute(
            """
            INSERT INTO report_export_sections (
              report_export_id,
              section_key,
              section_title,
              display_order,
              summary,
              section_payload
            ) VALUES (%s, %s, %s, %s, %s, %s::jsonb)
            """,
            (
                int(export_row["id"]),
                section["section_key"],
                section["section_title"],
                index,
                section["summary"],
                json.dumps(section["section_payload"]),
            ),
        )

    return int(export_row["id"])


def next_schedule_run(current: datetime, cadence: str):
    if cadence == "weekly":
        return current + timedelta(days=7)
    if cadence == "monthly":
        return current + timedelta(days=30)
    if cadence == "quarterly":
        return current + timedelta(days=90)
    return current + timedelta(days=30)


def load_report_schedules(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("rs.deal_id = %s")
        params.append(deal_id)
    if organisation_id is not None:
        conditions.append("COALESCE(rs.organisation_id, %s) = %s")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("COALESCE(rs.owner_id, %s) = %s")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("COALESCE(rs.account_id, %s) = %s")
        params.extend([account_id, account_id])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    schedule_rows = conn.execute(
        f"""
        SELECT
          rs.*,
          d.slug AS deal_slug,
          d.name AS deal_name,
          o.name AS organisation_name,
          po.name AS owner_display_name,
          a.name AS account_name
        FROM report_schedules rs
        LEFT JOIN deals d ON d.id = rs.deal_id
        LEFT JOIN organisations o ON o.id = rs.organisation_id
        LEFT JOIN portfolio_owners po ON po.id = rs.owner_id
        LEFT JOIN accounts a ON a.id = rs.account_id
        {where_clause}
        ORDER BY rs.next_run_at, rs.id
        """,
        tuple(params),
    ).fetchall()

    if not schedule_rows:
        return []

    schedule_ids = tuple(int(row["id"]) for row in schedule_rows)
    recipient_rows = conn.execute(
        f"""
        SELECT *
        FROM report_schedule_recipients
        WHERE report_schedule_id IN ({','.join(['%s'] * len(schedule_ids))})
        ORDER BY id
        """,
        schedule_ids,
    ).fetchall()

    return [
        serialize_report_schedule(
            schedule,
            [
                row
                for row in recipient_rows
                if int(row["report_schedule_id"]) == int(schedule["id"])
            ],
        )
        for schedule in schedule_rows
    ]


def load_report_delivery_logs(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("re.deal_id = %s")
        params.append(deal_id)
    if organisation_id is not None:
        conditions.append("COALESCE(re.organisation_id, %s) = %s")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("COALESCE(re.owner_id, %s) = %s")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("COALESCE(re.account_id, %s) = %s")
        params.extend([account_id, account_id])
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(
        f"""
        SELECT rdl.*, re.title
        FROM report_delivery_logs rdl
        JOIN report_exports re ON re.id = rdl.report_export_id
        {where_clause}
        ORDER BY COALESCE(rdl.delivered_at, re.generated_at) DESC, rdl.id DESC
        LIMIT 24
        """,
        tuple(params),
    ).fetchall()
    return [serialize_report_delivery_log(row) for row in rows]


def load_report_delivery_exceptions(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("re.deal_id = %s")
        params.append(deal_id)
    if organisation_id is not None:
        conditions.append("(rde.report_schedule_id IS NOT NULL AND COALESCE(rs.organisation_id, %s) = %s)")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("(rde.report_schedule_id IS NOT NULL AND COALESCE(rs.owner_id, %s) = %s)")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("(rde.report_schedule_id IS NOT NULL AND COALESCE(rs.account_id, %s) = %s)")
        params.extend([account_id, account_id])
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(
        f"""
        SELECT rde.*
        FROM report_delivery_exceptions rde
        LEFT JOIN report_exports re ON re.id = rde.report_export_id
        LEFT JOIN report_schedules rs ON rs.id = rde.report_schedule_id
        {where_clause}
        ORDER BY rde.raised_at DESC, rde.id DESC
        LIMIT 24
        """,
        tuple(params),
    ).fetchall()
    return [serialize_report_delivery_exception(row) for row in rows]


def load_report_generation_runs(
    conn,
    *,
    deal_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
):
    conditions = []
    params = []
    if deal_id is not None:
        conditions.append("re.deal_id = %s")
        params.append(deal_id)
    if organisation_id is not None:
        conditions.append("(rgr.report_schedule_id IS NOT NULL AND COALESCE(rs.organisation_id, %s) = %s)")
        params.extend([organisation_id, organisation_id])
    if owner_id is not None:
        conditions.append("(rgr.report_schedule_id IS NOT NULL AND COALESCE(rs.owner_id, %s) = %s)")
        params.extend([owner_id, owner_id])
    if account_id is not None:
        conditions.append("(rgr.report_schedule_id IS NOT NULL AND COALESCE(rs.account_id, %s) = %s)")
        params.extend([account_id, account_id])
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(
        f"""
        SELECT rgr.*
        FROM report_generation_runs rgr
        LEFT JOIN report_exports re ON re.id = rgr.report_export_id
        LEFT JOIN report_schedules rs ON rs.id = rgr.report_schedule_id
        {where_clause}
        ORDER BY rgr.started_at DESC, rgr.id DESC
        LIMIT 24
        """,
        tuple(params),
    ).fetchall()
    return [serialize_report_generation_run(row) for row in rows]


def create_delivery_exception(
    conn,
    *,
    report_schedule_id: int | None,
    report_export_id: int | None,
    exception_type: str,
    severity: str,
    title: str,
    summary: str,
    owner_name: str,
):
    conn.execute(
        """
        INSERT INTO report_delivery_exceptions (
          report_schedule_id,
          report_export_id,
          exception_type,
          severity,
          status,
          title,
          summary,
          owner_name,
          raised_at
        ) VALUES (%s, %s, %s, %s, 'open', %s, %s, %s, NOW())
        """,
        (
            report_schedule_id,
            report_export_id,
            exception_type,
            severity,
            title,
            summary,
            owner_name,
        ),
    )

def generate_deal_report_export(
    conn,
    deal_slug: str,
    report_kind: str,
    generated_by: str,
    report_schedule_id: int | None = None,
):
    deal = conn.execute(
        "SELECT id, slug, name, grade FROM deals WHERE slug = %s",
        (deal_slug,),
    ).fetchone()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    latest_period = conn.execute(
        """
        SELECT *
        FROM financial_periods
        WHERE deal_id = %s
        ORDER BY period_end DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    assessment = conn.execute(
        """
        SELECT *
        FROM deal_assessments
        WHERE deal_id = %s
        ORDER BY assessment_date DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    latest_snapshot = conn.execute(
        """
        SELECT id, snapshot_label, snapshot_data
        FROM deal_topsheet_snapshots
        WHERE deal_id = %s
        ORDER BY captured_at DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    distribution = conn.execute(
        """
        SELECT *
        FROM distribution_assessments
        WHERE deal_id = %s
        ORDER BY assessed_at DESC, id DESC
        LIMIT 1
        """,
        (deal["id"],),
    ).fetchone()
    risk_counts = conn.execute(
        """
        SELECT
          COUNT(*) FILTER (WHERE status <> 'resolved')::int AS open_count,
          COUNT(*) FILTER (WHERE severity = 'high' AND status <> 'resolved')::int AS high_count
        FROM risk_register_entries
        WHERE deal_id = %s
        """,
        (deal["id"],),
    ).fetchone()
    request_counts = conn.execute(
        """
        SELECT COUNT(*) FILTER (WHERE request_status NOT IN ('closed', 'declined'))::int AS open_count
        FROM borrower_requests
        WHERE deal_id = %s
        """,
        (deal["id"],),
    ).fetchone()
    amendment_count = conn.execute(
        "SELECT COUNT(*)::int AS count FROM deal_amendments WHERE deal_id = %s",
        (deal["id"],),
    ).fetchone()

    if report_kind == "deal_monitoring":
        snapshot_payload = build_snapshot_payload(conn, int(deal["id"]))
        activity_rows = load_activity_events(conn, deal_id=int(deal["id"]), limit=5)
        sections = [
            {
                "section_key": "deal_summary",
                "section_title": "Deal summary",
                "summary": "Current TopSheet summary for the monitored deal.",
                "section_payload": snapshot_payload,
            },
            {
                "section_key": "latest_period",
                "section_title": "Latest period",
                "summary": "Latest approved reported metrics against the active expected case.",
                "section_payload": {
                    "periodLabel": latest_period["period_label"] if latest_period else None,
                    "reportedMetrics": latest_period["reported_metrics"] if latest_period else {},
                    "expectedMetrics": latest_period["expected_metrics"] if latest_period else {},
                },
            },
            {
                "section_key": "risk_requests_distribution",
                "section_title": "Risk, requests, and distribution",
                "summary": "Current open monitoring items affecting the deal.",
                "section_payload": {
                    "openRisks": int(risk_counts["open_count"]),
                    "highSeverityRisks": int(risk_counts["high_count"]),
                    "openRequests": int(request_counts["open_count"]),
                    "distributionStatus": distribution["distribution_status"] if distribution else None,
                    "activeAmendments": int(amendment_count["count"]),
                },
            },
            {
                "section_key": "recent_activity",
                "section_title": "Recent activity",
                "summary": "Recent material workflow changes for the deal.",
                "section_payload": {
                    "events": [
                        {
                            "title": row["title"],
                            "eventType": row["event_type"],
                            "actorName": row["actor_name"],
                            "createdAt": row["created_at"].isoformat(),
                        }
                        for row in activity_rows
                    ]
                },
            },
        ]
        return insert_report_export(
            conn,
            {
                "export_scope": "deal",
                "report_kind": report_kind,
                "export_status": "generated",
                "review_status": "pending_review",
                "release_status": "draft",
                "export_format": "json",
                "title": f"{deal['name']} monitoring report",
                "summary": "Generated deal monitoring export from the live TopSheet, period, risk, request, and activity state.",
                "deal_id": int(deal["id"]),
                "financial_period_id": int(latest_period["id"]) if latest_period else None,
                "assessment_id": int(assessment["id"]) if assessment else None,
                "snapshot_id": int(latest_snapshot["id"]) if latest_snapshot else None,
                "report_schedule_id": report_schedule_id,
                "organisation_id": None,
                "owner_id": None,
                "account_id": None,
                "activity_source_domain": None,
                "generated_by": generated_by,
            },
            sections,
        )

    if report_kind != "activity_audit":
        raise HTTPException(status_code=400, detail="Unsupported deal report kind")

    activity_rows = load_activity_events(conn, deal_id=int(deal["id"]), limit=25)
    sections = [
        {
            "section_key": "audit_scope",
            "section_title": "Audit scope",
            "summary": "Scope and metadata for the exported deal timeline.",
            "section_payload": {
                "dealName": deal["name"],
                "eventCount": len(activity_rows),
                "generatedBy": generated_by,
            },
        },
        {
            "section_key": "event_log",
            "section_title": "Event log",
            "summary": "Chronological list of material deal events.",
            "section_payload": {
                "events": [serialize_activity_event(row) for row in activity_rows]
            },
        },
        {
            "section_key": "before_after_summary",
            "section_title": "Before / after summary",
            "summary": "State transitions captured in the timeline.",
            "section_payload": {
                "transitions": [
                    {
                        "title": row["title"],
                        "beforeState": row["before_state"],
                        "afterState": row["after_state"],
                    }
                    for row in activity_rows[:8]
                ]
            },
        },
    ]
    return insert_report_export(
        conn,
        {
            "export_scope": "activity",
            "report_kind": report_kind,
            "export_status": "generated",
            "review_status": "pending_review",
            "release_status": "draft",
            "export_format": "json",
            "title": f"{deal['name']} audit export",
            "summary": "Generated audit export from the deal activity timeline with before/after state captures.",
            "deal_id": int(deal["id"]),
            "financial_period_id": None,
            "assessment_id": None,
            "snapshot_id": None,
            "report_schedule_id": report_schedule_id,
            "organisation_id": None,
            "owner_id": None,
            "account_id": None,
            "activity_source_domain": None,
            "generated_by": generated_by,
        },
        sections,
    )


def generate_portfolio_report_export(
    conn,
    *,
    report_kind: str,
    generated_by: str,
    report_schedule_id: int | None = None,
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    source_domain: str | None = None,
):
    scope = resolve_portfolio_scope(conn, organisation_id, owner_id, account_id)

    if report_kind == "portfolio_monitoring":
        summary = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            latest_distribution AS (
              SELECT DISTINCT ON (da.deal_id)
                da.deal_id,
                da.distribution_status
              FROM distribution_assessments da
              ORDER BY da.deal_id, da.assessed_at DESC, da.id DESC
            )
            SELECT
              COUNT(DISTINCT sh.deal_id)::int AS deal_count,
              COUNT(DISTINCT CASE WHEN d.watchlist THEN sh.deal_id END)::int AS watchlist_count,
              COUNT(DISTINCT CASE WHEN ld.distribution_status = 'blocked' THEN sh.deal_id END)::int AS blocked_distributions,
              COALESCE(SUM(sh.current_amount), 0)::bigint AS exposure
            FROM scoped_holdings sh
            JOIN deals d ON d.id = sh.deal_id
            LEFT JOIN latest_distribution ld ON ld.deal_id = sh.deal_id
            """,
            (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
        ).fetchone()
        watchlist_rows = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, SUM(h.current_amount)::bigint AS exposure
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
              GROUP BY h.deal_id
            )
            SELECT d.name, d.slug, d.grade, sh.exposure
            FROM scoped_holdings sh
            JOIN deals d ON d.id = sh.deal_id
            WHERE d.watchlist
            ORDER BY sh.exposure DESC
            LIMIT 5
            """,
            (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
        ).fetchall()
        risk_rows = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, SUM(h.current_amount)::bigint AS exposure
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
              GROUP BY h.deal_id
            )
            SELECT r.title, r.severity, d.name AS deal_name, sh.exposure
            FROM risk_register_entries r
            JOIN deals d ON d.id = r.deal_id
            JOIN scoped_holdings sh ON sh.deal_id = r.deal_id
            WHERE r.status <> 'resolved'
            ORDER BY CASE r.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, sh.exposure DESC
            LIMIT 5
            """,
            (organisation_id, organisation_id, owner_id, owner_id, account_id, account_id),
        ).fetchall()
        activity_rows = load_activity_events(
            conn,
            organisation_id=organisation_id,
            owner_id=owner_id,
            account_id=account_id,
            limit=8,
        )
        sections = [
            {
                "section_key": "portfolio_summary",
                "section_title": "Portfolio summary",
                "summary": "High-level monitoring summary for the current scope.",
                "section_payload": {
                    "scopeTitle": scope["title"],
                    "scopeSubtitle": scope["subtitle"],
                    "dealCount": int(summary["deal_count"]),
                    "watchlistCount": int(summary["watchlist_count"]),
                    "blockedDistributions": int(summary["blocked_distributions"]),
                    "totalExposure": int(summary["exposure"]),
                },
            },
            {
                "section_key": "watchlist_focus",
                "section_title": "Watchlist focus",
                "summary": "Names driving current watchlist attention.",
                "section_payload": {
                    "deals": [
                        {
                            "name": row["name"],
                            "slug": row["slug"],
                            "grade": row["grade"],
                            "exposure": int(row["exposure"]),
                        }
                        for row in watchlist_rows
                    ]
                },
            },
            {
                "section_key": "risk_and_events",
                "section_title": "Risk and events",
                "summary": "High-severity risks and recent material events within scope.",
                "section_payload": {
                    "risks": [
                        {
                            "title": row["title"],
                            "severity": row["severity"],
                            "dealName": row["deal_name"],
                            "exposure": int(row["exposure"]),
                        }
                        for row in risk_rows
                    ],
                    "recentEvents": [
                        {
                            "title": row["title"],
                            "sourceDomain": row["source_domain"],
                            "createdAt": row["created_at"].isoformat(),
                        }
                        for row in activity_rows
                    ],
                },
            },
        ]
        return insert_report_export(
            conn,
            {
                "export_scope": "portfolio",
                "report_kind": report_kind,
                "export_status": "generated",
                "review_status": "pending_review",
                "release_status": "draft",
                "export_format": "json",
                "title": f"{scope['title']} monitoring report",
                "summary": "Generated portfolio monitoring export covering exposure, watchlist, risks, and recent activity.",
                "deal_id": None,
                "financial_period_id": None,
                "assessment_id": None,
                "snapshot_id": None,
                "report_schedule_id": report_schedule_id,
                "organisation_id": organisation_id,
                "owner_id": owner_id,
                "account_id": account_id,
                "activity_source_domain": None,
                "generated_by": generated_by,
            },
            sections,
        )

    if report_kind != "activity_audit":
        raise HTTPException(status_code=400, detail="Unsupported portfolio report kind")

    activity_rows = load_activity_events(
        conn,
        organisation_id=organisation_id,
        owner_id=owner_id,
        account_id=account_id,
        source_domain=source_domain,
        limit=40,
    )
    sections = [
        {
            "section_key": "audit_scope",
            "section_title": "Audit scope",
            "summary": "Scope and filters used for this activity export.",
            "section_payload": {
                "scopeTitle": scope["title"],
                "scopeSubtitle": scope["subtitle"],
                "sourceDomain": source_domain or "all",
                "eventCount": len(activity_rows),
            },
        },
        {
            "section_key": "event_log",
            "section_title": "Event log",
            "summary": "Chronological activity feed for the selected scope.",
            "section_payload": {
                "events": [serialize_activity_event(row) for row in activity_rows]
            },
        },
        {
            "section_key": "actors_and_transitions",
            "section_title": "Actors and transitions",
            "summary": "Actors involved and captured before/after state transitions.",
            "section_payload": {
                "actors": sorted({row["actor_name"] for row in activity_rows}),
                "transitions": [
                    {
                        "title": row["title"],
                        "beforeState": row["before_state"],
                        "afterState": row["after_state"],
                    }
                    for row in activity_rows[:10]
                ],
            },
        },
    ]
    return insert_report_export(
        conn,
        {
            "export_scope": "activity",
            "report_kind": report_kind,
            "export_status": "generated",
            "review_status": "pending_review",
            "release_status": "draft",
            "export_format": "json",
            "title": f"{scope['title']} activity audit export",
            "summary": "Generated activity export from the scoped audit timeline and before/after state captures.",
            "deal_id": None,
            "financial_period_id": None,
            "assessment_id": None,
            "snapshot_id": None,
            "report_schedule_id": report_schedule_id,
            "organisation_id": organisation_id,
            "owner_id": owner_id,
            "account_id": account_id,
            "activity_source_domain": source_domain,
            "generated_by": generated_by,
        },
        sections,
    )


def run_due_report_schedules(conn, triggered_by: str):
    now = datetime.now(timezone.utc)
    due_schedules = conn.execute(
        """
        SELECT *
        FROM report_schedules
        WHERE schedule_status = 'active'
          AND next_run_at <= NOW()
        ORDER BY next_run_at, id
        """
    ).fetchall()

    generated = []
    for schedule in due_schedules:
        run = conn.execute(
            """
            INSERT INTO report_generation_runs (
              report_schedule_id,
              report_export_id,
              run_status,
              trigger_mode,
              trigger_summary,
              started_at,
              completed_at,
              review_status,
              release_status
            ) VALUES (%s, NULL, 'running', 'scheduled', %s, NOW(), NULL, 'pending_review', 'draft')
            RETURNING id
            """,
            (
                int(schedule["id"]),
                f"{schedule['schedule_label']} schedule run was triggered.",
            ),
        ).fetchone()

        try:
            if schedule["schedule_scope"] == "deal":
                deal = conn.execute(
                    "SELECT slug FROM deals WHERE id = %s",
                    (schedule["deal_id"],),
                ).fetchone()
                export_id = generate_deal_report_export(
                    conn,
                    deal["slug"],
                    schedule["report_kind"],
                    triggered_by,
                    report_schedule_id=int(schedule["id"]),
                )
            else:
                source_domain = (
                    None
                    if schedule["activity_source_domain"] == "All domains"
                    else schedule["activity_source_domain"]
                )
                export_id = generate_portfolio_report_export(
                    conn,
                    report_kind=schedule["report_kind"],
                    generated_by=triggered_by,
                    report_schedule_id=int(schedule["id"]),
                    organisation_id=int(schedule["organisation_id"]) if schedule["organisation_id"] else None,
                    owner_id=int(schedule["owner_id"]) if schedule["owner_id"] else None,
                    account_id=int(schedule["account_id"]) if schedule["account_id"] else None,
                    source_domain=source_domain,
                )

            conn.execute(
                """
                UPDATE report_generation_runs
                SET report_export_id = %s,
                    run_status = 'completed',
                    completed_at = NOW()
                WHERE id = %s
                """,
                (export_id, int(run["id"])),
            )
            conn.execute(
                """
                UPDATE report_schedules
                SET last_run_at = NOW(),
                    next_run_at = %s
                WHERE id = %s
                """,
                (next_schedule_run(now, schedule["cadence"]), int(schedule["id"])),
            )
            record_activity_event(
                conn,
                source_domain="reports",
                event_type="schedule_run_completed",
                entity_type="report_schedule",
                entity_id=int(schedule["id"]),
                deal_id=int(schedule["deal_id"]) if schedule["deal_id"] else None,
                organisation_id=int(schedule["organisation_id"]) if schedule["organisation_id"] else None,
                owner_id=int(schedule["owner_id"]) if schedule["owner_id"] else None,
                account_id=int(schedule["account_id"]) if schedule["account_id"] else None,
                actor_name=triggered_by,
                title=f"{schedule['schedule_label']} generated",
                summary="A due report schedule generated a new export and queued it for review.",
                before_state={"nextRunAt": schedule["next_run_at"].isoformat()},
                after_state={"reportExportId": export_id, "reviewStatus": "pending_review"},
                deep_link="/reports",
            )
            generated.append(export_id)
        except Exception:
            conn.execute(
                """
                UPDATE report_generation_runs
                SET run_status = 'failed',
                    completed_at = NOW(),
                    release_status = 'delivery_blocked'
                WHERE id = %s
                """,
                (int(run["id"]),),
            )
            raise

    return generated


def release_report_export(conn, export_id: int, actor_name: str):
    export_row = conn.execute(
        """
        SELECT *
        FROM report_exports
        WHERE id = %s
        FOR UPDATE
        """,
        (export_id,),
    ).fetchone()
    if not export_row:
        raise HTTPException(status_code=404, detail="Report export not found")
    if export_row["review_status"] != "approved":
        raise HTTPException(status_code=400, detail="Report must be approved before release")

    recipients = []
    if export_row["report_schedule_id"]:
        recipients = conn.execute(
            """
            SELECT *
            FROM report_schedule_recipients
            WHERE report_schedule_id = %s
            ORDER BY id
            """,
            (int(export_row["report_schedule_id"]),),
        ).fetchall()

    active_recipients = [row for row in recipients if row["active"]]
    if not active_recipients:
        if not export_row["report_schedule_id"]:
            conn.execute(
                """
                INSERT INTO report_delivery_logs (
                  report_export_id,
                  report_schedule_id,
                  recipient_name,
                  recipient_type,
                  delivery_channel,
                  destination,
                  delivery_status,
                  delivered_at
                ) VALUES (%s, NULL, %s, 'ad_hoc_requestor', 'portal', %s, 'delivered', NOW())
                """,
                (
                    export_id,
                    actor_name,
                    f"portal://ad-hoc/{export_id}",
                ),
            )
            conn.execute(
                """
                UPDATE report_exports
                SET release_status = 'released',
                    released_by = %s,
                    released_at = NOW()
                WHERE id = %s
                """,
                (actor_name, export_id),
            )
            return
        create_delivery_exception(
            conn,
            report_schedule_id=int(export_row["report_schedule_id"]) if export_row["report_schedule_id"] else None,
            report_export_id=export_id,
            exception_type="missing_recipients",
            severity="high",
            title=f"{export_row['title']} has no active recipients",
            summary="Release was blocked because the schedule does not have any active recipients.",
            owner_name="Distribution Ops",
        )
        conn.execute(
            """
            UPDATE report_exports
            SET release_status = 'delivery_blocked'
            WHERE id = %s
            """,
            (export_id,),
        )
        raise HTTPException(status_code=400, detail="No active recipients configured for release")

    for recipient in active_recipients:
        conn.execute(
            """
            INSERT INTO report_delivery_logs (
              report_export_id,
              report_schedule_id,
              recipient_name,
              recipient_type,
              delivery_channel,
              destination,
              delivery_status,
              delivered_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'delivered', NOW())
            """,
            (
                export_id,
                export_row["report_schedule_id"],
                recipient["recipient_name"],
                recipient["recipient_type"],
                recipient["delivery_channel"],
                recipient["destination"],
            ),
        )

    conn.execute(
        """
        UPDATE report_exports
        SET release_status = 'released',
            released_by = %s,
            released_at = NOW()
        WHERE id = %s
        """,
        (actor_name, export_id),
    )
    if export_row["report_schedule_id"]:
        conn.execute(
            """
            UPDATE report_generation_runs
            SET release_status = 'released'
            WHERE report_export_id = %s
            """,
            (export_id,),
        )

def summarize_request_votes(votes):
    summary = {
        "support": 0,
        "supportWithConditions": 0,
        "oppose": 0,
        "abstain": 0,
        "total": len(votes),
    }

    for vote in votes:
        status = vote["voteStatus"]
        if status == "support":
            summary["support"] += 1
        elif status == "support_with_conditions":
            summary["supportWithConditions"] += 1
        elif status == "oppose":
            summary["oppose"] += 1
        elif status == "abstain":
            summary["abstain"] += 1

    return summary


def serialize_borrower_request(row, votes, decisions):
    serialized_votes = [serialize_borrower_request_vote(vote) for vote in votes]
    serialized_decisions = [
        serialize_borrower_request_decision(decision) for decision in decisions
    ]

    return {
        "id": int(row["id"]),
        "requestType": row["request_type"],
        "requestStatus": row["request_status"],
        "priority": row["priority"],
        "title": row["title"],
        "summary": row["summary"],
        "requestedAction": row["requested_action"],
        "borrowerContact": row["borrower_contact"],
        "ownerName": row["owner_name"],
        "submittedAt": row["submitted_at"].isoformat(),
        "dueDate": row["due_date"].isoformat(),
        "slaDueAt": row["sla_due_at"].isoformat(),
        "decisionSummary": row["decision_summary"],
        "relatedCovenantId": int(row["related_covenant_id"])
        if row["related_covenant_id"]
        else None,
        "relatedDistributionAssessmentId": int(row["related_distribution_assessment_id"])
        if row["related_distribution_assessment_id"]
        else None,
        "relatedRiskEntryId": int(row["related_risk_entry_id"])
        if row["related_risk_entry_id"]
        else None,
        "votes": serialized_votes,
        "voteSummary": summarize_request_votes(serialized_votes),
        "currentDecision": serialized_decisions[0] if serialized_decisions else None,
        "decisionHistory": serialized_decisions,
    }


def serialize_onboarding_activation_event(row):
    return {
        "id": int(row["id"]),
        "activationStatus": row["activation_status"],
        "activatedBy": row["activated_by"],
        "summary": row["summary"],
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "holdingId": int(row["holding_id"]) if row["holding_id"] else None,
        "activatedAt": row["activated_at"].isoformat(),
    }


def serialize_onboarding_workflow(row, tasks, activation_events):
    return {
        "id": int(row["id"]),
        "workflowType": row["workflow_type"],
        "workflowStatus": row["workflow_status"],
        "organisationId": int(row["organisation_id"]) if row["organisation_id"] else None,
        "ownerId": int(row["owner_id"]) if row["owner_id"] else None,
        "accountId": int(row["account_id"]) if row["account_id"] else None,
        "dealId": int(row["deal_id"]) if row["deal_id"] else None,
        "holdingId": int(row["holding_id"]) if row["holding_id"] else None,
        "organisationName": row["organisation_name"] or row["proposed_organisation_name"],
        "ownerDisplayName": row["owner_display_name"] or row["proposed_owner_name"],
        "accountName": row["account_name"] or row["proposed_account_name"],
        "dealName": row["deal_name"] or row["proposed_deal_name"],
        "proposedHoldingAmount": as_number(row["proposed_holding_amount"]),
        "ownerName": row["owner_name"],
        "targetGoLiveDate": row["target_go_live_date"].isoformat(),
        "summary": row["summary"],
        "createdAt": row["created_at"].isoformat(),
        "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
        "tasks": [
            {
                "id": int(task["id"]),
                "taskType": task["task_type"],
                "title": task["title"],
                "status": task["status"],
                "ownerName": task["owner_name"],
                "dueDate": task["due_date"].isoformat(),
                "notes": task["notes"],
            }
            for task in tasks
        ],
        "activationHistory": [
            serialize_onboarding_activation_event(event) for event in activation_events
        ],
    }


def serialize_topsheet_snapshot(row):
    return {
        "id": int(row["id"]),
        "snapshotLabel": row["snapshot_label"],
        "snapshotType": row["snapshot_type"],
        "capturedAt": row["captured_at"].isoformat(),
        "capturedBy": row["captured_by"],
        "summary": row["summary"],
        "snapshotData": row["snapshot_data"],
        "financialPeriodId": int(row["financial_period_id"]) if row["financial_period_id"] else None,
        "payloadHash": row["payload_hash"],
        "triggerEventId": int(row["trigger_event_id"]) if row["trigger_event_id"] else None,
        "priorSnapshotId": int(row["prior_snapshot_id"]) if row["prior_snapshot_id"] else None,
    }


def serialize_snapshot_provenance(row):
    return {
        "id": int(row["id"]),
        "provenanceKind": row["provenance_kind"],
        "sourceEntityType": row["source_entity_type"],
        "sourceEntityId": (
            int(row["source_entity_id"]) if row["source_entity_id"] is not None else None
        ),
        "sourceLabel": row["source_label"],
        "sourceEventId": int(row["source_event_id"]) if row["source_event_id"] else None,
        "payload": row["payload"],
        "createdAt": row["created_at"].isoformat(),
    }


def serialize_snapshot_recomputation(row):
    return {
        "id": int(row["id"]),
        "recomputedAt": row["recomputed_at"].isoformat(),
        "recomputedBy": row["recomputed_by"],
        "recomputationStatus": row["recomputation_status"],
        "expectedHash": row["expected_hash"],
        "actualHash": row["actual_hash"],
        "divergenceSummary": row["divergence_summary"],
        "diffPayload": row["diff_payload"],
    }


def load_deal_amendments(conn, deal_id: int):
    amendment_rows = conn.execute(
        """
        SELECT *
        FROM deal_amendments
        WHERE deal_id = %s
        ORDER BY created_at DESC, id DESC
        """,
        (deal_id,),
    ).fetchall()

    rule_version_rows = conn.execute(
        """
        SELECT *
        FROM amendment_rule_versions
        WHERE deal_id = %s
        ORDER BY effective_from DESC, id DESC
        """,
        (deal_id,),
    ).fetchall()

    impact_rows = conn.execute(
        """
        SELECT *
        FROM amendment_change_impacts
        WHERE deal_id = %s
        ORDER BY recomputed_at DESC, id DESC
        """,
        (deal_id,),
    ).fetchall()

    return [
        serialize_deal_amendment(
            amendment,
            [
                row
                for row in rule_version_rows
                if int(row["amendment_id"]) == int(amendment["id"])
            ],
            [
                row
                for row in impact_rows
                if int(row["amendment_id"]) == int(amendment["id"])
            ],
        )
        for amendment in amendment_rows
    ]


def build_snapshot_payload(conn, deal_id: int):
    deal = conn.execute(
        """
        SELECT d.id, d.name, d.grade, d.watchlist, d.status, d.latest_period_label,
               COALESCE(go.override_grade, d.grade) AS effective_grade
        FROM deals d
        LEFT JOIN LATERAL (
          SELECT override_grade
          FROM grade_overrides go
          WHERE go.deal_id = d.id
            AND go.override_status = 'active'
            AND go.expires_on >= CURRENT_DATE
          ORDER BY go.decided_at DESC, go.id DESC
          LIMIT 1
        ) go ON TRUE
        WHERE d.id = %s
        """,
        (deal_id,),
    ).fetchone()

    distribution = conn.execute(
        """
        SELECT distribution_status
        FROM distribution_assessments
        WHERE deal_id = %s
        ORDER BY assessed_at DESC, id DESC
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()

    assessment = conn.execute(
        """
        SELECT watchlist_status, escalation_level
        FROM deal_assessments
        WHERE deal_id = %s
        ORDER BY assessment_date DESC, id DESC
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()

    risks = conn.execute(
        """
        SELECT COUNT(*)::int AS open_risks
        FROM risk_register_entries
        WHERE deal_id = %s AND status <> 'resolved'
        """,
        (deal_id,),
    ).fetchone()

    requests = conn.execute(
        """
        SELECT COUNT(*)::int AS open_requests
        FROM borrower_requests
        WHERE deal_id = %s AND request_status NOT IN ('closed', 'declined')
        """,
        (deal_id,),
    ).fetchone()

    obligations = conn.execute(
        """
        SELECT COUNT(*)::int AS overdue_obligations
        FROM obligations
        WHERE deal_id = %s AND status = 'overdue'
        """,
        (deal_id,),
    ).fetchone()

    payload = {
        "dealName": deal["name"],
        "grade": deal["effective_grade"],
        "baseGrade": deal["grade"],
        "dealStatus": deal["status"],
        "watchlist": deal["watchlist"],
        "latestPeriodLabel": deal["latest_period_label"],
        "distributionStatus": distribution["distribution_status"] if distribution else None,
        "watchlistStatus": assessment["watchlist_status"] if assessment else None,
        "escalationLevel": assessment["escalation_level"] if assessment else None,
        "openRisks": int(risks["open_risks"]),
        "openRequests": int(requests["open_requests"]),
        "overdueObligations": int(obligations["overdue_obligations"]),
    }
    return payload


def capture_snapshot_record(
    conn,
    deal_id: int,
    snapshot_label: str,
    snapshot_type: str,
    captured_by: str,
    summary: str,
    trigger_event_id: int | None = None,
):
    deal = conn.execute(
        """
        SELECT
          d.id,
          d.name,
          (
            SELECT id
            FROM financial_periods fp
            WHERE fp.deal_id = d.id
            ORDER BY fp.period_end DESC, fp.id DESC
            LIMIT 1
          ) AS latest_period_id
        FROM deals d
        WHERE d.id = %s
        """,
        (deal_id,),
    ).fetchone()

    snapshot_payload = build_snapshot_payload(conn, deal_id)
    payload_hash = json_hash(snapshot_payload)
    prior_snapshot = conn.execute(
        """
        SELECT id
        FROM deal_topsheet_snapshots
        WHERE deal_id = %s
        ORDER BY captured_at DESC, id DESC
        LIMIT 1
        """,
        (deal_id,),
    ).fetchone()
    snapshot = conn.execute(
        """
        INSERT INTO deal_topsheet_snapshots (
          deal_id,
          financial_period_id,
          snapshot_label,
          snapshot_type,
          captured_at,
          captured_by,
          summary,
          snapshot_data,
          trigger_event_id,
          prior_snapshot_id,
          payload_hash
        ) VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s::jsonb, %s, %s, %s)
        RETURNING id
        """,
        (
            deal_id,
            deal["latest_period_id"],
            snapshot_label,
            snapshot_type,
            captured_by,
            summary,
            json.dumps(snapshot_payload),
            trigger_event_id,
            int(prior_snapshot["id"]) if prior_snapshot else None,
            payload_hash,
        ),
    ).fetchone()
    snapshot_id = int(snapshot["id"])
    record_snapshot_provenance(
        conn,
        snapshot_id=snapshot_id,
        provenance_kind="deal_state",
        source_entity_type="deal",
        source_entity_id=deal_id,
        source_label=deal["name"],
        payload={
            "financialPeriodId": int(deal["latest_period_id"])
            if deal["latest_period_id"] is not None
            else None
        },
    )
    if deal["latest_period_id"] is not None:
        record_snapshot_provenance(
            conn,
            snapshot_id=snapshot_id,
            provenance_kind="financial_period",
            source_entity_type="financial_period",
            source_entity_id=int(deal["latest_period_id"]),
            source_label=f"Latest monitored period for {deal['name']}",
        )
    return snapshot_id, snapshot_payload


def portfolio_href(
    organisation_id: int | None = None,
    owner_id: int | None = None,
    account_id: int | None = None,
    viewer_name: str | None = None,
    extra_params: dict[str, str | None] | None = None,
):
    params = []
    if organisation_id is not None:
        params.append(f"organisation={organisation_id}")
    if owner_id is not None:
        params.append(f"owner={owner_id}")
    if account_id is not None:
        params.append(f"account={account_id}")
    if viewer_name:
        params.append(f"viewer={viewer_name}")
    if extra_params:
        for key, value in extra_params.items():
            if value:
                params.append(f"{key}={value}")
    if not params:
        return "/portfolio"
    return f"/portfolio?{'&'.join(params)}"


def resolve_portfolio_scope(
    conn,
    organisation_id: int | None,
    owner_id: int | None,
    account_id: int | None,
    viewer_name: str | None = None,
    extra_params: dict[str, str | None] | None = None,
):
    platform_client = conn.execute(
        """
        SELECT id, name, client_type
        FROM platform_clients
        ORDER BY id
        LIMIT 1
        """
    ).fetchone()

    if not platform_client:
        raise HTTPException(status_code=500, detail="Platform client not configured")

    if account_id is not None:
        scope_row = conn.execute(
            """
            SELECT
              pc.id AS platform_client_id,
              pc.name AS platform_client_name,
              pc.client_type,
              o.id AS organisation_id,
              o.name AS organisation_name,
              po.id AS owner_id,
              po.name AS owner_name,
              a.id AS account_id,
              a.name AS account_name,
              a.benchmark
            FROM accounts a
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            JOIN organisations o ON o.id = po.organisation_id
            JOIN platform_clients pc ON pc.id = o.platform_client_id
            WHERE a.id = %s
            """,
            (account_id,),
        ).fetchone()

        if not scope_row:
            raise HTTPException(status_code=404, detail="Account not found")

        return {
            "level": "account",
            "platformClientId": int(scope_row["platform_client_id"]),
            "platformClientName": scope_row["platform_client_name"],
            "platformClientType": scope_row["client_type"],
            "organisationId": int(scope_row["organisation_id"]),
            "organisationName": scope_row["organisation_name"],
            "ownerId": int(scope_row["owner_id"]),
            "ownerName": scope_row["owner_name"],
            "accountId": int(scope_row["account_id"]),
            "accountName": scope_row["account_name"],
            "benchmark": scope_row["benchmark"],
            "title": scope_row["account_name"],
            "subtitle": f"{scope_row['owner_name']} · account / mandate view",
            "breadcrumb": [
                {
                    "label": scope_row["platform_client_name"],
                    "href": portfolio_href(
                        viewer_name=viewer_name, extra_params=extra_params
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["organisation_name"],
                    "href": portfolio_href(
                        organisation_id=int(scope_row["organisation_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["owner_name"],
                    "href": portfolio_href(
                        owner_id=int(scope_row["owner_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["account_name"],
                    "href": portfolio_href(
                        account_id=int(scope_row["account_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": True,
                },
            ],
        }

    if owner_id is not None:
        scope_row = conn.execute(
            """
            SELECT
              pc.id AS platform_client_id,
              pc.name AS platform_client_name,
              pc.client_type,
              o.id AS organisation_id,
              o.name AS organisation_name,
              po.id AS owner_id,
              po.name AS owner_name
            FROM portfolio_owners po
            JOIN organisations o ON o.id = po.organisation_id
            JOIN platform_clients pc ON pc.id = o.platform_client_id
            WHERE po.id = %s
            """,
            (owner_id,),
        ).fetchone()

        if not scope_row:
            raise HTTPException(status_code=404, detail="Portfolio owner not found")

        return {
            "level": "owner",
            "platformClientId": int(scope_row["platform_client_id"]),
            "platformClientName": scope_row["platform_client_name"],
            "platformClientType": scope_row["client_type"],
            "organisationId": int(scope_row["organisation_id"]),
            "organisationName": scope_row["organisation_name"],
            "ownerId": int(scope_row["owner_id"]),
            "ownerName": scope_row["owner_name"],
            "accountId": None,
            "accountName": None,
            "benchmark": None,
            "title": scope_row["owner_name"],
            "subtitle": f"{scope_row['organisation_name']} · beneficial owner view",
            "breadcrumb": [
                {
                    "label": scope_row["platform_client_name"],
                    "href": portfolio_href(
                        viewer_name=viewer_name, extra_params=extra_params
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["organisation_name"],
                    "href": portfolio_href(
                        organisation_id=int(scope_row["organisation_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["owner_name"],
                    "href": portfolio_href(
                        owner_id=int(scope_row["owner_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": True,
                },
            ],
        }

    if organisation_id is not None:
        scope_row = conn.execute(
            """
            SELECT
              pc.id AS platform_client_id,
              pc.name AS platform_client_name,
              pc.client_type,
              o.id AS organisation_id,
              o.name AS organisation_name
            FROM organisations o
            JOIN platform_clients pc ON pc.id = o.platform_client_id
            WHERE o.id = %s
            """,
            (organisation_id,),
        ).fetchone()

        if not scope_row:
            raise HTTPException(status_code=404, detail="Organisation not found")

        return {
            "level": "organisation",
            "platformClientId": int(scope_row["platform_client_id"]),
            "platformClientName": scope_row["platform_client_name"],
            "platformClientType": scope_row["client_type"],
            "organisationId": int(scope_row["organisation_id"]),
            "organisationName": scope_row["organisation_name"],
            "ownerId": None,
            "ownerName": None,
            "accountId": None,
            "accountName": None,
            "benchmark": None,
            "title": scope_row["organisation_name"],
            "subtitle": "Organisation-wide portfolio view",
            "breadcrumb": [
                {
                    "label": scope_row["platform_client_name"],
                    "href": portfolio_href(
                        viewer_name=viewer_name, extra_params=extra_params
                    ),
                    "active": False,
                },
                {
                    "label": scope_row["organisation_name"],
                    "href": portfolio_href(
                        organisation_id=int(scope_row["organisation_id"]),
                        viewer_name=viewer_name,
                        extra_params=extra_params,
                    ),
                    "active": True,
                },
            ],
        }

    return {
        "level": "platform_client",
        "platformClientId": int(platform_client["id"]),
        "platformClientName": platform_client["name"],
        "platformClientType": platform_client["client_type"],
        "organisationId": None,
        "organisationName": None,
        "ownerId": None,
        "ownerName": None,
        "accountId": None,
        "accountName": None,
        "benchmark": None,
        "title": platform_client["name"],
        "subtitle": "Consolidated asset manager view",
        "breadcrumb": [
            {
                "label": platform_client["name"],
                "href": portfolio_href(
                    viewer_name=viewer_name, extra_params=extra_params
                ),
                "active": True,
            }
        ],
    }


@app.get("/health")
def health():
    with get_connection() as conn:
        conn.execute("SELECT 1")
    return {"ok": True}


# ── TopSheet Import ────────────────────────────────────────────────────────────

class TopSheetImportRequest(BaseModel):
    dealSlug: str
    fileContentBase64: str
    requestedBy: str


@app.post("/api/topsheet/import")
def import_topsheet_endpoint(payload: TopSheetImportRequest):
    """
    Import a TopSheet Excel template for a deal.
    Accepts a base64-encoded .xlsx file and imports all sheets into the database.
    """
    import base64
    from .topsheet_importer import import_topsheet

    try:
        file_bytes = base64.b64decode(payload.fileContentBase64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 file content")

    with get_connection() as conn:
        with conn.transaction():
            viewer_context = load_viewer_context(conn, payload.requestedBy)
            ensure_permission(
                conn,
                viewer_context,
                "view_portfolio",
                title="TopSheet import denied",
                summary="The selected viewer does not have permission to import TopSheet data.",
                deep_link="/portfolio",
            )
            result = import_topsheet(conn, payload.dealSlug, file_bytes)

    if not result["ok"] and not result["counts"]:
        raise HTTPException(status_code=422, detail=result["errors"])

    return result


@app.get("/api/topsheet/{deal_slug}/covenant-config")
def get_covenant_config(deal_slug: str):
    """Return all configured covenant thresholds for a deal."""
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        rows = conn.execute(
            """SELECT * FROM covenant_thresholds
               WHERE deal_id = %s ORDER BY covenant_category, covenant_name""",
            (deal["id"],),
        ).fetchall()
    return {"covenants": [dict(r) for r in rows]}


@app.get("/api/topsheet/{deal_slug}/actuals")
def get_actual_periods(deal_slug: str):
    """Return all actual periods imported for a deal."""
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        rows = conn.execute(
            """SELECT id, period_label, period_flag, period_start, period_end,
                      period_frequency, source_document_name, source_document_type,
                      received_date, approval_tier, approved_by,
                      ratio_reconciliation_status, ham_acknowledged, created_at
               FROM actual_periods
               WHERE deal_id = %s ORDER BY period_flag""",
            (deal["id"],),
        ).fetchall()
    return {"actuals": [dict(r) for r in rows]}


@app.get("/api/topsheet/{deal_slug}/actuals/{period_flag}")
def get_actual_period_detail(deal_slug: str, period_flag: str):
    """Return full actual period data including metrics and ratios."""
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        row = conn.execute(
            "SELECT * FROM actual_periods WHERE deal_id=%s AND period_flag=%s",
            (deal["id"], period_flag),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Actual period not found")
    return dict(row)


# ── Analytics endpoints ────────────────────────────────────────────────────────

class AnalyticsRequest(BaseModel):
    requestedBy: str


@app.post("/api/topsheet/{deal_slug}/actuals/{period_flag}/analyse")
def analyse_period(deal_slug: str, period_flag: str, payload: AnalyticsRequest):
    """
    Run all analytics for an actual period:
      - Variance report (actual vs base case forecast)
      - Covenant tests (all configured thresholds)
      - Ratio reconciliation (borrower-reported vs platform-computed)
      - Consecutive lockup update (deal-level)
    """
    from .analytics import run_analytics_for_period

    with get_connection() as conn:
        with conn.transaction():
            viewer_context = load_viewer_context(conn, payload.requestedBy)
            ensure_permission(
                conn, viewer_context, "view_portfolio",
                title="Analytics denied",
                summary="Viewer does not have permission to run analytics.",
                deep_link="/portfolio",
            )
            deal = conn.execute(
                "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
            ).fetchone()
            if not deal:
                raise HTTPException(status_code=404, detail="Deal not found")

            result = run_analytics_for_period(conn, deal["id"], period_flag)

    return result.to_dict()


@app.get("/api/topsheet/{deal_slug}/variance/{period_flag}")
def get_variance_report(deal_slug: str, period_flag: str):
    """Return variance report for an actual period vs base case forecast."""
    from .analytics import compute_variance_report

    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        result = compute_variance_report(conn, deal["id"], period_flag)

    return {
        "deal_slug": deal_slug,
        "period_flag": period_flag,
        "summary_score": result.summary_score,
        "variances": result.variances,
        "errors": result.errors,
    }


@app.get("/api/topsheet/{deal_slug}/covenant-tests/{period_flag}")
def get_covenant_tests(deal_slug: str, period_flag: str):
    """Return covenant test results for a specific actual period."""
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        actual = conn.execute(
            "SELECT id FROM actual_periods WHERE deal_id=%s AND period_flag=%s",
            (deal["id"], period_flag),
        ).fetchone()
        if not actual:
            raise HTTPException(status_code=404, detail="Actual period not found")
        rows = conn.execute(
            """SELECT ct.*, cth.covenant_category, cth.test_frequency, cth.direction
               FROM covenant_tests ct
               LEFT JOIN covenant_thresholds cth ON cth.id = ct.covenant_threshold_id
               WHERE ct.actual_period_id = %s
               ORDER BY cth.covenant_category, ct.covenant_name""",
            (actual["id"],),
        ).fetchall()

    return {
        "deal_slug": deal_slug,
        "period_flag": period_flag,
        "tests": [dict(r) for r in rows],
        "worst_tier": max(
            (r["tier_status"] for r in rows),
            key=lambda s: {"performing": 0, "distribution_lockup": 1,
                           "trigger_event": 2, "event_of_default": 3}.get(s, 0),
            default="not_assessed",
        ),
    }


@app.get("/api/topsheet/{deal_slug}/reconciliation/{period_flag}")
def get_reconciliation(deal_slug: str, period_flag: str):
    """Return ratio reconciliation detail for a specific actual period."""
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id FROM deals WHERE slug = %s", (deal_slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        row = conn.execute(
            """SELECT ratio_reconciliation_status, ratio_reconciliation_detail,
                      borrower_reported_ratios, platform_computed_ratios
               FROM actual_periods WHERE deal_id=%s AND period_flag=%s""",
            (deal["id"], period_flag),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Actual period not found")

    detail = row["ratio_reconciliation_detail"]
    if isinstance(detail, str):
        detail = json.loads(detail)

    return {
        "deal_slug": deal_slug,
        "period_flag": period_flag,
        "overall_status": row["ratio_reconciliation_status"],
        "reconciliations": detail or [],
    }


@app.post("/api/intake/submit")
def submit_intake_document(payload: IntakeSubmitRequest):
    file_name = Path(payload.fileName).name.strip()
    if not file_name:
        raise HTTPException(status_code=400, detail="fileName is required")
    if payload.documentType and not is_valid_document_type(payload.documentType):
        raise HTTPException(status_code=400, detail="documentType must be a supported standard document type")

    try:
        file_bytes = base64.b64decode(payload.contentBase64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="contentBase64 must be valid base64") from exc

    intake_path = Path(INTAKE_DIRECTORY)
    intake_path.mkdir(parents=True, exist_ok=True)
    target_path = allocate_intake_file_path(intake_path, file_name)

    deal_id = None
    if payload.dealSlug:
        with get_connection() as conn:
            deal_row = conn.execute(
                "SELECT id, slug, name FROM deals WHERE slug = %s",
                (payload.dealSlug,),
            ).fetchone()
            if not deal_row:
                raise HTTPException(status_code=404, detail="Deal not found")
            deal_id = int(deal_row["id"])

    target_path.write_bytes(file_bytes)

    try:
        with get_connection() as conn:
            incoming_document_id = ingest_directory_file(
                conn,
                target_path,
                submission={
                    "dealId": deal_id,
                    "dealSlug": payload.dealSlug,
                    "dealConfidence": 0.99 if payload.dealSlug else None,
                    "documentType": payload.documentType,
                    "documentTypeConfidence": 0.99 if payload.documentType else None,
                    "sourceChannel": payload.sourceChannel or "cli_submit",
                    "sender": payload.sender,
                    "subject": payload.subject,
                    "periodLabel": payload.periodLabel,
                    "periodConfidence": 0.99 if payload.periodLabel else None,
                    "note": f"CLI submitted {target_path.name} into intake.",
                },
            )
            if incoming_document_id is None:
                conn.rollback()
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=409, detail="Document already exists in intake")

            document = conn.execute(
                """
                SELECT id, file_name, source_channel, document_type, period_label, processing_status, current_stage
                FROM incoming_documents
                WHERE id = %s
                """,
                (incoming_document_id,),
            ).fetchone()
            conn.commit()
    except HTTPException:
        raise
    except Exception:
        target_path.unlink(missing_ok=True)
        raise

    return {
        "submitted": True,
        "incomingDocumentId": int(document["id"]),
        "fileName": document["file_name"],
        "intakePath": str(target_path),
        "sourceChannel": document["source_channel"],
        "documentType": document["document_type"],
        "periodLabel": document["period_label"],
        "processingStatus": document["processing_status"],
        "currentStage": document["current_stage"],
    }


@app.get("/api/artifacts/{artifact_id}/content")
def get_artifact_content(
    artifact_id: int,
    viewer: str | None = None,
):
    with get_connection() as conn:
        artifact = load_visible_artifact(conn, artifact_id, viewer)

    return build_artifact_file_response(artifact)


@app.get("/api/entitlements/viewers")
def get_entitlement_viewers(viewer: str | None = None):
    with get_connection() as conn:
        return load_viewer_directory(conn, viewer)


@app.get("/api/intake")
def get_intake(viewer: str | None = None):
    intake_path = Path(INTAKE_DIRECTORY)
    directory_files = []
    if intake_path.exists():
        directory_files = [item.name for item in intake_path.iterdir() if item.is_file()]

    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_portfolio",
            title="Intake access denied",
            summary="The selected viewer attempted to open the intake workspace without portfolio access.",
            deep_link="/intake",
        )

        document_rows = conn.execute(
            """
            SELECT
              doc.id,
              doc.deal_id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.title AS obligation_title,
              doc.canonical_document_id,
              doc.intake_source_path,
              doc.raw_storage_status,
              doc.directory_observed_at,
              doc.fingerprinted_at,
              doc.source_channel,
              doc.sender,
              doc.subject,
              doc.file_name,
              doc.file_size_bytes,
              doc.mime_type,
              doc.period_label,
              doc.document_type,
              doc.classification_status,
              doc.processing_status,
              doc.current_stage,
              doc.review_tier,
              doc.confidence,
              doc.received_at,
              doc.last_updated_at,
              doc.notes
            FROM incoming_documents doc
            LEFT JOIN deals d ON d.id = doc.deal_id
            LEFT JOIN obligations o ON o.id = doc.matched_obligation_id
            ORDER BY doc.directory_observed_at DESC, doc.id DESC
            """
        ).fetchall()

        visible_documents = [
            row
            for row in document_rows
            if row["deal_id"] is None
            or viewer_can_see_scoped_item(
                viewer_context,
                deal_id=int(row["deal_id"]),
            )
        ]
        visible_document_ids = [int(row["id"]) for row in visible_documents]

        if not visible_document_ids:
            proposal_rows = []
            processing_rows = []
            ai_audit_rows = []
            citation_rows = []
        else:
            placeholders = sql_placeholders(visible_document_ids)
            proposal_rows = conn.execute(
                f"""
                SELECT *
                FROM incoming_document_proposals
                WHERE incoming_document_id IN ({placeholders})
                ORDER BY created_at DESC, id DESC
                """,
                tuple(visible_document_ids),
            ).fetchall()
            processing_rows = conn.execute(
                f"""
                SELECT *
                FROM document_processing_runs
                WHERE incoming_document_id IN ({placeholders})
                ORDER BY started_at DESC, id DESC
                """,
                tuple(visible_document_ids),
            ).fetchall()
            ai_audit_rows = load_intake_ai_audit_logs(conn, visible_document_ids)
            citation_rows = load_intake_evidence_citations(conn, visible_document_ids)
        deal_reference_rows = conn.execute(
            """
            SELECT id, slug, name
            FROM deals
            ORDER BY name
            """
        ).fetchall()
        documents = []
        stage_counts = {stage: 0 for stage in INTAKE_NORMALIZED_STAGES}
        committed_count = 0
        review_count = 0
        exception_count = 0

        for row in visible_documents:
            doc_id = int(row["id"])
            proposals = [
                {
                    "id": int(item["id"]),
                    "proposalType": item["proposal_type"],
                    "fieldKey": item["field_key"],
                    "fieldLabel": item["field_label"],
                    "proposedValue": (
                        standardize_document_type(item["proposed_value"]) or item["proposed_value"]
                        if item["field_key"] == "documentType"
                        else item["proposed_value"]
                    ),
                    "confidence": as_number(item["confidence"]),
                    "citationReference": item["citation_reference"],
                    "proposalStatus": item["proposal_status"],
                    "targetEntityType": item["target_entity_type"],
                    "targetMetricKey": item["target_metric_key"],
                    "targetPeriodKey": item["target_period_key"],
                    "validationStatus": item["validation_status"],
                    "validationSummary": item["validation_summary"],
                    "validationMessages": item["validation_messages"],
                    "routingDecision": item["routing_decision"],
                    "commitAction": item["commit_action"],
                    "committedEntityType": item["committed_entity_type"],
                    "committedEntityId": (
                        int(item["committed_entity_id"])
                        if item["committed_entity_id"] is not None
                        else None
                    ),
                    "committedAt": (
                        item["committed_at"].isoformat() if item["committed_at"] else None
                    ),
                    "committedBy": item["committed_by"],
                    "impactPreview": build_proposal_impact_preview(conn, item),
                    "createdBy": item["created_by"],
                    "createdAt": item["created_at"].isoformat(),
                }
                for item in proposal_rows
                if int(item["incoming_document_id"]) == doc_id
            ]
            stage_timeline = [
                {
                    "id": int(item["id"]),
                    "stageName": item["stage_name"],
                    "stageStatus": item["stage_status"],
                    "processorType": item["processor_type"],
                    "startedAt": item["started_at"].isoformat(),
                    "completedAt": (
                        item["completed_at"].isoformat() if item["completed_at"] else None
                    ),
                    "confidence": as_number(item["confidence"]),
                    "summary": item["summary"],
                }
                for item in processing_rows
                if int(item["incoming_document_id"]) == doc_id
            ]

            current_stage = row["current_stage"]
            normalized_stage = normalized_intake_stage(row, stage_timeline)
            stage_counts[normalized_stage] = stage_counts.get(normalized_stage, 0) + 1
            if row["processing_status"] == "committed":
                committed_count += 1
            elif normalized_stage == "review":
                review_count += 1
            elif normalized_stage == "exception":
                exception_count += 1

            documents.append(
                {
                    "id": str(doc_id),
                    "dealName": row["deal_name"],
                    "dealSlug": row["deal_slug"],
                    "obligationTitle": row["obligation_title"],
                    "canonicalDocumentId": (
                        int(row["canonical_document_id"])
                        if row["canonical_document_id"] is not None
                        else None
                    ),
                    "intakeSourcePath": row["intake_source_path"],
                    "rawStorageStatus": row["raw_storage_status"],
                    "directoryObservedAt": row["directory_observed_at"].isoformat(),
                    "fingerprintedAt": (
                        row["fingerprinted_at"].isoformat()
                        if row["fingerprinted_at"]
                        else None
                    ),
                    "sourceChannel": row["source_channel"],
                    "sender": row["sender"],
                    "subject": row["subject"],
                    "fileName": row["file_name"],
                    "fileSizeBytes": int(row["file_size_bytes"]),
                    "mimeType": row["mime_type"],
                    "periodLabel": row["period_label"],
                    "documentType": standardize_document_type(row["document_type"]) or row["document_type"],
                    "classificationStatus": row["classification_status"],
                    "processingStatus": row["processing_status"],
                    "currentStage": current_stage,
                    "normalizedStage": normalized_stage,
                    "reviewTier": row["review_tier"],
                    "confidence": as_number(row["confidence"]),
                    "receivedAt": row["received_at"].isoformat(),
                    "lastUpdatedAt": row["last_updated_at"].isoformat(),
                    "notes": row["notes"],
                    "stageTimeline": stage_timeline,
                    "proposals": proposals,
                    "aiAuditLogs": [
                        serialize_ai_audit_log(item)
                        for item in ai_audit_rows
                        if int(item["incoming_document_id"]) == doc_id
                    ],
                    "citations": [
                        serialize_evidence_citation(item)
                        for item in citation_rows
                        if int(item["incoming_document_id"]) == doc_id
                    ],
                }
            )

        recent_processing = [
            {
                "id": int(row["id"]),
                "incomingDocumentId": int(row["incoming_document_id"]),
                "stageName": row["stage_name"],
                "stageStatus": row["stage_status"],
                "processorType": row["processor_type"],
                "startedAt": row["started_at"].isoformat(),
                "completedAt": row["completed_at"].isoformat() if row["completed_at"] else None,
                "confidence": as_number(row["confidence"]),
                "summary": row["summary"],
            }
            for row in processing_rows[:20]
        ]

        return {
            "watcher": {
                "directory": INTAKE_WATCH_STATE["directory"],
                "pollSeconds": INTAKE_WATCH_STATE["pollSeconds"],
                "lastScanAt": INTAKE_WATCH_STATE["lastScanAt"],
                "lastError": INTAKE_WATCH_STATE["lastError"],
                "trackedFiles": INTAKE_WATCH_STATE["trackedFiles"],
                "newFilesInLastScan": INTAKE_WATCH_STATE["newFilesInLastScan"],
                "directoryFileCount": len(directory_files),
                "directoryFiles": directory_files,
            },
            "summary": {
                "trackedDocuments": len(documents),
                "committedDocuments": committed_count,
                "reviewDocuments": review_count,
                "exceptionDocuments": exception_count,
                "triageDocuments": exception_count,
            },
            "referenceData": {
                "deals": [
                    {"id": int(row["id"]), "slug": row["slug"], "name": row["name"]}
                    for row in deal_reference_rows
                ],
                "documentTypes": document_type_reference_data(),
            },
            "stageCounts": [
                {"stage": stage, "count": count}
                for stage, count in stage_counts.items()
            ],
            "documents": documents,
            "recentProcessingRuns": recent_processing,
        }


@app.post("/api/intake/proposals/{proposal_id}/update")
def update_intake_proposal(proposal_id: int, payload: ProposalUpdateRequest):
    with get_connection() as conn:
        with conn.transaction():
            viewer_context = load_viewer_context(conn, payload.updatedBy)
            ensure_permission(
                conn,
                viewer_context,
                "view_portfolio",
                title="Proposal update denied",
                summary="The selected viewer attempted to update an extraction proposal without intake access.",
                deep_link="/intake",
            )
            proposal = conn.execute(
                """
                SELECT
                  proposal.*,
                  doc.deal_id,
                  doc.matched_obligation_id,
                  doc.document_type,
                  doc.period_label,
                  doc.file_name,
                  doc.notes
                FROM incoming_document_proposals proposal
                JOIN incoming_documents doc ON doc.id = proposal.incoming_document_id
                WHERE proposal.id = %s
                FOR UPDATE
                """,
                (proposal_id,),
            ).fetchone()
            if not proposal:
                raise HTTPException(status_code=404, detail="Proposal not found")

            updated_deal_id = proposal["deal_id"]
            updated_notes = proposal["notes"]
            matched_obligation_id = proposal["matched_obligation_id"]
            updated_document_type = standardize_document_type(proposal["document_type"])
            if payload.dealSlug:
                deal_row = conn.execute(
                    "SELECT id, name FROM deals WHERE slug = %s",
                    (payload.dealSlug,),
                ).fetchone()
                if not deal_row:
                    raise HTTPException(status_code=404, detail="Deal not found")
                updated_deal_id = int(deal_row["id"])
                matched_obligation_id = select_intake_obligation(
                    conn,
                    updated_deal_id,
                    updated_document_type,
                )
                updated_notes = append_note(
                    proposal["notes"],
                    f"Deal reassigned to {deal_row['name']} during proposal correction.",
                )
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET deal_id = %s,
                        matched_obligation_id = %s,
                        classification_status = 'matched',
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        updated_deal_id,
                        matched_obligation_id,
                        updated_notes,
                        int(proposal["incoming_document_id"]),
                    ),
                )

            updated_value = payload.proposedValue or proposal["proposed_value"]
            if proposal["field_key"] == "documentType":
                standardized_document_type = standardize_document_type(updated_value)
                if not standardized_document_type:
                    raise HTTPException(
                        status_code=400,
                        detail="Document type must be selected from the standard document type list.",
                    )
                updated_value = standardized_document_type
                updated_document_type = standardized_document_type
                matched_obligation_id = (
                    select_intake_obligation(conn, updated_deal_id, updated_document_type)
                    if updated_deal_id
                    else None
                )
                updated_notes = append_note(
                    proposal["notes"],
                    f"Document type corrected to {get_document_type_definition(updated_document_type)['label']}.",
                )
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET document_type = %s,
                        matched_obligation_id = %s,
                        classification_status = %s,
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        updated_document_type,
                        matched_obligation_id,
                        "matched" if updated_deal_id and updated_document_type else "needs_triage",
                        updated_notes,
                        int(proposal["incoming_document_id"]),
                    ),
                )

            if payload.targetPeriodKey and not proposal_supports_target_period(proposal["proposal_type"]):
                raise HTTPException(
                    status_code=400,
                    detail="Target period can only be updated for period-scoped proposals.",
                )

            target_period_key = (
                normalize_period_key(payload.targetPeriodKey)
                if payload.targetPeriodKey
                else proposal["target_period_key"]
            )
            if target_period_key:
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET period_label = %s
                    WHERE id = %s
                    """,
                    (
                        period_label_from_key(target_period_key),
                        int(proposal["incoming_document_id"]),
                    ),
                )

            spec = {
                "proposalType": proposal["proposal_type"],
                "fieldKey": proposal["field_key"],
                "fieldLabel": proposal["field_label"],
                "proposedValue": updated_value,
                "confidence": as_number(proposal["confidence"]),
                "citationReference": proposal["citation_reference"],
                "targetEntityType": proposal["target_entity_type"],
                "targetMetricKey": proposal["target_metric_key"],
                "targetPeriodKey": target_period_key,
                "commitAction": proposal["commit_action"],
            }
            validation_status, validation_summary, validation_messages, routing_decision = (
                validate_proposal_spec(conn, deal_id=updated_deal_id, spec=spec)
            )
            proposal_status = (
                "accepted"
                if routing_decision == "auto_commit"
                else "pending_review"
                if routing_decision == "review"
                else "pending_triage"
            )
            conn.execute(
                """
                UPDATE incoming_document_proposals
                SET proposed_value = %s,
                    target_period_key = %s,
                    proposal_status = %s,
                    validation_status = %s,
                    validation_summary = %s,
                    validation_messages = %s::jsonb,
                    routing_decision = %s,
                    committed_entity_type = NULL,
                    committed_entity_id = NULL,
                    committed_at = NULL,
                    committed_by = NULL
                WHERE id = %s
                """,
                (
                    updated_value,
                    target_period_key,
                    proposal_status,
                    validation_status,
                    validation_summary,
                    json.dumps(validation_messages),
                    routing_decision,
                    proposal_id,
                ),
            )

            if routing_decision == "review":
                create_review_item_from_proposal(conn, proposal_id)
            elif routing_decision == "auto_commit":
                close_review_item_for_proposal(
                    conn,
                    proposal_id,
                    "Proposal corrected and auto-committed during intake exception resolution.",
                )
                commit_document_proposal(conn, proposal_id, payload.updatedBy)
            else:
                close_review_item_for_proposal(
                    conn,
                    proposal_id,
                    "Proposal moved back to triage during intake exception resolution.",
                )

            final_status = finalize_intake_document(
                conn,
                int(proposal["incoming_document_id"]),
                payload.updatedBy,
                "Proposal updated during intake exception resolution.",
            )
            record_activity_event(
                conn,
                source_domain="intake",
                event_type="proposal_updated",
                entity_type="incoming_document_proposal",
                entity_id=proposal_id,
                deal_id=updated_deal_id,
                actor_name=payload.updatedBy,
                title=f"{proposal['field_label']} proposal updated",
                summary=f"Proposal rerouted to {routing_decision} with document status now {final_status}.",
                before_state={
                    "proposedValue": proposal["proposed_value"],
                    "targetPeriodKey": proposal["target_period_key"],
                    "routingDecision": proposal["routing_decision"],
                },
                after_state={
                    "proposedValue": updated_value,
                    "targetPeriodKey": target_period_key,
                    "routingDecision": routing_decision,
                },
                deep_link="/intake",
            )
    return {"ok": True}


@app.post("/api/intake/documents/{document_id}/approve-batch")
def approve_intake_document_batch(document_id: int, payload: IntakeBatchApprovalRequest):
    with get_connection() as conn:
        with conn.transaction():
            viewer_context = load_viewer_context(conn, payload.approvedBy)
            ensure_permission(
                conn,
                viewer_context,
                "view_portfolio",
                title="Batch approval denied",
                summary="The selected viewer attempted to batch approve an intake document without intake access.",
                deep_link="/intake",
            )
            document = conn.execute(
                """
                SELECT id, deal_id, file_name
                FROM incoming_documents
                WHERE id = %s
                FOR UPDATE
                """,
                (document_id,),
            ).fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Incoming document not found")

            review_rows = conn.execute(
                """
                SELECT id, proposal_id
                FROM review_items
                WHERE incoming_document_id = %s
                  AND status = 'pending'
                ORDER BY id
                """,
                (document_id,),
            ).fetchall()
            for row in review_rows:
                conn.execute(
                    "UPDATE review_items SET status = 'approved' WHERE id = %s",
                    (int(row["id"]),),
                )
                if row["proposal_id"]:
                    commit_document_proposal(conn, int(row["proposal_id"]), payload.approvedBy)
                conn.execute(
                    """
                    UPDATE ratio_reconciliations
                    SET reconciliation_status = 'approved'
                    WHERE review_item_id = %s
                    """,
                    (int(row["id"]),),
                )
                sync_review_task(conn, int(row["id"]))

            final_status = finalize_intake_document(
                conn,
                document_id,
                payload.approvedBy,
                "Document package approved from the intake workspace.",
            )
            record_activity_event(
                conn,
                source_domain="intake",
                event_type="document_batch_approved",
                entity_type="incoming_document",
                entity_id=document_id,
                deal_id=int(document["deal_id"]) if document["deal_id"] else None,
                actor_name=payload.approvedBy,
                title=f"{document['file_name']} package approved",
                summary=f"Approved {len(review_rows)} pending extracted fact proposal(s) and moved the document to {final_status}.",
                before_state={"pendingReviewCount": len(review_rows)},
                after_state={"documentStatus": final_status},
                deep_link="/intake",
            )
    return {"ok": True}


@app.post("/api/intake/documents/{document_id}/invoke-exception-assist")
def invoke_intake_exception_assist(document_id: int, payload: ExceptionAssistRequest):
    with get_connection() as conn:
        with conn.transaction():
            viewer_context = load_viewer_context(conn, payload.invokedBy)
            ensure_permission(
                conn,
                viewer_context,
                "view_portfolio",
                title="Exception assist denied",
                summary="The selected viewer attempted to invoke exception assist without intake access.",
                deep_link="/intake",
            )
            document = conn.execute(
                """
                SELECT *
                FROM incoming_documents
                WHERE id = %s
                FOR UPDATE
                """,
                (document_id,),
            ).fetchone()
            if not document:
                raise HTTPException(status_code=404, detail="Incoming document not found")
            if document["current_stage"] != "exception" and document["processing_status"] != "exception":
                raise HTTPException(status_code=400, detail="Exception assist is only available for documents in exception")
            if standardize_document_type(document["document_type"]) != "compliance_certificate":
                raise HTTPException(status_code=400, detail="Exception assist is currently supported only for compliance certificates")

            missing_required_fields = missing_mandatory_fields_for_document(
                conn,
                document_id,
                document_type=document["document_type"],
            )
            if not missing_required_fields:
                raise HTTPException(status_code=400, detail="No mandatory fields are currently missing for this document")

            started_at = datetime.now(timezone.utc)
            context = DocumentContext(
                incoming_document_id=document_id,
                deal_id=int(document["deal_id"]) if document["deal_id"] else None,
                deal_slug=None,
                period_label=document["period_label"],
                document_type=standardize_document_type(document["document_type"]),
                matched_obligation_id=int(document["matched_obligation_id"]) if document["matched_obligation_id"] else None,
            )
            assist_result = run_exception_assist_extraction(
                file_path=Path(document["intake_source_path"]),
                mime_type=document["mime_type"],
                context=context,
            )
            completed_at = datetime.now(timezone.utc)

            if assist_result is None:
                raise HTTPException(status_code=400, detail="No exception assist processor is available for this document")

            assist_period_label = document["period_label"]
            if assist_result.period_label and assist_result.period_label != document["period_label"]:
                assist_period_label = assist_result.period_label
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET period_label = %s,
                        last_updated_at = %s
                    WHERE id = %s
                    """,
                    (assist_period_label, completed_at, document_id),
                )

            extracted_by_field = {
                field.field_key: field
                for field in assist_result.fields
                if field.field_key in missing_required_fields
            }
            recovered_fields = [
                field_key
                for field_key in missing_required_fields
                if field_key in extracted_by_field
            ]

            processing_run_id = create_processing_run(
                conn,
                document_id,
                "exception_assist",
                "completed" if recovered_fields else "failed",
                "exception_assist",
                started_at,
                completed_at,
                None,
                (
                    f"Exception assist recovered {len(recovered_fields)} of {len(missing_required_fields)} mandatory field(s)."
                    if recovered_fields
                    else "Exception assist could not recover any missing mandatory fields."
                ),
            )
            record_ai_audit_log(
                conn,
                incoming_document_id=document_id,
                processing_run_id=processing_run_id,
                proposal_id=None,
                ai_stage="exception_assist",
                actor_label="exception_assist",
                model_name="sesame-exception-assist",
                model_version="demo-v1",
                prompt_template=assist_result.prompt_template,
                confidence=None,
                summary=assist_result.document_summary or "Exception assist processed the document.",
                retrieved_context=[
                    {"kind": "documentType", "value": document["document_type"]},
                    {"kind": "missingMandatoryFields", "value": missing_required_fields},
                    {"kind": "periodLabel", "value": assist_period_label},
                    {"kind": "fileName", "value": document["file_name"]},
                ],
                tool_calls=[{"tool": "exception_assist", "recoveredFields": recovered_fields}],
                created_at=completed_at,
            )

            created_proposal_ids: list[int] = []
            for field_key in recovered_fields:
                field = extracted_by_field[field_key]
                spec = build_metric_extraction_spec(field, period_label=assist_period_label)
                validation_status, validation_summary, validation_messages, routing_decision = (
                    validate_proposal_spec(
                        conn,
                        deal_id=int(document["deal_id"]) if document["deal_id"] else None,
                        spec=spec,
                    )
                )
                if routing_decision == "auto_commit":
                    routing_decision = "review"
                    validation_status = "valid_with_attention"
                    validation_summary = "Exception assist recovered the field, but reviewer approval is required before commit."
                    validation_messages = list(validation_messages) + [
                        {
                            "code": "exception_assist_review_required",
                            "source": "exception_assist",
                        }
                    ]
                proposal_status = (
                    "accepted"
                    if routing_decision == "auto_commit"
                    else "pending_review"
                    if routing_decision == "review"
                    else "pending_triage"
                )
                proposal_id = create_document_proposal(
                    conn,
                    document_id,
                    spec["proposalType"],
                    spec["fieldKey"],
                    spec["fieldLabel"],
                    spec["proposedValue"],
                    spec["confidence"],
                    spec["citationReference"],
                    proposal_status,
                    payload.invokedBy,
                    completed_at,
                    target_entity_type=spec["targetEntityType"],
                    target_metric_key=spec["targetMetricKey"],
                    target_period_key=spec["targetPeriodKey"],
                    validation_status=validation_status,
                    validation_summary=validation_summary,
                    validation_messages=validation_messages,
                    routing_decision=routing_decision,
                    commit_action=spec["commitAction"],
                )
                create_evidence_citation(
                    conn,
                    incoming_document_id=document_id,
                    proposal_id=proposal_id,
                    citation_label=f"{spec['fieldLabel']} exception assist evidence",
                    citation_kind=spec.get("citationKind", "page"),
                    page_number=spec.get("citationPageNumber", 1),
                    field_key=spec["targetMetricKey"] or spec["fieldKey"],
                    text_snippet=spec["textSnippet"],
                )
                record_ai_audit_log(
                    conn,
                    incoming_document_id=document_id,
                    processing_run_id=processing_run_id,
                    proposal_id=proposal_id,
                    ai_stage="field_extraction",
                    actor_label="exception_assist",
                    model_name=assist_result.engine_name,
                    model_version=assist_result.engine_version,
                    prompt_template=assist_result.prompt_template,
                    confidence=spec["confidence"],
                    summary=spec.get("rationale") or validation_summary,
                    retrieved_context=[
                        {"kind": "fileName", "value": document["file_name"]},
                        {"kind": "periodLabel", "value": assist_period_label},
                        {"kind": "recoveredField", "value": spec["fieldKey"]},
                    ],
                    tool_calls=[{"tool": spec["commitAction"], "status": "review"}],
                    created_at=completed_at,
                )
                if routing_decision == "review":
                    create_review_item_from_proposal(conn, proposal_id)
                    created_proposal_ids.append(proposal_id)

            if created_proposal_ids:
                review_started_at = completed_at + timedelta(seconds=1)
                create_processing_run(
                    conn,
                    document_id,
                    "review",
                    "in_progress",
                    "review_router",
                    review_started_at,
                    None,
                    None,
                    f"Exception assist routed {len(created_proposal_ids)} recovered mandatory field proposal(s) to review.",
                )
                log_intake_stage(
                    "review",
                    incoming_document_id=document_id,
                    file_name=document["file_name"],
                    source_channel=document["source_channel"],
                    stage_status="in_progress",
                    document_type=document["document_type"],
                    period_label=assist_period_label,
                    summary=f"Exception assist queued {len(created_proposal_ids)} recovered mandatory field proposal(s) for review.",
                )

            final_status = finalize_intake_document(
                conn,
                document_id,
                payload.invokedBy,
                "Human invoked AI exception assist from the intake workspace.",
            )
            log_intake_stage(
                "exception",
                incoming_document_id=document_id,
                file_name=document["file_name"],
                source_channel=document["source_channel"],
                stage_status="completed" if final_status != "exception" else "in_progress",
                document_type=document["document_type"],
                period_label=assist_period_label,
                summary=(
                    f"Exception assist recovered {len(created_proposal_ids)} mandatory field proposal(s)."
                    if created_proposal_ids
                    else "Exception assist did not recover the missing mandatory fields."
                ),
            )
            record_activity_event(
                conn,
                source_domain="intake",
                event_type="exception_assist_invoked",
                entity_type="incoming_document",
                entity_id=document_id,
                deal_id=int(document["deal_id"]) if document["deal_id"] else None,
                actor_name=payload.invokedBy,
                title=f"{document['file_name']} exception assist invoked",
                summary=(
                    f"Recovered {len(created_proposal_ids)} mandatory field proposal(s) and moved the document to {final_status}."
                ),
                before_state={"documentStatus": "exception", "missingMandatoryFields": missing_required_fields},
                after_state={"documentStatus": final_status, "recoveredFields": recovered_fields},
                deep_link="/intake",
            )
    return {"ok": True}


@app.get("/api/portfolio")
def get_portfolio(
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
    as_at: str | None = None,
    sector: str | None = None,
    region: str | None = None,
    deal_type: str | None = None,
    phase: str | None = None,
    grade: str | None = None,
    watchlist: str | None = None,
    revenue_risk: str | None = None,
    viewer: str | None = None,
):
    with get_connection() as conn:
        demo_clock = load_demo_clock(conn)
        requested_as_at = parse_optional_date(as_at, field_name="as_at")
        effective_as_at = requested_as_at or demo_clock["_date"]
        selected_filters = {
            "asAt": effective_as_at.isoformat(),
            "sector": sector,
            "region": region,
            "dealType": deal_type,
            "phase": phase,
            "grade": grade,
            "watchlist": watchlist,
            "revenueRisk": revenue_risk,
        }
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_portfolio",
            title="Portfolio access denied",
            summary="The selected viewer attempted to open the portfolio workspace without portfolio access.",
            deep_link="/portfolio",
        )
        ensure_access_to_scope(
            conn,
            viewer_context,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
            deep_link="/portfolio",
        )
        scope = resolve_portfolio_scope(
            conn,
            organisation,
            owner,
            account,
            viewer_context["displayName"],
            extra_params={
                "asAt": effective_as_at.isoformat(),
                "sector": sector,
                "region": region,
                "dealType": deal_type,
                "phase": phase,
                "grade": grade,
                "watchlist": watchlist,
                "revenueRisk": revenue_risk,
            },
        )

        organisation_id = scope["organisationId"]
        owner_id = scope["ownerId"]
        account_id = scope["accountId"]

        summary = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_deals AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            ),
            covenant_data AS (
              SELECT sd.deal_id, sd.scoped_exposure, c.current_value, c.headroom_pct, d.watchlist
              FROM scoped_deals sd
              JOIN deals d ON d.id = sd.deal_id
              JOIN covenants c ON c.deal_id = d.id
            ),
            overdue AS (
              SELECT COUNT(*)::int AS count
              FROM obligations o
              JOIN scoped_deals sd ON sd.deal_id = o.deal_id
              WHERE o.status = 'overdue'
            ),
            reviews AS (
              SELECT COUNT(*)::int AS count
              FROM review_items r
              JOIN scoped_deals sd ON sd.deal_id = r.deal_id
              WHERE r.status = 'pending'
            )
            SELECT
              COALESCE(SUM(scoped_exposure), 0)::bigint AS total_aum,
              COUNT(*)::int AS deal_count,
              COALESCE(ROUND(SUM(current_value * scoped_exposure) / NULLIF(SUM(scoped_exposure), 0), 2), 0) AS weighted_avg_dscr,
              COALESCE(ROUND(SUM(headroom_pct * scoped_exposure) / NULLIF(SUM(scoped_exposure), 0), 2), 0) AS weighted_avg_headroom_pct,
              (SELECT count FROM overdue) AS overdue_obligations,
              (SELECT count FROM reviews) AS pending_reviews,
              COALESCE(SUM(CASE WHEN watchlist THEN 1 ELSE 0 END), 0)::int AS watchlist_count
            FROM covenant_data
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
            ),
        ).fetchone()

        organisations = conn.execute(
            """
            SELECT
              o.id,
              o.name,
              o.organisation_type,
              COALESCE(SUM(h.current_amount), 0)::bigint AS exposure,
              COUNT(DISTINCT h.deal_id)::int AS deal_count,
              COUNT(DISTINCT CASE WHEN d.watchlist THEN h.deal_id END)::int AS watchlist_count
            FROM organisations o
            LEFT JOIN portfolio_owners po ON po.organisation_id = o.id
            LEFT JOIN accounts a ON a.portfolio_owner_id = po.id
            LEFT JOIN holdings h ON h.account_id = a.id AND h.status = 'active'
            LEFT JOIN deals d ON d.id = h.deal_id
            WHERE o.platform_client_id = %s
            GROUP BY o.id
            ORDER BY exposure DESC, o.name
            """,
            (scope["platformClientId"],),
        ).fetchall()

        owners = conn.execute(
            """
            SELECT
              po.id,
              po.name,
              po.owner_type,
              o.id AS organisation_id,
              o.name AS organisation_name,
              COALESCE(SUM(h.current_amount), 0)::bigint AS exposure,
              COUNT(DISTINCT h.deal_id)::int AS deal_count,
              COUNT(DISTINCT CASE WHEN d.watchlist THEN h.deal_id END)::int AS watchlist_count
            FROM portfolio_owners po
            JOIN organisations o ON o.id = po.organisation_id
            LEFT JOIN accounts a ON a.portfolio_owner_id = po.id
            LEFT JOIN holdings h ON h.account_id = a.id AND h.status = 'active'
            LEFT JOIN deals d ON d.id = h.deal_id
            WHERE o.platform_client_id = %s
              AND (%s::int IS NULL OR o.id = %s::int)
            GROUP BY po.id, o.id
            ORDER BY exposure DESC, po.name
            """,
            (scope["platformClientId"], organisation_id, organisation_id),
        ).fetchall()

        accounts = conn.execute(
            """
            SELECT
              a.id,
              a.name,
              a.account_type,
              a.benchmark,
              po.id AS owner_id,
              po.name AS owner_name,
              o.id AS organisation_id,
              o.name AS organisation_name,
              COALESCE(SUM(h.current_amount), 0)::bigint AS exposure,
              COUNT(DISTINCT h.deal_id)::int AS deal_count,
              COUNT(DISTINCT CASE WHEN d.watchlist THEN h.deal_id END)::int AS watchlist_count
            FROM accounts a
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            JOIN organisations o ON o.id = po.organisation_id
            LEFT JOIN holdings h ON h.account_id = a.id AND h.status = 'active'
            LEFT JOIN deals d ON d.id = h.deal_id
            WHERE o.platform_client_id = %s
              AND (%s::int IS NULL OR o.id = %s::int)
              AND (%s::int IS NULL OR po.id = %s::int)
            GROUP BY a.id, po.id, o.id
            ORDER BY exposure DESC, a.name
            """,
            (
                scope["platformClientId"],
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
            ),
        ).fetchall()

        grade_distribution = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_deals AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            )
            SELECT
              COALESCE(go.override_grade, d.grade) AS effective_grade,
              COUNT(*)::int AS count,
              SUM(sd.scoped_exposure)::bigint AS exposure
            FROM scoped_deals sd
            JOIN deals d ON d.id = sd.deal_id
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            GROUP BY effective_grade
            ORDER BY effective_grade
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
            ),
        ).fetchall()

        covenant_heatmap = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_deals AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            )
            SELECT
              d.slug,
              d.name,
              c.code AS covenant_code,
              c.name AS covenant_name,
              c.status,
              c.headroom_pct
            FROM scoped_deals sd
            JOIN deals d ON d.id = sd.deal_id
            JOIN covenants c ON c.deal_id = d.id
            ORDER BY sd.scoped_exposure DESC
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
            ),
        ).fetchall()

        holdings = conn.execute(
            """
            SELECT
              h.id,
              o.id AS organisation_id,
              o.name AS organisation_name,
              po.id AS owner_id,
              po.name AS owner_name,
              a.id AS account_id,
              a.name AS account_name,
              a.benchmark,
              h.current_amount,
              h.acquisition_date::text AS acquisition_date,
              h.status,
              d.id AS deal_id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              d.borrower,
              d.sector,
              d.deal_type,
              d.revenue_risk,
              COALESCE(go.override_grade, d.grade) AS effective_grade,
              d.watchlist,
              d.phase,
              d.region,
              c.code AS covenant_code,
              c.name AS covenant_name,
              COALESCE(ch.dscr, c.current_value) AS current_value,
              CASE
                WHEN COALESCE(ch.dscr, c.current_value) < c.threshold_trigger THEN 'trigger_event'
                WHEN COALESCE(ch.dscr, c.current_value) < c.threshold_lockup THEN 'lock_up_risk'
                ELSE 'performing'
              END AS covenant_status,
              ROUND(
                ((COALESCE(ch.dscr, c.current_value) - c.threshold_lockup) / NULLIF(c.threshold_lockup, 0)) * 100,
                1
              ) AS headroom_pct,
              latest_period.period_key,
              latest_period.period_label,
              latest_period.period_end,
              dist.distribution_status,
              dist.blocker_count
            FROM holdings h
            JOIN accounts a ON a.id = h.account_id
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            JOIN organisations o ON o.id = po.organisation_id
            JOIN deals d ON d.id = h.deal_id
            JOIN covenants c ON c.deal_id = d.id
            LEFT JOIN LATERAL (
              SELECT fp.id, fp.period_key, fp.period_label, fp.period_end
              FROM financial_periods fp
              WHERE fp.deal_id = d.id
                AND fp.period_end <= %s::date
              ORDER BY fp.period_end DESC, fp.id DESC
              LIMIT 1
            ) latest_period ON TRUE
            LEFT JOIN LATERAL (
              SELECT ch.dscr
              FROM covenant_history ch
              WHERE ch.covenant_id = c.id
                AND latest_period.period_label IS NOT NULL
                AND ch.period_label = latest_period.period_label
              LIMIT 1
            ) ch ON TRUE
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.decided_at::date <= %s::date
                AND go.expires_on >= %s::date
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            LEFT JOIN LATERAL (
              SELECT distribution_status, blocker_count
              FROM distribution_assessments da
              WHERE da.deal_id = d.id
                AND da.assessed_at::date <= %s::date
              ORDER BY da.assessed_at DESC, da.id DESC
              LIMIT 1
            ) dist ON TRUE
            WHERE h.status = 'active'
              AND (%s::int IS NULL OR o.id = %s::int)
              AND (%s::int IS NULL OR po.id = %s::int)
              AND (%s::int IS NULL OR a.id = %s::int)
            ORDER BY o.name, po.name, a.name, h.current_amount DESC
            """,
            (
                effective_as_at,
                effective_as_at,
                effective_as_at,
                effective_as_at,
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
            ),
        ).fetchall()

        distribution_posture = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            ),
            latest_distribution AS (
              SELECT DISTINCT ON (da.deal_id)
                da.deal_id,
                da.distribution_status
              FROM distribution_assessments da
              JOIN scoped_exposure se ON se.deal_id = da.deal_id
              ORDER BY da.deal_id, da.assessed_at DESC, da.id DESC
            )
            SELECT
              ld.distribution_status,
              COUNT(*)::int AS count,
              COALESCE(SUM(se.scoped_exposure), 0)::bigint AS exposure
            FROM latest_distribution ld
            JOIN scoped_exposure se ON se.deal_id = ld.deal_id
            GROUP BY ld.distribution_status
            ORDER BY
              CASE ld.distribution_status
                WHEN 'blocked' THEN 0
                WHEN 'restricted' THEN 1
                WHEN 'review_required' THEN 2
                ELSE 3
              END
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
            ),
        ).fetchall()

        overdue_items = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            )
            SELECT
              o.id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              o.title,
              o.due_date::text AS due_date,
              o.days_overdue,
              CASE
                WHEN o.days_overdue > o.grace_days THEN 'outside_grace'
                WHEN o.days_overdue > 0 THEN 'within_grace'
                ELSE 'on_time'
              END AS grace_status
            FROM obligations o
            JOIN deals d ON d.id = o.deal_id
            JOIN scoped_holdings sh ON sh.deal_id = o.deal_id
            WHERE o.status = 'overdue'
              AND o.due_date <= %s::date
            ORDER BY o.days_overdue DESC
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
            ),
        ).fetchall()

        distribution_alert_rows = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            ),
            latest_distribution AS (
              SELECT DISTINCT ON (da.deal_id)
                da.id,
                da.deal_id,
                da.distribution_status,
                da.blocker_count,
                da.summary,
                da.assessed_at
              FROM distribution_assessments da
              JOIN scoped_exposure se ON se.deal_id = da.deal_id
              WHERE da.assessed_at::date <= %s::date
              ORDER BY da.deal_id, da.assessed_at DESC, da.id DESC
            )
            SELECT
              ld.id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              ld.distribution_status,
              ld.blocker_count,
              ld.summary,
              ld.assessed_at
            FROM latest_distribution ld
            JOIN deals d ON d.id = ld.deal_id
            JOIN scoped_exposure se ON se.deal_id = ld.deal_id
            WHERE ld.distribution_status <> 'allowed'
            ORDER BY
              CASE ld.distribution_status
                WHEN 'blocked' THEN 0
                WHEN 'restricted' THEN 1
                WHEN 'review_required' THEN 2
                ELSE 3
              END,
              ld.blocker_count DESC,
              se.scoped_exposure DESC
            LIMIT 5
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
            ),
        ).fetchall()

        deteriorating_trends = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            )
            SELECT
              t.id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              d.grade,
              d.watchlist,
              t.metric_label,
              t.severity,
              t.periods_observed,
              t.summary
            FROM trend_records t
            JOIN deals d ON d.id = t.deal_id
            JOIN scoped_exposure se ON se.deal_id = t.deal_id
            JOIN financial_periods fp ON fp.id = t.financial_period_id
            WHERE t.status = 'active' AND t.direction = 'down'
              AND fp.period_end <= %s::date
            ORDER BY
              CASE t.severity
                WHEN 'alert' THEN 0
                WHEN 'concern' THEN 1
                WHEN 'watch' THEN 2
                ELSE 3
              END,
              t.periods_observed DESC,
              se.scoped_exposure DESC
            LIMIT 5
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
            ),
        ).fetchall()

        watchlist_actions = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            )
            SELECT
              w.id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              w.status_to,
              w.recommendation,
              w.escalation_level,
              w.owner_name,
              w.next_review_date::text,
              w.rationale
            FROM watchlist_events w
            JOIN deals d ON d.id = w.deal_id
            JOIN scoped_exposure se ON se.deal_id = w.deal_id
            WHERE w.decided_at::date <= %s::date
            ORDER BY w.decided_at DESC, se.scoped_exposure DESC
            LIMIT 5
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
            ),
        ).fetchall()

        risk_rows = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            )
            SELECT
              r.id,
              r.risk_category,
              r.severity,
              r.status,
              r.title,
              r.summary,
              r.next_review_date,
              d.slug AS deal_slug,
              d.name AS deal_name,
              se.scoped_exposure
            FROM risk_register_entries r
            JOIN deals d ON d.id = r.deal_id
            JOIN scoped_exposure se ON se.deal_id = r.deal_id
            WHERE r.status <> 'resolved'
              AND r.opened_at::date <= %s::date
              AND (r.closed_at IS NULL OR r.closed_at::date > %s::date)
            ORDER BY
              CASE r.severity
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              r.next_review_date,
              se.scoped_exposure DESC
            LIMIT 5
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
                effective_as_at,
            ),
        ).fetchall()

        request_rows = conn.execute(
            """
            WITH scoped_holdings AS (
              SELECT DISTINCT h.deal_id, h.current_amount
              FROM holdings h
              JOIN accounts a ON a.id = h.account_id
              JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
              JOIN organisations o ON o.id = po.organisation_id
              WHERE h.status = 'active'
                AND (%s::int IS NULL OR o.id = %s::int)
                AND (%s::int IS NULL OR po.id = %s::int)
                AND (%s::int IS NULL OR a.id = %s::int)
            ),
            scoped_exposure AS (
              SELECT deal_id, SUM(current_amount)::bigint AS scoped_exposure
              FROM scoped_holdings
              GROUP BY deal_id
            ),
            vote_counts AS (
              SELECT
                brv.borrower_request_id,
                COUNT(*)::int AS total_votes,
                COUNT(*) FILTER (WHERE brv.vote_status = 'oppose')::int AS oppose_votes
              FROM borrower_request_votes brv
              GROUP BY brv.borrower_request_id
            )
            SELECT
              br.id,
              br.request_type,
              br.request_status,
              br.priority,
              br.title,
              br.summary,
              br.due_date,
              d.slug AS deal_slug,
              d.name AS deal_name,
              COALESCE(vc.total_votes, 0) AS total_votes,
              COALESCE(vc.oppose_votes, 0) AS oppose_votes
            FROM borrower_requests br
            JOIN deals d ON d.id = br.deal_id
            JOIN scoped_exposure se ON se.deal_id = br.deal_id
            LEFT JOIN vote_counts vc ON vc.borrower_request_id = br.id
            WHERE br.request_status NOT IN ('closed', 'declined')
              AND br.submitted_at::date <= %s::date
            ORDER BY
              CASE br.priority
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              br.due_date,
              se.scoped_exposure DESC
            LIMIT 5
            """,
            (
                organisation_id,
                organisation_id,
                owner_id,
                owner_id,
                account_id,
                account_id,
                effective_as_at,
            ),
        ).fetchall()

        access_deal_ids = sorted(viewer_context["access"]["dealIds"])
        if access_deal_ids:
            deal_slug_rows = conn.execute(
                f"""
                SELECT id, slug
                FROM deals
                WHERE id IN ({sql_placeholders(access_deal_ids)})
                """,
                tuple(access_deal_ids),
            ).fetchall()
        else:
            deal_slug_rows = []

    allowed_deal_slugs = {row["slug"] for row in deal_slug_rows}
    scoped_holdings = [
        row for row in holdings if row["deal_slug"] in allowed_deal_slugs
    ]

    available_filters = {
        "sectors": sorted({row["sector"] for row in scoped_holdings if row["sector"]}),
        "regions": sorted({row["region"] for row in scoped_holdings if row["region"]}),
        "dealTypes": sorted(
            {row["deal_type"] for row in scoped_holdings if row["deal_type"]}
        ),
        "phases": sorted({row["phase"] for row in scoped_holdings if row["phase"]}),
        "grades": sorted(
            {row["effective_grade"] for row in scoped_holdings if row["effective_grade"]}
        ),
        "revenueRisks": sorted(
            {row["revenue_risk"] for row in scoped_holdings if row["revenue_risk"]}
        ),
        "watchlistStates": ["all", "watchlist", "clear"],
    }

    selected_watchlist = watchlist or "all"
    selected_filters["watchlist"] = None if selected_watchlist == "all" else selected_watchlist

    def holding_matches_filters(row):
        if sector and row["sector"] != sector:
            return False
        if region and row["region"] != region:
            return False
        if deal_type and row["deal_type"] != deal_type:
            return False
        if phase and row["phase"] != phase:
            return False
        if grade and row["effective_grade"] != grade:
            return False
        if revenue_risk and row["revenue_risk"] != revenue_risk:
            return False
        if selected_watchlist == "watchlist" and not row["watchlist"]:
            return False
        if selected_watchlist == "clear" and row["watchlist"]:
            return False
        return True

    visible_holdings = [row for row in scoped_holdings if holding_matches_filters(row)]
    visible_deal_slugs = {row["deal_slug"] for row in visible_holdings}
    visible_deal_ids = [
        int(row["id"]) for row in deal_slug_rows if row["slug"] in visible_deal_slugs
    ]
    pending_review_counts: dict[int, int] = {}
    overdue_obligation_counts: dict[int, int] = {}
    request_summary_map: dict[int, dict[str, int]] = {}
    assessment_map: dict[int, dict[str, object | None]] = {}
    forecast_map: dict[int, dict[str, object | None]] = {}
    fulfilment_rate_pct = 0.0
    high_critical_risk_count = 0
    deteriorating_deal_count = 0

    if visible_deal_ids:
        with get_connection() as conn:
            pending_review_rows = conn.execute(
                f"""
                SELECT deal_id, COUNT(*)::int AS pending_reviews
                FROM review_items
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND status = 'pending'
                GROUP BY deal_id
                """,
                tuple(visible_deal_ids),
            ).fetchall()
            pending_review_counts = {
                int(row["deal_id"]): int(row["pending_reviews"])
                for row in pending_review_rows
            }

            overdue_obligation_rows = conn.execute(
                f"""
                SELECT deal_id, COUNT(*)::int AS overdue_obligations
                FROM obligations
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND status = 'overdue'
                  AND due_date <= %s::date
                GROUP BY deal_id
                """,
                (*tuple(visible_deal_ids), effective_as_at),
            ).fetchall()
            overdue_obligation_counts = {
                int(row["deal_id"]): int(row["overdue_obligations"])
                for row in overdue_obligation_rows
            }

            request_summary_rows = conn.execute(
                f"""
                WITH vote_counts AS (
                  SELECT
                    borrower_request_id,
                    COUNT(*) FILTER (WHERE vote_status = 'oppose')::int AS oppose_votes
                  FROM borrower_request_votes
                  GROUP BY borrower_request_id
                )
                SELECT
                  br.deal_id,
                  COUNT(*)::int AS open_requests,
                  COUNT(*) FILTER (WHERE br.priority = 'high')::int AS high_priority_requests,
                  COALESCE(SUM(COALESCE(vc.oppose_votes, 0)), 0)::int AS oppose_votes
                FROM borrower_requests br
                LEFT JOIN vote_counts vc ON vc.borrower_request_id = br.id
                WHERE br.deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND br.request_status NOT IN ('closed', 'declined')
                  AND br.submitted_at::date <= %s::date
                GROUP BY br.deal_id
                """,
                (*tuple(visible_deal_ids), effective_as_at),
            ).fetchall()
            request_summary_map = {
                int(row["deal_id"]): {
                    "openRequests": int(row["open_requests"]),
                    "highPriorityRequests": int(row["high_priority_requests"]),
                    "opposeVotes": int(row["oppose_votes"]),
                }
                for row in request_summary_rows
            }

            assessment_rows = conn.execute(
                f"""
                SELECT DISTINCT ON (a.deal_id)
                  a.deal_id,
                  a.overall_score,
                  a.watchlist_recommendation,
                  a.escalation_level,
                  a.summary
                FROM deal_assessments a
                WHERE a.deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND a.assessment_date <= %s::date
                ORDER BY a.deal_id, a.assessment_date DESC, a.id DESC
                """,
                (*tuple(visible_deal_ids), effective_as_at),
            ).fetchall()
            assessment_map = {
                int(row["deal_id"]): {
                    "overallScore": as_number(row["overall_score"]),
                    "watchlistRecommendation": row["watchlist_recommendation"],
                    "escalationLevel": row["escalation_level"],
                    "summary": row["summary"],
                }
                for row in assessment_rows
            }

            latest_period_rows = conn.execute(
                f"""
                SELECT DISTINCT ON (deal_id)
                  deal_id,
                  period_key
                FROM financial_periods
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND period_end <= %s::date
                ORDER BY deal_id, period_end DESC, id DESC
                """,
                (*tuple(visible_deal_ids), effective_as_at),
            ).fetchall()

            for row in latest_period_rows:
                summary = build_forecast_summary(
                    conn, int(row["deal_id"]), row["period_key"]
                )
                forecasted_dscr, forecast_case_count, forecast_summary = (
                    dashboard_forecast_snapshot(summary)
                )
                forecast_map[int(row["deal_id"])] = {
                    "forecastedDscr": forecasted_dscr,
                    "forecastCaseCount": forecast_case_count,
                    "forecastSummary": forecast_summary,
                }

            trailing_start = effective_as_at - timedelta(days=365)
            fulfilment_row = conn.execute(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS on_time_count,
                  COUNT(*) FILTER (WHERE due_date BETWEEN %s::date AND %s::date)::int AS trailing_due_count
                FROM obligations
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND due_date BETWEEN %s::date AND %s::date
                """,
                (
                    trailing_start,
                    effective_as_at,
                    *tuple(visible_deal_ids),
                    trailing_start,
                    effective_as_at,
                ),
            ).fetchone()
            trailing_due_count = int(fulfilment_row["trailing_due_count"] or 0)
            fulfilment_rate_pct = (
                round((int(fulfilment_row["on_time_count"] or 0) / trailing_due_count) * 100, 1)
                if trailing_due_count
                else 100.0
            )

            risk_count_row = conn.execute(
                f"""
                SELECT COUNT(*)::int AS count
                FROM risk_register_entries
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND severity IN ('high', 'critical')
                  AND opened_at::date <= %s::date
                  AND (closed_at IS NULL OR closed_at::date > %s::date)
                """,
                (*tuple(visible_deal_ids), effective_as_at, effective_as_at),
            ).fetchone()
            high_critical_risk_count = int(risk_count_row["count"] or 0)

            deteriorating_row = conn.execute(
                f"""
                SELECT COUNT(DISTINCT t.deal_id)::int AS count
                FROM trend_records t
                JOIN financial_periods fp ON fp.id = t.financial_period_id
                WHERE t.deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND t.status = 'active'
                  AND t.direction = 'down'
                  AND fp.period_end <= %s::date
                """,
                (*tuple(visible_deal_ids), effective_as_at),
            ).fetchone()
            deteriorating_deal_count = int(deteriorating_row["count"] or 0)

    visible_deal_metrics = {}
    for row in visible_holdings:
        item = visible_deal_metrics.setdefault(
            row["deal_slug"],
            {
                "slug": row["deal_slug"],
                "name": row["deal_name"],
                "grade": row["effective_grade"],
                "watchlist": row["watchlist"],
                "exposure": 0,
                "currentValue": as_number(row["current_value"])
                if "current_value" in row.keys()
                else 0,
                "headroomPct": as_number(row["headroom_pct"]),
                "covenantCode": row["covenant_code"]
                if "covenant_code" in row.keys()
                else "",
                "covenantName": row["covenant_name"]
                if "covenant_name" in row.keys()
                else "",
                "covenantStatus": row["covenant_status"],
                "distributionStatus": row["distribution_status"],
            },
        )
        item["exposure"] += int(row["current_amount"])

    organisation_summary = {}
    owner_summary = {}
    account_summary = {}
    for row in visible_holdings:
        organisation_entry = organisation_summary.setdefault(
            int(row["organisation_id"]),
            {
                "id": int(row["organisation_id"]),
                "name": row["organisation_name"],
                "type": next(
                    (
                        source["organisation_type"]
                        for source in organisations
                        if int(source["id"]) == int(row["organisation_id"])
                    ),
                    "organisation",
                ),
                "exposure": 0,
                "dealSlugs": set(),
                "watchlistDealSlugs": set(),
            },
        )
        organisation_entry["exposure"] += int(row["current_amount"])
        organisation_entry["dealSlugs"].add(row["deal_slug"])
        if row["watchlist"]:
            organisation_entry["watchlistDealSlugs"].add(row["deal_slug"])

        owner_entry = owner_summary.setdefault(
            int(row["owner_id"]),
            {
                "id": int(row["owner_id"]),
                "name": row["owner_name"],
                "type": next(
                    (
                        source["owner_type"]
                        for source in owners
                        if int(source["id"]) == int(row["owner_id"])
                    ),
                    "owner",
                ),
                "organisationId": int(row["organisation_id"]),
                "organisationName": row["organisation_name"],
                "exposure": 0,
                "dealSlugs": set(),
                "watchlistDealSlugs": set(),
            },
        )
        owner_entry["exposure"] += int(row["current_amount"])
        owner_entry["dealSlugs"].add(row["deal_slug"])
        if row["watchlist"]:
            owner_entry["watchlistDealSlugs"].add(row["deal_slug"])

        account_entry = account_summary.setdefault(
            int(row["account_id"]),
            {
                "id": int(row["account_id"]),
                "name": row["account_name"],
                "type": next(
                    (
                        source["account_type"]
                        for source in accounts
                        if int(source["id"]) == int(row["account_id"])
                    ),
                    "account",
                ),
                "ownerId": int(row["owner_id"]),
                "ownerName": row["owner_name"],
                "organisationId": int(row["organisation_id"]),
                "organisationName": row["organisation_name"],
                "benchmark": row["benchmark"],
                "exposure": 0,
                "dealSlugs": set(),
                "watchlistDealSlugs": set(),
            },
        )
        account_entry["exposure"] += int(row["current_amount"])
        account_entry["dealSlugs"].add(row["deal_slug"])
        if row["watchlist"]:
            account_entry["watchlistDealSlugs"].add(row["deal_slug"])

    total_aum = sum(item["exposure"] for item in visible_deal_metrics.values())
    weighted_avg_dscr = (
        round(
            sum(item["currentValue"] * item["exposure"] for item in visible_deal_metrics.values())
            / total_aum,
            2,
        )
        if total_aum
        else 0
    )
    weighted_avg_headroom = (
        round(
            sum(item["headroomPct"] * item["exposure"] for item in visible_deal_metrics.values())
            / total_aum,
            2,
        )
        if total_aum
        else 0
    )
    visible_pending_reviews = sum(pending_review_counts.values())

    visible_overdue_items = [
        row for row in overdue_items if row["deal_slug"] in visible_deal_slugs
    ]
    visible_distribution_alert_rows = [
        row for row in distribution_alert_rows if row["deal_slug"] in visible_deal_slugs
    ]
    visible_trends = [
        row for row in deteriorating_trends if row["deal_slug"] in visible_deal_slugs
    ]
    visible_watchlist_actions = [
        row for row in watchlist_actions if row["deal_slug"] in visible_deal_slugs
    ]
    visible_risks = [
        row for row in risk_rows if row["deal_slug"] in visible_deal_slugs
    ]
    visible_requests = [
        row for row in request_rows if row["deal_slug"] in visible_deal_slugs
    ]
    visible_covenant_heatmap = [
        {
            "slug": item["slug"],
            "name": item["name"],
            "covenant_code": item["covenantCode"],
            "covenant_name": item["covenantName"],
            "status": item["covenantStatus"],
            "headroom_pct": item["headroomPct"],
        }
        for item in visible_deal_metrics.values()
    ]
    grade_distribution_map = {}
    distribution_summary_map = {}
    for item in visible_deal_metrics.values():
        grade_bucket = grade_distribution_map.setdefault(
            item["grade"], {"grade": item["grade"], "count": 0, "exposure": 0}
        )
        grade_bucket["count"] += 1
        grade_bucket["exposure"] += item["exposure"]

        distribution_key = item["distributionStatus"] or "not_assessed"
        distribution_bucket = distribution_summary_map.setdefault(
            distribution_key,
            {"status": distribution_key, "count": 0, "exposure": 0},
        )
        distribution_bucket["count"] += 1
        distribution_bucket["exposure"] += item["exposure"]

    recent_alerts = [
        {
            "id": f"distribution-{row['id']}",
            "priority": "high" if row["distribution_status"] == "blocked" else "medium",
            "title": "Distribution restriction active",
            "description": f"{row['deal_name']}: {row['summary']}",
            "dealSlug": row["deal_slug"],
            "createdAt": row["assessed_at"].isoformat(),
            "_sort": (
                distribution_status_rank(row["distribution_status"]),
                row["assessed_at"].isoformat(),
            ),
        }
        for row in visible_distribution_alert_rows
    ] + [
        {
            "id": f"alert-{item['id']}",
            "priority": "high",
            "title": "Overdue compliance deliverable",
            "description": f"{item['deal_name']}: {item['title']} is {item['days_overdue']} days overdue.",
            "dealSlug": item["deal_slug"],
            "createdAt": iso_now(),
            "_sort": (4, iso_now()),
        }
        for item in visible_overdue_items
    ]
    recent_alerts.sort(key=lambda item: (item["_sort"][0], item["_sort"][1]), reverse=False)
    recent_alerts = [
        {
            "id": item["id"],
            "priority": item["priority"],
            "title": item["title"],
            "description": item["description"],
            "dealSlug": item["dealSlug"],
            "createdAt": item["createdAt"],
        }
        for item in recent_alerts[:6]
    ]

    holding_rows = []
    deal_rows_by_slug: dict[str, dict[str, object]] = {}

    for row in visible_holdings:
        deal_id = int(row["deal_id"])
        pending_reviews = pending_review_counts.get(deal_id, 0)
        overdue_obligations = overdue_obligation_counts.get(deal_id, 0)
        deliverables_up_to_date = overdue_obligations == 0
        request_summary = request_summary_map.get(
            deal_id,
            {"openRequests": 0, "highPriorityRequests": 0, "opposeVotes": 0},
        )
        assessment = assessment_map.get(
            deal_id,
            {
                "overallScore": None,
                "watchlistRecommendation": None,
                "escalationLevel": None,
                "summary": None,
            },
        )
        forecast = forecast_map.get(
            deal_id,
            {
                "forecastedDscr": None,
                "forecastCaseCount": 0,
                "forecastSummary": None,
            },
        )

        review_status = f"{pending_reviews} pending" if pending_reviews else "clear"
        governance_parts = []
        open_requests = int(request_summary["openRequests"])
        oppose_votes = int(request_summary["opposeVotes"])
        if open_requests:
            governance_parts.append(
                f"{open_requests} open request{'s' if open_requests != 1 else ''}"
            )
        if oppose_votes:
            governance_parts.append(
                f"{oppose_votes} oppose vote{'s' if oppose_votes != 1 else ''}"
            )
        if not governance_parts:
            governance_parts.append("no open governance items")

        holding_row = {
            "id": int(row["id"]),
            "organisationId": int(row["organisation_id"]),
            "organisationName": row["organisation_name"],
            "ownerId": int(row["owner_id"]),
            "ownerName": row["owner_name"],
            "accountId": int(row["account_id"]),
            "accountName": row["account_name"],
            "benchmark": row["benchmark"],
            "currentAmount": int(row["current_amount"]),
            "acquisitionDate": row["acquisition_date"],
            "status": row["status"],
            "dealId": deal_id,
            "dealSlug": row["deal_slug"],
            "dealName": row["deal_name"],
            "borrower": row["borrower"],
            "sector": row["sector"],
            "dealType": row["deal_type"],
            "revenueRisk": row["revenue_risk"],
            "grade": row["effective_grade"],
            "watchlist": bool(row["watchlist"]),
            "phase": row["phase"],
            "region": row["region"],
            "exposure": int(row["current_amount"]),
            "reportedDscr": as_number(row["current_value"]),
            "covenantStatus": row["covenant_status"],
            "headroomPct": as_number(row["headroom_pct"]),
            "distributionStatus": row["distribution_status"],
            "distributionBlockerCount": int(row["blocker_count"] or 0),
            "overdueObligations": overdue_obligations,
            "deliverablesUpToDate": deliverables_up_to_date,
            "pendingReviews": pending_reviews,
            "reviewStatus": review_status,
            "performanceScore": assessment["overallScore"],
            "performanceSummary": assessment["summary"],
            "watchlistRecommendation": assessment["watchlistRecommendation"],
            "escalationLevel": assessment["escalationLevel"],
            "forecastedDscr": forecast["forecastedDscr"],
            "forecastCaseCount": int(forecast["forecastCaseCount"]),
            "forecastSummary": forecast["forecastSummary"],
            "openRequests": open_requests,
            "highPriorityRequests": int(request_summary["highPriorityRequests"]),
            "requestsWithOpposition": oppose_votes,
            "governanceSummary": " · ".join(governance_parts),
        }
        holding_rows.append(holding_row)

        deal_entry = deal_rows_by_slug.setdefault(
            row["deal_slug"],
            {
                "dealId": deal_id,
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "borrower": row["borrower"],
                "sector": row["sector"],
                "dealType": row["deal_type"],
                "revenueRisk": row["revenue_risk"],
                "grade": row["effective_grade"],
                "watchlist": bool(row["watchlist"]),
                "exposure": 0,
                "reportedDscr": as_number(row["current_value"]),
                "covenantStatus": row["covenant_status"],
                "distributionStatus": row["distribution_status"],
                "distributionBlockerCount": int(row["blocker_count"] or 0),
                "overdueObligations": overdue_obligations,
                "deliverablesUpToDate": deliverables_up_to_date,
                "pendingReviews": pending_reviews,
                "reviewStatus": review_status,
                "performanceScore": assessment["overallScore"],
                "performanceSummary": assessment["summary"],
                "watchlistRecommendation": assessment["watchlistRecommendation"],
                "escalationLevel": assessment["escalationLevel"],
                "forecastedDscr": forecast["forecastedDscr"],
                "forecastCaseCount": int(forecast["forecastCaseCount"]),
                "forecastSummary": forecast["forecastSummary"],
                "openRequests": open_requests,
                "highPriorityRequests": int(request_summary["highPriorityRequests"]),
                "requestsWithOpposition": oppose_votes,
                "governanceSummary": " · ".join(governance_parts),
                "organisations": set(),
                "owners": set(),
                "accounts": set(),
            },
        )
        deal_entry["exposure"] += int(row["current_amount"])
        deal_entry["organisations"].add(row["organisation_name"])
        deal_entry["owners"].add(row["owner_name"])
        deal_entry["accounts"].add(row["account_name"])

    deal_rows = [
        {
            **deal_row,
            "organisations": sorted(deal_row["organisations"]),
            "owners": sorted(deal_row["owners"]),
            "accounts": sorted(deal_row["accounts"]),
        }
        for deal_row in sorted(
            deal_rows_by_slug.values(),
            key=lambda item: (-int(item["exposure"]), str(item["dealName"])),
        )
    ]

    restricted_deal_count = sum(
        1
        for deal_row in deal_rows
        if deal_row["distributionStatus"] in ("restricted", "review_required")
    )
    blocked_deal_count = sum(
        1
        for deal_row in deal_rows
        if deal_row["distributionStatus"] == "blocked"
    )

    return {
        "viewer": serialize_viewer(viewer_context),
        "platformClient": {
            "id": scope["platformClientId"],
            "name": scope["platformClientName"],
            "clientType": scope["platformClientType"],
        },
        "asOf": {
            "requested": requested_as_at.isoformat() if requested_as_at else None,
            "effective": effective_as_at.isoformat(),
            "default": demo_clock["_date"].isoformat(),
            "clockLabel": demo_clock["clockLabel"],
            "isHistorical": requested_as_at is not None,
        },
        "currentScope": {
            "level": scope["level"],
            "title": scope["title"],
            "subtitle": scope["subtitle"],
            "benchmark": scope["benchmark"],
            "breadcrumb": scope["breadcrumb"],
        },
        "scopeFilters": {
            "organisation": str(scope["organisationId"]) if scope["organisationId"] else None,
            "owner": str(scope["ownerId"]) if scope["ownerId"] else None,
            "account": str(scope["accountId"]) if scope["accountId"] else None,
        },
        "selectedFilters": {
            "organisation": str(scope["organisationId"]) if scope["organisationId"] else None,
            "owner": str(scope["ownerId"]) if scope["ownerId"] else None,
            "account": str(scope["accountId"]) if scope["accountId"] else None,
            "asAt": effective_as_at.isoformat(),
            "sector": sector,
            "region": region,
            "dealType": deal_type,
            "phase": phase,
            "grade": grade,
            "watchlist": selected_watchlist,
            "revenueRisk": revenue_risk,
        },
        "availableFilters": available_filters,
        "summary": {
            "totalExposure": total_aum,
            "dealCount": len(deal_rows),
            "organisationCount": len({int(row["organisationId"]) for row in holding_rows}),
            "ownerCount": len({int(row["ownerId"]) for row in holding_rows}),
            "accountCount": len({int(row["accountId"]) for row in holding_rows}),
            "pendingReviews": sum(int(row["pendingReviews"]) for row in deal_rows),
            "overdueObligations": sum(int(row["overdueObligations"]) for row in deal_rows),
            "openRequests": sum(int(row["openRequests"]) for row in deal_rows),
            "watchlistCount": sum(1 for row in deal_rows if row["watchlist"]),
            "restrictedDealCount": restricted_deal_count,
            "blockedDealCount": blocked_deal_count,
        },
        "hierarchy": {
            "organisations": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "type": item["type"],
                    "dealCount": len(item["dealSlugs"]),
                    "watchlistCount": len(item["watchlistDealSlugs"]),
                    "exposure": item["exposure"],
                    "active": scope["organisationId"] == item["id"],
                    "href": portfolio_href(
                        organisation_id=item["id"],
                        viewer_name=viewer_context["displayName"],
                        extra_params=selected_filters,
                    ),
                }
                for item in sorted(
                    organisation_summary.values(),
                    key=lambda value: (-value["exposure"], value["name"]),
                )
            ],
            "owners": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "type": item["type"],
                    "organisationId": item["organisationId"],
                    "organisationName": item["organisationName"],
                    "dealCount": len(item["dealSlugs"]),
                    "watchlistCount": len(item["watchlistDealSlugs"]),
                    "exposure": item["exposure"],
                    "active": scope["ownerId"] == item["id"],
                    "href": portfolio_href(
                        owner_id=item["id"],
                        viewer_name=viewer_context["displayName"],
                        extra_params=selected_filters,
                    ),
                }
                for item in sorted(
                    owner_summary.values(),
                    key=lambda value: (-value["exposure"], value["name"]),
                )
            ],
            "accounts": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "type": item["type"],
                    "ownerId": item["ownerId"],
                    "ownerName": item["ownerName"],
                    "organisationId": item["organisationId"],
                    "organisationName": item["organisationName"],
                    "benchmark": item["benchmark"],
                    "dealCount": len(item["dealSlugs"]),
                    "watchlistCount": len(item["watchlistDealSlugs"]),
                    "exposure": item["exposure"],
                    "active": scope["accountId"] == item["id"],
                    "href": portfolio_href(
                        account_id=item["id"],
                        viewer_name=viewer_context["displayName"],
                        extra_params=selected_filters,
                    ),
                }
                for item in sorted(
                    account_summary.values(),
                    key=lambda value: (-value["exposure"], value["name"]),
                )
            ],
        },
        "holdings": holding_rows,
        "deals": deal_rows,
        "totalAum": total_aum,
        "dealCount": len(deal_rows),
        "weightedAvgDscr": weighted_avg_dscr,
        "weightedAvgHeadroomPct": weighted_avg_headroom,
        "overdueObligations": len(visible_overdue_items),
        "pendingReviews": visible_pending_reviews,
        "watchlistCount": sum(1 for item in visible_deal_metrics.values() if item["watchlist"]),
        "healthInputs": {
            "fulfilmentRatePct": fulfilment_rate_pct,
            "highCriticalRiskCount": high_critical_risk_count,
            "deterioratingDealCount": deteriorating_deal_count,
        },
        "gradeDistribution": sorted(
            grade_distribution_map.values(), key=lambda item: item["grade"]
        ),
        "distributionSummary": sorted(
            distribution_summary_map.values(),
            key=lambda item: distribution_status_rank(item["status"]),
        ),
        "covenantHeatmap": [
            {
                "slug": row["slug"],
                "name": row["name"],
                "covenantCode": row["covenant_code"],
                "covenantName": row["covenant_name"],
                "status": row["status"],
                "headroomPct": as_number(row["headroom_pct"]),
            }
            for row in visible_covenant_heatmap
        ],
        "recentAlerts": recent_alerts,
        "deterioratingTrends": [
            {
                "id": int(row["id"]),
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "grade": row["grade"],
                "watchlist": row["watchlist"],
                "metricLabel": row["metric_label"],
                "severity": row["severity"],
                "periodsObserved": int(row["periods_observed"]),
                "summary": row["summary"],
            }
            for row in visible_trends
        ],
        "watchlistActions": [
            {
                "id": int(row["id"]),
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "statusTo": row["status_to"],
                "recommendation": row["recommendation"],
                "escalationLevel": row["escalation_level"],
                "ownerName": row["owner_name"],
                "nextReviewDate": row["next_review_date"],
                "rationale": row["rationale"],
            }
            for row in visible_watchlist_actions
        ],
        "overdueItems": [
            {
                "id": str(row["id"]),
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "title": row["title"],
                "dueDate": row["due_date"],
                "daysOverdue": int(row["days_overdue"]),
                "graceStatus": row["grace_status"],
            }
            for row in visible_overdue_items
        ],
        "topRisks": [
            {
                "id": int(row["id"]),
                "riskCategory": row["risk_category"],
                "severity": row["severity"],
                "status": row["status"],
                "title": row["title"],
                "summary": row["summary"],
                "nextReviewDate": row["next_review_date"].isoformat(),
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "scopedExposure": int(
                    visible_deal_metrics.get(row["deal_slug"], {}).get("exposure", 0)
                ),
            }
            for row in visible_risks
        ],
        "borrowerRequests": [
            {
                "id": int(row["id"]),
                "requestType": row["request_type"],
                "requestStatus": row["request_status"],
                "priority": row["priority"],
                "title": row["title"],
                "summary": row["summary"],
                "dueDate": row["due_date"].isoformat(),
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "totalVotes": int(row["total_votes"]),
                "opposeVotes": int(row["oppose_votes"]),
            }
            for row in visible_requests
        ],
    }


@app.get("/api/dashboard")
def get_dashboard(
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
    as_at: str | None = None,
    sector: str | None = None,
    region: str | None = None,
    deal_type: str | None = None,
    phase: str | None = None,
    grade: str | None = None,
    watchlist: str | None = None,
    revenue_risk: str | None = None,
    viewer: str | None = None,
):
    return get_portfolio(
        organisation=organisation,
        owner=owner,
        account=account,
        as_at=as_at,
        sector=sector,
        region=region,
        deal_type=deal_type,
        phase=phase,
        grade=grade,
        watchlist=watchlist,
        revenue_risk=revenue_risk,
        viewer=viewer,
    )

    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_portfolio",
            title="Portfolio access denied",
            summary="The selected viewer attempted to open the portfolio workspace without portfolio access.",
            deep_link="/portfolio",
        )
        ensure_access_to_scope(
            conn,
            viewer_context,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
            deep_link="/portfolio",
        )
        scope = resolve_portfolio_scope(
            conn,
            organisation,
            owner,
            account,
            viewer_context["displayName"],
        )

        holdings = conn.execute(
            """
            SELECT
              h.id,
              o.id AS organisation_id,
              o.name AS organisation_name,
              po.id AS owner_id,
              po.name AS owner_name,
              a.id AS account_id,
              a.name AS account_name,
              a.benchmark,
              h.current_amount,
              d.id AS deal_id,
              d.slug AS deal_slug,
              d.name AS deal_name,
              d.borrower,
              COALESCE(go.override_grade, d.grade) AS effective_grade,
              d.watchlist,
              c.current_value,
              c.status AS covenant_status,
              dist.distribution_status,
              dist.blocker_count
            FROM holdings h
            JOIN accounts a ON a.id = h.account_id
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            JOIN organisations o ON o.id = po.organisation_id
            JOIN deals d ON d.id = h.deal_id
            JOIN covenants c ON c.deal_id = d.id
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            LEFT JOIN LATERAL (
              SELECT distribution_status, blocker_count
              FROM distribution_assessments da
              WHERE da.deal_id = d.id
              ORDER BY da.assessed_at DESC, da.id DESC
              LIMIT 1
            ) dist ON TRUE
            WHERE h.status = 'active'
              AND o.platform_client_id = %s
              AND (%s::int IS NULL OR o.id = %s::int)
              AND (%s::int IS NULL OR po.id = %s::int)
              AND (%s::int IS NULL OR a.id = %s::int)
            ORDER BY o.name, po.name, a.name, h.current_amount DESC
            """,
            (
                scope["platformClientId"],
                scope["organisationId"],
                scope["organisationId"],
                scope["ownerId"],
                scope["ownerId"],
                scope["accountId"],
                scope["accountId"],
            ),
        ).fetchall()

        access_deal_ids = sorted(viewer_context["access"]["dealIds"])
        if access_deal_ids:
            deal_slug_rows = conn.execute(
                f"""
                SELECT id, slug
                FROM deals
                WHERE id IN ({sql_placeholders(access_deal_ids)})
                """,
                tuple(access_deal_ids),
            ).fetchall()
        else:
            deal_slug_rows = []

        allowed_deal_slugs = {row["slug"] for row in deal_slug_rows}
        visible_holdings = [
            row for row in holdings if row["deal_slug"] in allowed_deal_slugs
        ]
        visible_deal_ids = sorted({int(row["deal_id"]) for row in visible_holdings})

        pending_review_counts: dict[int, int] = {}
        overdue_obligation_counts: dict[int, int] = {}
        request_summary_map: dict[int, dict[str, int]] = {}
        assessment_map: dict[int, dict[str, object | None]] = {}
        forecast_map: dict[int, dict[str, object | None]] = {}

        if visible_deal_ids:
            pending_review_rows = conn.execute(
                f"""
                SELECT deal_id, COUNT(*)::int AS pending_reviews
                FROM review_items
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND status = 'pending'
                GROUP BY deal_id
                """,
                tuple(visible_deal_ids),
            ).fetchall()
            pending_review_counts = {
                int(row["deal_id"]): int(row["pending_reviews"])
                for row in pending_review_rows
            }

            overdue_obligation_rows = conn.execute(
                f"""
                SELECT deal_id, COUNT(*)::int AS overdue_obligations
                FROM obligations
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND status = 'overdue'
                GROUP BY deal_id
                """,
                tuple(visible_deal_ids),
            ).fetchall()
            overdue_obligation_counts = {
                int(row["deal_id"]): int(row["overdue_obligations"])
                for row in overdue_obligation_rows
            }

            request_summary_rows = conn.execute(
                f"""
                WITH vote_counts AS (
                  SELECT
                    borrower_request_id,
                    COUNT(*) FILTER (WHERE vote_status = 'oppose')::int AS oppose_votes
                  FROM borrower_request_votes
                  GROUP BY borrower_request_id
                )
                SELECT
                  br.deal_id,
                  COUNT(*)::int AS open_requests,
                  COUNT(*) FILTER (WHERE br.priority = 'high')::int AS high_priority_requests,
                  COALESCE(SUM(COALESCE(vc.oppose_votes, 0)), 0)::int AS oppose_votes
                FROM borrower_requests br
                LEFT JOIN vote_counts vc ON vc.borrower_request_id = br.id
                WHERE br.deal_id IN ({sql_placeholders(visible_deal_ids)})
                  AND br.request_status NOT IN ('closed', 'declined')
                GROUP BY br.deal_id
                """,
                tuple(visible_deal_ids),
            ).fetchall()
            request_summary_map = {
                int(row["deal_id"]): {
                    "openRequests": int(row["open_requests"]),
                    "highPriorityRequests": int(row["high_priority_requests"]),
                    "opposeVotes": int(row["oppose_votes"]),
                }
                for row in request_summary_rows
            }

            assessment_rows = conn.execute(
                f"""
                SELECT DISTINCT ON (a.deal_id)
                  a.deal_id,
                  a.overall_score,
                  a.watchlist_recommendation,
                  a.escalation_level,
                  a.summary
                FROM deal_assessments a
                WHERE a.deal_id IN ({sql_placeholders(visible_deal_ids)})
                ORDER BY a.deal_id, a.assessment_date DESC, a.id DESC
                """,
                tuple(visible_deal_ids),
            ).fetchall()
            assessment_map = {
                int(row["deal_id"]): {
                    "overallScore": as_number(row["overall_score"]),
                    "watchlistRecommendation": row["watchlist_recommendation"],
                    "escalationLevel": row["escalation_level"],
                    "summary": row["summary"],
                }
                for row in assessment_rows
            }

            latest_period_rows = conn.execute(
                f"""
                SELECT DISTINCT ON (deal_id)
                  deal_id,
                  period_key
                FROM financial_periods
                WHERE deal_id IN ({sql_placeholders(visible_deal_ids)})
                ORDER BY deal_id, period_end DESC, id DESC
                """,
                tuple(visible_deal_ids),
            ).fetchall()

            for row in latest_period_rows:
                summary = build_forecast_summary(
                    conn, int(row["deal_id"]), row["period_key"]
                )
                forecasted_dscr, forecast_case_count, forecast_summary = (
                    dashboard_forecast_snapshot(summary)
                )
                forecast_map[int(row["deal_id"])] = {
                    "forecastedDscr": forecasted_dscr,
                    "forecastCaseCount": forecast_case_count,
                    "forecastSummary": forecast_summary,
                }

    holding_rows = []
    deal_rows_by_slug: dict[str, dict[str, object]] = {}

    for row in visible_holdings:
        deal_id = int(row["deal_id"])
        pending_reviews = pending_review_counts.get(deal_id, 0)
        overdue_obligations = overdue_obligation_counts.get(deal_id, 0)
        deliverables_up_to_date = overdue_obligations == 0
        request_summary = request_summary_map.get(
            deal_id,
            {"openRequests": 0, "highPriorityRequests": 0, "opposeVotes": 0},
        )
        assessment = assessment_map.get(
            deal_id,
            {
                "overallScore": None,
                "watchlistRecommendation": None,
                "escalationLevel": None,
                "summary": None,
            },
        )
        forecast = forecast_map.get(
            deal_id,
            {
                "forecastedDscr": None,
                "forecastCaseCount": 0,
                "forecastSummary": None,
            },
        )

        review_status = (
            f"{pending_reviews} pending"
            if pending_reviews
            else "clear"
        )
        governance_parts = []
        open_requests = int(request_summary["openRequests"])
        oppose_votes = int(request_summary["opposeVotes"])
        if open_requests:
            governance_parts.append(
                f"{open_requests} open request{'s' if open_requests != 1 else ''}"
            )
        if oppose_votes:
            governance_parts.append(
                f"{oppose_votes} oppose vote{'s' if oppose_votes != 1 else ''}"
            )
        if not governance_parts:
            governance_parts.append("no open governance items")

        holding_row = {
            "id": int(row["id"]),
            "organisationId": int(row["organisation_id"]),
            "organisationName": row["organisation_name"],
            "ownerId": int(row["owner_id"]),
            "ownerName": row["owner_name"],
            "accountId": int(row["account_id"]),
            "accountName": row["account_name"],
            "benchmark": row["benchmark"],
            "dealId": deal_id,
            "dealSlug": row["deal_slug"],
            "dealName": row["deal_name"],
            "borrower": row["borrower"],
            "grade": row["effective_grade"],
            "watchlist": bool(row["watchlist"]),
            "exposure": int(row["current_amount"]),
            "reportedDscr": as_number(row["current_value"]),
            "covenantStatus": row["covenant_status"],
            "distributionStatus": row["distribution_status"],
            "distributionBlockerCount": int(row["blocker_count"] or 0),
            "overdueObligations": overdue_obligations,
            "deliverablesUpToDate": deliverables_up_to_date,
            "pendingReviews": pending_reviews,
            "reviewStatus": review_status,
            "performanceScore": assessment["overallScore"],
            "performanceSummary": assessment["summary"],
            "watchlistRecommendation": assessment["watchlistRecommendation"],
            "escalationLevel": assessment["escalationLevel"],
            "forecastedDscr": forecast["forecastedDscr"],
            "forecastCaseCount": int(forecast["forecastCaseCount"]),
            "forecastSummary": forecast["forecastSummary"],
            "openRequests": open_requests,
            "highPriorityRequests": int(request_summary["highPriorityRequests"]),
            "requestsWithOpposition": oppose_votes,
            "governanceSummary": " · ".join(governance_parts),
        }
        holding_rows.append(holding_row)

        deal_entry = deal_rows_by_slug.setdefault(
            row["deal_slug"],
            {
                "dealId": deal_id,
                "dealSlug": row["deal_slug"],
                "dealName": row["deal_name"],
                "borrower": row["borrower"],
                "grade": row["effective_grade"],
                "watchlist": bool(row["watchlist"]),
                "exposure": 0,
                "reportedDscr": as_number(row["current_value"]),
                "covenantStatus": row["covenant_status"],
                "distributionStatus": row["distribution_status"],
                "distributionBlockerCount": int(row["blocker_count"] or 0),
                "overdueObligations": overdue_obligations,
                "deliverablesUpToDate": deliverables_up_to_date,
                "pendingReviews": pending_reviews,
                "reviewStatus": review_status,
                "performanceScore": assessment["overallScore"],
                "performanceSummary": assessment["summary"],
                "watchlistRecommendation": assessment["watchlistRecommendation"],
                "escalationLevel": assessment["escalationLevel"],
                "forecastedDscr": forecast["forecastedDscr"],
                "forecastCaseCount": int(forecast["forecastCaseCount"]),
                "forecastSummary": forecast["forecastSummary"],
                "openRequests": open_requests,
                "highPriorityRequests": int(request_summary["highPriorityRequests"]),
                "requestsWithOpposition": oppose_votes,
                "governanceSummary": " · ".join(governance_parts),
                "organisations": set(),
                "owners": set(),
                "accounts": set(),
            },
        )
        deal_entry["exposure"] += int(row["current_amount"])
        deal_entry["organisations"].add(row["organisation_name"])
        deal_entry["owners"].add(row["owner_name"])
        deal_entry["accounts"].add(row["account_name"])

    deal_rows = [
        {
            **deal_row,
            "organisations": sorted(deal_row["organisations"]),
            "owners": sorted(deal_row["owners"]),
            "accounts": sorted(deal_row["accounts"]),
        }
        for deal_row in sorted(
            deal_rows_by_slug.values(),
            key=lambda item: (-int(item["exposure"]), str(item["dealName"])),
        )
    ]

    restricted_deal_count = sum(
        1
        for deal_row in deal_rows
        if deal_row["distributionStatus"] in ("restricted", "review_required")
    )
    blocked_deal_count = sum(
        1
        for deal_row in deal_rows
        if deal_row["distributionStatus"] == "blocked"
    )

    return {
        "viewer": serialize_viewer(viewer_context),
        "platformClient": {
            "id": scope["platformClientId"],
            "name": scope["platformClientName"],
            "clientType": scope["platformClientType"],
        },
        "currentScope": {
            "level": scope["level"],
            "title": scope["title"],
            "subtitle": scope["subtitle"],
            "benchmark": scope["benchmark"],
            "breadcrumb": scope["breadcrumb"],
        },
        "scopeFilters": {
            "organisation": str(scope["organisationId"]) if scope["organisationId"] else None,
            "owner": str(scope["ownerId"]) if scope["ownerId"] else None,
            "account": str(scope["accountId"]) if scope["accountId"] else None,
        },
        "summary": {
            "totalExposure": sum(int(row["exposure"]) for row in deal_rows),
            "dealCount": len(deal_rows),
            "organisationCount": len(
                {int(row["organisationId"]) for row in holding_rows}
            ),
            "ownerCount": len({int(row["ownerId"]) for row in holding_rows}),
            "accountCount": len({int(row["accountId"]) for row in holding_rows}),
            "pendingReviews": sum(int(row["pendingReviews"]) for row in deal_rows),
            "overdueObligations": sum(
                int(row["overdueObligations"]) for row in deal_rows
            ),
            "openRequests": sum(int(row["openRequests"]) for row in deal_rows),
            "watchlistCount": sum(1 for row in deal_rows if row["watchlist"]),
            "restrictedDealCount": restricted_deal_count,
            "blockedDealCount": blocked_deal_count,
        },
        "holdings": holding_rows,
        "deals": deal_rows,
    }


@app.get("/api/portfolio/packs")
def get_portfolio_packs(
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
):
    with get_connection() as conn:
        scope = resolve_portfolio_scope(conn, organisation, owner, account)
        packs = load_memo_packs(
            conn,
            organisation_id=scope["organisationId"],
            owner_id=scope["ownerId"],
            account_id=scope["accountId"],
            portfolio_only=True,
        )

    return {
        "scope": {
            "level": scope["level"],
            "title": scope["title"],
            "subtitle": scope["subtitle"],
        },
        "packs": packs,
    }


@app.get("/api/work-queue")
def get_work_queue(assignee: str | None = None, team: str | None = None):
    with get_connection() as conn:
        task_rows = conn.execute(
            """
            SELECT
              wt.*,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.name AS organisation_name,
              po.name AS owner_name,
              a.name AS account_name
            FROM workflow_tasks wt
            LEFT JOIN deals d ON d.id = wt.deal_id
            LEFT JOIN organisations o ON o.id = wt.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = wt.owner_id
            LEFT JOIN accounts a ON a.id = wt.account_id
            ORDER BY
              CASE wt.escalation_status
                WHEN 'overdue' THEN 0
                WHEN 'escalated' THEN 1
                WHEN 'approaching_due' THEN 2
                WHEN 'on_track' THEN 3
                ELSE 4
              END,
              CASE wt.priority
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                ELSE 3
              END,
              wt.due_at,
              wt.id
            """
        ).fetchall()

    assignee_options = sorted(
        {row["assignee_name"] for row in task_rows if row["assignee_name"]}
    )
    team_options = sorted({row["assignee_team"] for row in task_rows if row["assignee_team"]})

    selected_assignee = assignee or (
        "PM - Infrastructure" if "PM - Infrastructure" in assignee_options else assignee_options[0] if assignee_options else ""
    )
    selected_team = team or (
        "Portfolio Management" if "Portfolio Management" in team_options else team_options[0] if team_options else ""
    )

    open_rows = [row for row in task_rows if row["task_status"] != "resolved"]
    my_rows = [
        row for row in open_rows if not selected_assignee or row["assignee_name"] == selected_assignee
    ]
    team_rows = [
        row for row in open_rows if not selected_team or row["assignee_team"] == selected_team
    ]
    attention_rows = [
        row
        for row in open_rows
        if row["escalation_status"] in ("overdue", "escalated", "approaching_due")
    ]
    recent_resolved_rows = sorted(
        [row for row in task_rows if row["task_status"] == "resolved"],
        key=lambda row: row["completed_at"] or row["due_at"],
        reverse=True,
    )[:6]

    return {
        "selectedAssignee": selected_assignee,
        "selectedTeam": selected_team,
        "summary": {
            "openTasks": len(open_rows),
            "myOpenTasks": len(my_rows),
            "teamOpenTasks": len(team_rows),
            "overdueTasks": sum(1 for row in open_rows if row["escalation_status"] == "overdue"),
            "escalatedTasks": sum(1 for row in open_rows if row["escalation_status"] == "escalated"),
            "blockedTasks": sum(1 for row in open_rows if row["task_status"] == "blocked"),
            "dueToday": sum(
                1
                for row in open_rows
                if row["due_at"].date() == datetime.now(timezone.utc).date()
            ),
        },
        "assigneeOptions": assignee_options,
        "teamOptions": team_options,
        "myTasks": [serialize_workflow_task(row) for row in my_rows],
        "teamTasks": [serialize_workflow_task(row) for row in team_rows],
        "attentionTasks": [serialize_workflow_task(row) for row in attention_rows],
        "recentlyResolved": [serialize_workflow_task(row) for row in recent_resolved_rows],
    }


@app.get("/api/notifications")
def get_notifications(subscriber: str | None = None, team: str | None = None):
    with get_connection() as conn:
        preference_rows = conn.execute(
            """
            SELECT *
            FROM notification_preferences
            ORDER BY subscriber_name
            """
        ).fetchall()
        subscriber_options = [row["subscriber_name"] for row in preference_rows]
        team_options = sorted({row["subscriber_team"] for row in preference_rows})
        selected_subscriber = subscriber or (
            "PM - Infrastructure"
            if "PM - Infrastructure" in subscriber_options
            else subscriber_options[0]
            if subscriber_options
            else ""
        )
        selected_team = team or (
            next(
                (
                    row["subscriber_team"]
                    for row in preference_rows
                    if row["subscriber_name"] == selected_subscriber
                ),
                team_options[0] if team_options else "",
            )
        )

        preference = next(
            (row for row in preference_rows if row["subscriber_name"] == selected_subscriber),
            None,
        )

        subscription_rows = conn.execute(
            """
            SELECT
              ns.*,
              d.name AS deal_name,
              o.name AS organisation_name,
              po.name AS owner_name,
              a.name AS account_name
            FROM notification_subscriptions ns
            LEFT JOIN deals d ON d.id = ns.deal_id
            LEFT JOIN organisations o ON o.id = ns.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = ns.owner_id
            LEFT JOIN accounts a ON a.id = ns.account_id
            WHERE ns.subscriber_name = %s
            ORDER BY ns.active DESC, ns.id
            """,
            (selected_subscriber,),
        ).fetchall()

        delivery_rows = conn.execute(
            """
            SELECT
              nd.*,
              ne.id AS event_id,
              ne.source_domain,
              ne.source_entity_type,
              ne.source_entity_id,
              ne.event_type,
              ne.severity,
              ne.title,
              ne.summary,
              ne.deep_link,
              ne.payload,
              ne.created_at,
              d.name AS deal_name,
              d.slug AS deal_slug
            FROM notification_deliveries nd
            JOIN notification_events ne ON ne.id = nd.notification_event_id
            LEFT JOIN deals d ON d.id = ne.deal_id
            WHERE nd.subscriber_name = %s
            ORDER BY nd.delivered_at DESC, nd.id DESC
            """,
            (selected_subscriber,),
        ).fetchall()

        digest_rows = conn.execute(
            """
            SELECT *
            FROM notification_digests
            WHERE subscriber_name = %s
            ORDER BY generated_at DESC, id DESC
            LIMIT 12
            """,
            (selected_subscriber,),
        ).fetchall()

    inbox_rows = [row for row in delivery_rows if row["delivery_status"] != "dismissed"]
    return {
        "selectedSubscriber": selected_subscriber,
        "selectedTeam": selected_team,
        "subscriberOptions": subscriber_options,
        "teamOptions": team_options,
        "summary": {
            "newItems": sum(1 for row in inbox_rows if row["delivery_status"] == "new"),
            "acknowledgedItems": sum(
                1 for row in inbox_rows if row["delivery_status"] == "acknowledged"
            ),
            "digestCount": len(digest_rows),
            "escalations": sum(
                1 for row in inbox_rows if row["event_type"] in ("task_overdue", "task_escalated")
            ),
        },
        "preferences": {
            "subscriberName": selected_subscriber,
            "subscriberTeam": preference["subscriber_team"] if preference else selected_team,
            "inAppEnabled": preference["in_app_enabled"] if preference else True,
            "digestEnabled": preference["digest_enabled"] if preference else True,
            "digestFrequency": preference["digest_frequency"] if preference else "daily",
            "escalationOnly": preference["escalation_only"] if preference else False,
            "immediateEnabled": preference["immediate_enabled"] if preference else True,
            "defaultChannel": preference["default_channel"] if preference else "in_app",
        },
        "subscriptions": [
            {
                "id": int(row["id"]),
                "sourceDomain": row["source_domain"],
                "dealName": row["deal_name"],
                "organisationName": row["organisation_name"],
                "ownerName": row["owner_name"],
                "accountName": row["account_name"],
                "severityThreshold": row["severity_threshold"],
                "deliveryFrequency": row["delivery_frequency"],
                "onlyEscalations": row["only_escalations"],
                "active": row["active"],
                "subscriptionLabel": row["subscription_label"],
            }
            for row in subscription_rows
        ],
        "inbox": [serialize_notification_delivery(row) for row in inbox_rows],
        "digests": [
            {
                "id": int(row["id"]),
                "digestLabel": row["digest_label"],
                "digestFrequency": row["digest_frequency"],
                "deliveryChannel": row["delivery_channel"],
                "digestStatus": row["digest_status"],
                "itemCount": int(row["item_count"]),
                "summary": row["summary"],
                "generatedAt": row["generated_at"].isoformat(),
            }
            for row in digest_rows
        ],
    }


@app.post("/api/notification-deliveries/{delivery_id}/state")
def update_notification_delivery_state(delivery_id: int, payload: NotificationDeliveryStateRequest):
    status_map = {
        "seen": "delivery_seen",
        "acknowledged": "delivery_acknowledged",
        "dismissed": "delivery_dismissed",
    }
    if payload.state not in status_map:
        raise HTTPException(status_code=400, detail="Unsupported notification state")

    with get_connection() as conn:
        existing = conn.execute(
            """
            SELECT
              nd.id,
              nd.subscriber_name,
              nd.delivery_status,
              ne.id AS event_id,
              ne.deal_id,
              ne.organisation_id,
              ne.owner_id,
              ne.account_id,
              ne.title,
              ne.deep_link
            FROM notification_deliveries nd
            JOIN notification_events ne ON ne.id = nd.notification_event_id
            WHERE nd.id = %s
            """,
            (delivery_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Notification delivery not found")

        update_parts = ["delivery_status = %s"]
        params = [payload.state]
        if payload.state == "seen":
            update_parts.append("seen_at = NOW()")
        elif payload.state == "acknowledged":
            update_parts.append("seen_at = COALESCE(seen_at, NOW())")
            update_parts.append("acknowledged_at = NOW()")
        elif payload.state == "dismissed":
            update_parts.append("dismissed_at = NOW()")

        conn.execute(
            f"""
            UPDATE notification_deliveries
            SET {", ".join(update_parts)}
            WHERE id = %s
            """,
            tuple(params + [delivery_id]),
        )
        record_activity_event(
            conn,
            source_domain="notifications",
            event_type=status_map[payload.state],
            entity_type="notification_delivery",
            entity_id=delivery_id,
            deal_id=int(existing["deal_id"]) if existing["deal_id"] else None,
            organisation_id=int(existing["organisation_id"]) if existing["organisation_id"] else None,
            owner_id=int(existing["owner_id"]) if existing["owner_id"] else None,
            account_id=int(existing["account_id"]) if existing["account_id"] else None,
            actor_name=existing["subscriber_name"],
            title=f"{existing['title']} notification {payload.state.replace('_', ' ')}",
            summary=f"{existing['subscriber_name']} marked the in-app notification as {payload.state.replace('_', ' ')}.",
            before_state={"deliveryStatus": existing["delivery_status"]},
            after_state={"deliveryStatus": payload.state},
            deep_link=existing["deep_link"] or "/notifications",
        )
        conn.commit()

    return {"ok": True}


@app.post("/api/notification-preferences/{subscriber_name}")
def update_notification_preferences(subscriber_name: str, payload: NotificationPreferenceUpdateRequest):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO notification_preferences (
              subscriber_name,
              subscriber_team,
              in_app_enabled,
              digest_enabled,
              digest_frequency,
              escalation_only,
              immediate_enabled,
              default_channel
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (subscriber_name) DO UPDATE
            SET
              subscriber_team = EXCLUDED.subscriber_team,
              in_app_enabled = EXCLUDED.in_app_enabled,
              digest_enabled = EXCLUDED.digest_enabled,
              digest_frequency = EXCLUDED.digest_frequency,
              escalation_only = EXCLUDED.escalation_only,
              immediate_enabled = EXCLUDED.immediate_enabled,
              default_channel = EXCLUDED.default_channel
            """,
            (
                subscriber_name,
                payload.subscriberTeam,
                payload.inAppEnabled,
                payload.digestEnabled,
                payload.digestFrequency,
                payload.escalationOnly,
                payload.immediateEnabled,
                payload.defaultChannel,
            ),
        )
        conn.commit()

    return {"ok": True}


@app.post("/api/notification-subscriptions/{subscription_id}")
def update_notification_subscription(subscription_id: int, payload: NotificationSubscriptionUpdateRequest):
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM notification_subscriptions WHERE id = %s",
            (subscription_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Notification subscription not found")

        conn.execute(
            """
            UPDATE notification_subscriptions
            SET active = %s,
                delivery_frequency = %s,
                only_escalations = %s
            WHERE id = %s
            """,
            (payload.active, payload.deliveryFrequency, payload.onlyEscalations, subscription_id),
        )
        conn.commit()

    return {"ok": True}


@app.get("/api/activity")
def get_activity(sourceDomain: str | None = None, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_activity",
            title="Activity access denied",
            summary="The selected viewer attempted to open the activity feed without activity access.",
            deep_link="/activity",
        )
        source_rows = conn.execute(
            """
            SELECT DISTINCT source_domain
            FROM activity_events
            ORDER BY source_domain
            """
        ).fetchall()
        activity_rows = conn.execute(
            """
            SELECT
              ae.*,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.name AS organisation_name,
              po.name AS owner_name,
              a.name AS account_name
            FROM activity_events ae
            LEFT JOIN deals d ON d.id = ae.deal_id
            LEFT JOIN organisations o ON o.id = ae.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = ae.owner_id
            LEFT JOIN accounts a ON a.id = ae.account_id
            WHERE (%s::text IS NULL OR ae.source_domain = %s::text)
            ORDER BY ae.created_at DESC, ae.id DESC
            LIMIT 80
            """,
            (sourceDomain, sourceDomain),
        ).fetchall()

    serialized_events = [
        serialize_activity_event(row)
        for row in activity_rows
        if viewer_can_see_activity(viewer_context, serialize_activity_event(row))
    ]
    source_options = [row["source_domain"] for row in source_rows]
    return {
        "viewer": serialize_viewer(viewer_context),
        "selectedSourceDomain": sourceDomain or "All domains",
        "sourceDomainOptions": ["All domains"] + source_options,
        "summary": {
            "eventCount": len(serialized_events),
            "dealEvents": sum(1 for row in serialized_events if row["dealId"]),
            "platformEvents": sum(1 for row in serialized_events if not row["dealId"]),
            "actors": len({row["actorName"] for row in serialized_events}),
        },
        "events": serialized_events,
    }


@app.get("/api/deals/{slug}/activity")
def get_deal_activity(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_activity",
            title="Deal activity access denied",
            summary="The selected viewer attempted to open a deal timeline without activity access.",
            deep_link=f"/deals/{slug}/activity",
        )
        deal = conn.execute(
            "SELECT id, slug, name, grade, watchlist FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/activity",
        )

        activity_rows = conn.execute(
            """
            SELECT
              ae.*,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.name AS organisation_name,
              po.name AS owner_name,
              a.name AS account_name
            FROM activity_events ae
            LEFT JOIN deals d ON d.id = ae.deal_id
            LEFT JOIN organisations o ON o.id = ae.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = ae.owner_id
            LEFT JOIN accounts a ON a.id = ae.account_id
            WHERE ae.deal_id = %s
            ORDER BY ae.created_at DESC, ae.id DESC
            LIMIT 80
            """,
            (int(deal["id"]),),
        ).fetchall()

    serialized_events = [serialize_activity_event(row) for row in activity_rows]
    return {
        "viewer": serialize_viewer(viewer_context),
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["grade"],
        "watchlist": deal["watchlist"],
        "summary": {
            "eventCount": len(serialized_events),
            "actors": len({row["actorName"] for row in serialized_events}),
            "domains": len({row["sourceDomain"] for row in serialized_events}),
        },
        "events": serialized_events,
    }


@app.get("/api/reports")
def get_reports(
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
    sourceDomain: str | None = None,
    viewer: str | None = None,
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_reports",
            title="Reports access denied",
            summary="The selected viewer attempted to open the reports workspace without report access.",
            deep_link="/reports",
        )
        ensure_access_to_scope(
            conn,
            viewer_context,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
            deep_link="/reports",
        )
        scope = resolve_portfolio_scope(
            conn,
            organisation,
            owner,
            account,
            viewer_context["displayName"],
        )
        exports = load_report_exports(
            conn,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
            source_domain=sourceDomain,
        )
        schedules = load_report_schedules(
            conn,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
        )
        runs = load_report_generation_runs(
            conn,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
        )
        deliveries = load_report_delivery_logs(
            conn,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
        )
        exceptions = load_report_delivery_exceptions(
            conn,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
        )
        source_rows = conn.execute(
            """
            SELECT DISTINCT source_domain
            FROM activity_events
            ORDER BY source_domain
            """
        ).fetchall()

    visible_exports = [
        item for item in exports if viewer_can_see_report(viewer_context, item)
    ]
    visible_export_ids = {item["id"] for item in visible_exports}
    visible_schedules = [
        item
        for item in schedules
        if viewer_can_see_scoped_item(
            viewer_context,
            deal_id=item["dealId"],
            organisation_id=item["organisationId"],
            owner_id=item["ownerId"],
            account_id=item["accountId"],
        )
    ]
    visible_schedule_ids = {item["id"] for item in visible_schedules}
    visible_runs = [
        item
        for item in runs
        if (item["reportExportId"] and item["reportExportId"] in visible_export_ids)
        or (item["reportScheduleId"] and item["reportScheduleId"] in visible_schedule_ids)
    ]
    visible_deliveries = [
        item for item in deliveries if item["reportExportId"] in visible_export_ids
    ]
    visible_exceptions = [
        item
        for item in exceptions
        if (item["reportExportId"] and item["reportExportId"] in visible_export_ids)
        or (item["reportScheduleId"] and item["reportScheduleId"] in visible_schedule_ids)
    ]
    return {
        "viewer": serialize_viewer(viewer_context),
        "scope": {
            "level": scope["level"],
            "title": scope["title"],
            "subtitle": scope["subtitle"],
        },
        "summary": {
            "exportCount": len(visible_exports),
            "dueSchedules": sum(
                1
                for item in visible_schedules
                if datetime.fromisoformat(item["nextRunAt"]) <= datetime.now(timezone.utc)
            ),
            "pendingApproval": sum(
                1 for item in visible_exports if item["reviewStatus"] != "approved"
            ),
            "openExceptions": sum(
                1 for item in visible_exceptions if item["status"] == "open"
            ),
        },
        "selectedSourceDomain": sourceDomain or "All domains",
        "sourceDomainOptions": ["All domains"] + [row["source_domain"] for row in source_rows],
        "exports": visible_exports,
        "schedules": visible_schedules,
        "generationRuns": visible_runs,
        "deliveryLogs": visible_deliveries,
        "deliveryExceptions": visible_exceptions,
    }


@app.post("/api/reports")
def create_report_export(
    payload: ReportExportCreateRequest,
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
    viewer: str | None = None,
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "generate_reports",
            title="Report generation denied",
            summary="The selected viewer attempted to generate a report without generation permission.",
            deep_link="/reports",
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
        )
        ensure_access_to_scope(
            conn,
            viewer_context,
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
            deep_link="/reports",
        )
        export_id = generate_portfolio_report_export(
            conn,
            report_kind=payload.reportKind,
            generated_by=viewer_context["displayName"],
            report_schedule_id=None,
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
            source_domain=payload.sourceDomain,
        )
        conn.execute(
            """
            INSERT INTO report_generation_runs (
              report_schedule_id,
              report_export_id,
              run_status,
              trigger_mode,
              trigger_summary,
              started_at,
              completed_at,
              review_status,
              release_status
            ) VALUES (NULL, %s, 'completed', 'manual', %s, NOW(), NOW(), 'pending_review', 'draft')
            """,
            (
                export_id,
                f"Manual {payload.reportKind} export generated from the reports workspace.",
            ),
        )
        scope = resolve_portfolio_scope(
            conn,
            organisation or payload.organisationId,
            owner or payload.ownerId,
            account or payload.accountId,
            viewer_context["displayName"],
        )
        record_activity_event(
            conn,
            source_domain="reports",
            event_type="report_export_generated",
            entity_type="report_export",
            entity_id=export_id,
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
            actor_name=viewer_context["displayName"],
            title=f"{scope['title']} {payload.reportKind.replace('_', ' ')} generated",
            summary="A reporting export was generated from the current scoped monitoring state.",
            before_state={"exportStatus": "draft"},
            after_state={"exportStatus": "generated", "reportKind": payload.reportKind},
            deep_link="/reports",
        )
        conn.commit()

    return {"id": export_id}


@app.post("/api/report-schedules/run-due")
def run_report_schedules(
    payload: ReportScheduleRunRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.triggeredBy)
        ensure_permission(
            conn,
            viewer_context,
            "generate_reports",
            title="Scheduled report generation denied",
            summary="The selected viewer attempted to run due schedules without report generation permission.",
            deep_link="/reports",
        )
        export_ids = run_due_report_schedules(conn, viewer_context["displayName"])
        conn.commit()
    return {"generatedIds": export_ids}


@app.post("/api/report-exports/{export_id}/review")
def review_report_export(
    export_id: int, payload: ReportExportWorkflowRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.actorName)
        ensure_permission(
            conn,
            viewer_context,
            "review_reports",
            title="Report review denied",
            summary="The selected viewer attempted to review a report without review permission.",
            deep_link="/reports",
        )
        export_row = conn.execute(
            """
            SELECT *
            FROM report_exports
            WHERE id = %s
            FOR UPDATE
            """,
            (export_id,),
        ).fetchone()
        if not export_row:
            raise HTTPException(status_code=404, detail="Report export not found")
        if not viewer_can_see_scoped_item(
            viewer_context,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
        ):
            ensure_visible_scoped_item(
                conn,
                viewer_context,
                deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
                organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
                owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
                account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
                deep_link="/reports",
                title="Report review scope denied",
                summary="The selected viewer is not entitled to the report scope being reviewed.",
            )

        conn.execute(
            """
            UPDATE report_exports
            SET review_status = 'reviewed',
                reviewed_by = %s,
                reviewed_at = NOW()
            WHERE id = %s
            """,
            (viewer_context["displayName"], export_id),
        )
        if export_row["report_schedule_id"]:
            conn.execute(
                """
                UPDATE report_generation_runs
                SET review_status = 'reviewed'
                WHERE report_export_id = %s
                """,
                (export_id,),
            )
        record_activity_event(
            conn,
            source_domain="reports",
            event_type="report_reviewed",
            entity_type="report_export",
            entity_id=export_id,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
            actor_name=viewer_context["displayName"],
            title=f"{export_row['title']} reviewed",
            summary=payload.note or "The export was reviewed and is ready for approval.",
            before_state={"reviewStatus": export_row["review_status"]},
            after_state={"reviewStatus": "reviewed"},
            deep_link="/reports",
        )
        conn.commit()
    return {"ok": True}


@app.post("/api/report-exports/{export_id}/approve")
def approve_report_export(
    export_id: int, payload: ReportExportWorkflowRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.actorName)
        ensure_permission(
            conn,
            viewer_context,
            "approve_reports",
            title="Report approval denied",
            summary="The selected viewer attempted to approve a report without approval permission.",
            deep_link="/reports",
        )
        export_row = conn.execute(
            """
            SELECT *
            FROM report_exports
            WHERE id = %s
            FOR UPDATE
            """,
            (export_id,),
        ).fetchone()
        if not export_row:
            raise HTTPException(status_code=404, detail="Report export not found")
        if not viewer_can_see_scoped_item(
            viewer_context,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
        ):
            ensure_visible_scoped_item(
                conn,
                viewer_context,
                deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
                organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
                owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
                account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
                deep_link="/reports",
                title="Report approval scope denied",
                summary="The selected viewer is not entitled to the report scope being approved.",
            )

        conn.execute(
            """
            UPDATE report_exports
            SET review_status = 'approved',
                approved_by = %s,
                approved_at = NOW()
            WHERE id = %s
            """,
            (viewer_context["displayName"], export_id),
        )
        if export_row["report_schedule_id"]:
            conn.execute(
                """
                UPDATE report_generation_runs
                SET review_status = 'approved'
                WHERE report_export_id = %s
                """,
                (export_id,),
            )
        record_activity_event(
            conn,
            source_domain="reports",
            event_type="report_approved",
            entity_type="report_export",
            entity_id=export_id,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
            actor_name=viewer_context["displayName"],
            title=f"{export_row['title']} approved",
            summary=payload.note or "The export was approved for release.",
            before_state={"reviewStatus": export_row["review_status"]},
            after_state={"reviewStatus": "approved"},
            deep_link="/reports",
        )
        conn.commit()
    return {"ok": True}


@app.post("/api/report-exports/{export_id}/release")
def release_report(
    export_id: int, payload: ReportExportWorkflowRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.actorName)
        ensure_permission(
            conn,
            viewer_context,
            "release_reports",
            title="Report release denied",
            summary="The selected viewer attempted to release a report without release permission.",
            deep_link="/reports",
        )
        export_row = conn.execute(
            """
            SELECT *
            FROM report_exports
            WHERE id = %s
            """,
            (export_id,),
        ).fetchone()
        if not export_row:
            raise HTTPException(status_code=404, detail="Report export not found")
        if not viewer_can_see_scoped_item(
            viewer_context,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
        ):
            ensure_visible_scoped_item(
                conn,
                viewer_context,
                deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
                organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
                owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
                account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
                deep_link="/reports",
                title="Report release scope denied",
                summary="The selected viewer is not entitled to the report scope being released.",
            )

        release_report_export(conn, export_id, viewer_context["displayName"])
        record_activity_event(
            conn,
            source_domain="reports",
            event_type="report_released",
            entity_type="report_export",
            entity_id=export_id,
            deal_id=int(export_row["deal_id"]) if export_row["deal_id"] else None,
            organisation_id=int(export_row["organisation_id"]) if export_row["organisation_id"] else None,
            owner_id=int(export_row["owner_id"]) if export_row["owner_id"] else None,
            account_id=int(export_row["account_id"]) if export_row["account_id"] else None,
            actor_name=viewer_context["displayName"],
            title=f"{export_row['title']} released",
            summary=payload.note or "The approved export was released to configured recipients.",
            before_state={"releaseStatus": export_row["release_status"]},
            after_state={"releaseStatus": "released"},
            deep_link="/reports",
        )
        conn.commit()
    return {"ok": True}


@app.get("/api/deals/{slug}/reports")
def get_deal_reports(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_reports",
            title="Deal reports access denied",
            summary="The selected viewer attempted to open deal reports without report access.",
            deep_link=f"/deals/{slug}/reports",
        )
        deal = conn.execute(
            "SELECT id, slug, name, grade FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/reports",
        )

        exports = load_report_exports(conn, deal_id=int(deal["id"]))
        schedules = load_report_schedules(conn, deal_id=int(deal["id"]))
        runs = load_report_generation_runs(conn, deal_id=int(deal["id"]))
        deliveries = load_report_delivery_logs(conn, deal_id=int(deal["id"]))
        exceptions = load_report_delivery_exceptions(conn, deal_id=int(deal["id"]))

    return {
        "viewer": serialize_viewer(viewer_context),
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["grade"],
        "exports": exports,
        "schedules": schedules,
        "generationRuns": runs,
        "deliveryLogs": deliveries,
        "deliveryExceptions": exceptions,
    }


@app.post("/api/deals/{slug}/reports")
def create_deal_report_export(
    slug: str, payload: ReportExportCreateRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "generate_reports",
            title="Deal report generation denied",
            summary="The selected viewer attempted to generate a deal report without report generation permission.",
            deep_link=f"/deals/{slug}/reports",
        )
        deal_check = conn.execute(
            "SELECT id FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()
        if not deal_check:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal_check["id"]),
            deep_link=f"/deals/{slug}/reports",
        )
        export_id = generate_deal_report_export(
            conn,
            slug,
            payload.reportKind,
            viewer_context["displayName"],
            report_schedule_id=None,
        )
        conn.execute(
            """
            INSERT INTO report_generation_runs (
              report_schedule_id,
              report_export_id,
              run_status,
              trigger_mode,
              trigger_summary,
              started_at,
              completed_at,
              review_status,
              release_status
            ) VALUES (NULL, %s, 'completed', 'manual', %s, NOW(), NOW(), 'pending_review', 'draft')
            """,
            (
                export_id,
                f"Manual {payload.reportKind} export generated from the deal workspace.",
            ),
        )
        deal = conn.execute(
            "SELECT id, slug, name FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()
        record_activity_event(
            conn,
            source_domain="reports",
            event_type="report_export_generated",
            entity_type="report_export",
            entity_id=export_id,
            deal_id=int(deal["id"]),
            actor_name=payload.generatedBy,
            title=f"{deal['name']} {payload.reportKind.replace('_', ' ')} generated",
            summary="A deal-level reporting export was generated from the current monitored state.",
            before_state={"exportStatus": "draft"},
            after_state={"exportStatus": "generated", "reportKind": payload.reportKind},
            deep_link=f"/deals/{deal['slug']}/reports",
        )
        conn.commit()

    return {"id": export_id}


@app.post("/api/portfolio/packs")
def create_portfolio_pack(
    payload: MemoPackCreateRequest,
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
):
    if payload.packKind != "watchlist_committee":
        raise HTTPException(status_code=400, detail="Unsupported portfolio pack kind")

    with get_connection() as conn:
        pack_id = generate_portfolio_memo_pack(
            conn,
            payload.generatedBy,
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
        )
        record_activity_event(
            conn,
            source_domain="memo_packs",
            event_type="portfolio_pack_generated",
            entity_type="memo_pack",
            entity_id=pack_id,
            actor_name=payload.generatedBy,
            title="Portfolio watchlist committee pack generated",
            summary="A portfolio watchlist committee pack was generated from the current platform scope.",
            organisation_id=organisation or payload.organisationId,
            owner_id=owner or payload.ownerId,
            account_id=account or payload.accountId,
            before_state={"packStatus": "draft"},
            after_state={"packStatus": "generated", "packKind": payload.packKind},
            deep_link="/portfolio/packs",
        )
        conn.commit()

    return {"id": pack_id}


@app.get("/api/deals/{slug}/assessment")
def get_deal_assessment(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Deal assessment access denied",
            summary="The selected viewer attempted to open a deal assessment without deal access.",
            deep_link=f"/deals/{slug}/assessment",
        )
        deal = conn.execute(
            """
            SELECT
              d.id,
              d.slug,
              d.name,
              d.borrower,
              d.grade,
              d.watchlist,
              d.status,
              d.revenue_risk,
              go.id AS active_override_id,
              go.previous_grade,
              go.override_grade,
              go.override_status,
              go.rationale AS override_rationale,
              go.owner_name AS override_owner_name,
              go.expires_on AS override_expires_on,
              go.decided_at AS override_decided_at,
              go.impact_summary AS override_impact_summary
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT *
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/assessment",
        )

        assessment = conn.execute(
            """
            SELECT
              a.*,
              fp.period_key,
              fp.period_label,
              fp.period_end
            FROM deal_assessments a
            JOIN financial_periods fp ON fp.id = a.financial_period_id
            WHERE a.deal_id = %s
            ORDER BY a.assessment_date DESC, a.id DESC
            LIMIT 1
            """,
            (deal["id"],),
        ).fetchone()

        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        trend_rows = conn.execute(
            """
            SELECT
              id,
              metric_key,
              metric_label,
              trend_type,
              direction,
              periods_observed,
              severity,
              total_change_pct,
              status,
              summary
            FROM trend_records
            WHERE deal_id = %s AND financial_period_id = %s
            ORDER BY
              CASE severity
                WHEN 'alert' THEN 0
                WHEN 'concern' THEN 1
                WHEN 'watch' THEN 2
                ELSE 3
              END,
              periods_observed DESC,
              id
            """,
            (deal["id"], assessment["financial_period_id"]),
        ).fetchall()

        watchlist_rows = conn.execute(
            """
            SELECT
              id,
              status_from,
              status_to,
              recommendation,
              escalation_level,
              owner_name,
              rationale,
              decided_at,
              next_review_date::text
            FROM watchlist_events
            WHERE deal_id = %s
            ORDER BY decided_at DESC, id DESC
            """,
            (deal["id"],),
        ).fetchall()

        grade_override_rows = conn.execute(
            """
            SELECT id, previous_grade, override_grade, override_status, rationale,
                   owner_name, expires_on, decided_at, impact_summary
            FROM grade_overrides
            WHERE deal_id = %s
            ORDER BY decided_at DESC, id DESC
            """,
            (deal["id"],),
        ).fetchall()

        forecast_context = build_forecast_summary(
            conn, int(deal["id"]), assessment["period_key"]
        )

    component_weights = {
        "covenant": 0.4,
        "variance": 0.2,
        "trend": 0.2,
        "compliance": 0.2,
    }
    component_scores = {
        "covenant": int(assessment["covenant_score"]),
        "variance": int(assessment["variance_score"]),
        "trend": int(assessment["trend_score"]),
        "compliance": int(assessment["compliance_score"]),
    }
    component_labels = {
        "covenant": "Covenant",
        "variance": "Variance",
        "trend": "Trend",
        "compliance": "Compliance",
    }
    component_summaries = {
        "covenant": "Threshold headroom and covenant posture remain the anchor of the deal score.",
        "variance": "Latest period variances determine whether operating performance is tracking to plan.",
        "trend": "Multi-period direction captures persistent deterioration or recovery beyond one quarter.",
        "compliance": "Document timeliness and fulfilment discipline determine operational reliability.",
    }

    components = [
        {
            "key": key,
            "label": component_labels[key],
            "score": score,
            "weight": component_weights[key],
            "weightedPoints": round(score * component_weights[key], 2),
            "status": assessment_component_status(score),
            "summary": component_summaries[key],
        }
        for key, score in component_scores.items()
    ]

    active_trends = sorted(
        [
            {
                "id": int(row["id"]),
                "metricKey": row["metric_key"],
                "metricLabel": row["metric_label"],
                "trendType": row["trend_type"],
                "direction": row["direction"],
                "periodsObserved": int(row["periods_observed"]),
                "severity": row["severity"],
                "totalChangePct": as_number(row["total_change_pct"]),
                "status": row["status"],
                "summary": row["summary"],
            }
            for row in trend_rows
        ],
        key=lambda item: (trend_severity_rank(item["severity"]), -item["periodsObserved"]),
    )

    active_override = (
        {
            "id": int(deal["active_override_id"]),
            "previous_grade": deal["previous_grade"],
            "override_grade": deal["override_grade"],
            "override_status": deal["override_status"],
            "rationale": deal["override_rationale"],
            "owner_name": deal["override_owner_name"],
            "expires_on": deal["override_expires_on"],
            "decided_at": deal["override_decided_at"],
            "impact_summary": deal["override_impact_summary"],
        }
        if deal["active_override_id"]
        else None
    )

    return {
        "viewer": serialize_viewer(viewer_context),
        "dealName": deal["name"],
        "dealSlug": deal["slug"],
        "borrower": deal["borrower"],
        "dealGrade": deal["grade"],
        "effectiveGrade": deal["override_grade"] or deal["grade"],
        "dealStatus": deal["status"],
        "watchlist": deal["watchlist"],
        "revenueRisk": deal["revenue_risk"],
        "assessment": {
            "assessmentDate": assessment["assessment_date"].isoformat(),
            "periodKey": assessment["period_key"],
            "periodLabel": assessment["period_label"],
            "periodEnd": assessment["period_end"].isoformat(),
            "grade": assessment["grade"],
            "overallScore": as_number(assessment["overall_score"]),
            "watchlistStatus": assessment["watchlist_status"],
            "watchlistRecommendation": assessment["watchlist_recommendation"],
            "escalationLevel": assessment["escalation_level"],
            "summary": assessment["summary"],
            "components": components,
        },
        "activeGradeOverride": serialize_grade_override(active_override),
        "gradeOverrideHistory": [
            serialize_grade_override(row) for row in grade_override_rows
        ],
        "activeTrends": active_trends,
        "forecastContext": forecast_context,
        "watchlistHistory": [
            {
                "id": int(row["id"]),
                "statusFrom": row["status_from"],
                "statusTo": row["status_to"],
                "recommendation": row["recommendation"],
                "escalationLevel": row["escalation_level"],
                "ownerName": row["owner_name"],
                "rationale": row["rationale"],
                "decidedAt": row["decided_at"].isoformat(),
                "nextReviewDate": row["next_review_date"],
            }
            for row in watchlist_rows
        ],
    }


@app.get("/api/deals")
def get_deals():
    with get_connection() as conn:
        deals = conn.execute(
            """
            SELECT
              d.slug,
              d.name,
              d.summary,
              COALESCE(go.override_grade, d.grade) AS effective_grade,
              d.exposure,
              d.watchlist
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            ORDER BY d.exposure DESC
            """
        ).fetchall()

    return [
        {
            "slug": row["slug"],
            "name": row["name"],
            "summary": row["summary"],
            "grade": row["effective_grade"],
            "exposure": int(row["exposure"]),
            "watchlist": row["watchlist"],
        }
        for row in deals
    ]


@app.get("/api/deals/{slug}")
def get_deal(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Deal access denied",
            summary="The selected viewer attempted to open a deal workspace without deal access.",
            deep_link=f"/deals/{slug}",
        )
        deal = conn.execute(
            """
            SELECT
              d.*,
              go.id AS grade_override_id,
              go.previous_grade,
              go.override_grade,
              go.override_status,
              go.rationale AS override_rationale,
              go.owner_name AS override_owner_name,
              go.expires_on AS override_expires_on,
              go.decided_at AS override_decided_at,
              go.impact_summary AS override_impact_summary
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT *
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}",
        )

        covenant = conn.execute(
            "SELECT * FROM covenants WHERE deal_id = %s", (deal["id"],)
        ).fetchone()

        history = conn.execute(
            """
            SELECT period_label, dscr, expected_dscr
            FROM covenant_history
            WHERE covenant_id = %s
            ORDER BY id
            """,
            (covenant["id"],),
        ).fetchall()

        obligations = conn.execute(
            """
            SELECT id, code, title, due_date::text, status, days_overdue, grace_days, phase
            FROM obligations
            WHERE deal_id = %s
            ORDER BY due_date
            """,
            (deal["id"],),
        ).fetchall()

        documents = conn.execute(
            """
            SELECT id, document_type, document_name, period_label, status, received_at, evidence_page, snippet
            FROM documents
            WHERE deal_id = %s
            ORDER BY received_at DESC
            """,
            (deal["id"],),
        ).fetchall()

        distribution = conn.execute(
            """
            SELECT
              da.*,
              fp.period_key,
              fp.period_label,
              fp.period_end
            FROM distribution_assessments da
            JOIN financial_periods fp ON fp.id = da.financial_period_id
            WHERE da.deal_id = %s
            ORDER BY da.assessed_at DESC, da.id DESC
            LIMIT 1
            """,
            (deal["id"],),
        ).fetchone()

        risk_rows = conn.execute(
            """
            SELECT
              r.*,
              doc.document_name AS source_document_name,
              doc.document_type AS source_document_type
            FROM risk_register_entries r
            LEFT JOIN documents doc ON doc.id = r.source_document_id
            WHERE r.deal_id = %s
            ORDER BY
              CASE r.severity
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              r.next_review_date,
              r.id
            """,
            (deal["id"],),
        ).fetchall()

        borrower_request_rows = conn.execute(
            """
            SELECT *
            FROM borrower_requests
            WHERE deal_id = %s
            ORDER BY
              CASE priority
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              due_date,
              id
            """,
            (deal["id"],),
        ).fetchall()

        request_vote_rows = conn.execute(
            """
            SELECT
              brv.id,
              brv.borrower_request_id,
              brv.account_id,
              a.name AS account_name,
              brv.vote_status,
              brv.voter_name,
              brv.rationale,
              brv.decided_at
            FROM borrower_request_votes brv
            JOIN accounts a ON a.id = brv.account_id
            JOIN borrower_requests br ON br.id = brv.borrower_request_id
            WHERE br.deal_id = %s
            ORDER BY brv.decided_at DESC, brv.id DESC
            """,
            (deal["id"],),
        ).fetchall()

        request_decision_rows = conn.execute(
            """
            SELECT
              brd.*
            FROM borrower_request_decisions brd
            JOIN borrower_requests br ON br.id = brd.borrower_request_id
            WHERE br.deal_id = %s
            ORDER BY brd.decided_at DESC, brd.id DESC
            """,
            (deal["id"],),
        ).fetchall()

        snapshot_rows = conn.execute(
            """
            SELECT id, financial_period_id, snapshot_label, snapshot_type, captured_at,
                   captured_by, summary, snapshot_data, payload_hash, trigger_event_id,
                   prior_snapshot_id
            FROM deal_topsheet_snapshots
            WHERE deal_id = %s
            ORDER BY captured_at DESC, id DESC
            LIMIT 6
            """,
            (deal["id"],),
        ).fetchall()

        amendment_history = load_deal_amendments(conn, int(deal["id"]))
        memo_packs = load_memo_packs(conn, deal_id=int(deal["id"]))
        latest_period_row = conn.execute(
            """
            SELECT period_key
            FROM financial_periods
            WHERE deal_id = %s
            ORDER BY period_end DESC, id DESC
            LIMIT 1
            """,
            (deal["id"],),
        ).fetchone()
        forecast_summary = (
            build_forecast_summary(conn, int(deal["id"]), latest_period_row["period_key"])
            if latest_period_row
            else None
        )

        active_override = (
            {
                "id": int(deal["grade_override_id"]),
                "previous_grade": deal["previous_grade"],
                "override_grade": deal["override_grade"],
                "override_status": deal["override_status"],
                "rationale": deal["override_rationale"],
                "owner_name": deal["override_owner_name"],
                "expires_on": deal["override_expires_on"],
                "decided_at": deal["override_decided_at"],
                "impact_summary": deal["override_impact_summary"],
            }
            if deal["grade_override_id"]
            else None
        )

    return {
        "viewer": serialize_viewer(viewer_context),
        "slug": deal["slug"],
        "name": deal["name"],
        "borrower": deal["borrower"],
        "sector": deal["sector"],
        "dealType": deal["deal_type"],
        "region": deal["region"],
        "currency": deal["currency"],
        "facilityAmount": int(deal["facility_amount"]),
        "exposure": int(deal["exposure"]),
        "grade": deal["override_grade"] or deal["grade"],
        "baseGrade": deal["grade"],
        "watchlist": deal["watchlist"],
        "status": deal["status"],
        "revenueRisk": deal["revenue_risk"],
        "summary": deal["summary"],
        "phase": deal["phase"],
        "dealOverview": deal["deal_overview"],
        "latestPeriodLabel": deal["latest_period_label"],
        "latestPeriodEnd": deal["latest_period_end"].isoformat(),
        "latestReportedAt": deal["latest_reported_at"].isoformat(),
        "nextTestDate": deal["next_test_date"].isoformat(),
        "metrics": deal["metrics"],
        "activeGradeOverride": serialize_grade_override(active_override),
        "distributionAssessment": serialize_distribution_assessment(distribution),
        "riskSnapshot": {
            "openCount": sum(1 for row in risk_rows if row["status"] != "resolved"),
            "highSeverityCount": sum(1 for row in risk_rows if row["severity"] == "high"),
            "nextReviewDate": min(
                (row["next_review_date"].isoformat() for row in risk_rows if row["status"] != "resolved"),
                default=None,
            ),
            "entries": [serialize_risk_entry(row) for row in risk_rows],
        },
        "borrowerRequests": [
            serialize_borrower_request(
                row,
                [
                    vote
                    for vote in request_vote_rows
                    if int(vote["borrower_request_id"]) == int(row["id"])
                ],
                [
                    decision
                    for decision in request_decision_rows
                    if int(decision["borrower_request_id"]) == int(row["id"])
                ],
            )
            for row in borrower_request_rows
        ],
        "amendmentHistory": amendment_history,
        "memoPacks": memo_packs,
        "forecastSummary": forecast_summary,
        "snapshotHistory": [serialize_topsheet_snapshot(row) for row in snapshot_rows],
        "covenant": {
            "id": covenant["id"],
            "code": covenant["code"],
            "name": covenant["name"],
            "compositionTag": covenant["composition_tag"],
            "currentValue": as_number(covenant["current_value"]),
            "thresholdLockup": as_number(covenant["threshold_lockup"]),
            "thresholdTrigger": as_number(covenant["threshold_trigger"]),
            "headroomPct": as_number(covenant["headroom_pct"]),
            "status": covenant["status"],
            "rationale": covenant["rationale"],
            "numeratorLabel": covenant["numerator_label"],
            "numeratorValue": int(covenant["numerator_value"]),
            "denominatorLabel": covenant["denominator_label"],
            "denominatorValue": int(covenant["denominator_value"]),
            "evidencePage": covenant["evidence_page"],
            "evidenceSnippet": covenant["evidence_snippet"],
        },
        "history": [
            {
                "periodLabel": row["period_label"],
                "dscr": as_number(row["dscr"]),
                "expectedDscr": as_number(row["expected_dscr"]),
            }
            for row in history
        ],
        "obligations": [
            {
                "id": str(row["id"]),
                "code": row["code"],
                "title": row["title"],
                "dueDate": row["due_date"],
                "status": row["status"],
                "daysOverdue": int(row["days_overdue"]),
                "graceDays": int(row["grace_days"]),
                "phase": row["phase"],
            }
            for row in obligations
        ],
        "documents": [
            {
                "id": str(row["id"]),
                "documentType": row["document_type"],
                "documentName": row["document_name"],
                "periodLabel": row["period_label"],
                "status": row["status"],
                "receivedAt": row["received_at"].isoformat(),
                "evidencePage": row["evidence_page"],
                "snippet": row["snippet"],
            }
            for row in documents
        ],
    }


@app.get("/api/deals/{slug}/packs")
def get_deal_packs(slug: str):
    with get_connection() as conn:
        deal = conn.execute(
            """
            SELECT d.id, d.slug, d.name, COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        packs = load_memo_packs(conn, deal_id=int(deal["id"]))

    return {
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["effective_grade"],
        "packs": packs,
    }


@app.post("/api/deals/{slug}/packs")
def create_deal_pack(slug: str, payload: MemoPackCreateRequest):
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id, slug, name FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        pack_id = generate_deal_memo_pack(
            conn,
            slug,
            payload.packKind,
            payload.generatedBy,
            borrower_request_id=payload.borrowerRequestId,
        )
        record_activity_event(
            conn,
            source_domain="memo_packs",
            event_type="deal_pack_generated",
            entity_type="memo_pack",
            entity_id=pack_id,
            deal_id=int(deal["id"]),
            actor_name=payload.generatedBy,
            title=f"{deal['name']} memo pack generated",
            summary=(
                "A deal committee pack was generated from the live monitoring state."
                if payload.packKind == "deal_committee"
                else "A borrower request decision pack was generated from the current request state."
            ),
            before_state={"packStatus": "draft"},
            after_state={"packStatus": "generated", "packKind": payload.packKind},
            deep_link=f"/deals/{deal['slug']}/packs",
        )
        conn.commit()

    return {"id": pack_id}


@app.get("/api/deals/{slug}/risk")
def get_deal_risk(slug: str):
    with get_connection() as conn:
        deal = conn.execute(
            """
            SELECT d.id, d.slug, d.name, COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        risk_rows = conn.execute(
            """
            SELECT
              r.*,
              doc.document_name AS source_document_name,
              doc.document_type AS source_document_type
            FROM risk_register_entries r
            LEFT JOIN documents doc ON doc.id = r.source_document_id
            WHERE r.deal_id = %s
            ORDER BY
              CASE r.severity
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              r.next_review_date,
              r.id
            """,
            (deal["id"],),
        ).fetchall()

    open_rows = [row for row in risk_rows if row["status"] != "resolved"]
    return {
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["effective_grade"],
        "summary": {
            "totalRisks": len(risk_rows),
            "openRisks": len(open_rows),
            "highSeverityRisks": sum(1 for row in open_rows if row["severity"] == "high"),
            "nextReviewDate": min(
                (row["next_review_date"].isoformat() for row in open_rows),
                default=None,
            ),
        },
        "entries": [serialize_risk_entry(row) for row in risk_rows],
    }


@app.get("/api/deals/{slug}/requests")
def get_deal_borrower_requests(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Borrower request access denied",
            summary="The selected viewer attempted to open borrower requests without deal access.",
            deep_link=f"/deals/{slug}/requests",
        )
        deal = conn.execute(
            """
            SELECT d.id, d.slug, d.name, COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/requests",
        )

        request_rows = conn.execute(
            """
            SELECT *
            FROM borrower_requests
            WHERE deal_id = %s
            ORDER BY
              CASE priority
                WHEN 'high' THEN 0
                WHEN 'medium' THEN 1
                ELSE 2
              END,
              due_date,
              id
            """,
            (deal["id"],),
        ).fetchall()

        vote_rows = conn.execute(
            """
            SELECT
              brv.id,
              brv.borrower_request_id,
              brv.account_id,
              a.name AS account_name,
              brv.vote_status,
              brv.voter_name,
              brv.rationale,
              brv.decided_at
            FROM borrower_request_votes brv
            JOIN accounts a ON a.id = brv.account_id
            JOIN borrower_requests br ON br.id = brv.borrower_request_id
            WHERE br.deal_id = %s
            ORDER BY brv.decided_at DESC, brv.id DESC
            """,
            (deal["id"],),
        ).fetchall()

        decision_rows = conn.execute(
            """
            SELECT brd.*
            FROM borrower_request_decisions brd
            JOIN borrower_requests br ON br.id = brd.borrower_request_id
            WHERE br.deal_id = %s
            ORDER BY brd.decided_at DESC, brd.id DESC
            """,
            (deal["id"],),
        ).fetchall()

    requests = [
        serialize_borrower_request(
            row,
            [vote for vote in vote_rows if int(vote["borrower_request_id"]) == int(row["id"])],
            [
                decision
                for decision in decision_rows
                if int(decision["borrower_request_id"]) == int(row["id"])
            ],
        )
        for row in request_rows
    ]

    return {
        "viewer": serialize_viewer(viewer_context),
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["effective_grade"],
        "summary": {
            "openRequests": sum(
                1
                for item in requests
                if item["requestStatus"] not in ("closed", "declined")
            ),
            "highPriorityRequests": sum(
                1
                for item in requests
                if item["priority"] == "high"
                and item["requestStatus"] not in ("closed", "declined")
            ),
            "requestsWithOpposition": sum(
                1 for item in requests if item["voteSummary"]["oppose"] > 0
            ),
        },
        "requests": requests,
    }


@app.get("/api/deals/{slug}/amendments")
def get_deal_amendments(slug: str):
    with get_connection() as conn:
        deal = conn.execute(
            """
            SELECT d.id, d.slug, d.name, COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        amendments = load_deal_amendments(conn, int(deal["id"]))

    return {
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["effective_grade"],
        "summary": {
            "totalAmendments": len(amendments),
            "activeAmendments": sum(
                1 for item in amendments if item["amendmentStatus"] == "active"
            ),
            "activeRuleVersions": sum(
                1
                for item in amendments
                for version in item["ruleVersions"]
                if version["isActive"]
            ),
            "recomputedObjects": sum(
                len(item["changeImpacts"]) for item in amendments
            ),
            "latestEffectiveDate": max(
                (item["effectiveFrom"] for item in amendments),
                default=None,
            ),
        },
        "amendments": amendments,
    }


@app.get("/api/deals/{slug}/forecasts")
def get_deal_forecasts(slug: str):
    with get_connection() as conn:
        deal = conn.execute(
            """
            SELECT d.id, d.slug, d.name, COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        latest_period = conn.execute(
            """
            SELECT period_key
            FROM financial_periods
            WHERE deal_id = %s
            ORDER BY period_end DESC, id DESC
            LIMIT 1
            """,
            (deal["id"],),
        ).fetchone()
        summary = (
            build_forecast_summary(conn, int(deal["id"]), latest_period["period_key"])
            if latest_period
            else None
        )
        cases = load_forecast_cases(conn, int(deal["id"]))

    return {
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["effective_grade"],
        "summary": summary,
        "cases": cases,
    }


@app.post("/api/forecast-case-versions/{version_id}/activate")
def activate_forecast_version(version_id: int, payload: ForecastVersionActivateRequest):
    with get_connection() as conn:
        version = conn.execute(
            """
            SELECT
              v.*,
              c.deal_id,
              c.case_name,
              c.case_type,
              c.drives_monitoring,
              c.summary AS case_summary
            FROM forecast_case_versions v
            JOIN forecast_cases c ON c.id = v.forecast_case_id
            WHERE v.id = %s
            """,
            (version_id,),
        ).fetchone()

        if not version:
            raise HTTPException(status_code=404, detail="Forecast version not found")

        conn.execute(
            """
            UPDATE forecast_case_versions
            SET is_active = FALSE,
                version_status = CASE
                  WHEN version_status = 'draft' THEN version_status
                  ELSE 'superseded'
                END
            WHERE forecast_case_id = %s
              AND id <> %s
            """,
            (int(version["forecast_case_id"]), version_id),
        )
        conn.execute(
            """
            UPDATE forecast_case_versions
            SET is_active = TRUE,
                version_status = 'active',
                activated_at = NOW()
            WHERE id = %s
            """,
            (version_id,),
        )

        refresh_impacts = []
        if version["drives_monitoring"]:
            refresh_impacts = recompute_monitoring_case(conn, int(version["deal_id"]), version, version)
            for impact in refresh_impacts:
                conn.execute(
                    """
                    INSERT INTO forecast_refresh_impacts (
                      deal_id,
                      forecast_case_id,
                      forecast_case_version_id,
                      impact_type,
                      target_entity_type,
                      target_entity_id,
                      impact_summary,
                      before_state,
                      after_state,
                      refreshed_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, NOW())
                    """,
                    (
                        int(version["deal_id"]),
                        int(version["forecast_case_id"]),
                        version_id,
                        impact["impact_type"],
                        impact["target_entity_type"],
                        impact["target_entity_id"],
                        impact["impact_summary"],
                        json.dumps(impact["before_state"]),
                        json.dumps(impact["after_state"]),
                    ),
                )
        else:
            conn.execute(
                """
                INSERT INTO forecast_refresh_impacts (
                  deal_id,
                  forecast_case_id,
                  forecast_case_version_id,
                  impact_type,
                  target_entity_type,
                  target_entity_id,
                  impact_summary,
                  before_state,
                  after_state,
                  refreshed_at
                ) VALUES (%s, %s, %s, 'scenario_activation', 'forecast_case_version', %s, %s, %s::jsonb, %s::jsonb, NOW())
                """,
                (
                    int(version["deal_id"]),
                    int(version["forecast_case_id"]),
                    version_id,
                    version_id,
                    f"{version['case_name']} ({version['version_label']}) was activated for scenario comparison.",
                    json.dumps({"isActive": False, "versionStatus": version["version_status"]}),
                    json.dumps({"isActive": True, "versionStatus": "active"}),
                ),
            )

        deal = conn.execute(
            "SELECT slug, name FROM deals WHERE id = %s",
            (int(version["deal_id"]),),
        ).fetchone()
        record_activity_event(
            conn,
            source_domain="forecasts",
            event_type="forecast_version_activated",
            entity_type="forecast_case_version",
            entity_id=version_id,
            deal_id=int(version["deal_id"]),
            actor_name=payload.activatedBy,
            title=f"{version['case_name']} {version['version_label']} activated",
            summary=f"{version['case_name']} ({version['version_label']}) became the active forecast version for scenario comparison.",
            before_state={
                "isActive": False,
                "versionStatus": version["version_status"],
                "refreshImpactCount": 0,
            },
            after_state={
                "isActive": True,
                "versionStatus": "active",
                "refreshImpactCount": len(refresh_impacts),
            },
            deep_link=f"/deals/{deal['slug']}/forecasts",
            created_at=datetime.now(timezone.utc),
        )
        conn.commit()

    return {"id": version_id}


@app.post("/api/borrower-requests/{request_id}/decide")
def decide_borrower_request(
    request_id: int, payload: BorrowerRequestDecisionRequest, viewer: str | None = None
):
    status_to_distribution = {
        "approved": "allowed",
        "approved_with_conditions": "review_required",
        "declined": "blocked",
    }
    status_to_lockup = {
        "approved": "clear",
        "approved_with_conditions": "near_lock_up",
        "declined": "lock_up",
    }
    status_to_risk = {
        "approved": "monitoring",
        "approved_with_conditions": "monitoring",
        "declined": "open",
    }
    status_to_outcome = {
        "approved": "approved_change",
        "approved_with_conditions": "temporary_waiver",
        "declined": "decline",
    }
    request_type_to_amendment = {
        "waiver_request": "waiver",
        "consent_request": "consent",
    }
    amendment_status_map = {
        "approved": "active",
        "approved_with_conditions": "active",
        "declined": "declined",
    }

    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.decidedBy)
        ensure_permission(
            conn,
            viewer_context,
            "decide_requests",
            title="Borrower request decision denied",
            summary="The selected viewer attempted to record a borrower request decision without decision permission.",
            deep_link="/requests",
        )
        request_row = conn.execute(
            """
            SELECT br.*, d.id AS deal_id,
                   go.id AS active_grade_override_id
            FROM borrower_requests br
            JOIN deals d ON d.id = br.deal_id
            LEFT JOIN LATERAL (
              SELECT id
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE br.id = %s
            """,
            (request_id,),
        ).fetchone()

        if not request_row:
            raise HTTPException(status_code=404, detail="Borrower request not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(request_row["deal_id"]),
            deep_link="/requests",
        )

        effective_from = datetime.fromisoformat(payload.effectiveFrom).date()
        expires_on = (
            datetime.fromisoformat(payload.expiresOn).date()
            if payload.expiresOn
            else None
        )
        prior_version_end = effective_from - timedelta(days=1)

        snapshot_before = build_snapshot_payload(conn, int(request_row["deal_id"]))

        distribution_before = None
        if request_row["related_distribution_assessment_id"]:
            distribution_before = conn.execute(
                """
                SELECT id, distribution_status, lockup_state, blocker_count,
                       distribution_capacity, cash_trap_amount, summary, rationale
                FROM distribution_assessments
                WHERE id = %s
                """,
                (request_row["related_distribution_assessment_id"],),
            ).fetchone()

        risk_before = None
        if request_row["related_risk_entry_id"]:
            risk_before = conn.execute(
                """
                SELECT id, status, mitigant, next_review_date
                FROM risk_register_entries
                WHERE id = %s
                """,
                (request_row["related_risk_entry_id"],),
            ).fetchone()

        covenant_row = None
        if request_row["related_covenant_id"]:
            covenant_row = conn.execute(
                """
                SELECT id, code, name, threshold_lockup, threshold_trigger, status
                FROM covenants
                WHERE id = %s
                """,
                (request_row["related_covenant_id"],),
            ).fetchone()

        decision = conn.execute(
            """
            INSERT INTO borrower_request_decisions (
              borrower_request_id,
              decision_status,
              decision_summary,
              decision_rationale,
              decided_by,
              effective_from,
              expires_on,
              related_grade_override_id,
              activated_distribution_status,
              decision_outcome,
              decided_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id, decided_at
            """,
            (
                request_id,
                payload.decisionStatus,
                payload.decisionSummary,
                payload.decisionRationale,
                payload.decidedBy,
                payload.effectiveFrom,
                payload.expiresOn,
                request_row["active_grade_override_id"],
                status_to_distribution.get(payload.decisionStatus),
                status_to_outcome.get(payload.decisionStatus, payload.decisionStatus),
            ),
        ).fetchone()

        conn.execute(
            """
            UPDATE borrower_requests
            SET request_status = %s,
                decision_summary = %s
            WHERE id = %s
            """,
            (payload.decisionStatus, payload.decisionSummary, request_id),
        )

        if request_row["related_distribution_assessment_id"]:
            next_status = status_to_distribution.get(payload.decisionStatus)
            if next_status:
                next_lockup_state = status_to_lockup.get(
                    payload.decisionStatus,
                    distribution_before["lockup_state"] if distribution_before else "lock_up",
                )
                conn.execute(
                    """
                    UPDATE distribution_assessments
                    SET distribution_status = %s,
                        lockup_state = %s,
                        summary = %s,
                        rationale = %s
                    WHERE id = %s
                    """,
                    (
                        next_status,
                        next_lockup_state,
                        payload.decisionSummary,
                        payload.decisionRationale,
                        request_row["related_distribution_assessment_id"],
                    ),
                )

        if request_row["related_risk_entry_id"]:
            conn.execute(
                """
                UPDATE risk_register_entries
                SET status = %s,
                    mitigant = CASE
                      WHEN mitigant = '' THEN %s
                      ELSE mitigant || ' ' || %s
                    END
                WHERE id = %s
                """,
                (
                    status_to_risk.get(payload.decisionStatus, "monitoring"),
                    payload.decisionSummary,
                    payload.decisionSummary,
                    request_row["related_risk_entry_id"],
                ),
            )

        distribution_after = None
        if request_row["related_distribution_assessment_id"]:
            distribution_after = conn.execute(
                """
                SELECT id, distribution_status, lockup_state, blocker_count,
                       distribution_capacity, cash_trap_amount, summary, rationale
                FROM distribution_assessments
                WHERE id = %s
                """,
                (request_row["related_distribution_assessment_id"],),
            ).fetchone()

        risk_after = None
        if request_row["related_risk_entry_id"]:
            risk_after = conn.execute(
                """
                SELECT id, status, mitigant, next_review_date
                FROM risk_register_entries
                WHERE id = %s
                """,
                (request_row["related_risk_entry_id"],),
            ).fetchone()

        amendment = conn.execute(
            """
            INSERT INTO deal_amendments (
              deal_id,
              borrower_request_id,
              borrower_request_decision_id,
              amendment_type,
              amendment_status,
              title,
              summary,
              source_domain,
              effective_from,
              effective_to,
              created_by,
              created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                int(request_row["deal_id"]),
                request_id,
                int(decision["id"]),
                request_type_to_amendment.get(
                    request_row["request_type"], request_row["request_type"]
                ),
                amendment_status_map.get(payload.decisionStatus, "monitoring"),
                request_row["title"],
                payload.decisionSummary,
                "borrower_request",
                effective_from,
                expires_on,
                payload.decidedBy,
                decision["decided_at"],
            ),
        ).fetchone()

        if payload.decisionStatus in ("approved", "approved_with_conditions"):
            if distribution_before and distribution_after:
                conn.execute(
                    """
                    UPDATE amendment_rule_versions
                    SET is_active = FALSE,
                        effective_to = COALESCE(effective_to, %s)
                    WHERE deal_id = %s
                      AND target_entity_type = 'distribution_assessment'
                      AND target_entity_id = %s
                      AND is_active = TRUE
                    """,
                    (
                        prior_version_end,
                        int(request_row["deal_id"]),
                        int(request_row["related_distribution_assessment_id"]),
                    ),
                )
                distribution_before_state = {
                    "distributionStatus": distribution_before["distribution_status"],
                    "lockupState": distribution_before["lockup_state"],
                    "distributionCapacity": as_number(
                        distribution_before["distribution_capacity"]
                    ),
                    "cashTrapAmount": as_number(distribution_before["cash_trap_amount"]),
                    "summary": distribution_before["summary"],
                }
                distribution_after_state = {
                    "distributionStatus": distribution_after["distribution_status"],
                    "lockupState": distribution_after["lockup_state"],
                    "distributionCapacity": as_number(
                        distribution_after["distribution_capacity"]
                    ),
                    "cashTrapAmount": as_number(distribution_after["cash_trap_amount"]),
                    "summary": distribution_after["summary"],
                }
                conn.execute(
                    """
                    INSERT INTO amendment_rule_versions (
                      amendment_id,
                      deal_id,
                      rule_domain,
                      rule_type,
                      target_entity_type,
                      target_entity_id,
                      target_label,
                      version_label,
                      change_summary,
                      effective_from,
                      effective_to,
                      is_active,
                      previous_value,
                      updated_value
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s::jsonb, %s::jsonb)
                    """,
                    (
                        int(amendment["id"]),
                        int(request_row["deal_id"]),
                        "distribution",
                        "temporary_release_window",
                        "distribution_assessment",
                        int(request_row["related_distribution_assessment_id"]),
                        request_row["title"],
                        f"{request_row['title']} rule version",
                        payload.decisionSummary,
                        effective_from,
                        expires_on,
                        json.dumps(distribution_before_state),
                        json.dumps(distribution_after_state),
                    ),
                )

            if covenant_row:
                conn.execute(
                    """
                    UPDATE amendment_rule_versions
                    SET is_active = FALSE,
                        effective_to = COALESCE(effective_to, %s)
                    WHERE deal_id = %s
                      AND target_entity_type = 'covenant'
                      AND target_entity_id = %s
                      AND rule_type = 'distribution_gate'
                      AND is_active = TRUE
                    """,
                    (
                        prior_version_end,
                        int(request_row["deal_id"]),
                        int(request_row["related_covenant_id"]),
                    ),
                )
                covenant_before_state = {
                    "thresholdLockup": as_number(covenant_row["threshold_lockup"]),
                    "thresholdTrigger": as_number(covenant_row["threshold_trigger"]),
                    "distributionGate": "standard",
                    "requiresPmReview": False,
                }
                covenant_after_state = {
                    "thresholdLockup": as_number(covenant_row["threshold_lockup"]),
                    "thresholdTrigger": as_number(covenant_row["threshold_trigger"]),
                    "distributionGate": "temporary_waiver"
                    if payload.decisionStatus == "approved_with_conditions"
                    else "relaxed",
                    "requiresPmReview": payload.decisionStatus
                    == "approved_with_conditions",
                    "effectiveTo": payload.expiresOn,
                }
                conn.execute(
                    """
                    INSERT INTO amendment_rule_versions (
                      amendment_id,
                      deal_id,
                      rule_domain,
                      rule_type,
                      target_entity_type,
                      target_entity_id,
                      target_label,
                      version_label,
                      change_summary,
                      effective_from,
                      effective_to,
                      is_active,
                      previous_value,
                      updated_value
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s::jsonb, %s::jsonb)
                    """,
                    (
                        int(amendment["id"]),
                        int(request_row["deal_id"]),
                        "covenant",
                        "distribution_gate",
                        "covenant",
                        int(request_row["related_covenant_id"]),
                        f"{covenant_row['code']} {covenant_row['name']}",
                        f"{request_row['title']} covenant interpretation",
                        payload.decisionRationale,
                        effective_from,
                        expires_on,
                        json.dumps(covenant_before_state),
                        json.dumps(covenant_after_state),
                    ),
                )

        if distribution_before and distribution_after:
            distribution_before_state = {
                "distributionStatus": distribution_before["distribution_status"],
                "lockupState": distribution_before["lockup_state"],
                "distributionCapacity": as_number(
                    distribution_before["distribution_capacity"]
                ),
                "cashTrapAmount": as_number(distribution_before["cash_trap_amount"]),
            }
            distribution_after_state = {
                "distributionStatus": distribution_after["distribution_status"],
                "lockupState": distribution_after["lockup_state"],
                "distributionCapacity": as_number(
                    distribution_after["distribution_capacity"]
                ),
                "cashTrapAmount": as_number(distribution_after["cash_trap_amount"]),
            }
            conn.execute(
                """
                INSERT INTO amendment_change_impacts (
                  amendment_id,
                  deal_id,
                  impact_type,
                  target_entity_type,
                  target_entity_id,
                  target_label,
                  impact_summary,
                  before_state,
                  after_state,
                  recomputed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                """,
                (
                    int(amendment["id"]),
                    int(request_row["deal_id"]),
                    "distribution_recompute",
                    "distribution_assessment",
                    int(request_row["related_distribution_assessment_id"]),
                    request_row["title"],
                    payload.decisionSummary,
                    json.dumps(distribution_before_state),
                    json.dumps(distribution_after_state),
                    decision["decided_at"],
                ),
            )

        if risk_before and risk_after:
            risk_before_state = {
                "status": risk_before["status"],
                "mitigant": risk_before["mitigant"],
                "nextReviewDate": risk_before["next_review_date"].isoformat(),
            }
            risk_after_state = {
                "status": risk_after["status"],
                "mitigant": risk_after["mitigant"],
                "nextReviewDate": risk_after["next_review_date"].isoformat(),
            }
            conn.execute(
                """
                INSERT INTO amendment_change_impacts (
                  amendment_id,
                  deal_id,
                  impact_type,
                  target_entity_type,
                  target_entity_id,
                  target_label,
                  impact_summary,
                  before_state,
                  after_state,
                  recomputed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                """,
                (
                    int(amendment["id"]),
                    int(request_row["deal_id"]),
                    "risk_recompute",
                    "risk_register_entry",
                    int(request_row["related_risk_entry_id"]),
                    request_row["title"],
                    payload.decisionRationale,
                    json.dumps(risk_before_state),
                    json.dumps(risk_after_state),
                    decision["decided_at"],
                ),
            )

        snapshot_id, snapshot_after = capture_snapshot_record(
            conn,
            int(request_row["deal_id"]),
            f"{request_row['title']} snapshot",
            "rule_change",
            payload.decidedBy,
            f"Automatic TopSheet snapshot captured after the {request_row['title']} decision took effect.",
        )
        conn.execute(
            """
            INSERT INTO amendment_change_impacts (
              amendment_id,
              deal_id,
              impact_type,
              target_entity_type,
              target_entity_id,
              target_label,
              impact_summary,
              before_state,
              after_state,
              recomputed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
            """,
            (
                int(amendment["id"]),
                int(request_row["deal_id"]),
                "topsheet_snapshot",
                "deal_topsheet_snapshot",
                snapshot_id,
                request_row["title"],
                "TopSheet snapshot refreshed automatically after the amendment took effect.",
                json.dumps(snapshot_before),
                json.dumps(snapshot_after),
                decision["decided_at"],
            ),
        )

        deal = conn.execute(
            "SELECT slug, name FROM deals WHERE id = %s",
            (int(request_row["deal_id"]),),
        ).fetchone()
        record_activity_event(
            conn,
            source_domain="borrower_requests",
            event_type="decision_recorded",
            entity_type="borrower_request",
            entity_id=request_id,
            deal_id=int(request_row["deal_id"]),
            actor_name=payload.decidedBy,
            title=f"{request_row['title']} decision recorded",
            summary=payload.decisionSummary,
            before_state={
                "requestStatus": "pending_decision",
                "decisionOutcome": "awaiting_committee",
            },
            after_state={
                "requestStatus": payload.decisionStatus,
                "decisionOutcome": status_to_outcome.get(payload.decisionStatus, payload.decisionStatus),
            },
            deep_link=f"/deals/{deal['slug']}/requests",
            created_at=decision["decided_at"],
        )
        record_activity_event(
            conn,
            source_domain="amendments",
            event_type="amendment_activated"
            if payload.decisionStatus in ("approved", "approved_with_conditions")
            else "amendment_recorded",
            entity_type="deal_amendment",
            entity_id=int(amendment["id"]),
            deal_id=int(request_row["deal_id"]),
            actor_name=payload.decidedBy,
            title=f"{request_row['title']} amendment {amendment_status_map.get(payload.decisionStatus, 'recorded')}",
            summary="Decision output was converted into an effective-dated monitoring amendment.",
            before_state={"amendmentStatus": "pending"},
            after_state={
                "amendmentStatus": amendment_status_map.get(payload.decisionStatus, "monitoring"),
                "effectiveFrom": payload.effectiveFrom,
                "effectiveTo": payload.expiresOn,
            },
            deep_link=f"/deals/{deal['slug']}/amendments",
            created_at=decision["decided_at"],
        )
        snapshot_event_id = record_activity_event(
            conn,
            source_domain="snapshots",
            event_family="audit",
            event_type="snapshot_captured",
            entity_type="deal_topsheet_snapshot",
            entity_id=snapshot_id,
            deal_id=int(request_row["deal_id"]),
            actor_name=payload.decidedBy,
            actor_type="user",
            audit_how="rule_change_capture",
            title=f"{request_row['title']} snapshot captured",
            summary="A TopSheet snapshot was captured automatically after the rule change took effect.",
            before_state={"snapshotData": snapshot_before},
            after_state={"snapshotData": snapshot_after},
            deep_link=f"/deals/{deal['slug']}/snapshots",
            created_at=decision["decided_at"],
        )
        conn.execute(
            """
            UPDATE deal_topsheet_snapshots
            SET trigger_event_id = %s
            WHERE id = %s
            """,
            (snapshot_event_id, snapshot_id),
        )
        record_snapshot_provenance(
            conn,
            snapshot_id=snapshot_id,
            provenance_kind="trigger_event",
            source_entity_type="activity_event",
            source_entity_id=snapshot_event_id,
            source_label="Automatic post-decision snapshot",
            source_event_id=snapshot_event_id,
            payload={"decisionStatus": payload.decisionStatus},
            created_at=decision["decided_at"],
        )
        conn.commit()

    return {"id": int(decision["id"])}


@app.get("/api/deals/{slug}/snapshots")
def get_deal_snapshots(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Snapshot access denied",
            summary="The selected viewer attempted to open deal snapshots without deal access.",
            deep_link=f"/deals/{slug}/snapshots",
        )
        deal = conn.execute(
            "SELECT id, slug, name FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/snapshots",
        )

        snapshot_rows = conn.execute(
            """
            SELECT id, financial_period_id, snapshot_label, snapshot_type, captured_at,
                   captured_by, summary, snapshot_data, payload_hash, trigger_event_id,
                   prior_snapshot_id
            FROM deal_topsheet_snapshots
            WHERE deal_id = %s
            ORDER BY captured_at DESC, id DESC
            """,
            (deal["id"],),
        ).fetchall()
        snapshot_ids = [int(row["id"]) for row in snapshot_rows]
        provenance_rows = load_snapshot_provenance(conn, snapshot_ids)
        recomputation_rows = load_snapshot_recomputations(conn, snapshot_ids)

    return {
        "viewer": serialize_viewer(viewer_context),
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "snapshots": [
            {
                **serialize_topsheet_snapshot(row),
                "provenance": [
                    serialize_snapshot_provenance(item)
                    for item in provenance_rows
                    if int(item["snapshot_id"]) == int(row["id"])
                ],
                "recomputations": [
                    serialize_snapshot_recomputation(item)
                    for item in recomputation_rows
                    if int(item["snapshot_id"]) == int(row["id"])
                ],
            }
            for row in snapshot_rows
        ],
    }


@app.post("/api/deals/{slug}/snapshots")
def capture_deal_snapshot(
    slug: str, payload: TopsheetSnapshotCaptureRequest, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.capturedBy)
        ensure_permission(
            conn,
            viewer_context,
            "capture_snapshots",
            title="Snapshot capture denied",
            summary="The selected viewer attempted to capture a snapshot without snapshot permission.",
            deep_link=f"/deals/{slug}/snapshots",
        )
        deal = conn.execute(
            "SELECT id, slug, name FROM deals WHERE slug = %s",
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/snapshots",
        )

        snapshot_before_count = conn.execute(
            """
            SELECT COUNT(*)::int AS count
            FROM deal_topsheet_snapshots
            WHERE deal_id = %s
            """,
            (int(deal["id"]),),
        ).fetchone()
        snapshot_id, _ = capture_snapshot_record(
            conn,
            int(deal["id"]),
            payload.snapshotLabel,
            payload.snapshotType,
            payload.capturedBy,
            payload.summary or f"Manual snapshot captured for {deal['name']}.",
        )
        event_id = record_activity_event(
            conn,
            source_domain="snapshots",
            event_family="audit",
            event_type="snapshot_captured",
            entity_type="deal_topsheet_snapshot",
            entity_id=snapshot_id,
            deal_id=int(deal["id"]),
            actor_name=payload.capturedBy,
            actor_type="user",
            audit_how="manual_capture",
            title=f"{payload.snapshotLabel} captured",
            summary=payload.summary or f"Manual snapshot captured for {deal['name']}.",
            before_state={"snapshotCount": int(snapshot_before_count["count"])},
            after_state={"snapshotCount": int(snapshot_before_count["count"]) + 1},
            deep_link=f"/deals/{deal['slug']}/snapshots",
        )
        conn.execute(
            """
            UPDATE deal_topsheet_snapshots
            SET trigger_event_id = %s
            WHERE id = %s
            """,
            (event_id, snapshot_id),
        )
        record_snapshot_provenance(
            conn,
            snapshot_id=snapshot_id,
            provenance_kind="trigger_event",
            source_entity_type="activity_event",
            source_entity_id=event_id,
            source_label="Snapshot capture event",
            source_event_id=event_id,
            payload={"capturedBy": payload.capturedBy, "snapshotType": payload.snapshotType},
        )
        conn.commit()

    return {"id": snapshot_id}


@app.post("/api/deals/{slug}/snapshots/{snapshot_id}/recompute")
def recompute_deal_snapshot(
    slug: str,
    snapshot_id: int,
    payload: SnapshotRecomputeRequest,
    viewer: str | None = None,
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.recomputedBy)
        ensure_permission(
            conn,
            viewer_context,
            "capture_snapshots",
            title="Snapshot recomputation denied",
            summary="The selected viewer attempted to recompute a snapshot without snapshot permission.",
            deep_link=f"/deals/{slug}/snapshots",
        )
        snapshot = conn.execute(
            """
            SELECT s.id, s.deal_id, s.snapshot_label, s.payload_hash, s.snapshot_data, d.slug, d.name
            FROM deal_topsheet_snapshots s
            JOIN deals d ON d.id = s.deal_id
            WHERE s.id = %s AND d.slug = %s
            """,
            (snapshot_id, slug),
        ).fetchone()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(snapshot["deal_id"]),
            deep_link=f"/deals/{slug}/snapshots",
        )

        recomputed_payload = build_snapshot_payload(conn, int(snapshot["deal_id"]))
        actual_hash = json_hash(recomputed_payload)
        expected_hash = snapshot["payload_hash"] or ""
        diff_payload = {
            "stored": snapshot["snapshot_data"],
            "recomputed": recomputed_payload,
        }
        status = "matched" if expected_hash == actual_hash else "diverged"
        divergence_summary = (
            "Recomputed payload matches the stored snapshot payload hash."
            if status == "matched"
            else "Recomputed payload diverges from the stored snapshot payload hash."
        )
        conn.execute(
            """
            INSERT INTO snapshot_recomputations (
              snapshot_id,
              recomputed_at,
              recomputed_by,
              recomputation_status,
              expected_hash,
              actual_hash,
              divergence_summary,
              diff_payload
            ) VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s::jsonb)
            """,
            (
                snapshot_id,
                payload.recomputedBy,
                status,
                expected_hash,
                actual_hash,
                divergence_summary,
                json.dumps(diff_payload),
            ),
        )
        activity_id = record_activity_event(
            conn,
            source_domain="snapshots",
            event_family="audit",
            event_type="snapshot_recomputed",
            entity_type="deal_topsheet_snapshot",
            entity_id=snapshot_id,
            deal_id=int(snapshot["deal_id"]),
            actor_name=payload.recomputedBy,
            actor_type="user",
            audit_how="recompute_check",
            title=f"{snapshot['snapshot_label']} recomputed",
            summary=divergence_summary,
            before_state={"expectedHash": expected_hash},
            after_state={"actualHash": actual_hash, "status": status},
            deep_link=f"/deals/{slug}/snapshots",
        )
        record_snapshot_provenance(
            conn,
            snapshot_id=snapshot_id,
            provenance_kind="recomputation_check",
            source_entity_type="activity_event",
            source_entity_id=activity_id,
            source_label="Snapshot recomputation check",
            source_event_id=activity_id,
            payload={"status": status, "actualHash": actual_hash},
        )
        conn.commit()

    return {"status": status}


@app.get("/api/deals/{slug}/distribution")
def get_deal_distribution(slug: str):
    with get_connection() as conn:
        deal = conn.execute(
            """
            SELECT
              d.id,
              d.slug,
              d.name,
              d.borrower,
              COALESCE(go.override_grade, d.grade) AS effective_grade,
              d.watchlist,
              d.status,
              d.summary
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()

        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        distribution = conn.execute(
            """
            SELECT
              da.*,
              fp.period_key,
              fp.period_label,
              fp.period_end,
              fp.source_document_id
            FROM distribution_assessments da
            JOIN financial_periods fp ON fp.id = da.financial_period_id
            WHERE da.deal_id = %s
            ORDER BY da.assessed_at DESC, da.id DESC
            LIMIT 1
            """,
            (deal["id"],),
        ).fetchone()

        if not distribution:
            raise HTTPException(status_code=404, detail="Distribution assessment not found")

        covenant = conn.execute(
            """
            SELECT id, code, name, current_value, threshold_lockup, threshold_trigger, headroom_pct, status
            FROM covenants
            WHERE deal_id = %s
            """,
            (deal["id"],),
        ).fetchone()

        obligations = conn.execute(
            """
            SELECT title, due_date::text AS due_date, status, days_overdue
            FROM obligations
            WHERE deal_id = %s AND status <> 'fulfilled'
            ORDER BY due_date
            """,
            (deal["id"],),
        ).fetchall()

        source_document = None
        if distribution["source_document_id"]:
            source_document = conn.execute(
                """
                SELECT id, document_type, document_name, period_label, status, received_at,
                       evidence_page, snippet
                FROM documents
                WHERE id = %s
                """,
                (distribution["source_document_id"],),
            ).fetchone()

    return {
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "borrower": deal["borrower"],
        "dealGrade": deal["effective_grade"],
        "dealStatus": deal["status"],
        "watchlist": deal["watchlist"],
        "dealSummary": deal["summary"],
        "distribution": serialize_distribution_assessment(distribution),
        "covenant": {
            "id": int(covenant["id"]),
            "code": covenant["code"],
            "name": covenant["name"],
            "currentValue": as_number(covenant["current_value"]),
            "thresholdLockup": as_number(covenant["threshold_lockup"]),
            "thresholdTrigger": as_number(covenant["threshold_trigger"]),
            "headroomPct": as_number(covenant["headroom_pct"]),
            "status": covenant["status"],
        },
        "openObligations": [
            {
                "title": row["title"],
                "dueDate": row["due_date"],
                "status": row["status"],
                "daysOverdue": int(row["days_overdue"]),
            }
            for row in obligations
        ],
        "sourceDocument": serialize_source_document(source_document),
    }


@app.get("/api/deals/{slug}/periods/{period_key}")
def get_deal_financial_period(
    slug: str, period_key: str, viewer: str | None = None
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Financial period access denied",
            summary="The selected viewer attempted to open a deal period without deal access.",
            deep_link=f"/deals/{slug}/periods/{period_key}",
        )
        deal = conn.execute(
            """
            SELECT
              d.*,
              COALESCE(go.override_grade, d.grade) AS effective_grade
            FROM deals d
            LEFT JOIN LATERAL (
              SELECT override_grade
              FROM grade_overrides go
              WHERE go.deal_id = d.id
                AND go.override_status = 'active'
                AND go.expires_on >= CURRENT_DATE
              ORDER BY go.decided_at DESC, go.id DESC
              LIMIT 1
            ) go ON TRUE
            WHERE d.slug = %s
            """,
            (slug,),
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/periods/{period_key}",
        )

        covenant = conn.execute(
            "SELECT * FROM covenants WHERE deal_id = %s",
            (deal["id"],),
        ).fetchone()

        period_rows = conn.execute(
            """
            SELECT id, period_key, period_label, period_end, source_document_id, status, summary,
                   reported_metrics, expected_metrics
            FROM financial_periods
            WHERE deal_id = %s
            ORDER BY period_end DESC, id DESC
            """,
            (deal["id"],),
        ).fetchall()

        available_periods = [
            {
                "periodKey": row["period_key"],
                "periodLabel": row["period_label"],
                "periodEnd": row["period_end"].isoformat(),
                "status": row["status"],
                "isLatest": index == 0,
            }
            for index, row in enumerate(period_rows)
        ]

        selected_period = None
        lookup_key = (
            period_rows[0]["period_key"]
            if period_key == "latest" and period_rows
            else normalize_period_key(period_key)
        )
        for row in period_rows:
            if row["period_key"] == lookup_key:
                selected_period = row
                break

        if not selected_period:
            raise HTTPException(status_code=404, detail="Financial period not found")

        source_document = None
        if selected_period["source_document_id"]:
            source_document = conn.execute(
                """
                SELECT id, document_type, document_name, period_label, status, received_at,
                       evidence_page, snippet
                FROM documents
                WHERE id = %s
                """,
                (selected_period["source_document_id"],),
            ).fetchone()

        reconciliation_rows = conn.execute(
            """
            SELECT
              id,
              metric_key,
              metric_label,
              borrower_reported_value,
              platform_computed_value,
              variance_value,
              variance_pct,
              tolerance_pct,
              reconciliation_status,
              explanation,
              review_item_id
            FROM ratio_reconciliations
            WHERE financial_period_id = %s
            ORDER BY
              CASE reconciliation_status
                WHEN 'pending_review' THEN 0
                WHEN 'exception' THEN 1
                WHEN 'within_tolerance' THEN 2
                ELSE 3
              END,
              id
            """,
            (selected_period["id"],),
        ).fetchall()

        supersession_rows = conn.execute(
            """
            SELECT
              ds.id,
              ds.period_label,
              ds.supersession_reason,
              ds.impact_summary,
              ds.affected_objects,
              ds.downstream_recomputed,
              ds.effective_at,
              ds.superseded_document_id,
              superseded.document_name AS superseded_document_name,
              superseded.document_type AS superseded_document_type,
              ds.superseding_document_id,
              superseding.document_name AS superseding_document_name,
              superseding.document_type AS superseding_document_type
            FROM document_supersessions ds
            JOIN documents superseded ON superseded.id = ds.superseded_document_id
            JOIN documents superseding ON superseding.id = ds.superseding_document_id
            WHERE ds.deal_id = %s
              AND ds.period_label = %s
            ORDER BY ds.effective_at DESC, ds.id DESC
            """,
            (deal["id"], selected_period["period_label"]),
        ).fetchall()

        variance_rows = conn.execute(
            """
            SELECT metric_key, metric_label, reported_value, expected_value, variance_value,
                   variance_pct, direction, materiality, commentary
            FROM financial_variances
            WHERE financial_period_id = %s
            ORDER BY id
            """,
            (selected_period["id"],),
        ).fetchall()

        variances = [
            {
                "metricKey": row["metric_key"],
                "metricLabel": row["metric_label"],
                "reportedValue": as_number(row["reported_value"]),
                "expectedValue": as_number(row["expected_value"]),
                "varianceValue": as_number(row["variance_value"]),
                "variancePct": as_number(row["variance_pct"]),
                "direction": row["direction"],
                "materiality": row["materiality"],
                "commentary": row["commentary"],
            }
            for row in variance_rows
        ]

        scenario_comparison = build_forecast_summary(
            conn, int(deal["id"]), selected_period["period_key"]
        )

        return {
            "dealName": deal["name"],
            "dealSlug": deal["slug"],
            "borrower": deal["borrower"],
            "grade": deal["effective_grade"],
            "periodKey": selected_period["period_key"],
            "periodLabel": selected_period["period_label"],
            "periodEnd": selected_period["period_end"].isoformat(),
            "status": selected_period["status"],
            "summary": selected_period["summary"],
            "reportedMetrics": selected_period["reported_metrics"],
            "expectedMetrics": selected_period["expected_metrics"],
            "variances": variances,
            "sourceDocument": serialize_source_document(source_document),
            "ratioReconciliations": [
                {
                    "id": int(row["id"]),
                    "metricKey": row["metric_key"],
                    "metricLabel": row["metric_label"],
                    "borrowerReportedValue": as_number(row["borrower_reported_value"]),
                    "platformComputedValue": as_number(row["platform_computed_value"]),
                    "varianceValue": as_number(row["variance_value"]),
                    "variancePct": as_number(row["variance_pct"]),
                    "tolerancePct": as_number(row["tolerance_pct"]),
                    "status": row["reconciliation_status"],
                    "explanation": row["explanation"],
                    "reviewItemId": row["review_item_id"],
                }
                for row in reconciliation_rows
            ],
            "sourceSupersessions": [
                serialize_document_supersession(row) for row in supersession_rows
            ],
            "scenarioComparison": scenario_comparison,
            "availablePeriods": available_periods,
            "covenant": {
                "id": covenant["id"],
                "code": covenant["code"],
                "name": covenant["name"],
                "currentValue": as_number(covenant["current_value"]),
                "thresholdLockup": as_number(covenant["threshold_lockup"]),
                "headroomPct": as_number(covenant["headroom_pct"]),
                "status": covenant["status"],
            },
        }


@app.get("/api/deals/{slug}/covenants/{covenant_id}")
def get_covenant_detail(slug: str, covenant_id: int):
    with get_connection() as conn:
        covenant = conn.execute(
            """
            SELECT d.name AS deal_name, d.slug AS deal_slug, c.*
            FROM deals d
            JOIN covenants c ON c.deal_id = d.id
            WHERE d.slug = %s AND c.id = %s
            """,
            (slug, covenant_id),
        ).fetchone()

        if not covenant:
            raise HTTPException(status_code=404, detail="Covenant not found")

        history = conn.execute(
            """
            SELECT period_label, dscr, expected_dscr
            FROM covenant_history
            WHERE covenant_id = %s
            ORDER BY id
            """,
            (covenant_id,),
        ).fetchall()

    return {
        "dealName": covenant["deal_name"],
        "dealSlug": covenant["deal_slug"],
        "code": covenant["code"],
        "name": covenant["name"],
        "compositionTag": covenant["composition_tag"],
        "currentValue": as_number(covenant["current_value"]),
        "thresholdLockup": as_number(covenant["threshold_lockup"]),
        "thresholdTrigger": as_number(covenant["threshold_trigger"]),
        "headroomPct": as_number(covenant["headroom_pct"]),
        "status": covenant["status"],
        "rationale": covenant["rationale"],
        "numeratorLabel": covenant["numerator_label"],
        "numeratorValue": int(covenant["numerator_value"]),
        "denominatorLabel": covenant["denominator_label"],
        "denominatorValue": int(covenant["denominator_value"]),
        "evidencePage": covenant["evidence_page"],
        "evidenceSnippet": covenant["evidence_snippet"],
        "history": [
            {
                "periodLabel": row["period_label"],
                "value": as_number(row["dscr"]),
                "expectedValue": as_number(row["expected_dscr"]),
            }
            for row in history
        ],
    }


@app.get("/api/review-queue")
def get_review_queue():
    with get_connection() as conn:
        items = conn.execute(
            """
            SELECT
              r.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              r.incoming_document_id,
              r.proposal_type,
              r.field_name,
              r.proposed_value,
              r.confidence,
              r.prior_value,
              r.status,
              r.reason,
              r.document_name,
              r.page_number,
              r.snippet,
              r.owner_name,
              r.due_at,
              r.sla_due_at,
              doc.mime_type
            FROM review_items r
            JOIN deals d ON d.id = r.deal_id
            LEFT JOIN incoming_documents doc ON doc.id = r.incoming_document_id
            ORDER BY r.id
            """
        ).fetchall()

    return [
        {
            "id": int(row["id"]),
            "dealName": row["deal_name"],
            "dealSlug": row["deal_slug"],
            "incomingDocumentId": int(row["incoming_document_id"])
            if row["incoming_document_id"] is not None
            else None,
            "proposalType": row["proposal_type"],
            "fieldName": row["field_name"],
            "proposedValue": row["proposed_value"],
            "confidence": as_number(row["confidence"]),
            "priorValue": row["prior_value"],
            "status": row["status"],
            "reason": row["reason"],
            "documentName": row["document_name"],
            "pageNumber": row["page_number"],
            "snippet": row["snippet"],
            "ownerName": row["owner_name"],
            "dueAt": row["due_at"].isoformat(),
            "slaDueAt": row["sla_due_at"].isoformat(),
            "mimeType": row["mime_type"],
        }
        for row in items
    ]


@app.get("/api/evidence")
def get_evidence():
    with get_connection() as conn:
        document_rows = conn.execute(
            """
            SELECT
              doc.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              doc.document_type,
              doc.document_name,
              doc.period_label,
              doc.status,
              doc.received_at,
              doc.evidence_page,
              doc.snippet
            FROM documents doc
            JOIN deals d ON d.id = doc.deal_id
            ORDER BY doc.received_at DESC
            """
        ).fetchall()

        review_rows = conn.execute(
            """
            SELECT
              r.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              r.proposal_type,
              r.field_name,
              r.proposed_value,
              r.confidence,
              r.prior_value,
              r.status,
              r.reason,
              r.document_name,
              r.page_number,
              r.snippet
            FROM review_items r
            JOIN deals d ON d.id = r.deal_id
            WHERE r.status = 'pending'
            ORDER BY r.confidence ASC, r.id ASC
            """
        ).fetchall()

        supersession_rows = conn.execute(
            """
            SELECT
              ds.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              ds.period_label,
              ds.supersession_reason,
              ds.impact_summary,
              ds.affected_objects,
              ds.downstream_recomputed,
              ds.effective_at,
              ds.superseded_document_id,
              superseded.document_name AS superseded_document_name,
              superseded.document_type AS superseded_document_type,
              ds.superseding_document_id,
              superseding.document_name AS superseding_document_name,
              superseding.document_type AS superseding_document_type
            FROM document_supersessions ds
            JOIN deals d ON d.id = ds.deal_id
            JOIN documents superseded ON superseded.id = ds.superseded_document_id
            JOIN documents superseding ON superseding.id = ds.superseding_document_id
            ORDER BY ds.effective_at DESC, ds.id DESC
            """
        ).fetchall()

    approved_documents = sum(1 for row in document_rows if row["status"] == "approved")

    return {
        "summary": {
            "documentsReceived": len(document_rows),
            "pendingReviews": len(review_rows),
            "approvedDocuments": approved_documents,
            "supersessions": len(supersession_rows),
        },
        "documents": [
            {
                "id": str(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "documentType": row["document_type"],
                "documentName": row["document_name"],
                "periodLabel": row["period_label"],
                "status": row["status"],
                "receivedAt": row["received_at"].isoformat(),
                "evidencePage": row["evidence_page"],
                "snippet": row["snippet"],
            }
            for row in document_rows
        ],
        "reviewItems": [
            {
                "id": int(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "proposalType": row["proposal_type"],
                "fieldName": row["field_name"],
                "proposedValue": row["proposed_value"],
                "confidence": as_number(row["confidence"]),
                "priorValue": row["prior_value"],
                "status": row["status"],
                "reason": row["reason"],
                "documentName": row["document_name"],
                "pageNumber": row["page_number"],
                "snippet": row["snippet"],
            }
            for row in review_rows
        ],
        "supersessions": [
            {
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                **serialize_document_supersession(row),
            }
            for row in supersession_rows
        ],
    }


@app.get("/api/compliance")
def get_compliance():
    with get_connection() as conn:
        obligations = conn.execute(
            """
            SELECT
              o.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.code,
              o.title,
              o.due_date::text,
              o.status,
              o.days_overdue,
              o.grace_days,
              o.phase
            FROM obligations o
            JOIN deals d ON d.id = o.deal_id
            ORDER BY o.due_date, d.name
            """
        ).fetchall()

        incoming_documents = conn.execute(
            """
            SELECT
              doc.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.title AS obligation_title,
              doc.source_channel,
              doc.sender,
              doc.subject,
              doc.file_name,
              doc.period_label,
              doc.document_type,
              doc.classification_status,
              doc.processing_status,
              doc.current_stage,
              doc.review_tier,
              doc.confidence,
              doc.received_at,
              doc.last_updated_at,
              doc.notes
            FROM incoming_documents doc
            LEFT JOIN deals d ON d.id = doc.deal_id
            LEFT JOIN obligations o ON o.id = doc.matched_obligation_id
            ORDER BY doc.received_at DESC
            """
        ).fetchall()

        processing_runs = conn.execute(
            """
            SELECT
              run.id,
              doc.file_name,
              d.name AS deal_name,
              run.stage_name,
              run.stage_status,
              run.processor_type,
              run.started_at,
              run.completed_at,
              run.confidence,
              run.summary
            FROM document_processing_runs run
            JOIN incoming_documents doc ON doc.id = run.incoming_document_id
            LEFT JOIN deals d ON d.id = doc.deal_id
            ORDER BY run.started_at DESC
            LIMIT 12
            """
        ).fetchall()

        fulfilments = conn.execute(
            """
            SELECT
              fulfilment.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              o.title AS obligation_title,
              fulfilment.due_date::text,
              fulfilment.received_at,
              fulfilment.status,
              fulfilment.days_late,
              fulfilment.matched_by,
              fulfilment.notes,
              doc.file_name
            FROM obligation_fulfilments fulfilment
            JOIN obligations o ON o.id = fulfilment.obligation_id
            JOIN deals d ON d.id = o.deal_id
            LEFT JOIN incoming_documents doc ON doc.id = fulfilment.incoming_document_id
            ORDER BY fulfilment.due_date DESC, fulfilment.id DESC
            LIMIT 12
            """
        ).fetchall()

        case_rows = conn.execute(
            """
            SELECT
              c.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              c.case_type,
              c.severity,
              c.status,
              c.owner_name,
              c.title,
              c.summary,
              c.opened_at,
              c.sla_due_at,
              c.closed_at,
              c.resolution_note,
              incoming.file_name
            FROM compliance_cases c
            LEFT JOIN deals d ON d.id = c.deal_id
            LEFT JOIN incoming_documents incoming ON incoming.id = c.incoming_document_id
            ORDER BY c.opened_at DESC
            """
        ).fetchall()

        alert_rows = conn.execute(
            """
            SELECT
              a.id,
              d.name AS deal_name,
              d.slug AS deal_slug,
              a.priority,
              a.status,
              a.channel,
              a.title,
              a.description,
              a.triggered_at,
              a.acknowledged_at,
              a.resolved_at
            FROM compliance_alerts a
            LEFT JOIN deals d ON d.id = a.deal_id
            ORDER BY a.triggered_at DESC
            """
        ).fetchall()

    stage_counts = {}
    for row in incoming_documents:
        stage_counts[row["current_stage"]] = stage_counts.get(row["current_stage"], 0) + 1

    pending_reviews = sum(1 for row in incoming_documents if row["current_stage"] == "review")
    inbox_attention = sum(
        1 for row in incoming_documents if row["processing_status"] != "committed"
    )
    overdue_count = sum(1 for row in obligations if row["status"] == "overdue")
    grace_count = sum(1 for row in obligations if row["status"] == "late_within_grace")
    approaching_count = sum(1 for row in obligations if row["status"] == "approaching")
    open_cases = sum(1 for row in case_rows if row["status"] != "resolved")
    active_alerts = sum(1 for row in alert_rows if row["status"] != "resolved")

    obligations_sorted = sorted(
        obligations,
        key=lambda row: (sort_key_for_obligation_status(row["status"]), row["due_date"]),
    )

    return {
        "summary": {
            "activeObligations": len(obligations),
            "overdueObligations": overdue_count,
            "withinGrace": grace_count,
            "approaching": approaching_count,
            "inboxAttention": inbox_attention,
            "pendingReview": pending_reviews,
            "openCases": open_cases,
            "activeAlerts": active_alerts,
        },
        "stageCounts": [
            {"stage": stage, "count": count}
            for stage, count in sorted(stage_counts.items(), key=lambda item: item[0])
        ],
        "obligations": [
            {
                "id": str(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "code": row["code"],
                "title": row["title"],
                "dueDate": row["due_date"],
                "status": row["status"],
                "daysOverdue": int(row["days_overdue"]),
                "graceDays": int(row["grace_days"]),
                "phase": row["phase"],
            }
            for row in obligations_sorted
        ],
        "incomingDocuments": [
            {
                "id": str(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "obligationTitle": row["obligation_title"],
                "sourceChannel": row["source_channel"],
                "sender": row["sender"],
                "subject": row["subject"],
                "fileName": row["file_name"],
                "periodLabel": row["period_label"],
                "documentType": row["document_type"],
                "classificationStatus": row["classification_status"],
                "processingStatus": row["processing_status"],
                "currentStage": row["current_stage"],
                "reviewTier": row["review_tier"],
                "confidence": as_number(row["confidence"]),
                "receivedAt": row["received_at"].isoformat(),
                "lastUpdatedAt": row["last_updated_at"].isoformat(),
                "notes": row["notes"],
            }
            for row in incoming_documents
        ],
        "processingRuns": [
            {
                "id": int(row["id"]),
                "fileName": row["file_name"],
                "dealName": row["deal_name"],
                "stageName": row["stage_name"],
                "stageStatus": row["stage_status"],
                "processorType": row["processor_type"],
                "startedAt": row["started_at"].isoformat(),
                "completedAt": (
                    row["completed_at"].isoformat() if row["completed_at"] else None
                ),
                "confidence": as_number(row["confidence"]),
                "summary": row["summary"],
            }
            for row in processing_runs
        ],
        "fulfilments": [
            {
                "id": int(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "obligationTitle": row["obligation_title"],
                "dueDate": row["due_date"],
                "receivedAt": (
                    row["received_at"].isoformat() if row["received_at"] else None
                ),
                "status": row["status"],
                "daysLate": int(row["days_late"]),
                "matchedBy": row["matched_by"],
                "notes": row["notes"],
                "fileName": row["file_name"],
            }
            for row in fulfilments
        ],
        "cases": [
            {
                "id": int(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "caseType": row["case_type"],
                "severity": row["severity"],
                "status": row["status"],
                "ownerName": row["owner_name"],
                "title": row["title"],
                "summary": row["summary"],
                "openedAt": row["opened_at"].isoformat(),
                "slaDueAt": row["sla_due_at"].isoformat(),
                "closedAt": (row["closed_at"].isoformat() if row["closed_at"] else None),
                "resolutionNote": row["resolution_note"],
                "fileName": row["file_name"],
            }
            for row in case_rows
        ],
        "alerts": [
            {
                "id": int(row["id"]),
                "dealName": row["deal_name"],
                "dealSlug": row["deal_slug"],
                "priority": row["priority"],
                "status": row["status"],
                "channel": row["channel"],
                "title": row["title"],
                "description": row["description"],
                "triggeredAt": row["triggered_at"].isoformat(),
                "acknowledgedAt": (
                    row["acknowledged_at"].isoformat()
                    if row["acknowledged_at"]
                    else None
                ),
                "resolvedAt": (
                    row["resolved_at"].isoformat() if row["resolved_at"] else None
                ),
            }
            for row in alert_rows
        ],
    }


@app.get("/api/onboarding")
def get_onboarding():
    with get_connection() as conn:
        workflow_rows = conn.execute(
            """
            SELECT
              ow.*,
              o.name AS organisation_name,
              po.name AS owner_display_name,
              a.name AS account_name,
              d.name AS deal_name
            FROM onboarding_workflows ow
            LEFT JOIN organisations o ON o.id = ow.organisation_id
            LEFT JOIN portfolio_owners po ON po.id = ow.owner_id
            LEFT JOIN accounts a ON a.id = ow.account_id
            LEFT JOIN deals d ON d.id = ow.deal_id
            ORDER BY ow.created_at DESC, ow.id DESC
            """
        ).fetchall()

        task_rows = conn.execute(
            """
            SELECT id, workflow_id, task_type, title, status, owner_name, due_date, notes
            FROM onboarding_tasks
            ORDER BY due_date, id
            """
        ).fetchall()

        activation_rows = conn.execute(
            """
            SELECT id, workflow_id, activation_status, activated_by, summary,
                   organisation_id, owner_id, account_id, deal_id, holding_id, activated_at
            FROM onboarding_activation_events
            ORDER BY activated_at DESC, id DESC
            """
        ).fetchall()

        organisations = conn.execute(
            "SELECT id, name FROM organisations ORDER BY name"
        ).fetchall()
        owners = conn.execute(
            """
            SELECT po.id, po.name, o.name AS organisation_name
            FROM portfolio_owners po
            JOIN organisations o ON o.id = po.organisation_id
            ORDER BY o.name, po.name
            """
        ).fetchall()
        accounts = conn.execute(
            """
            SELECT a.id, a.name, po.name AS owner_name
            FROM accounts a
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            ORDER BY po.name, a.name
            """
        ).fetchall()
        deals = conn.execute(
            "SELECT id, name, slug FROM deals ORDER BY name"
        ).fetchall()

    return {
        "summary": {
            "activeWorkflows": sum(
                1 for row in workflow_rows if row["workflow_status"] != "completed"
            ),
            "pendingTasks": sum(1 for row in task_rows if row["status"] != "completed"),
            "newDealPackets": sum(
                1 for row in workflow_rows if row["workflow_type"] == "new_deal_packet"
            ),
        },
        "workflows": [
            serialize_onboarding_workflow(
                row,
                [task for task in task_rows if int(task["workflow_id"]) == int(row["id"])],
                [
                    event
                    for event in activation_rows
                    if int(event["workflow_id"]) == int(row["id"])
                ],
            )
            for row in workflow_rows
        ],
        "referenceData": {
            "organisations": [
                {"id": int(row["id"]), "name": row["name"]} for row in organisations
            ],
            "owners": [
                {
                    "id": int(row["id"]),
                    "name": row["name"],
                    "organisationName": row["organisation_name"],
                }
                for row in owners
            ],
            "accounts": [
                {
                    "id": int(row["id"]),
                    "name": row["name"],
                    "ownerName": row["owner_name"],
                }
                for row in accounts
            ],
            "deals": [
                {"id": int(row["id"]), "name": row["name"], "slug": row["slug"]}
                for row in deals
            ],
        },
    }


@app.post("/api/demo-clock")
def update_demo_clock(payload: DemoClockUpdateRequest, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer or payload.updatedBy)
        ensure_permission(
            conn,
            viewer_context,
            "view_portfolio",
            title="Demo clock update denied",
            summary="The selected viewer attempted to update the demo clock without configuration access.",
            deep_link="/configuration",
        )
        previous_clock = load_demo_clock(conn)
        conn.execute(
            """
            UPDATE demo_clock
            SET current_demo_date = %s,
                clock_label = %s,
                updated_by = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (
                payload.currentDemoDate,
                payload.clockLabel or previous_clock["clockLabel"],
                payload.updatedBy,
                previous_clock["id"],
            ),
        )
        record_activity_event(
            conn,
            source_domain="configuration",
            event_type="demo_clock_updated",
            entity_type="demo_clock",
            entity_id=previous_clock["id"],
            actor_name=payload.updatedBy,
            title="Demo clock updated",
            summary=(
                f"Demo operating date moved from {previous_clock['currentDemoDate']} "
                f"to {payload.currentDemoDate}."
            ),
            deep_link="/configuration",
            event_family="audit",
            audit_how="configuration_update",
            before_state={
                "currentDemoDate": previous_clock["currentDemoDate"],
                "clockLabel": previous_clock["clockLabel"],
            },
            after_state={
                "currentDemoDate": payload.currentDemoDate,
                "clockLabel": payload.clockLabel or previous_clock["clockLabel"],
            },
        )
        conn.commit()
        updated_clock = load_demo_clock(conn)

    return {
        "id": updated_clock["id"],
        "currentDemoDate": updated_clock["currentDemoDate"],
        "clockLabel": updated_clock["clockLabel"],
        "updatedBy": updated_clock["updatedBy"],
        "updatedAt": updated_clock["updatedAt"],
    }


@app.get("/api/calendar")
def get_calendar(
    organisation: int | None = None,
    owner: int | None = None,
    account: int | None = None,
    viewer: str | None = None,
):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_portfolio",
            title="Calendar access denied",
            summary="The selected viewer attempted to open the operating calendar without portfolio access.",
            deep_link="/portfolio/calendar",
        )
        ensure_access_to_scope(
            conn,
            viewer_context,
            organisation_id=organisation,
            owner_id=owner,
            account_id=account,
            deep_link="/portfolio/calendar",
        )
        scope = resolve_portfolio_scope(
            conn,
            organisation,
            owner,
            account,
            viewer_context["displayName"],
        )
        demo_clock = load_demo_clock(conn)
        deal_rows = conn.execute(
            """
            SELECT DISTINCT d.id, d.slug, d.name
            FROM holdings h
            JOIN accounts a ON a.id = h.account_id
            JOIN portfolio_owners po ON po.id = a.portfolio_owner_id
            JOIN organisations o ON o.id = po.organisation_id
            JOIN deals d ON d.id = h.deal_id
            WHERE h.status = 'active'
              AND (%s::int IS NULL OR o.id = %s::int)
              AND (%s::int IS NULL OR po.id = %s::int)
              AND (%s::int IS NULL OR a.id = %s::int)
            ORDER BY d.name
            """,
            (
                scope["organisationId"],
                scope["organisationId"],
                scope["ownerId"],
                scope["ownerId"],
                scope["accountId"],
                scope["accountId"],
            ),
        ).fetchall()
        allowed_deal_ids = viewer_context["access"]["dealIds"]
        visible_deal_ids = [
            int(row["id"])
            for row in deal_rows
            if int(row["id"]) in allowed_deal_ids
        ]
        cycles = load_monitoring_cycles(
            conn,
            demo_date=demo_clock["_date"],
            deal_ids=visible_deal_ids,
        )

    cycle_alerts = build_cycle_alerts(cycles)
    upcoming_events = sorted(
        [
            {
                "cycleId": cycle["id"],
                "dealSlug": cycle["dealSlug"],
                "dealName": cycle["dealName"],
                **event,
            }
            for cycle in cycles
            for event in cycle["events"]
        ],
        key=lambda item: (
            item["scheduledFor"],
            cycle_status_rank(item["status"]),
            item["dealName"],
        ),
    )[:12]

    return {
        "viewer": serialize_viewer(viewer_context),
        "demoClock": {
            "id": demo_clock["id"],
            "currentDemoDate": demo_clock["currentDemoDate"],
            "clockLabel": demo_clock["clockLabel"],
            "updatedBy": demo_clock["updatedBy"],
            "updatedAt": demo_clock["updatedAt"],
        },
        "scope": {
            "level": scope["level"],
            "title": scope["title"],
            "subtitle": scope["subtitle"],
        },
        "summary": {
            "activeCycles": sum(1 for cycle in cycles if cycle["cycleStatus"] != "complete"),
            "blockedCycles": sum(
                1
                for cycle in cycles
                if cycle["cycleStatus"] in {"blocked", "overdue"}
            ),
            "readyForRelease": sum(
                1 for cycle in cycles if cycle["cycleStatus"] == "ready_for_release"
            ),
            "milestonesThisWeek": sum(
                1
                for event in upcoming_events
                if event["status"] in {"due_soon", "due_today", "ready", "overdue"}
            ),
        },
        "cycleAlerts": cycle_alerts[:8],
        "upcomingEvents": upcoming_events,
        "cycles": cycles,
    }


@app.get("/api/deals/{slug}/calendar")
def get_deal_calendar(slug: str, viewer: str | None = None):
    with get_connection() as conn:
        viewer_context = load_viewer_context(conn, viewer)
        ensure_permission(
            conn,
            viewer_context,
            "view_deal",
            title="Deal calendar access denied",
            summary="The selected viewer attempted to open a deal operating calendar without deal access.",
            deep_link=f"/deals/{slug}/calendar",
        )
        deal = conn.execute(
            """
            SELECT id, slug, name, grade, watchlist
            FROM deals
            WHERE slug = %s
            """,
            (slug,),
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        ensure_access_to_deal(
            conn,
            viewer_context,
            int(deal["id"]),
            deep_link=f"/deals/{slug}/calendar",
        )
        demo_clock = load_demo_clock(conn)
        cycles = load_monitoring_cycles(
            conn,
            demo_date=demo_clock["_date"],
            deal_ids=[int(deal["id"])],
        )

    cycle_alerts = build_cycle_alerts(cycles)
    return {
        "viewer": serialize_viewer(viewer_context),
        "demoClock": {
            "id": demo_clock["id"],
            "currentDemoDate": demo_clock["currentDemoDate"],
            "clockLabel": demo_clock["clockLabel"],
            "updatedBy": demo_clock["updatedBy"],
            "updatedAt": demo_clock["updatedAt"],
        },
        "dealSlug": deal["slug"],
        "dealName": deal["name"],
        "dealGrade": deal["grade"],
        "watchlist": deal["watchlist"],
        "summary": {
            "cycleCount": len(cycles),
            "blockedCycles": sum(
                1
                for cycle in cycles
                if cycle["cycleStatus"] in {"blocked", "overdue"}
            ),
            "readyForRelease": sum(
                1 for cycle in cycles if cycle["cycleStatus"] == "ready_for_release"
            ),
            "alertCount": len(cycle_alerts),
        },
        "cycleAlerts": cycle_alerts,
        "cycles": cycles,
    }


@app.post("/api/onboarding/{workflow_id}/activate")
def activate_onboarding_workflow(workflow_id: int):
    with get_connection() as conn:
        workflow = conn.execute(
            """
            SELECT *
            FROM onboarding_workflows
            WHERE id = %s
            """,
            (workflow_id,),
        ).fetchone()

        if not workflow:
            raise HTTPException(status_code=404, detail="Onboarding workflow not found")

        if workflow["workflow_status"] == "completed":
            raise HTTPException(status_code=400, detail="Workflow already activated")

        platform_client = conn.execute(
            "SELECT id FROM platform_clients ORDER BY id LIMIT 1"
        ).fetchone()
        if not platform_client:
            raise HTTPException(status_code=500, detail="Platform client not configured")

        organisation_id = workflow["organisation_id"]
        owner_id = workflow["owner_id"]
        account_id = workflow["account_id"]
        deal_id = workflow["deal_id"]
        holding_id = workflow["holding_id"]
        target_go_live = workflow["target_go_live_date"]
        proposed_amount = workflow["proposed_holding_amount"] or 25000000
        risk_entry = None

        if not organisation_id:
            organisation = conn.execute(
                """
                INSERT INTO organisations (
                  platform_client_id,
                  name,
                  organisation_type,
                  domicile,
                  reporting_currency
                ) VALUES (%s, %s, 'pension_fund', 'United States', 'USD')
                RETURNING id
                """,
                (
                    int(platform_client["id"]),
                    workflow["proposed_organisation_name"] or f"Organisation {workflow_id}",
                ),
            ).fetchone()
            organisation_id = int(organisation["id"])

        if not owner_id:
            owner = conn.execute(
                """
                INSERT INTO portfolio_owners (
                  organisation_id,
                  name,
                  owner_type
                ) VALUES (%s, %s, 'beneficial_owner')
                RETURNING id
                """,
                (
                    organisation_id,
                    workflow["proposed_owner_name"] or f"Owner {workflow_id}",
                ),
            ).fetchone()
            owner_id = int(owner["id"])

        if not account_id:
            account = conn.execute(
                """
                INSERT INTO accounts (
                  portfolio_owner_id,
                  name,
                  account_type,
                  benchmark,
                  status
                ) VALUES (%s, %s, 'segregated_mandate', 'SOFR + 350 bps', 'active')
                RETURNING id
                """,
                (
                    owner_id,
                    workflow["proposed_account_name"] or f"Account {workflow_id}",
                ),
            ).fetchone()
            account_id = int(account["id"])

        new_deal_created = False
        if not deal_id:
            deal_name = workflow["proposed_deal_name"] or f"Activated Deal {workflow_id}"
            slug_base = slugify(deal_name)
            slug = slug_base
            suffix = 2
            while conn.execute("SELECT 1 FROM deals WHERE slug = %s", (slug,)).fetchone():
                slug = f"{slug_base}-{suffix}"
                suffix += 1

            metrics = {
                "revenue": 12000000,
                "ebitda": 7200000,
                "cfads": 6600000,
                "debtService": 5000000,
                "netDebt": 185000000,
                "cash": 15000000,
                "leasedCapacityPct": 65,
                "constructionCompletionPct": 100,
            }
            deal = conn.execute(
                """
                INSERT INTO deals (
                  slug, name, borrower, sector, deal_type, region, currency,
                  facility_amount, exposure, grade, watchlist, status, revenue_risk,
                  summary, phase, deal_overview, latest_period_label,
                  latest_period_end, latest_reported_at, next_test_date, metrics
                ) VALUES (
                  %s, %s, %s, 'Data Center', 'Project Finance', 'North America', 'USD',
                  %s, %s, '2 - In Line', FALSE, 'Monitoring', 'P2-V3-D2',
                  %s, 'ramp_up', %s, 'Activation',
                  %s, NOW(), (%s::date + INTERVAL '75 days')::date, %s::jsonb
                )
                RETURNING id
                """,
                (
                    slug,
                    deal_name,
                    f"{deal_name} Borrower LLC",
                    proposed_amount * 6,
                    proposed_amount,
                    "Deal activated from the onboarding workflow and seeded with opening monitoring objects.",
                    f"{deal_name} entered the live portfolio through onboarding activation.",
                    target_go_live,
                    target_go_live,
                    json.dumps(metrics),
                ),
            ).fetchone()
            deal_id = int(deal["id"])
            new_deal_created = True

            document = conn.execute(
                """
                INSERT INTO documents (
                  deal_id, document_type, document_name, period_label, status,
                  received_at, evidence_page, snippet
                ) VALUES (%s, 'activation_package', %s, 'Activation', 'approved', NOW(), 1, %s)
                RETURNING id
                """,
                (
                    deal_id,
                    f"{deal_name} Activation Package.pdf",
                    f"Activation package established opening monitored metrics for {deal_name}.",
                ),
            ).fetchone()

            period = conn.execute(
                """
                INSERT INTO financial_periods (
                  deal_id, period_key, period_label, period_end, source_document_id,
                  status, summary, reported_metrics, expected_metrics
                ) VALUES (%s, %s, 'Activation', %s, %s, 'approved', %s, %s::jsonb, %s::jsonb)
                RETURNING id
                """,
                (
                    deal_id,
                    f"activation-{deal_id}",
                    target_go_live,
                    int(document["id"]),
                    f"Opening monitoring period created when {deal_name} was activated.",
                    json.dumps(metrics),
                    json.dumps(
                        {
                            **metrics,
                            "revenue": metrics["revenue"] - 200000,
                            "ebitda": metrics["ebitda"] - 100000,
                            "cfads": metrics["cfads"] - 80000,
                            "leasedCapacityPct": metrics["leasedCapacityPct"] - 2,
                        }
                    ),
                ),
            ).fetchone()
            financial_period_id = int(period["id"])

            covenant = conn.execute(
                """
                INSERT INTO covenants (
                  deal_id, code, name, composition_tag, current_value,
                  threshold_lockup, threshold_trigger, headroom_pct, status, rationale,
                  numerator_label, numerator_value, denominator_label, denominator_value,
                  evidence_page, evidence_snippet
                ) VALUES (
                  %s, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.32,
                  1.22, 1.14, 8.2, 'performing', %s,
                  'CFADS', 6600000, 'Debt Service', 5000000, 1, %s
                )
                RETURNING id
                """,
                (
                    deal_id,
                    f"{deal_name} activated with healthy opening covenant headroom.",
                    f"Activation package measured Senior DSCR at 1.32x for {deal_name}.",
                ),
            ).fetchone()

            conn.execute(
                """
                INSERT INTO covenant_history (covenant_id, period_label, dscr, expected_dscr)
                VALUES (%s, 'Activation', 1.32, 1.30)
                """,
                (int(covenant["id"]),),
            )

            conn.execute(
                """
                INSERT INTO obligations (
                  deal_id, code, title, due_date, status, days_overdue, grace_days, phase
                ) VALUES (
                  %s, 'INFO-010', 'Quarterly compliance certificate',
                  (%s::date + INTERVAL '14 days')::date, 'approaching', 0, 5, 'ramp_up'
                )
                """,
                (deal_id, target_go_live),
            )

            variance_specs = [
                ("revenue", "Revenue", 12000000, 11800000, 200000, 1.69, "up", "minor"),
                ("ebitda", "EBITDA", 7200000, 7100000, 100000, 1.41, "up", "minor"),
                ("cfads", "CFADS", 6600000, 6520000, 80000, 1.23, "up", "minor"),
                ("leasedCapacityPct", "Leased Capacity %", 65, 63, 2, 3.17, "up", "minor"),
                ("constructionCompletionPct", "Construction Completion %", 100, 100, 0, 0, "flat", "minor"),
                ("seniorDscr", "Senior DSCR", 1.32, 1.30, 0.02, 1.54, "up", "minor"),
            ]
            for metric in variance_specs:
                conn.execute(
                    """
                    INSERT INTO financial_variances (
                      financial_period_id, metric_key, metric_label, reported_value,
                      expected_value, variance_value, variance_pct, direction,
                      materiality, commentary
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        financial_period_id,
                        metric[0],
                        metric[1],
                        metric[2],
                        metric[3],
                        metric[4],
                        metric[5],
                        metric[6],
                        metric[7],
                        f"{metric[1]} seeded from onboarding activation.",
                    ),
                )

            assessment = conn.execute(
                """
                INSERT INTO deal_assessments (
                  deal_id, financial_period_id, assessment_date, grade, overall_score,
                  covenant_score, variance_score, trend_score, compliance_score,
                  watchlist_status, watchlist_recommendation, escalation_level, summary
                ) VALUES (
                  %s, %s, %s, '2 - In Line', 78, 76, 72, 70, 94,
                  'standard', 'no_change', 'none', %s
                )
                RETURNING id
                """,
                (
                    deal_id,
                    financial_period_id,
                    target_go_live,
                    f"{deal_name} entered live monitoring through onboarding activation with a clean opening assessment.",
                ),
            ).fetchone()

            distribution = conn.execute(
                """
                INSERT INTO distribution_assessments (
                  deal_id, financial_period_id, assessed_at, distribution_status,
                  lockup_state, blocker_count, distribution_capacity, cash_trap_amount,
                  summary, rationale, failed_conditions, required_actions
                ) VALUES (
                  %s, %s, NOW(), 'allowed', 'clear', 0, %s, NULL,
                  %s, %s, '[]'::jsonb, %s::jsonb
                )
                RETURNING id
                """,
                (
                    deal_id,
                    financial_period_id,
                    round(proposed_amount * 0.05),
                    f"{deal_name} entered the live portfolio with no active distribution blockers.",
                    f"Activation package showed clean opening covenant and compliance posture for {deal_name}.",
                    json.dumps(
                        [
                            {
                                "label": "Maintain quarterly monitoring cadence",
                                "owner": "HAM - Activated Deal",
                            }
                        ]
                    ),
                ),
            ).fetchone()

            trend = conn.execute(
                """
                INSERT INTO trend_records (
                  deal_id, financial_period_id, metric_key, metric_label, trend_type,
                  direction, periods_observed, severity, total_change_pct, status, summary
                ) VALUES (
                  %s, %s, 'leasedCapacityPct', 'Leased Capacity %', 'activation_outperformance',
                  'up', 1, 'stable', 3.17, 'active', %s
                )
                RETURNING id
                """,
                (
                    deal_id,
                    financial_period_id,
                    f"{deal_name} activated with leased capacity slightly above the opening case.",
                ),
            ).fetchone()

            conn.execute(
                """
                INSERT INTO watchlist_events (
                  deal_id, assessment_id, status_from, status_to, recommendation,
                  escalation_level, owner_name, rationale, decided_at, next_review_date
                ) VALUES (
                  %s, %s, 'standard', 'standard', 'no_change',
                  'none', 'Onboarding activation', %s, NOW(), (%s::date + INTERVAL '90 days')::date
                )
                """,
                (
                    deal_id,
                    int(assessment["id"]),
                    f"{deal_name} activation review concluded with standard monitoring.",
                    target_go_live,
                ),
            )

            risk_entry = conn.execute(
                """
                INSERT INTO risk_register_entries (
                  deal_id, assessment_id, trend_record_id, compliance_case_id,
                  ratio_reconciliation_id, source_document_id, risk_category, severity,
                  probability, impact, status, owner_name, title, summary, mitigant,
                  next_review_date, opened_at, closed_at
                ) VALUES (
                  %s, %s, %s, NULL, NULL, %s, 'onboarding_execution', 'low',
                  'possible', 'low', 'monitoring', 'HAM - Activated Deal', %s, %s, %s,
                  (%s::date + INTERVAL '90 days')::date, NOW(), NULL
                )
                RETURNING id
                """,
                (
                    deal_id,
                    int(assessment["id"]),
                    int(trend["id"]),
                    int(document["id"]),
                    f"{deal_name} first live monitoring cycle",
                    f"{deal_name} should be monitored closely through its first live quarterly package.",
                    "Validate the first ordinary reporting cycle against the onboarding assumptions.",
                    target_go_live,
                ),
            ).fetchone()

            snapshot_payload = build_snapshot_payload(conn, deal_id)
        conn.execute(
            """
            INSERT INTO deal_topsheet_snapshots (
                  deal_id, financial_period_id, snapshot_label, snapshot_type,
                  captured_at, captured_by, summary, snapshot_data
                ) VALUES (
                  %s, %s, %s, 'activation', NOW(), %s, %s, %s::jsonb
                )
                """,
                (
                    deal_id,
                    financial_period_id,
                    f"{deal_name} Activation Snapshot",
                    workflow["owner_name"],
                    "Opening TopSheet snapshot captured when the workflow was activated.",
                    json.dumps(snapshot_payload),
                ),
            )

        if not holding_id and account_id and deal_id:
            holding = conn.execute(
                """
                INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status)
                VALUES (%s, %s, %s, %s, 'active')
                ON CONFLICT (account_id, deal_id) DO UPDATE
                SET current_amount = EXCLUDED.current_amount
                RETURNING id
                """,
                (account_id, deal_id, proposed_amount, target_go_live),
            ).fetchone()
            holding_id = int(holding["id"])

        conn.execute(
            """
            UPDATE onboarding_workflows
            SET workflow_status = 'completed',
                organisation_id = %s,
                owner_id = %s,
                account_id = %s,
                deal_id = %s,
                holding_id = %s,
                completed_at = NOW()
            WHERE id = %s
            """,
            (organisation_id, owner_id, account_id, deal_id, holding_id, workflow_id),
        )
        conn.execute(
            """
            UPDATE onboarding_tasks
            SET status = 'completed',
                notes = CASE
                  WHEN notes = '' THEN 'Completed during workflow activation.'
                  ELSE notes || ' Completed during workflow activation.'
                END
            WHERE workflow_id = %s
            """,
            (workflow_id,),
        )
        sync_onboarding_workflow_tasks(conn, workflow_id)
        if new_deal_created and risk_entry:
            sync_risk_task(conn, int(risk_entry["id"]))

        event = conn.execute(
            """
            INSERT INTO onboarding_activation_events (
              workflow_id, activation_status, activated_by, summary,
              organisation_id, owner_id, account_id, deal_id, holding_id, activated_at
            ) VALUES (
              %s, 'activated', %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            RETURNING id
            """,
            (
                workflow_id,
                workflow["owner_name"],
                "Workflow activated into the live portfolio hierarchy and monitoring model."
                if new_deal_created
                else "Workflow activated into the live portfolio hierarchy.",
                organisation_id,
                owner_id,
                account_id,
                deal_id,
                holding_id,
            ),
        ).fetchone()

        record_activity_event(
            conn,
            source_domain="configuration",
            event_type="onboarding_activated",
            entity_type="onboarding_workflow",
            entity_id=workflow_id,
            deal_id=deal_id,
            organisation_id=organisation_id,
            owner_id=owner_id,
            account_id=account_id,
            actor_name=workflow["owner_name"],
            title=f"{workflow['summary']} activated",
            summary="The onboarding workflow was activated into the live hierarchy and monitoring model.",
            before_state={
                "workflowStatus": workflow["workflow_status"],
                "holdingStatus": "proposed" if not workflow["holding_id"] else "existing",
            },
            after_state={
                "workflowStatus": "completed",
                "holdingStatus": "active",
                "holdingId": holding_id,
            },
            deep_link="/configuration",
        )

        conn.commit()

    return {
        "id": int(event["id"]),
        "organisationId": organisation_id,
        "ownerId": owner_id,
        "accountId": account_id,
        "dealId": deal_id,
        "holdingId": holding_id,
    }


@app.post("/api/onboarding")
def create_onboarding_workflow(payload: OnboardingWorkflowCreateRequest):
    default_tasks = {
        "new_deal_packet": [
            ("entity_setup", "Create hierarchy and account structure"),
            ("deal_intake", "Load draft deal profile and covenant set"),
            ("allocation", "Confirm opening holding and go-live path"),
        ],
        "holding_allocation": [
            ("committee_vote", "Collect investment committee votes"),
            ("holding_commit", "Create holding once approved"),
        ],
    }

    with get_connection() as conn:
        workflow = conn.execute(
            """
            INSERT INTO onboarding_workflows (
              workflow_type,
              workflow_status,
              organisation_id,
              owner_id,
              account_id,
              deal_id,
              holding_id,
              proposed_organisation_name,
              proposed_owner_name,
              proposed_account_name,
              proposed_deal_name,
              proposed_holding_amount,
              owner_name,
              target_go_live_date,
              summary,
              created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (
                payload.workflowType,
                payload.workflowStatus,
                payload.organisationId,
                payload.ownerId,
                payload.accountId,
                payload.dealId,
                payload.holdingId,
                payload.proposedOrganisationName,
                payload.proposedOwnerName,
                payload.proposedAccountName,
                payload.proposedDealName,
                payload.proposedHoldingAmount,
                payload.ownerName,
                payload.targetGoLiveDate,
                payload.summary,
            ),
        ).fetchone()

        for offset, (task_type, title) in enumerate(
            default_tasks.get(payload.workflowType, []),
            start=1,
        ):
            task = conn.execute(
                """
                INSERT INTO onboarding_tasks (
                  workflow_id,
                  task_type,
                  title,
                  status,
                  owner_name,
                  due_date,
                  notes
                ) VALUES (%s, %s, %s, 'pending', %s, (%s::date + (%s * INTERVAL '1 day'))::date, %s)
                RETURNING id
                """,
                (
                    workflow["id"],
                    task_type,
                    title,
                    payload.ownerName,
                    payload.targetGoLiveDate,
                    offset * -7,
                    "Generated automatically when the onboarding workflow was opened.",
                ),
            ).fetchone()
            sync_onboarding_task_entry(conn, int(task["id"]))

        conn.commit()

    return {"id": int(workflow["id"])}


@app.post("/api/compliance/incoming-documents/{document_id}/triage")
def triage_incoming_document(document_id: int, payload: TriageRequest):
    with get_connection() as conn:
        with conn.transaction():
            document = conn.execute(
                """
                SELECT id, deal_id, file_name, notes, classification_status, processing_status, current_stage
                FROM incoming_documents
                WHERE id = %s
                FOR UPDATE
                """,
                (document_id,),
            ).fetchone()

            if not document:
                raise HTTPException(status_code=404, detail="Incoming document not found")

            case_row = conn.execute(
                """
                SELECT id
                FROM compliance_cases
                WHERE incoming_document_id = %s AND status != 'resolved'
                ORDER BY opened_at DESC
                LIMIT 1
                FOR UPDATE
                """,
                (document_id,),
            ).fetchone()

            alert_row = conn.execute(
                """
                SELECT id
                FROM compliance_alerts
                WHERE compliance_case_id = %s AND status != 'resolved'
                ORDER BY triggered_at DESC
                LIMIT 1
                FOR UPDATE
                """,
                (case_row["id"],) if case_row else (None,),
            ).fetchone() if case_row else None

            if payload.action == "assign_deal":
                if not payload.dealSlug:
                    raise HTTPException(status_code=400, detail="dealSlug is required")

                deal = conn.execute(
                    "SELECT id, name FROM deals WHERE slug = %s",
                    (payload.dealSlug,),
                ).fetchone()
                if not deal:
                    raise HTTPException(status_code=404, detail="Deal not found")

                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET deal_id = %s,
                        classification_status = 'assigned_to_deal',
                        processing_status = 'triage_in_progress',
                        current_stage = 'matching',
                        last_updated_at = NOW(),
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        deal["id"],
                        append_note(document["notes"], f"Assigned to {deal['name']} during triage."),
                        document_id,
                    ),
                )

                if case_row:
                    conn.execute(
                        """
                        UPDATE compliance_cases
                        SET deal_id = %s,
                            status = 'in_progress',
                            owner_name = 'HAM - Shared Inbox'
                        WHERE id = %s
                        """,
                        (deal["id"], case_row["id"]),
                    )
            elif payload.action == "send_to_review":
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET processing_status = 'in_review',
                        current_stage = 'review',
                        review_tier = 'tier_2',
                        last_updated_at = NOW(),
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        append_note(document["notes"], "Escalated to review queue from inbox triage."),
                        document_id,
                    ),
                )

                if case_row:
                    conn.execute(
                        """
                        UPDATE compliance_cases
                        SET status = 'pending_review'
                        WHERE id = %s
                        """,
                        (case_row["id"],),
                    )
            elif payload.action == "mark_duplicate":
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET classification_status = 'duplicate',
                        processing_status = 'closed',
                        current_stage = 'closed',
                        last_updated_at = NOW(),
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        append_note(document["notes"], "Marked as duplicate in inbox triage."),
                        document_id,
                    ),
                )

                if case_row:
                    conn.execute(
                        """
                        UPDATE compliance_cases
                        SET status = 'resolved',
                            closed_at = NOW(),
                            resolution_note = 'Marked as duplicate during triage.'
                        WHERE id = %s
                        """,
                        (case_row["id"],),
                    )
                if alert_row:
                    conn.execute(
                        """
                        UPDATE compliance_alerts
                        SET status = 'resolved',
                            resolved_at = NOW()
                        WHERE id = %s
                        """,
                        (alert_row["id"],),
                    )
            elif payload.action == "close":
                conn.execute(
                    """
                    UPDATE incoming_documents
                    SET processing_status = 'closed',
                        current_stage = 'closed',
                        last_updated_at = NOW(),
                        notes = %s
                    WHERE id = %s
                    """,
                    (
                        append_note(document["notes"], "Closed from inbox triage without further action."),
                        document_id,
                    ),
                )
                if case_row:
                    conn.execute(
                        """
                        UPDATE compliance_cases
                        SET status = 'resolved',
                            closed_at = NOW(),
                            resolution_note = 'Closed in inbox triage.'
                        WHERE id = %s
                        """,
                        (case_row["id"],),
                    )
                if alert_row:
                    conn.execute(
                        """
                        UPDATE compliance_alerts
                        SET status = 'resolved',
                            resolved_at = NOW()
                        WHERE id = %s
                        """,
                        (alert_row["id"],),
                    )
            else:
                raise HTTPException(status_code=400, detail="Unsupported triage action")

            if case_row:
                sync_compliance_case_task(conn, int(case_row["id"]))

            updated_document = conn.execute(
                """
                SELECT id, deal_id, classification_status, processing_status, current_stage
                FROM incoming_documents
                WHERE id = %s
                """,
                (document_id,),
            ).fetchone()
            deal_slug = None
            if updated_document["deal_id"]:
                deal = conn.execute(
                    "SELECT slug FROM deals WHERE id = %s",
                    (int(updated_document["deal_id"]),),
                ).fetchone()
                deal_slug = deal["slug"] if deal else None
            record_activity_event(
                conn,
                source_domain="compliance",
                event_type="triage_updated",
                entity_type="incoming_document",
                entity_id=document_id,
                deal_id=int(updated_document["deal_id"]) if updated_document["deal_id"] else None,
                actor_name="HAM - Shared Inbox",
                title=f"{document['file_name']} triage updated",
                summary=f"Inbox triage applied the {payload.action.replace('_', ' ')} action.",
                before_state={
                    "classificationStatus": document["classification_status"],
                    "processingStatus": document["processing_status"],
                    "currentStage": document["current_stage"],
                },
                after_state={
                    "classificationStatus": updated_document["classification_status"],
                    "processingStatus": updated_document["processing_status"],
                    "currentStage": updated_document["current_stage"],
                },
                deep_link=f"/deals/{deal_slug}" if deal_slug else "/compliance/inbox",
            )

    return {"ok": True}


@app.post("/api/review-queue/{review_id}/approve")
def approve_review_item(review_id: int):
    with get_connection() as conn:
        with conn.transaction():
            item = conn.execute(
                """
                SELECT
                  id,
                  deal_id,
                  incoming_document_id,
                  proposal_id,
                  proposal_type,
                  field_name,
                  proposed_value,
                  status,
                  document_name
                FROM review_items
                WHERE id = %s
                FOR UPDATE
                """,
                (review_id,),
            ).fetchone()

            if not item:
                raise HTTPException(status_code=404, detail="Review item not found")

            conn.execute(
                "UPDATE review_items SET status = 'approved' WHERE id = %s",
                (review_id,),
            )

            conn.execute(
                """
                UPDATE ratio_reconciliations
                SET reconciliation_status = 'approved'
                WHERE review_item_id = %s
                """,
                (review_id,),
            )

            if item["proposal_id"]:
                commit_document_proposal(conn, int(item["proposal_id"]), "Review - Tier 2")

            if item["field_name"] == "senior_dscr" and not item["proposal_id"]:
                numeric_value = float(item["proposed_value"].replace("x", ""))
                conn.execute(
                    """
                    UPDATE covenants
                    SET current_value = %s,
                        headroom_pct = ROUND((((%s)::numeric - threshold_lockup) / threshold_lockup) * 100, 2),
                        status = CASE
                          WHEN %s <= threshold_trigger THEN 'trigger_event'
                          WHEN %s <= threshold_lockup THEN 'lock_up'
                          ELSE 'performing'
                        END
                    WHERE deal_id = %s
                    """,
                    (
                        numeric_value,
                        numeric_value,
                        numeric_value,
                        numeric_value,
                        item["deal_id"],
                    ),
                )

            pending_count = None
            if item["incoming_document_id"]:
                pending_count = conn.execute(
                    """
                    SELECT COUNT(*)::int AS count
                    FROM review_items
                    WHERE incoming_document_id = %s AND status = 'pending'
                    """,
                    (item["incoming_document_id"],),
                ).fetchone()
            else:
                pending_count = conn.execute(
                    """
                    SELECT COUNT(*)::int AS count
                    FROM review_items
                    WHERE deal_id = %s AND status = 'pending'
                    """,
                    (item["deal_id"],),
                ).fetchone()

            if int(pending_count["count"]) == 0:
                if item["incoming_document_id"] and item["proposal_id"]:
                    final_status = finalize_intake_document(
                        conn,
                        int(item["incoming_document_id"]),
                        "Review - Tier 2",
                        "Tier 2 review approved and extracted facts committed.",
                    )
                    if final_status == "committed":
                        now = datetime.now(timezone.utc)
                        create_processing_run(
                            conn,
                            int(item["incoming_document_id"]),
                            "commit",
                            "completed",
                            "review_commit",
                            now,
                            now,
                            1.0,
                            "Review-approved extracted facts were committed into canonical records.",
                        )
                else:
                    conn.execute(
                        """
                        UPDATE obligations
                        SET status = 'fulfilled',
                            days_overdue = 0
                        WHERE deal_id = %s AND code = 'INFO-010'
                        """,
                        (item["deal_id"],),
                    )
                    conn.execute(
                        """
                        UPDATE documents
                        SET status = 'approved'
                        WHERE deal_id = %s AND document_type = 'compliance_certificate'
                        """,
                        (item["deal_id"],),
                    )
                    conn.execute(
                        """
                        UPDATE incoming_documents
                        SET processing_status = 'committed',
                            current_stage = 'committed',
                            last_updated_at = NOW(),
                            notes = 'Tier 2 review approved and canonical state committed.'
                        WHERE deal_id = %s
                          AND file_name = %s
                        """,
                        (item["deal_id"], item["document_name"]),
                    )
                    conn.execute(
                        """
                        UPDATE financial_periods
                        SET status = 'approved'
                        WHERE deal_id = %s
                          AND period_label = (
                            SELECT latest_period_label
                            FROM deals
                            WHERE id = %s
                          )
                        """,
                        (item["deal_id"], item["deal_id"]),
                    )
                    conn.execute(
                        """
                        UPDATE obligation_fulfilments
                        SET status = 'fulfilled',
                            days_late = 0,
                            matched_by = 'system_commit'
                        WHERE incoming_document_id IN (
                          SELECT id
                          FROM incoming_documents
                          WHERE deal_id = %s AND file_name = %s
                        )
                        """,
                        (item["deal_id"], item["document_name"]),
                    )

            sync_review_task(conn, review_id)
            deal = conn.execute(
                "SELECT slug, name FROM deals WHERE id = %s",
                (item["deal_id"],),
            ).fetchone()
            record_activity_event(
                conn,
                source_domain="review",
                event_type="review_approved",
                entity_type="review_item",
                entity_id=review_id,
                deal_id=int(item["deal_id"]),
                actor_name="Review - Tier 2",
                title=f"{deal['name']} review item approved",
                summary=f"{item['field_name']} was approved and committed to the monitored record.",
                before_state={"reviewStatus": item["status"]},
                after_state={"reviewStatus": "approved", "pendingReviewCount": int(pending_count["count"])},
                deep_link=f"/deals/{deal['slug']}/periods/latest",
            )

    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# PLUMBING — system configuration reference endpoints
# ═══════════════════════════════════════════════════════════════════════════════

REVENUE_RISK_TEMPLATE = {
    "pricingMechanisms": [
        {
            "code": "P1",
            "name": "Fixed by contract",
            "description": "The price per unit (or total payment) is specified in a long-term contract. No exposure to market price movements during the contract term.",
            "typicalSectors": "Availability-based PFI/PPP; fixed-price PPA; long-lease real estate; take-or-pay pipeline tariffs.",
            "riskImplication": "Lowest pricing risk. Key risk shifts to counterparty credit and contract enforceability.",
        },
        {
            "code": "P2",
            "name": "Indexed / escalating by formula",
            "description": "The price adjusts by a defined formula linked to a published index (CPI, RPI, wage index). The adjustment is mechanical and not subject to negotiation or regulatory discretion.",
            "typicalSectors": "Index-linked PFI unitary charges; RPI-linked regulated tariffs; CPI-escalated lease rentals; index-linked PPA prices.",
            "riskImplication": "Low pricing risk. Exposed to basis risk between revenue index and cost index, and to index reform risk (e.g. RPI to CPIH transition).",
        },
        {
            "code": "P3",
            "name": "Regulated / administered",
            "description": "The price is set by a regulator or government authority through a periodic review process. The regulatory framework creates both a floor and a ceiling on returns.",
            "typicalSectors": "RAB-based utility tariffs; regulated airport charges; regulated pipeline tariffs; water tariffs.",
            "riskImplication": "Moderate pricing risk. Regulatory risk is the key concern — adverse determinations can compress margins, but the framework also provides downside protection.",
        },
        {
            "code": "P4",
            "name": "Negotiated / re-contracted periodically",
            "description": "The price is set by commercial negotiation at intervals. At each renewal point there is genuine uncertainty about the outcome.",
            "typicalSectors": "Lease renewals; PPA renewals; O&M contract renewals; franchise rebids; airport airline agreements.",
            "riskImplication": "Moderate to high pricing risk at renewal points. Depends on contract expiry timing vs debt maturity, market conditions, and borrower competitive position.",
        },
        {
            "code": "P5",
            "name": "Market / merchant",
            "description": "The price is determined by supply and demand in a competitive market at the time of sale. The borrower is a price-taker with no contractual protection.",
            "typicalSectors": "Wholesale electricity (merchant generators); commodity prices; hotel room rates; self-storage rates.",
            "riskImplication": "Highest pricing risk. Assessment focuses on cost curve position, competitive dynamics, hedging programme, and breakeven price relative to forward curve.",
        },
        {
            "code": "P6",
            "name": "Hybrid / layered",
            "description": "A combination of pricing mechanisms where different revenue streams follow different pricing types. Common in practice — most assets have a blended pricing profile.",
            "typicalSectors": "Capacity market (P1) + energy market (P5) for power generators; regulated aeronautical charges (P3) + commercial revenue (P5) for airports.",
            "riskImplication": "Risk depends on the blend. Assessment must decompose revenue into component streams and classify each separately.",
        },
    ],
    "volumeMechanisms": [
        {
            "code": "V1",
            "name": "Guaranteed / take-or-pay",
            "description": "The counterparty must pay regardless of whether they use the capacity or take the product. Volume risk is entirely transferred to the counterparty.",
            "typicalSectors": "Take-or-pay gas contracts; ship-or-pay pipeline commitments; availability-based PFI; fully let single-tenant long-lease real estate.",
            "riskImplication": "Lowest volume risk. Credit risk shifts to counterparty creditworthiness and ability to honour the commitment.",
        },
        {
            "code": "V2",
            "name": "Contracted with performance conditions",
            "description": "A contract exists, but payment depends on the asset's actual output, availability, or performance meeting specified standards.",
            "typicalSectors": "PPAs where the generator bears resource risk; rolling stock availability leases; PFI with performance deductions.",
            "riskImplication": "Volume risk is transformed into operational/performance risk. Assessment focuses on gap between design and achievable performance.",
        },
        {
            "code": "V3",
            "name": "Partially contracted",
            "description": "A proportion of capacity or output is committed under contract, with the remainder sold on a spot or short-term basis.",
            "typicalSectors": "Power plant with 70% PPA + 30% merchant; port with minimum throughput commitment + spot cargo; data centre with anchor tenants + speculative capacity.",
            "riskImplication": "Risk depends on the contracted proportion and quality of the uncontracted market. The coverage ratio of contracted revenue to debt service is a key metric.",
        },
        {
            "code": "V4",
            "name": "Demand-driven, essential / inelastic",
            "description": "No contractual volume commitment, but demand is driven by essential need and is relatively price-inelastic. The service is a necessity with limited substitutes.",
            "typicalSectors": "Regulated water utility; electricity distribution; commuter rail; urban road tolls; district heating; social housing.",
            "riskImplication": "Low to moderate volume risk. Demand is structurally supported but can decline from demographic change, efficiency improvements, or policy shifts.",
        },
        {
            "code": "V5",
            "name": "Demand-driven, elastic / discretionary",
            "description": "Volume depends on consumer or business choice and is meaningfully sensitive to price, competition, economic conditions, and behavioural change.",
            "typicalSectors": "Airport passengers (leisure); discretionary retail; hotel leisure guests; self-storage; toll roads with free alternatives.",
            "riskImplication": "High volume risk. Demand is cyclical and competitive. Assessment requires traffic/demand studies, elasticity analysis, and sensitivity to economic downturn.",
        },
        {
            "code": "V6",
            "name": "Speculative / project-dependent",
            "description": "Volume is highly uncertain, dependent on specific project outcomes, exploration success, development activity, or market creation.",
            "typicalSectors": "Greenfield infrastructure in ramp-up; new-build speculative logistics; exploration-stage mining; early-stage clean tech; first-of-a-kind technology.",
            "riskImplication": "Highest volume risk. Financial structure must accommodate a ramp-up period with potential for sub-economic utilisation.",
        },
    ],
    "durationCategories": [
        {
            "code": "D1",
            "name": "Fully matched or over-hedged",
            "description": "The revenue arrangement extends to or beyond debt maturity. There is no period of uncontracted revenue during the debt term.",
            "riskImplication": "Lowest duration risk. No merchant tail. Refinancing risk may still exist if debt matures before the contract.",
        },
        {
            "code": "D2",
            "name": "Substantially matched (>80% coverage)",
            "description": "The primary revenue arrangement covers more than 80% of the debt term. A short merchant tail exists but is a relatively small proportion of total debt service.",
            "riskImplication": "Low duration risk. The merchant tail should be stress-tested but is unlikely to be the primary credit concern.",
        },
        {
            "code": "D3",
            "name": "Partially matched (50-80% coverage)",
            "description": "The revenue arrangement covers 50-80% of the debt term. A significant merchant tail exists. The base case includes meaningful post-contract revenue assumptions.",
            "riskImplication": "Moderate duration risk. The merchant tail is a material credit factor requiring independent stress on post-contract pricing and volume.",
        },
        {
            "code": "D4",
            "name": "Under-matched (<50% coverage)",
            "description": "The revenue arrangement covers less than 50% of the debt term. The majority of the debt will be repaid from uncontracted or re-contracted revenue.",
            "riskImplication": "High duration risk. Effectively a merchant credit for the majority of the debt term. Long-term credit depends on asset competitiveness and market position.",
        },
        {
            "code": "D5",
            "name": "No contracted revenue / fully merchant",
            "description": "There is no long-term revenue arrangement. All revenue is earned on a merchant, spot, or short-term basis throughout the debt term.",
            "riskImplication": "Highest duration risk. Revenue is entirely market-dependent from day one. Assessment is fully focused on market position, cost curve, and competitive dynamics.",
        },
    ],
}


@app.get("/api/plumbing/risk-template")
def get_risk_template():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT slug, name, revenue_risk, revenue_risk_composite,
                   revenue_pricing_mechanism, revenue_volume_mechanism,
                   revenue_duration_category, revenue_risk_level
            FROM deals
            ORDER BY name
            """
        ).fetchall()

    deal_classifications = []
    for row in rows:
        composite = row["revenue_risk_composite"] or row["revenue_risk"]
        pricing = row["revenue_pricing_mechanism"]
        volume = row["revenue_volume_mechanism"]
        duration = row["revenue_duration_category"]
        if composite and not pricing:
            parts = composite.split("-")
            pricing = parts[0] if len(parts) > 0 else None
            volume = parts[1] if len(parts) > 1 else None
            duration = parts[2] if len(parts) > 2 else None
        deal_classifications.append({
            "dealSlug": row["slug"],
            "dealName": row["name"],
            "composite": composite,
            "pricingCode": pricing,
            "volumeCode": volume,
            "durationCode": duration,
            "riskLevel": row["revenue_risk_level"],
        })

    return {
        "template": REVENUE_RISK_TEMPLATE,
        "dealClassifications": deal_classifications,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RISK REGISTER endpoints
# ═══════════════════════════════════════════════════════════════════════════════

SECTOR_TO_SUBSECTOR = {
    "Data Center": "7F: Data Centres",
    "Renewable Energy": "7C: Renewable Energy — Common",
    "Solar": "7A: Renewable Energy — Solar",
    "Wind": "7B: Renewable Energy — Wind",
    "Energy Storage": "7D: Energy Storage / Battery",
    "Rail": "7H: Rail",
    "Rolling Stock": "7I: Rolling Stock",
    "Ports": "7J: Ports",
    "Airports": "7K: Airports",
    "Roads": "7L: Roads",
    "Gas Utilities": "7M: Gas Utilities",
    "Electricity Utilities": "7N: Electricity Utilities",
    "Pipelines": "7O: Pipelines",
    "Thermal Generation": "7Q: Thermal Generation",
    "Real Estate": "7T: Real Estate",
    "Social Infrastructure": "7U: Social Infrastructure",
    "Energy from Waste": "7W: Energy from Waste",
    "Clean Tech": "7X: Clean Tech Charging",
    "Telecommunications": "7G: Telecommunications",
}


def _get_deal_id(conn, slug: str) -> int:
    row = conn.execute("SELECT id FROM deals WHERE slug = %s", (slug,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Deal not found")
    return int(row["id"])


@app.get("/api/deals/{slug}/risk-register")
def get_risk_register(
    slug: str,
    status: str | None = None,
    category: str | None = None,
    risk_level: str | None = None,
    sector_filter: bool = True,
):
    with get_connection() as conn:
        deal = conn.execute(
            "SELECT id, sector FROM deals WHERE slug = %s", (slug,)
        ).fetchone()
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")

        deal_id = int(deal["id"])
        deal_sector = deal["sector"] or ""
        sector_sub = SECTOR_TO_SUBSECTOR.get(deal_sector)

        conn.execute(
            """INSERT INTO deal_risk_register (deal_id, risk_id, status)
               SELECT %s, risk_id, 'not_yet_assessed' FROM risk_taxonomy
               ON CONFLICT (deal_id, risk_id) DO NOTHING""",
            (deal_id,),
        )

        conditions = ["drr.deal_id = %s"]
        params: list = [deal_id]

        if status:
            statuses = [s.strip() for s in status.split(",")]
            conditions.append("drr.status = ANY(%s)")
            params.append(statuses)
        if category:
            conditions.append("rt.category_code = %s")
            params.append(category)
        if risk_level:
            levels = [l.strip() for l in risk_level.split(",")]
            conditions.append("drr.risk_level = ANY(%s)")
            params.append(levels)
        if sector_filter and sector_sub:
            conditions.append(
                "(rt.category_number BETWEEN 1 AND 6 OR rt.sub_sector = %s OR drr.status = 'assessed')"
            )
            params.append(sector_sub)

        where = " AND ".join(conditions)
        rows = conn.execute(
            f"""SELECT
                drr.id, drr.deal_id, drr.risk_id, drr.status,
                drr.likelihood, drr.severity, drr.risk_score, drr.risk_level,
                drr.mitigation_party_score, drr.mitigation_party_name, drr.mitigation_party_detail,
                drr.mitigation_capital_score, drr.mitigation_capital_type,
                drr.mitigation_capital_provider, drr.mitigation_capital_amount,
                drr.mitigation_capital_expiry, drr.mitigation_capital_detail,
                drr.sensitised_at_origination, drr.sensitivity_name,
                drr.stress_applied, drr.stress_dscr_min, drr.stress_dscr_max, drr.stress_dscr_avg,
                drr.monitoring_kpi, drr.monitoring_threshold,
                drr.trend, drr.commentary,
                drr.assessed_by, drr.assessed_at, drr.review_trigger,
                rt.risk_name, rt.category_code, rt.category_name,
                rt.category_number, rt.sub_sector, rt.sort_order,
                rt.description, rt.typical_sectors, rt.key_indicators
            FROM deal_risk_register drr
            JOIN risk_taxonomy rt ON drr.risk_id = rt.risk_id
            WHERE {where}
            ORDER BY rt.sort_order""",
            params,
        ).fetchall()

    def fmt_row(r):
        return {
            "id": str(r["id"]),
            "riskId": r["risk_id"], "riskName": r["risk_name"],
            "categoryCode": r["category_code"], "categoryName": r["category_name"],
            "categoryNumber": r["category_number"], "subSector": r["sub_sector"],
            "description": r["description"], "typicalSectors": r["typical_sectors"],
            "keyIndicators": r["key_indicators"], "status": r["status"],
            "likelihood": r["likelihood"], "severity": r["severity"],
            "riskScore": r["risk_score"], "riskLevel": r["risk_level"],
            "mitigationPartyScore": r["mitigation_party_score"],
            "mitigationPartyName": r["mitigation_party_name"],
            "mitigationPartyDetail": r["mitigation_party_detail"],
            "mitigationCapitalScore": r["mitigation_capital_score"],
            "mitigationCapitalType": r["mitigation_capital_type"],
            "mitigationCapitalProvider": r["mitigation_capital_provider"],
            "mitigationCapitalAmount": float(r["mitigation_capital_amount"]) if r["mitigation_capital_amount"] is not None else None,
            "mitigationCapitalExpiry": str(r["mitigation_capital_expiry"]) if r["mitigation_capital_expiry"] else None,
            "mitigationCapitalDetail": r["mitigation_capital_detail"],
            "sensitisedAtOrigination": r["sensitised_at_origination"],
            "sensitivityName": r["sensitivity_name"],
            "stressApplied": r["stress_applied"],
            "stressDscrMin": float(r["stress_dscr_min"]) if r["stress_dscr_min"] is not None else None,
            "stressDscrMax": float(r["stress_dscr_max"]) if r["stress_dscr_max"] is not None else None,
            "stressDscrAvg": float(r["stress_dscr_avg"]) if r["stress_dscr_avg"] is not None else None,
            "monitoringKpi": r["monitoring_kpi"],
            "monitoringThreshold": float(r["monitoring_threshold"]) if r["monitoring_threshold"] is not None else None,
            "trend": r["trend"], "commentary": r["commentary"],
            "assessedBy": r["assessed_by"],
            "assessedAt": r["assessed_at"].isoformat() if r["assessed_at"] else None,
            "reviewTrigger": r["review_trigger"],
        }

    return {"dealSlug": slug, "dealSector": deal_sector, "sectorSubsector": sector_sub,
            "total": len(rows), "risks": [fmt_row(r) for r in rows]}


@app.put("/api/deals/{slug}/risk-register/{risk_id}")
def update_risk_entry(slug: str, risk_id: str, body: dict):
    with get_connection() as conn:
        deal_id = _get_deal_id(conn, slug)
        prior = conn.execute(
            """SELECT id, likelihood, severity, risk_score, risk_level,
                      mitigation_party_score, mitigation_capital_score,
                      trend, commentary, assessed_by, assessed_at, review_trigger
               FROM deal_risk_register WHERE deal_id = %s AND risk_id = %s""",
            (deal_id, risk_id),
        ).fetchone()
        if not prior:
            raise HTTPException(status_code=404, detail="Risk not found in register")

        new_id_row = conn.execute(
            """UPDATE deal_risk_register SET
                status=COALESCE(%s,status), likelihood=%s, severity=%s,
                mitigation_party_score=%s, mitigation_party_name=%s, mitigation_party_detail=%s,
                mitigation_capital_score=%s, mitigation_capital_type=%s,
                mitigation_capital_provider=%s, mitigation_capital_amount=%s,
                mitigation_capital_expiry=%s, mitigation_capital_detail=%s,
                sensitised_at_origination=COALESCE(%s,sensitised_at_origination),
                sensitivity_name=%s, stress_applied=%s,
                stress_dscr_min=%s, stress_dscr_max=%s, stress_dscr_avg=%s,
                monitoring_kpi=%s, monitoring_threshold=%s,
                trend=COALESCE(%s,trend), commentary=%s, assessed_by=%s,
                assessed_at=NOW(), review_trigger=%s, updated_at=NOW()
               WHERE deal_id=%s AND risk_id=%s RETURNING id""",
            (body.get("status"), body.get("likelihood"), body.get("severity"),
             body.get("mitigationPartyScore"), body.get("mitigationPartyName"),
             body.get("mitigationPartyDetail"), body.get("mitigationCapitalScore"),
             body.get("mitigationCapitalType"), body.get("mitigationCapitalProvider"),
             body.get("mitigationCapitalAmount"), body.get("mitigationCapitalExpiry"),
             body.get("mitigationCapitalDetail"), body.get("sensitisedAtOrigination"),
             body.get("sensitivityName"), body.get("stressApplied"),
             body.get("stressDscrMin"), body.get("stressDscrMax"), body.get("stressDscrAvg"),
             body.get("monitoringKpi"), body.get("monitoringThreshold"),
             body.get("trend"), body.get("commentary"), body.get("assessedBy"),
             body.get("reviewTrigger"), deal_id, risk_id),
        ).fetchone()

        conn.execute(
            """INSERT INTO deal_risk_register_history
                (deal_id, risk_id, likelihood, severity, risk_score, risk_level,
                 mitigation_party_score, mitigation_capital_score,
                 trend, commentary, assessed_by, assessed_at, review_trigger, superseded_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (deal_id, risk_id, prior["likelihood"], prior["severity"],
             prior["risk_score"], prior["risk_level"],
             prior["mitigation_party_score"], prior["mitigation_capital_score"],
             prior["trend"], prior["commentary"],
             prior["assessed_by"], prior["assessed_at"], prior["review_trigger"],
             new_id_row["id"]),
        )
    return {"ok": True, "id": str(new_id_row["id"])}


@app.post("/api/deals/{slug}/risk-register/initialise")
def initialise_risk_register_endpoint(slug: str):
    with get_connection() as conn:
        deal_id = _get_deal_id(conn, slug)
        result = conn.execute("SELECT initialise_risk_register(%s)", (deal_id,)).fetchone()
    return {"ok": True, "rowsInserted": result[0] if result else 0}


@app.get("/api/portfolio/risk-heatmap")
def get_risk_heatmap():
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT rt.category_name, rt.category_number, drr.risk_level,
                      COUNT(DISTINCT drr.deal_id) AS deal_count,
                      SUM(d.exposure) AS total_exposure
               FROM deal_risk_register drr
               JOIN risk_taxonomy rt ON drr.risk_id = rt.risk_id
               JOIN deals d ON drr.deal_id = d.id
               WHERE drr.status = 'assessed' AND drr.risk_level IN ('high','critical','fatal')
               GROUP BY rt.category_name, rt.category_number, drr.risk_level
               ORDER BY rt.category_number, drr.risk_level"""
        ).fetchall()
    return {"heatmap": [
        {"categoryName": r["category_name"], "categoryNumber": r["category_number"],
         "riskLevel": r["risk_level"], "dealCount": r["deal_count"],
         "totalExposure": float(r["total_exposure"]) if r["total_exposure"] else 0}
        for r in rows
    ]}


@app.get("/api/portfolio/weak-mitigation")
def get_weak_mitigation():
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT d.name AS deal_name, d.slug AS deal_slug, rt.risk_name,
                      drr.risk_id, drr.risk_score, drr.risk_level,
                      drr.mitigation_party_score, drr.mitigation_capital_score, drr.commentary
               FROM deal_risk_register drr
               JOIN risk_taxonomy rt ON drr.risk_id = rt.risk_id
               JOIN deals d ON drr.deal_id = d.id
               WHERE drr.status='assessed' AND drr.risk_level IN ('high','critical','fatal')
                 AND drr.mitigation_party_score IN ('M1_none','M2_reputational')
                 AND drr.mitigation_capital_score IN ('C1_none','C2_comfort')
               ORDER BY drr.risk_score DESC"""
        ).fetchall()
    return {"items": [
        {"dealName": r["deal_name"], "dealSlug": r["deal_slug"],
         "riskId": r["risk_id"], "riskName": r["risk_name"],
         "riskScore": r["risk_score"], "riskLevel": r["risk_level"],
         "mitigationPartyScore": r["mitigation_party_score"],
         "mitigationCapitalScore": r["mitigation_capital_score"],
         "commentary": r["commentary"]}
        for r in rows
    ]}


# ═══════════════════════════════════════════════════════════════════════════════
# DEAL STRUCTURE CHILD TABLE endpoints (Phase 2)
# ═══════════════════════════════════════════════════════════════════════════════

def _json_serial(obj):
    """JSON serializer for dates and Decimals."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if hasattr(obj, "__float__"):
        return float(obj)
    return str(obj)


def _child_table_get(table: str, slug: str, order_by: str = "created_at"):
    """Generic GET for deal child tables."""
    with get_connection() as conn:
        deal_id = _get_deal_id(conn, slug)
        rows = conn.execute(
            f"SELECT * FROM {table} WHERE deal_id = %s ORDER BY {order_by}",
            (deal_id,),
        ).fetchall()
    items = []
    for r in rows:
        item = {}
        for k, v in dict(r).items():
            if k == "deal_id":
                continue
            if isinstance(v, (date, datetime)):
                item[k] = v.isoformat()
            elif hasattr(v, "__float__") and not isinstance(v, (int, float, bool)):
                item[k] = float(v)
            elif isinstance(v, uuid_mod.UUID):
                item[k] = str(v)
            else:
                item[k] = v
        items.append(item)
    return {"dealSlug": slug, "total": len(items), "items": items}



@app.get("/api/deals/{slug}/capital-structure")
def get_capital_structure(slug: str):
    return _child_table_get("capital_structure_instruments", slug, "waterfall_priority")


@app.get("/api/deals/{slug}/enforcement-classes")
def get_enforcement_classes(slug: str):
    return _child_table_get("enforcement_classes", slug, "priority")


@app.get("/api/deals/{slug}/corporate-entities")
def get_corporate_entities(slug: str):
    return _child_table_get("corporate_entities", slug, "entity_type")


@app.get("/api/deals/{slug}/counterparties")
def get_counterparties(slug: str):
    return _child_table_get("deal_counterparties", slug, "counterparty_type")


@app.get("/api/deals/{slug}/reserve-accounts")
def get_reserve_accounts(slug: str):
    return _child_table_get("deal_reserve_accounts", slug, "account_type")


@app.get("/api/deals/{slug}/hedge-portfolio")
def get_hedge_portfolio(slug: str):
    return _child_table_get("hedge_portfolio", slug, "maturity")


@app.get("/api/deals/{slug}/development-phases")
def get_development_phases(slug: str):
    return _child_table_get("deal_development_phases", slug, "phase_number")


@app.get("/api/deals/{slug}/investor-allocations")
def get_investor_allocations(slug: str):
    return _child_table_get("investor_allocations", slug, "investor_name")


@app.get("/api/deals/{slug}/intercreditor")
def get_intercreditor(slug: str):
    with get_connection() as conn:
        deal_id = _get_deal_id(conn, slug)
        row = conn.execute(
            "SELECT * FROM intercreditor_terms WHERE deal_id = %s", (deal_id,)
        ).fetchone()
    if not row:
        return {"dealSlug": slug, "terms": None}
    terms = {}
    for k, v in dict(row).items():
        if k in ("id", "deal_id", "created_at", "updated_at"):
            continue
        terms[k] = v
    return {"dealSlug": slug, "terms": terms}


@app.get("/api/deals/{slug}/financial-template")
def get_financial_template(slug: str):
    with get_connection() as conn:
        deal_id = _get_deal_id(conn, slug)
        row = conn.execute(
            "SELECT * FROM deal_financial_template WHERE deal_id = %s", (deal_id,)
        ).fetchone()
    if not row:
        return {"dealSlug": slug, "template": None}
    return {
        "dealSlug": slug,
        "template": {
            "sectorTemplate": row["sector_template"],
            "revenueLineLabels": row["revenue_line_labels"],
            "costLineLabels": row["cost_line_labels"],
            "capexLineLabels": row["capex_line_labels"],
            "sectorKpiLabels": row["sector_kpi_labels"],
        },
    }
