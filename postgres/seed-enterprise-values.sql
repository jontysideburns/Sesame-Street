-- ═══════════════════════════════════════════════════════════════════════════════
-- Enterprise Value seed — 10 deals (LTV-based)
-- ═══════════════════════════════════════════════════════════════════════════════
-- EV = total drawn debt / target LTV. Idempotent — safe to re-run.
-- Valuation date: 2026-04-14 (platform "as of" date).
--
-- Apply with:
--   docker exec -i docker-postgres-1 psql -U sesame -d sesamestreet < postgres/seed-enterprise-values.sql

-- North Sea OWF — 30% LTV
UPDATE deals SET
    enterprise_value = 460000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'north-sea-owf';

-- Wigmore Solar — 20% LTV (overrides prior £150m)
UPDATE deals SET
    enterprise_value = 500000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = 'Wigmore Solar OpCo Limited'
WHERE slug = 'wigmore-solar';

-- M6 Toll — 40% LTV
UPDATE deals SET
    enterprise_value = 1924122500,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'm6-toll';

-- Getlink Eurotunnel — 50% LTV
UPDATE deals SET
    enterprise_value = 11034000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'getlink-eurotunnel';

-- Delta PRS — 60% LTV
UPDATE deals SET
    enterprise_value = 565600000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'delta-prs';

-- Beta PRS — 60% LTV (471,333,333 ≈ 282.8m / 0.60)
UPDATE deals SET
    enterprise_value = 471333333,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'project-beta-prs';

-- Data centres — 50% LTV each
UPDATE deals SET
    enterprise_value = 340000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'apollo-edge-campus';

UPDATE deals SET
    enterprise_value = 390000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'aurora-prime-data-campus';

UPDATE deals SET
    enterprise_value = 390000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'granite-switchyard-campus';

UPDATE deals SET
    enterprise_value = 490000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'ion-harbor-campus';

-- Project Alpha Port — equity = debt (50% LTV); EV = debt + equity = 350m
UPDATE deals SET
    enterprise_value = 350000000,
    equity_invested = 175000000,
    valuation_date = '2026-04-14',
    valuation_method = 'mark_to_model',
    valuation_entity = name
WHERE slug = 'project-alpha-port';

-- ─── End of seed ──────────────────────────────────────────────────────────────
