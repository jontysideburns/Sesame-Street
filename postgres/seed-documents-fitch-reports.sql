-- ═══════════════════════════════════════════════════════════════════════════════
-- Document intake seed — Fitch rating reports for Gatwick + Getlink
-- ═══════════════════════════════════════════════════════════════════════════════
-- Logs the Fitch PDFs against their deals using the platform's standard
-- two-tier intake model:
--   1. incoming_documents — raw intake record (file path, checksum, size)
--   2. documents          — canonical / processed record with snippet
--   3. evidence_citations — field-level provenance linking specific risks
--      in deal_risk_register to the pages in the PDFs that support them.
--
-- This gives us reinterrogability: any risk register row can trace back to
-- the exact page + quote that sourced it, and the raw PDF is reachable via
-- the checksum + intake_source_path.
--
-- Idempotent: ON CONFLICT on checksum / document_name guards.
-- Apply with:
--   docker exec -i docker-postgres-1 psql -U sesame -d sesamestreet < postgres/seed-documents-fitch-reports.sql

-- ─── Idempotency helpers ──────────────────────────────────────────────────────
-- There's no unique constraint on incoming_documents.checksum or documents,
-- so we NOT EXISTS-guard each insert.

-- ─── 1. INCOMING DOCUMENTS ────────────────────────────────────────────────────

-- Gatwick: Fitch A (GF Class A affirm + GAF expected rating, 12 Nov 2025)
INSERT INTO incoming_documents (
    deal_id, intake_source_path, raw_storage_status, directory_observed_at,
    fingerprinted_at, source_channel, sender, subject, file_name,
    file_size_bytes, checksum, mime_type, document_type,
    classification_status, processing_status, current_stage,
    review_tier, confidence, received_at, last_updated_at, notes
)
SELECT d.id,
    'C:\Users\jpste\OneDrive\Documents\TAMC\LGW\Fitch A.pdf',
    'retained', '2026-04-15 12:00:00+00'::timestamptz,
    '2026-04-15 12:00:00+00'::timestamptz, 'manual_upload',
    'Fitch Ratings', 'Fitch Rates Gatwick Finance''s New Notes at BB(EXP); Affirms Gatwick Funding''s Notes at BBB+',
    'Fitch A.pdf',
    14385840, '9a6b1edc373a76ae2ce7dc76a9c530e6ff26dd81bc9d72c1e3b3c26c9312efb6',
    'application/pdf', 'rating_report',
    'classified', 'processed', 'canonical_linked',
    'analyst', 0.99, '2025-11-12 13:42:00+00'::timestamptz,
    now(), 'Fitch rating action on GAF expected rating (BB(EXP)/Stable) and GF Class A affirmation (BBB+/Stable), 12 Nov 2025.'
FROM deals d
WHERE d.slug = 'gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM incoming_documents idoc
    WHERE idoc.deal_id = d.id
      AND idoc.checksum = '9a6b1edc373a76ae2ce7dc76a9c530e6ff26dd81bc9d72c1e3b3c26c9312efb6'
  );

-- Gatwick: Fitch MidCo (final rating on GAF, 21 Nov 2025)
INSERT INTO incoming_documents (
    deal_id, intake_source_path, raw_storage_status, directory_observed_at,
    fingerprinted_at, source_channel, sender, subject, file_name,
    file_size_bytes, checksum, mime_type, document_type,
    classification_status, processing_status, current_stage,
    review_tier, confidence, received_at, last_updated_at, notes
)
SELECT d.id,
    'C:\Users\jpste\OneDrive\Documents\TAMC\LGW\FitchMidco.pdf',
    'retained', '2026-04-15 12:00:00+00'::timestamptz,
    '2026-04-15 12:00:00+00'::timestamptz, 'manual_upload',
    'Fitch Ratings', 'Fitch Rates Gatwick Airport Finance Plc''s Notes ''BB''; Outlook Stable',
    'FitchMidco.pdf',
    10374082, '5cdb0d893d1c88771d6f129c4e0f51ab47a74a0061de956e82587132114ae541',
    'application/pdf', 'rating_report',
    'classified', 'processed', 'canonical_linked',
    'analyst', 0.99, '2025-11-21 18:11:00+00'::timestamptz,
    now(), 'Fitch final rating on GAF GBP475m 6% 2030 bond (XS3221827911): BB/Stable, 21 Nov 2025. Supersedes the 12 Nov expected rating.'
