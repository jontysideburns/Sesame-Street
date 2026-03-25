#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


DEFAULT_BASE_URL = os.environ.get("SESAME_API_BASE_URL", "http://localhost:4000")
DEFAULT_VIEWER = os.environ.get("SESAME_VIEWER")


class ApiError(RuntimeError):
    pass


def build_url(base_url: str, path: str, params: dict | None = None):
    query = urllib.parse.urlencode(
        {key: value for key, value in (params or {}).items() if value is not None}
    )
    suffix = f"?{query}" if query else ""
    return f"{base_url.rstrip('/')}{path}{suffix}"


def api_request(base_url: str, method: str, path: str, *, params: dict | None = None, payload: dict | None = None):
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        build_url(base_url, path, params),
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        try:
            parsed = json.loads(detail)
            detail = parsed.get("detail", detail)
        except json.JSONDecodeError:
            pass
        raise ApiError(f"{exc.code} {exc.reason}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ApiError(f"Unable to reach API at {base_url}: {exc.reason}") from exc


def print_json(data):
    print(json.dumps(data, indent=2, sort_keys=True))


def print_kv(rows: list[tuple[str, object]]):
    width = max(len(label) for label, _ in rows) if rows else 0
    for label, value in rows:
        print(f"{label.ljust(width)}  {value}")


def print_table(rows: list[dict], columns: list[tuple[str, str]]):
    if not rows:
        print("(none)")
        return

    widths = []
    for key, title in columns:
        width = len(title)
        for row in rows:
            width = max(width, len(str(row.get(key, ""))))
        widths.append(width)

    header = "  ".join(title.ljust(width) for (_, title), width in zip(columns, widths))
    divider = "  ".join("-" * width for width in widths)
    print(header)
    print(divider)
    for row in rows:
        print(
            "  ".join(
                str(row.get(key, "")).ljust(width)
                for (key, _), width in zip(columns, widths)
            )
        )


def cmd_submit_document(args):
    file_path = Path(args.file_path).expanduser()
    if not file_path.is_file():
        raise ApiError(f"File not found: {file_path}")

    payload = {
        "fileName": file_path.name,
        "contentBase64": base64.b64encode(file_path.read_bytes()).decode("ascii"),
        "sourceChannel": args.source_channel,
        "sender": args.sender,
        "subject": args.subject,
        "periodLabel": args.period_label,
    }
    result = api_request(args.base_url, "POST", "/api/intake/submit", payload=payload)
    if args.json:
        print_json(result)
        return
    print_kv(
        [
            ("Submitted", result["submitted"]),
            ("Incoming ID", result["incomingDocumentId"]),
            ("File", result["fileName"]),
            ("Intake Path", result["intakePath"]),
            ("Source Channel", result["sourceChannel"]),
            ("Document Type", result["documentType"] or "-"),
            ("Period", result["periodLabel"] or "-"),
            ("Stage", result["currentStage"]),
            ("Status", result["processingStatus"]),
        ]
    )


def cmd_intake_status(args):
    result = api_request(
        args.base_url,
        "GET",
        "/api/intake",
        params={"viewer": args.viewer},
    )
    documents = result.get("documents", [])[: args.limit]
    if args.json:
        print_json({"watcher": result.get("watcher"), "documents": documents})
        return

    print("Watcher")
    print_kv(
        [
            ("Directory", result["watcher"]["directory"]),
            ("Last Scan", result["watcher"]["lastScanAt"] or "-"),
            ("Last Error", result["watcher"]["lastError"] or "-"),
            ("Tracked Files", result["watcher"]["trackedFiles"]),
            ("New Last Scan", result["watcher"]["newFilesInLastScan"]),
        ]
    )
    print()
    print("Documents")
    print_table(
        [
            {
                "id": row["id"],
                "fileName": row["fileName"],
                "documentType": row["documentType"] or "-",
                "periodLabel": row["periodLabel"] or "-",
                "currentStage": row["currentStage"],
                "processingStatus": row["processingStatus"],
                "confidence": row["confidence"],
            }
            for row in documents
        ],
        [
            ("id", "ID"),
            ("fileName", "File"),
            ("documentType", "Type"),
            ("periodLabel", "Period"),
            ("currentStage", "Stage"),
            ("processingStatus", "Status"),
            ("confidence", "Confidence"),
        ],
    )


def cmd_review_queue(args):
    result = api_request(args.base_url, "GET", "/api/review-queue")
    items = result[: args.limit]
    if args.json:
        print_json(items)
        return

    print_table(
        [
            {
                "id": row["id"],
                "dealName": row["dealName"],
                "fieldName": row["fieldName"],
                "proposedValue": row["proposedValue"],
                "confidence": row["confidence"],
                "status": row["status"],
            }
            for row in items
        ],
        [
            ("id", "ID"),
            ("dealName", "Deal"),
            ("fieldName", "Field"),
            ("proposedValue", "Proposed Value"),
            ("confidence", "Confidence"),
            ("status", "Status"),
        ],
    )


def cmd_approve_review(args):
    result = api_request(
        args.base_url,
        "POST",
        f"/api/review-queue/{args.review_id}/approve",
    )
    if args.json:
        print_json(result)
        return
    print(f"Approved review item {args.review_id}.")


def cmd_triage_document(args):
    payload = {"action": args.action, "dealSlug": args.deal_slug}
    result = api_request(
        args.base_url,
        "POST",
        f"/api/compliance/incoming-documents/{args.document_id}/triage",
        payload=payload,
    )
    if args.json:
        print_json(result)
        return
    print(f"Applied triage action '{args.action}' to incoming document {args.document_id}.")


def cmd_set_demo_clock(args):
    payload = {
        "currentDemoDate": args.current_demo_date,
        "clockLabel": args.clock_label,
        "updatedBy": args.updated_by or args.viewer or "CLI Operator",
    }
    result = api_request(
        args.base_url,
        "POST",
        "/api/demo-clock",
        params={"viewer": args.viewer},
        payload=payload,
    )
    if args.json:
        print_json(result)
        return
    print_kv(
        [
            ("Current Demo Date", result["currentDemoDate"]),
            ("Clock Label", result["clockLabel"]),
            ("Updated By", result["updatedBy"]),
            ("Updated At", result["updatedAt"]),
        ]
    )


def cmd_deal(args):
    result = api_request(
        args.base_url,
        "GET",
        f"/api/deals/{args.slug}",
        params={"viewer": args.viewer},
    )
    print_json(result)


def cmd_portfolio(args):
    result = api_request(
        args.base_url,
        "GET",
        "/api/portfolio",
        params={"viewer": args.viewer},
    )
    print_json(result)


def cmd_health(args):
    health = api_request(args.base_url, "GET", "/health")
    intake = api_request(
        args.base_url,
        "GET",
        "/api/intake",
        params={"viewer": args.viewer},
    )
    combined = {"health": health, "watcher": intake.get("watcher", {})}
    if args.json:
        print_json(combined)
        return
    print_kv(
        [
            ("API OK", health.get("ok")),
            ("Watcher Directory", intake["watcher"]["directory"]),
            ("Watcher Last Scan", intake["watcher"]["lastScanAt"] or "-"),
            ("Watcher Last Error", intake["watcher"]["lastError"] or "-"),
            ("Tracked Files", intake["watcher"]["trackedFiles"]),
            ("New Last Scan", intake["watcher"]["newFilesInLastScan"]),
        ]
    )


def build_parser():
    parser = argparse.ArgumentParser(description="Sesame Street operator CLI")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL")
    parser.add_argument("--viewer", default=DEFAULT_VIEWER, help="Viewer name for scoped API calls")
    parser.add_argument("--json", action="store_true", help="Print raw JSON responses")

    subparsers = parser.add_subparsers(dest="command", required=True)

    submit = subparsers.add_parser("submit-document", help="Submit a document into intake")
    submit.add_argument("file_path", help="Path to the file to submit")
    submit.add_argument("--source-channel", default="cli_submit", help="Source channel label")
    submit.add_argument("--sender", help="Sender label")
    submit.add_argument("--subject", help="Submission subject")
    submit.add_argument("--period-label", help="Explicit reporting period override, e.g. Q2 2026")
    submit.set_defaults(func=cmd_submit_document)

    intake = subparsers.add_parser("intake-status", help="List recent intake documents and stages")
    intake.add_argument("--limit", type=int, default=10, help="Maximum number of documents to show")
    intake.set_defaults(func=cmd_intake_status)

    review = subparsers.add_parser("review-queue", help="List pending review items")
    review.add_argument("--limit", type=int, default=10, help="Maximum number of review items to show")
    review.set_defaults(func=cmd_review_queue)

    approve = subparsers.add_parser("approve-review", help="Approve a review item")
    approve.add_argument("review_id", type=int, help="Review item ID")
    approve.set_defaults(func=cmd_approve_review)

    triage = subparsers.add_parser("triage-document", help="Apply a triage action to an incoming document")
    triage.add_argument("document_id", type=int, help="Incoming document ID")
    triage.add_argument(
        "--action",
        required=True,
        choices=["assign_deal", "send_to_review", "mark_duplicate", "close"],
        help="Triage action",
    )
    triage.add_argument("--deal-slug", help="Required with --action assign_deal")
    triage.set_defaults(func=cmd_triage_document)

    clock = subparsers.add_parser("set-demo-clock", help="Update the demo operating date")
    clock.add_argument("current_demo_date", help="New demo date in YYYY-MM-DD format")
    clock.add_argument("--clock-label", help="Optional label to show in the UI")
    clock.add_argument("--updated-by", help="Actor name for the change")
    clock.set_defaults(func=cmd_set_demo_clock)

    deal = subparsers.add_parser("deal", help="Fetch a deal summary")
    deal.add_argument("slug", help="Deal slug")
    deal.set_defaults(func=cmd_deal)

    portfolio = subparsers.add_parser("portfolio", help="Fetch the portfolio summary")
    portfolio.set_defaults(func=cmd_portfolio)

    health = subparsers.add_parser("health", help="Check API and watcher status")
    health.set_defaults(func=cmd_health)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
