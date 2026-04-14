-- ═══════════════════════════════════════════════════════════════════════════════
-- Capital Stack Phase 2 — Seed data for Gatwick + Wigmore Solar
-- ═══════════════════════════════════════════════════════════════════════════════
-- Idempotent. Applies the valuation anchor (EV / date / method / entity),
-- populates v8 capital-structure taxonomy fields on existing instruments and
-- entities, and adds the GAF MidCo bond to Gatwick. Safe to re-run.
--
-- Apply with:
--   docker exec -i docker-postgres-1 psql -U sesame -d sesamestreet < postgres/seed-capital-stack.sql

-- ─── GATWICK ──────────────────────────────────────────────────────────────────

UPDATE deals
SET enterprise_value = 6500000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = 'Gatwick Airport Limited'
WHERE slug = 'gatwick-airport';

-- v8 fields on existing corporate entities
UPDATE corporate_entities SET
    ownership_pct = 100, within_security_perimeter = TRUE, ratio_level = 'opco',
    consolidation_method = 'proportional', control_type = 'full_control', ownership_type = 'direct'
WHERE deal_id = (SELECT id FROM deals WHERE slug='gatwick-airport')
  AND entity_name = 'Gatwick Airport Limited';

UPDATE corporate_entities SET
    ownership_pct = 100, within_security_perimeter = TRUE, ratio_level = 'none',
    consolidation_method = 'proportional', control_type = 'full_control', ownership_type = 'direct'
WHERE deal_id = (SELECT id FROM deals WHERE slug='gatwick-airport')
  AND entity_name = 'Gatwick Funding Limited';

UPDATE corporate_entities SET
    ownership_pct = 100, within_security_perimeter = TRUE, ratio_level = 'none',
    consolidation_method = 'proportional', control_type = 'full_control', ownership_type = 'direct',
    parent_entity = 'Gatwick Airport Finance plc (GAF)'
WHERE deal_id = (SELECT id FROM deals WHERE slug='gatwick-airport')
  AND entity_name = 'Ivy Holdco Limited';

-- Add GAF MidCo entity (idempotent — relies on entity_name not already present)
INSERT INTO corporate_entities
    (deal_id, entity_name, entity_type, parent_entity, jurisdiction,
     ring_fenced, securitisation_boundary,
     ownership_pct, ownership_type, control_type, consolidation_method,
     within_security_perimeter, ratio_level)
SELECT d.id, 'Gatwick Airport Finance plc (GAF)', 'midco',
       'VINCI Airports / GIP (50.01 / 49.99)', 'GB',
       FALSE, FALSE,
       100, 'direct', 'full_control', 'proportional',
       TRUE, 'holdco'
FROM deals d
WHERE d.slug='gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM corporate_entities ce
    WHERE ce.deal_id = d.id AND ce.entity_name = 'Gatwick Airport Finance plc (GAF)'
  );

-- v8/v9 fields on the 11 existing Class A bonds; our holding pro-rata of £125m
UPDATE capital_structure_instruments SET
    entity_level = 'opco',
    entity_name = 'Gatwick Funding Limited',
    ownership_pct = 100,
    structural_seniority = 1,
    ratio_consolidation_level = 'consolidated',
    subordination_agreement = FALSE,
    cashflow_priority_rank = 1,
    pari_passu_group = 'Class A',
    security_ranking = 'Senior Secured',
    our_holding = ROUND(drawn_amount * (125000000.0 / 3364600000.0))
WHERE deal_id = (SELECT id FROM deals WHERE slug='gatwick-airport')
  AND instrument_name LIKE 'Class A%';

-- Add the GAF MidCo bond (Fitch-rated, 21 Nov 2025; BB / Stable)
INSERT INTO capital_structure_instruments
    (deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
     committed_amount, drawn_amount, currency, start_date, maturity_date,
     interest_type, margin_bps, repayment_type,
     our_holding, our_holding_pct, status, notes,
     instrument_format, pari_passu_group,
     entity_level, entity_name, ownership_pct, structural_seniority,
     ratio_consolidation_level, subordination_agreement, cashflow_priority_rank)
SELECT d.id, 'GAF 6% 2030 Bond (XS3221827911)', 'senior_term', 2, 'MidCo',
       475000000, 475000000, 'GBP', '2025-11-21'::date, '2030-11-21'::date,
       'fixed', 600, 'bullet',
       0, 0, 'active',
       'Fitch BB/Stable, 21 Nov 2025. Structurally subordinated to GF ring-fenced group. No dedicated liquidity line; shareholders commit to 6 months debt service as cash.',
       'bond', 'GAF MidCo',
       'midco', 'Gatwick Airport Finance plc (GAF)', 100, 2,
       'consolidated', FALSE, 2
FROM deals d
WHERE d.slug = 'gatwick-airport'
  AND NOT EXISTS (
    SELECT 1 FROM capital_structure_instruments csi
    WHERE csi.deal_id = d.id AND csi.instrument_name LIKE 'GAF 6%%'
  );

-- Tag the GAF MidCo bond: Senior at MidCo level, structurally subordinated
-- to the CTA group (captured via entity_level='midco' + cashflow_priority_rank=2).
UPDATE capital_structure_instruments SET
    security_ranking = 'Senior Secured HoldCo'
WHERE deal_id = (SELECT id FROM deals WHERE slug='gatwick-airport')
  AND entity_level = 'midco';

-- ─── WIGMORE SOLAR (simple single-level control) ──────────────────────────────

UPDATE deals
SET enterprise_value = 150000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = 'Wigmore Solar OpCo Limited'
WHERE slug = 'wigmore-solar';

INSERT INTO corporate_entities
    (deal_id, entity_name, entity_type, parent_entity, jurisdiction,
     ring_fenced, securitisation_boundary,
     ownership_pct, ownership_type, control_type, consolidation_method,
     within_security_perimeter, ratio_level)
SELECT d.id, 'Wigmore Solar OpCo Limited', 'opco', NULL, 'GB',
       TRUE, FALSE,
       100, 'direct', 'full_control', 'proportional',
       TRUE, 'opco'
FROM deals d
WHERE d.slug='wigmore-solar'
  AND NOT EXISTS (
    SELECT 1 FROM corporate_entities ce
    WHERE ce.deal_id = d.id AND ce.entity_name = 'Wigmore Solar OpCo Limited'
  );

UPDATE capital_structure_instruments SET
    entity_level = 'opco',
    entity_name = 'Wigmore Solar OpCo Limited',
    ownership_pct = 100,
    structural_seniority = 1,
    ratio_consolidation_level = 'opco_standalone',
    subordination_agreement = FALSE,
    cashflow_priority_rank = 1,
    pari_passu_group = 'Senior',
    security_ranking = 'Senior Secured'
WHERE deal_id = (SELECT id FROM deals WHERE slug='wigmore-solar');

-- ─── End of seed ──────────────────────────────────────────────────────────────
