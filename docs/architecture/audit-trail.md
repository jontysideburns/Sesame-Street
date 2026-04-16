# Audit-trail architecture

## Purpose

Every data point displayed on a deal's TopSheet must be traceable back to the source document that provided it — with page and snippet precision. This document describes the platform's provenance architecture so that:

- The ingestion engine knows what to write on every `INSERT`.
- The TopSheet UI knows where to look for citations when a user clicks the 📎 icon next to any field.
- A snapshot saved to an IC pack three months ago is still fully auditable, even if the underlying documents have been superseded since.

## Status

Scaffolded (2026-04-15). Columns and tables exist; population is not yet enforced. A follow-up migration at the real-client cutover will flip the scaffolding into hard constraints (`NOT NULL`, `CHECK` on `field_key` regex, trigger-based immutability on pinned citations).

## Four-layer model

1. **Bronze — raw intake.** `incoming_documents` stores every file the platform has ever seen: file path, size, SHA-256 checksum, MIME type, sender, source channel. Retained indefinitely, immutable. A file is "received" the moment this row exists.
2. **Canonical — processed document.** `documents` is the promoted, classified version: which deal, what period, what type (rating report, compliance certificate, audited financials, …), with a representative page + snippet for UI display. Linked back to `incoming_documents.canonical_document_id`.
3. **Field provenance — per-row, per-value.** Two complementary mechanisms:
   - **Row-level pointer columns** on every deal-scoped table. Every row can name its source document (`source_document_id`), page (`source_page`), snippet (`source_snippet`), extractor (`source_extracted_by`), and extraction time (`source_extracted_at`).
   - **Column-level citations** in `evidence_citations` using the `field_key` convention. Used when a scalar field on a row has a different source from the row itself, or when multiple citations exist for one value.
4. **Snapshot pinning — frozen audit record.** When a TopSheet snapshot is taken (IC pack, covenant-test pack, waiver record), the engine walks every rendered field and writes one row into `topsheet_snapshot_field_citations`. Those rows are immutable and CASCADE-deleted with the snapshot. This guarantees reproducibility even after sources supersede.

## The five-column provenance block

Every deal-scoped table that powers the TopSheet carries the same five columns. Pattern matches what `actual_periods` has carried for financial data since the first schema:

```sql
source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL
source_page         INTEGER
source_snippet      TEXT
source_extracted_by TEXT   -- 'topsheet_importer' | 'manual' | 'ai_extraction:<model>' | '<Agency> Report' | ...
source_extracted_at TIMESTAMPTZ
```

Indexed on `source_document_id` so you can pivot any way ("every field that came from doc #42").

### Tables covered (17 tables, 85 columns)

| Area | Tables |
|---|---|
| Capital stack | `capital_structure_instruments`, `corporate_entities`, `deal_jurisdiction_splits` |
| Covenants & tests | `covenant_thresholds`, `deal_distribution_conditions`, `deal_eod_register`, `deal_trigger_events` |
| Counterparties & reserves | `deal_counterparties`, `deal_reserve_accounts`, `hedge_portfolio` |
| Risk & KPIs | `deal_risk_register` (KPI scenario series live in `forecast_period_items` under `forecast_cases`; see [kpi-scenarios.md](kpi-scenarios.md)) |
| Lifecycle & governance | `deal_amendments`, `deal_consent_mechanics`, `deal_development_phases`, `deal_obligation_register`, `deal_onboarding_snapshots` |

Tables already carrying provenance (no change needed): `actual_periods`, `period_financial_items`, `deal_kpi_observations`, `financial_periods`, `forecast_model_metadata`, `ratio_reconciliations`, `risk_register_entries` (legacy), `deal_reporting_periods` (via `source_document_id`).

### Tables deliberately NOT getting the block

- `deals` scalar fields (enterprise_value, borrower_lei, sponsor_name, grade, deal_overview, etc.): too many columns per row, and different fields usually come from different documents. These use **column-level `evidence_citations`** instead (see next section).

## `evidence_citations.field_key` convention

`evidence_citations` is the universal evidence store. Every row points to a document page + snippet, and carries a `field_key` that names what the citation is for. The convention — documented as a `COMMENT` on the column, and destined for a `CHECK` constraint at cutover — is:

| Pattern | When to use | Example |
|---|---|---|
| `{table}:{pk_or_natural_id}` | Whole-row citation | `capital_structure_instruments:15` |
| `{table}.{column}:{pk_or_natural_id}` | Single-column citation within a row | `deals.enterprise_value:26` |
| `{table}:{natural_id}` | When the row's logical key is not the numeric PK | `deal_risk_register:RISK-ST-008` |

**Regex (for future CHECK):** `^[a-z_]+(\.[a-z_]+)?:[A-Za-z0-9_-]+$`

Rules:

- Lowercase table and column names exactly as they appear in SQL.
- Unquoted PK or natural_id, colon-separated.
- One citation per supporting quote/page — a single field can have many citations (primary source, amendment, waiver).

## Snapshot pinning — `topsheet_snapshot_field_citations`

When a TopSheet snapshot is taken (`deal_topsheet_snapshots`), the snapshot engine walks every rendered field, resolves its citation from the live mechanisms above, and writes one row per field into `topsheet_snapshot_field_citations` with the same `field_key` convention. The row copies — not references — the citation's snippet, page and document pointer. Columns:

```sql
snapshot_id         INTEGER NOT NULL REFERENCES deal_topsheet_snapshots(id) ON DELETE CASCADE
field_key           TEXT NOT NULL
source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL
source_page         INTEGER
source_cell_ref     TEXT
source_snippet      TEXT
source_extracted_by TEXT
source_confidence   NUMERIC(5,2)
pinned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE (snapshot_id, field_key)
```