FROM deals d
WHERE d.slug = 'gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM incoming_documents idoc
    WHERE idoc.deal_id = d.id
      AND idoc.checksum = '5cdb0d893d1c88771d6f129c4e0f51ab47a74a0061de956e82587132114ae541'
  );

-- Getlink / Eurotunnel: Fitch affirms CLEF + GET (4 Apr 2024)
INSERT INTO incoming_documents (
    deal_id, intake_source_path, raw_storage_status, directory_observed_at,
    fingerprinted_at, source_channel, sender, subject, file_name,
    file_size_bytes, checksum, mime_type, document_type,
    classification_status, processing_status, current_stage,
    review_tier, confidence, received_at, last_updated_at, notes
)
SELECT d.id,
    'C:\Users\jpste\OneDrive\Documents\TAMC\Eurotunnel\Fitch Affirms CLEF and Getlink; Revises Outlook on Getlink''s Bond to Positive_.pdf',
    'retained', '2026-04-15 12:00:00+00'::timestamptz,
    '2026-04-15 12:00:00+00'::timestamptz, 'manual_upload',
    'Fitch Ratings', 'Fitch Affirms CLEF and Getlink; Revises Outlook on Getlink''s Bond to Positive',
    'Fitch Affirms CLEF and Getlink; Revises Outlook on Getlink''s Bond to Positive_.pdf',
    137568, '230c2320f7d2fce15b77c3dc7faefd91a583a513c1aa18dd0d3368e0bd3578dc',
    'application/pdf', 'rating_report',
    'classified', 'processed', 'canonical_linked',
    'analyst', 0.99, '2024-04-04 17:07:00+00'::timestamptz,
    now(), 'Fitch action 4 Apr 2024: CLEF affirmed BBB/Stable; GET EUR850m 2025 bond affirmed BB, Outlook revised Stable → Positive.'
FROM deals d
WHERE d.slug = 'getlink-eurotunnel'
  AND NOT EXISTS (
    SELECT 1 FROM incoming_documents idoc
    WHERE idoc.deal_id = d.id
      AND idoc.checksum = '230c2320f7d2fce15b77c3dc7faefd91a583a513c1aa18dd0d3368e0bd3578dc'
  );

-- ─── 2. CANONICAL DOCUMENTS ───────────────────────────────────────────────────

-- Gatwick Fitch A
INSERT INTO documents (deal_id, document_type, document_name, period_label, status,
    received_at, evidence_page, snippet)
SELECT d.id, 'rating_report',
    'Fitch — Gatwick Funding BBB+ affirm + GAF BB(EXP) new (12 Nov 2025)',
    'FY 2025', 'canonical',
    '2025-11-12 13:42:00+00'::timestamptz, 1,
    'Fitch Ratings has assigned Gatwick Airport Finance plc''s (GAF) proposed GBP475 million bond issuance a BB(EXP) expected rating with a Stable Outlook. Fitch has also affirmed Gatwick Funding Limited''s (GF) notes at BBB+ with a Stable Outlook.'
FROM deals d
WHERE d.slug = 'gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM documents doc
    WHERE doc.deal_id = d.id AND doc.document_name LIKE 'Fitch — Gatwick Funding BBB+ affirm%'
  );

-- Gatwick Fitch MidCo
INSERT INTO documents (deal_id, document_type, document_name, period_label, status,
    received_at, evidence_page, snippet)
SELECT d.id, 'rating_report',
    'Fitch — GAF BB/Stable final rating on GBP475m 2030 bond (21 Nov 2025)',
    'FY 2025', 'canonical',
    '2025-11-21 18:11:00+00'::timestamptz, 1,
    'Fitch Ratings has assigned Gatwick Airport Finance plc''s (GAF) GBP475 million bond issue a final BB rating with a Stable Outlook. The proceeds were used to refinance its existing GBP450 million bond due in April 2026.'
