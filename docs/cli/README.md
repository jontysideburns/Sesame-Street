# CLI Manual

Purpose: operator-facing command line interface for driving the demo backend.
Audience: engineering, QA, demos, and internal operators.
Status: current

The CLI lives at [app/cli.py](/Users/ericbroda/Development/scratch/sesamestreet/app/cli.py).

Run commands as:

```bash
python3 "${PROJECT_DIR}/app/cli.py" <command> [options]
```

Global options:

- `--base-url` overrides the API root. Default: `http://localhost:4000`
- `--viewer` passes a viewer name to scoped read endpoints
- `--json` prints raw JSON instead of the default human-readable output

## Commands

### `submit-document`

Submit a local file into the intake pipeline through the API.

```bash
python3 "${PROJECT_DIR}/app/cli.py" submit-document \
  "${PROJECT_DIR}/scratch/Aurora Prime Q2 2026 Compliance Certificate.txt" \
  --source-channel cli_submit
```

Options:

- `--source-channel` labels the submission source. Default: `cli_submit`
- `--sender` sets the sender field on the intake document
- `--subject` sets the subject field on the intake document
- `--period-label` explicitly sets the reporting period

Behavior:

- reads the file locally
- base64-encodes it
- sends it to `POST /api/intake/submit`
- the server writes the file into its intake directory and immediately runs the normal intake ingestion pipeline
- deal matching and document-type classification are inferred by the backend rather than provided on the CLI

### `intake-status`

List recent intake documents and watcher status.

```bash
python3 "${PROJECT_DIR}/app/cli.py" intake-status
python3 "${PROJECT_DIR}/app/cli.py" intake-status --limit 20
```

### `review-queue`

List pending review items.

```bash
python3 "${PROJECT_DIR}/app/cli.py" review-queue
```

### `approve-review`

Approve a review item by ID.

```bash
python3 "${PROJECT_DIR}/app/cli.py" approve-review 12
```

### `triage-document`

Apply a triage action to an incoming document.

```bash
python3 "${PROJECT_DIR}/app/cli.py" triage-document 7 --action send_to_review
python3 "${PROJECT_DIR}/app/cli.py" triage-document 7 --action assign_deal --deal-slug aurora-prime-data-campus
python3 "${PROJECT_DIR}/app/cli.py" triage-document 7 --action mark_duplicate
python3 "${PROJECT_DIR}/app/cli.py" triage-document 7 --action close
```

Supported actions:

- `assign_deal`
- `send_to_review`
- `mark_duplicate`
- `close`

### `set-demo-clock`

Update the operating date used by the demo.

```bash
python3 "${PROJECT_DIR}/app/cli.py" set-demo-clock 2026-09-10 \
  --clock-label "Quarter-end readiness week" \
  --updated-by "Configuration Workspace"
```

### `deal`

Fetch a deal summary by slug.

```bash
python3 "${PROJECT_DIR}/app/cli.py" deal aurora-prime-data-campus --json
```

### `portfolio`

Fetch the top-level portfolio response.

```bash
python3 "${PROJECT_DIR}/app/cli.py" portfolio --json
```

### `health`

Check the API `/health` endpoint plus watcher status from `/api/intake`.

```bash
python3 "${PROJECT_DIR}/app/cli.py" health
```

## Notes

- The CLI is an operator surface, not an end-user feature.
- `submit-document` goes through the API rather than copying files directly into the watch directory.
- The CLI defaults to the first active viewer when `--viewer` is omitted, matching current backend behavior.
- For deeply nested responses like `deal` and `portfolio`, `--json` is usually the most useful output mode.
