# Sesame Street - V2

Private Markets Debt Monitoring Platform.

This repository contains a runnable investor-demo application for private markets debt monitoring. At a high level, the system is designed to:

- receive borrower documents and monitoring inputs
- turn those inputs into reviewable proposed facts
- commit approved facts into canonical deal state
- project that state into portfolio, deal, covenant, compliance, and reporting views

The current implementation is a focused demo, not the full target platform. It is intentionally centered on a flagship workflow:

- portfolio dashboard
- flagship deal TopSheet for `Aurora Prime Data Campus`
- covenant drilldown for `Senior DSCR`
- overdue obligation and compliance review workflow

V1 code is preserved at git tag `v1`.

## Quick Start

These commands assume `PROJECT_DIR` points to the repository root.

1. Install client dependencies:

```bash
cd "${PROJECT_DIR}/client"
npm install
```

2. Create a Python environment for the server:

```bash
source "${PROJECT_DIR}/bin/environment.sh"
source "${PROJECT_DIR}/bin/vactivate.sh"
pip install -r "${PROJECT_DIR}/server/requirements.txt"
```

3. Start PostgreSQL:

```bash
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" up -d postgres
```

4. Start the server:

```bash
cd "${PROJECT_DIR}"
uvicorn server.main:app --reload --host 0.0.0.0 --port 4000
```

5. In another terminal, start the client:

```bash
cd "${PROJECT_DIR}/client"
npm run dev
```

6. Open the app:

```text
http://localhost:3000
```

7. Submit a sample intake document:

```bash
COMPLIANCE_CERTIFICATE="${PROJECT_DIR}/scratch/Aurora Prime Q2 2026 Compliance Certificate.txt"
python3 "${PROJECT_DIR}/app/cli.py" submit-document \
  "$COMPLIANCE_CERTIFICATE" \
  --source-channel cli_submit
```

This sends the sample compliance certificate into the backend intake pipeline through the API in the same shape as a normal submission. The server stores the file in its intake directory, infers document metadata from the submission itself, runs classification and extraction, and routes the resulting proposals into auto-commit, review, or triage as appropriate.

To reset the seeded demo state:

```bash
"${PROJECT_DIR}/app/clear.sh"
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" up -d postgres
```

## High-Level Architecture

The current repo is a simple three-part application:

- Next.js frontend in `client/`
- FastAPI backend in `server/`
- PostgreSQL schema and seeded demo data in `postgres/init.sql`

Conceptually, the system is organized as an operational monitoring flow:

1. Documents and incoming borrower information enter the system.
2. The platform classifies, extracts, and stages proposed facts.
3. Deterministic checks and human approval decide what becomes canonical.
4. Canonical state drives portfolio, deal, covenant, compliance, and reporting views.

That means the product behaves more like a transactional workflow and monitoring system than a pure analytics application. Analytical views exist, but they are downstream projections over approved operational state.

## Documentation

Detailed docs live under `docs/`:

- `docs/private_markets_debt_monitoring_platform.md` — Markdown version of the broader requirements source
- `docs/Private Markets Debt Monitoring Platform.docx` — Original Word document for the broader requirements source
- `docs/cli/README.md` — Operator CLI manual and command reference
- `docs/demo/getting-started.md` — Detailed local setup and troubleshooting for the runnable demo
- `docs/demo/implementation.md` — Consolidated current-state implementation guide
- `docs/demo/demo-script.md` — Presenter narrative for the investor demo flow
- `docs/architecture/business.md` — High-level business and workflow reference
- `docs/architecture/data.md` — High-level data model and processing reference
- `docs/roadmap/feature-registry.md` — Broader platform feature map and dependency plan
- `docs/roadmap/target-snowflake.md` — Future-state Snowflake implementation target

## Useful Commands

Start the full Dockerized stack from existing images:

```bash
"${PROJECT_DIR}/bin/build-all-images.sh"
"${PROJECT_DIR}/app/startd.sh" up
```

Stop the stack:

```bash
"${PROJECT_DIR}/app/startd.sh" down
```

CLI help:

```bash
python3 "${PROJECT_DIR}/app/cli.py" --help
python3 "${PROJECT_DIR}/app/cli.py" submit-document --help
```

Open a SQL prompt in the Postgres container:

```bash
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" exec postgres \
  psql -U sesame -d sesamestreet
```

List tables:

```bash
"${PROJECT_DIR}/app/sql.sh" "\dt"
```

View individual tables:

```bash
"${PROJECT_DIR}/app/sql.sh" "SELECT id, slug, name, borrower, exposure, status FROM deals ORDER BY exposure DESC;"
"${PROJECT_DIR}/app/sql.sh" "SELECT id, deal_id, code, name, current_value, threshold_lockup, threshold_trigger, status FROM covenants ORDER BY deal_id;"
"${PROJECT_DIR}/app/sql.sh" "SELECT id, covenant_id, period_label, dscr, expected_dscr FROM covenant_history ORDER BY covenant_id, id;"
"${PROJECT_DIR}/app/sql.sh" "SELECT id, deal_id, code, title, due_date, status, days_overdue, grace_days FROM obligations ORDER BY due_date;"
"${PROJECT_DIR}/app/sql.sh" "SELECT id, deal_id, document_type, document_name, period_label, status, received_at FROM documents ORDER BY received_at DESC;"
"${PROJECT_DIR}/app/sql.sh" "SELECT id, deal_id, proposal_type, field_name, proposed_value, confidence, status FROM review_items ORDER BY id;"
```

Useful joins:

```bash
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, d.name, c.name AS covenant_name, c.current_value AS dscr, c.threshold_lockup, c.threshold_trigger, c.status AS covenant_status FROM deals d JOIN covenants c ON c.deal_id = d.id ORDER BY d.exposure DESC;"
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, o.title, o.due_date, o.status, o.days_overdue, o.grace_days FROM deals d JOIN obligations o ON o.deal_id = d.id ORDER BY o.due_date, d.slug;"
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, doc.document_name, doc.document_type, doc.period_label, doc.status AS document_status, doc.evidence_page FROM deals d JOIN documents doc ON doc.deal_id = d.id ORDER BY doc.received_at DESC;"
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, r.field_name, r.proposed_value, r.confidence, r.status AS review_status, r.document_name, r.page_number FROM deals d JOIN review_items r ON r.deal_id = d.id ORDER BY d.slug, r.id;"
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, c.name AS covenant_name, h.period_label, h.dscr, h.expected_dscr FROM deals d JOIN covenants c ON c.deal_id = d.id JOIN covenant_history h ON h.covenant_id = c.id ORDER BY d.slug, h.id;"
"${PROJECT_DIR}/app/sql.sh" "SELECT d.slug, d.name, c.current_value AS dscr, o.title AS overdue_item, o.days_overdue, doc.document_name, r.field_name, r.proposed_value FROM deals d LEFT JOIN covenants c ON c.deal_id = d.id LEFT JOIN obligations o ON o.deal_id = d.id AND o.status = 'overdue' LEFT JOIN documents doc ON doc.deal_id = d.id LEFT JOIN review_items r ON r.deal_id = d.id AND r.status = 'pending' WHERE d.slug = 'aurora-prime-data-campus' ORDER BY doc.received_at DESC NULLS LAST, r.id;"
```

## Retrieving V1 Files

```bash
# View all v1 files
git show v1 --name-only

# Retrieve a specific file
git checkout v1 -- path/to/file

# Browse v1 in full
git log v1
```