FROM deals d
WHERE d.slug = 'gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM documents doc
    WHERE doc.deal_id = d.id AND doc.document_name LIKE 'Fitch — GAF BB/Stable%'
  );

-- Getlink Fitch
INSERT INTO documents (deal_id, document_type, document_name, period_label, status,
    received_at, evidence_page, snippet)
SELECT d.id, 'rating_report',
    'Fitch — CLEF BBB/Stable affirm; GET BB Outlook → Positive (04 Apr 2024)',
    'FY 2023', 'canonical',
    '2024-04-04 17:07:00+00'::timestamptz, 1,
    'Fitch Ratings has affirmed Channel Link Enterprises Finance Plc''s (CLEF) notes at BBB with a Stable Outlook. Fitch has also affirmed Getlink S.E.''s (GET) EUR850 million green bond at BB and revised the Outlook to Positive from Stable.'
FROM deals d
WHERE d.slug = 'getlink-eurotunnel'
  AND NOT EXISTS (
    SELECT 1 FROM documents doc
    WHERE doc.deal_id = d.id AND doc.document_name LIKE 'Fitch — CLEF BBB/Stable%'
  );

-- ─── 3. LINK incoming → canonical ─────────────────────────────────────────────

UPDATE incoming_documents idoc
SET canonical_document_id = doc.id
FROM documents doc, deals d
WHERE d.slug = 'gatwick-airport'
  AND doc.deal_id = d.id AND idoc.deal_id = d.id
  AND idoc.checksum = '9a6b1edc373a76ae2ce7dc76a9c530e6ff26dd81bc9d72c1e3b3c26c9312efb6'
  AND doc.document_name LIKE 'Fitch — Gatwick Funding BBB+ affirm%';

UPDATE incoming_documents idoc
SET canonical_document_id = doc.id
FROM documents doc, deals d
WHERE d.slug = 'gatwick-airport'
  AND doc.deal_id = d.id AND idoc.deal_id = d.id
  AND idoc.checksum = '5cdb0d893d1c88771d6f129c4e0f51ab47a74a0061de956e82587132114ae541'
  AND doc.document_name LIKE 'Fitch — GAF BB/Stable%';

UPDATE incoming_documents idoc
SET canonical_document_id = doc.id
FROM documents doc, deals d
WHERE d.slug = 'getlink-eurotunnel'
  AND doc.deal_id = d.id AND idoc.deal_id = d.id
  AND idoc.checksum = '230c2320f7d2fce15b77c3dc7faefd91a583a513c1aa18dd0d3368e0bd3578dc'
  AND doc.document_name LIKE 'Fitch — CLEF BBB/Stable%';

-- ─── 4. EVIDENCE CITATIONS — risk register provenance ─────────────────────────
-- Each risk register entry we seeded in seed-risks-gatwick-getlink.sql points
-- back to a specific page + snippet in the Fitch report that sourced it.
-- field_key = 'deal_risk_register:' || risk_id (semantic pointer — there's no
-- FK between evidence_citations and deal_risk_register in the current schema).

-- Clean old Fitch-sourced citations for these deals so this is idempotent.
DELETE FROM evidence_citations
WHERE canonical_document_id IN (
    SELECT id FROM documents
    WHERE document_name LIKE 'Fitch — GAF BB/Stable%'
       OR document_name LIKE 'Fitch — Gatwick Funding BBB+ affirm%'
       OR document_name LIKE 'Fitch — CLEF BBB/Stable%'
);

-- Helper pattern: pick the canonical document id in the FROM, insert one row per risk.

-- Gatwick MidCo (final rating, 21 Nov) — primary source for GAF-specific risks
INSERT INTO evidence_citations (canonical_document_id, citation_label, citation_kind,
    page_number, field_key, text_snippet)