Why copy and not reference? Because if the source document is later **superseded** (audited replaces unaudited, CTA amendment replaces original), the historical snapshot must still show the original citation as it was at capture time. Foreign-key references would update or break. Copies don't.

`source_document_id` stays a foreign key so we can still find the file if it's still there, but `ON DELETE SET NULL` keeps the snippet and page even if the document gets purged.

This table is complementary to — not a replacement for — `topsheet_snapshot_provenance`, which records **event-level** provenance ("why was this snapshot taken? what triggered it?"). The new table is **field-level** ("what sourced each number inside the snapshot?").

## Helper view — `v_topsheet_field_audit_status`

A read-only view returning one row per `(deal_id, table_name)` with `total_rows` and `missing_count`. Use:

```sql
-- Production: must be empty
SELECT * FROM v_topsheet_field_audit_status WHERE missing_count > 0;

-- Dashboard: coverage %
SELECT deal_id,
       SUM(total_rows)     AS total,
       SUM(missing_count)  AS missing,
       ROUND(100.0 * (1 - SUM(missing_count)::numeric / NULLIF(SUM(total_rows),0)), 1) AS coverage_pct
FROM v_topsheet_field_audit_status
GROUP BY deal_id;
```

In the demo portfolio, every row returns `missing_count = total_rows` (100% missing). That's the expected baseline.

## Worked example — Gatwick's enterprise value

Suppose the TopSheet renders **Enterprise Value: £6,500,000,000** for Gatwick (deal `id=26`). The provenance chain:

1. `incoming_documents` row for `Fitch A.pdf`, SHA-256 `9a6b1edc…`, received 2025-11-12.
2. `documents` row `id=42`, `document_name='Fitch — Gatwick Funding BBB+ affirm + GAF BB(EXP) new (12 Nov 2025)'`, promoted from intake #1.
3. `evidence_citations` row:
   - `canonical_document_id = 42`
   - `field_key = 'deals.enterprise_value:26'`
   - `page_number = 3`
   - `text_snippet = 'Consolidated net debt/EBITDA peaks at 7.2x in 2027...'`
4. TopSheet renders `£6.5bn` with a 📎 icon. User clicks → UI queries `evidence_citations WHERE field_key = 'deals.enterprise_value:26'` → shows the snippet + page + link to the PDF.
5. When an IC pack snapshot is taken on 2026-06-30, `topsheet_snapshot_field_citations` gets a row for `(snapshot_id=N, field_key='deals.enterprise_value:26', source_document_id=42, source_page=3, source_snippet='Consolidated net debt/EBITDA peaks at 7.2x in 2027...')`. That row is immutable.
6. In 2026-12, Fitch issues a new report. `incoming_documents` gets a new row, `documents` gets a new canonical row, `document_supersessions` records the superseding relationship, and `evidence_citations` gets fresh rows pointing at the new document. **The 2026-06-30 snapshot remains unchanged** because its pinned citations are copies, not pointers.

## Real-client cutover — the hard-enforcement migration

At the point of onboarding the first real client, a new migration will:

1. Run the ingestion engine against every real deal and populate `source_document_id` on every new row.
2. `ALTER TABLE <tbl> ALTER COLUMN source_document_id SET NOT NULL` on every scaffolded table.
3. `ALTER TABLE evidence_citations ADD CONSTRAINT evidence_citations_field_key_format CHECK (field_key ~ '^[a-z_]+(\.[a-z_]+)?:[A-Za-z0-9_-]+$')`.
4. Add a BEFORE UPDATE trigger on `topsheet_snapshot_field_citations` that raises if any field changes after insert (immutability).
5. Add a CI check wired to `v_topsheet_field_audit_status`: fail any pipeline that would merge a row where `missing_count > 0` for any production deal.

The dummy-portfolio rows (with all `source_document_id IS NULL`) stay untouched — they'll either be deleted on cutover or migrated to `document_type='manual_demo_seed'` records as a one-off.

## Ingestion engine contract

Every importer that writes to a scaffolded table must supply, on every `INSERT`:

- `source_document_id` — the `documents.id` that sourced this row.
- `source_page` — where in the PDF / sheet.
- `source_snippet` — the extracted quote (≤ 500 char typical).
- `source_extracted_by` — one of:
  - `'manual'` — analyst hand-entered (low confidence, must include snippet justifying).
  - `'topsheet_importer'` — Excel TopSheet v9 template pipeline.
  - `'email_ingestion'` — email intake parser.
  - `'ai_extraction:<model-id>'` — AI extraction (e.g. `'ai_extraction:claude-sonnet-4.6'`).
  - `'rating_agency:<agency>'` — credit-agency feed.
- `source_extracted_at` — extraction timestamp (NOW() is fine at write-time).

For scalar deal fields (`deals.*`), also write one `evidence_citations` row per scalar field touched, using the `deals.<column>:<deal_id>` `field_key`.

## Related tables (for reference)

- `documents` — canonical document record. `(id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet)`.
- `incoming_documents` — raw intake. Links via `canonical_document_id`.
- `evidence_citations` — universal field-level citations. `field_key` names the field.
- `document_supersessions` — audited replaces unaudited; tracks prior versions and downstream recomputation.
- `document_processing_runs` — stage-level extraction audit (classify / extract / validate / commit).
- `ai_audit_logs` — AI model provenance (prompt, tool calls, model version).
- `incoming_document_proposals` — pre-approval field-level proposals from AI extraction (Bronze → Silver gate).
- `topsheet_snapshot_provenance` — event-level ("why was this snapshot taken") context.
- `topsheet_snapshot_field_citations` — field-level pinned citations (this doc's focus).
- `v_topsheet_field_audit_status` — coverage view across all scaffolded tables.