SELECT doc.id, v.citation_label, 'rating_driver', v.page_number, v.field_key, v.snippet
FROM documents doc, (VALUES
    ('Fitch GAF — structural subordination', 1, 'deal_risk_register:RISK-ST-008',
     'GAF''s debt rating is notched down twice from the group''s consolidated profile, due to the structural subordination of GAF debt to GF debt, and GAF''s reliance on a single asset (GF).'),
    ('Fitch GAF — reliance on upstream dividends', 2, 'deal_risk_register:RISK-ST-003',
     'Debt service at GAF is reliant on dividends being upstreamed from the ring-fenced group. The removal of the GBP70 million debt service reserve account is credit negative, but mitigated by the shareholders'' commitment to maintain six months of debt service as cash at GAF.'),
    ('Fitch GAF — consolidated leverage 7.2x peak', 3, 'deal_risk_register:RISK-CF-010',
     'Under Fitch''s rating case, consolidated net debt/EBITDA, including GAF''s debt, peaks at 7.2x in 2027, which is below Fitch''s downgrade sensitivity.'),
    ('Fitch GAF — refinancing risk (single bullet)', 2, 'deal_risk_register:RISK-CF-015',
     'GAF''s debt has no material interest-rate risk, but the reliance on bullet debt (single bullet GBP475 million in 2030) creates refinancing risk.'),
    ('Fitch GAF — no material IR risk', 2, 'deal_risk_register:RISK-CF-011',
     'GAF''s debt has no material interest-rate risk.')
) AS v(citation_label, page_number, field_key, snippet)
WHERE doc.document_name LIKE 'Fitch — GAF BB/Stable%';

-- Gatwick Fitch A (12 Nov, GF affirm) — primary source for operational and GF risks
INSERT INTO evidence_citations (canonical_document_id, citation_label, citation_kind,
    page_number, field_key, text_snippet)
SELECT doc.id, v.citation_label, 'rating_driver', v.page_number, v.field_key, v.snippet
FROM documents doc, (VALUES
    ('Fitch GF — volume risk High Midrange', 2, 'deal_risk_register:RISK-AP-001',
     'Gatwick is the second-largest airport in the UK, serving as an origin-and-destination, leisure-oriented airport with a strong catchment area (London and south-east UK) of 15 million people. Gatwick''s traffic has been less resilient than EMEA peers to economic downturns.'),
    ('Fitch GF — airport competition', 2, 'deal_risk_register:RISK-AP-005',
     'It competes with Heathrow, a primary hub and long-haul full-service airport, and Stansted Airport, which focuses on low-cost carriers.'),
    ('Fitch GF — price / regulation', 2, 'deal_risk_register:RISK-PG-001',
     'The airport operates under light-handed regulation. New commitments for 2025-2029 feature an annual increase of gross yield at CPI less 1% in the first two years and CPI for the final two years of the extension period.'),
    ('Fitch GF — modern infra, flexible capex', 2, 'deal_risk_register:RISK-CF-007',
     'Gatwick has considerable experience managing its asset base and has carried out major works in recent years. The investment programme is large but modular.'),
    ('Fitch GF — leisure O&D cycle exposure', 2, 'deal_risk_register:RISK-MK-001',
     'Gatwick''s traffic has been less resilient than EMEA peers to economic downturns, but we believe this has improved due to its focus on the growing LCC market and long-term contracts with airlines.'),
    ('Fitch GF — CPI-linked tariff', 2, 'deal_risk_register:RISK-MK-002',
     'New commitments for 2025-2029 feature an annual increase of gross yield at CPI less 1% in the first two years and CPI for the final two years.'),
    ('Fitch GF — leisure / discretionary cycle (commodity)', 2, 'deal_risk_register:RISK-MK-005',
     'Gatwick''s traffic has been less resilient than EMEA peers to economic downturns. Its focus on the growing LCC market is relevant where airline costs (including fuel) are a key demand driver.'),
    ('Fitch GF — UK catchment GDP sensitivity', 2, 'deal_risk_register:RISK-MK-017',
     'Strong catchment area (London and south-east UK) of 15 million people. Traffic has historically been correlated with UK discretionary consumer spending.')
) AS v(citation_label, page_number, field_key, snippet)
WHERE doc.document_name LIKE 'Fitch — Gatwick Funding BBB+ affirm%';

-- Getlink (04 Apr 2024)
INSERT INTO evidence_citations (canonical_document_id, citation_label, citation_kind,
    page_number, field_key, text_snippet)
SELECT doc.id, v.citation_label, 'rating_driver', v.page_number, v.field_key, v.snippet
FROM documents doc, (VALUES
    ('Fitch GET — structural subordination, 3-notch', 1, 'deal_risk_register:RISK-ST-008',
     'GET is credit-linked to CLEF. We assess GET''s consolidated profile, comprising Eurotunnel, ElecLink and Europorte, at BBB and apply a three-notch downward adjustment to arrive at its BB rating.'),
    ('Fitch GET — mixed traffic / volume risk', 1, 'deal_risk_register:RISK-CF-002',
     'Traffic volume proved resilient through economic recessions for Eurostar passengers and car shuttle volumes, while truck shuttle volumes showed significant volatility (-46% in 2007-2009).'),
    ('Fitch GET — inter-modal competition (ferries)', 2, 'deal_risk_register:RISK-MK-008',
     'Eurotunnel is able to differentiate itself from competing ferry operators in the Dover Strait and command a premium on ferry fares, due to the speed, ease and reliability of its shuttle service.'),
    ('Fitch GET — flexible shuttle fares / regulated rail', 2, 'deal_risk_register:RISK-MK-006',
     'Shuttle service fares are flexible and can be adapted to market conditions. The railway usage contract regulates railway network fares, preventing a full pass-through of inflation into tariffs.'),
    ('Fitch GET — ElecLink power price exposure', 2, 'deal_risk_register:RISK-MK-012',
     'ElecLink''s cash flows could be volatile due to its exposure to electricity price risk in the French and UK markets and the possible impact from the profit-sharing mechanism embedded in ElecLink''s concession framework.'),
    ('Fitch GET — EUR850m bullet refinancing risk', 2, 'deal_risk_register:RISK-CF-015',
     'The EUR850 million five-year fixed rate bullet bond is due in 2025. Fitch views refinancing risk as moderately high, mitigated by the 12-month debt service reserve account and the cash on balance sheet at the GET level.'),
    ('Fitch GET — permitted-debt baskets', 2, 'deal_risk_register:RISK-ST-004',
     'The protective features of the consolidated-based lock-up and incurrence covenants are diminished by the possibility of raising prior-ranking non-recourse debt at subsidiaries and the presence of sizeable baskets for additional debt and dividends.'),
    ('Fitch CLEF — DSCR 1.5x avg / 1.18x min', 3, 'deal_risk_register:RISK-CF-010',
     'The FRC results in a DSCR averaging 1.50x during 2024-2049, with a minimum DSCR of 1.18x in 2041.'),
    ('Fitch CLEF — GBP/EUR natural hedge', 2, 'deal_risk_register:RISK-MK-019',
     'Debt is senior, largely fixed-rate and fully amortising but with a back-loaded repayment profile. Debt is almost evenly split between sterling and euros, substantially mirroring EBITDA exposure.'),
    ('Fitch CLEF — concession to 2086', 1, 'deal_risk_register:RISK-RL-002',
     'CLEF''s rating is underpinned by the critical nature of the asset managed by Eurotunnel, the fixed railway link between the UK and France, the long-term maturity of the concession terminating in 2086.'),
    ('Fitch CLEF — capex EUR150-200m/year', 1, 'deal_risk_register:RISK-CF-007',
     'Eurotunnel''s capex was EUR140 million in 2023 and it forecasts investing a further EUR150 million to 200 million per year in the coming years, mainly on rolling stock maintenance and renewal programmes.'),
    ('Fitch GET — partial CPI pass-through (inflation)', 2, 'deal_risk_register:RISK-MK-002',
     'The railway usage contract regulates railway network fares, preventing a full pass-through of inflation into tariffs.'),
    ('Fitch GET — blended UK-FR GDP driver', 5, 'deal_risk_register:RISK-MK-017',
     'We expect now truck shuttles to fully recover to 2018 levels by 2045, car shuttles by 2041 and Eurostar traffic by 2027. After recovery, we assume volumes will grow below blended UK-France GDP.')
) AS v(citation_label, page_number, field_key, snippet)
WHERE doc.document_name LIKE 'Fitch — CLEF BBB/Stable%';

-- ─── End of seed ──────────────────────────────────────────────────────────────
