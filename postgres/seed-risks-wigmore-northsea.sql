-- ═══════════════════════════════════════════════════════════════════════════════
-- Deal risk register seed — Wigmore Solar + North Sea OWF
-- ═══════════════════════════════════════════════════════════════════════════════
-- Source: portfolio manager assessment (xsesamestreet internal, 2026-04-15).
-- Scope: key technical / resource / opex risks for renewable generation assets.
-- Scoring: likelihood 1-5, severity 1-6. Stress parameters quoted in commentary.
--
-- Idempotent: ON CONFLICT (deal_id, risk_id) DO UPDATE keeps re-runs safe.
-- Apply with:
--   docker exec -i docker-postgres-1 psql -U sesame -d sesamestreet < postgres/seed-risks-wigmore-northsea.sql

-- ─── WIGMORE SOLAR ────────────────────────────────────────────────────────────

INSERT INTO deal_risk_register (deal_id, risk_id, status, likelihood, severity,
    mitigation_party_score, mitigation_capital_score, commentary, assessed_by,
    assessed_at, trend, sensitised_at_origination, sensitivity_name, stress_applied,
    monitoring_kpi, monitoring_threshold)
SELECT d.id, v.risk_id, 'assessed', v.likelihood, v.severity,
       v.mit_party, v.mit_capital, v.commentary,
       'Portfolio manager assessment (xsesamestreet, 2026-04-15)',
       '2026-04-15 12:00:00+00'::timestamptz, 'stable',
       v.sensitised, v.sens_name, v.stress,
       v.monitoring_kpi, v.monitoring_threshold
FROM deals d, (VALUES
    ('RISK-RE-002', 2, 3, 'M3_contractual', 'C2_comfort',
     'Panel degradation risk: base case assumes 0.5% p.a. linear degradation in line with manufacturer warranty. Stress scenario: actual degradation runs at 1.0% p.a. — over a 10-year horizon this implies a cumulative ~5% permanent revenue loss vs base case (compounding effect). Partial mitigation via manufacturer performance warranty, but claim process can be protracted and warranted curves are typically step-functions that understate real-world decay.',
     TRUE, 'Accelerated panel degradation', '1.0% p.a. vs 0.5% p.a. base (10y → ~5% revenue drag)',
     'Measured annual output decline (%)', 0.75),
    ('RISK-RE-001', 3, 3, 'M1_none', 'C1_none',
     'Solar resource / irradiance risk: year-on-year GHI variability at the Wigmore site is approximately 4% standard deviation (P90-P10 spread). Single-year output can deviate materially from the P50 expected generation profile — impacts revenue directly under merchant / CfD strike volumes. No direct mitigation available: resource variability is a natural feature of the asset.',
     TRUE, 'P90 solar resource year', 'GHI -1SD (~-4%) vs P50 long-run mean',
     'Annual GHI vs P50 (%)', -4.0),
    ('RISK-RE-024', 2, 3, 'M3_contractual', 'C1_none',
     'O&M cost escalation: base case O&M schedule locked via LTSA / O&M contract with CPI-linked escalators. Stress scenario: O&M costs increase by +10% above base (driven by inverter replacement, vegetation, security, insurance or unscheduled repairs beyond contract scope). Contractor performance and fixed-price terms provide partial mitigation; residual exposure on out-of-scope items.',
     TRUE, 'O&M cost stress (+10%)', 'O&M opex +10% above base case',
     'O&M opex vs budget (%)', 110.0)
) AS v(risk_id, likelihood, severity, mit_party, mit_capital, commentary,
       sensitised, sens_name, stress, monitoring_kpi, monitoring_threshold)
WHERE d.slug = 'wigmore-solar'
ON CONFLICT (deal_id, risk_id) DO UPDATE SET
    status = EXCLUDED.status,
    likelihood = EXCLUDED.likelihood,
    severity = EXCLUDED.severity,
    mitigation_party_score = EXCLUDED.mitigation_party_score,
    mitigation_capital_score = EXCLUDED.mitigation_capital_score,
    commentary = EXCLUDED.commentary,
    assessed_by = EXCLUDED.assessed_by,
    assessed_at = EXCLUDED.assessed_at,
    trend = EXCLUDED.trend,
    sensitised_at_origination = EXCLUDED.sensitised_at_origination,
    sensitivity_name = EXCLUDED.sensitivity_name,
    stress_applied = EXCLUDED.stress_applied,
    monitoring_kpi = EXCLUDED.monitoring_kpi,
    monitoring_threshold = EXCLUDED.monitoring_threshold,
    updated_at = now();

-- ─── NORTH SEA OWF ────────────────────────────────────────────────────────────

INSERT INTO deal_risk_register (deal_id, risk_id, status, likelihood, severity,
    mitigation_party_score, mitigation_capital_score, commentary, assessed_by,
    assessed_at, trend, sensitised_at_origination, sensitivity_name, stress_applied,
    monitoring_kpi, monitoring_threshold)
SELECT d.id, v.risk_id, 'assessed', v.likelihood, v.severity,
       v.mit_party, v.mit_capital, v.commentary,
       'Portfolio manager assessment (xsesamestreet, 2026-04-15)',
       '2026-04-15 12:00:00+00'::timestamptz, 'stable',
       v.sensitised, v.sens_name, v.stress,
       v.monitoring_kpi, v.monitoring_threshold
FROM deals d, (VALUES
    ('RISK-RE-012', 2, 3, 'M3_contractual', 'C2_comfort',
     'Turbine performance / availability degradation: base case assumes 0.5% p.a. output decline driven by blade erosion, wear and availability drift. Stress scenario: actual decline runs at 1.0% p.a. — over a 10-year horizon this implies a cumulative ~5% permanent revenue loss vs base case. Partial mitigation via OEM availability warranty and LTSA availability guarantees, though offshore blade repair campaigns and gearbox replacements can drive sustained under-performance.',
     TRUE, 'Accelerated turbine performance decline', '1.0% p.a. vs 0.5% p.a. base (10y → ~5% revenue drag)',
     'Measured annual output decline (%)', 0.75),
    ('RISK-RE-011', 3, 3, 'M1_none', 'C1_none',
     'Wind resource risk: year-on-year wind speed variability at the North Sea OWF site is approximately 5% standard deviation (P90-P10 spread is wider than solar given atmospheric variability). Single-year generation can deviate materially from the P50 expected profile — revenue exposure amplified by cubic wind-to-power relationship. No direct mitigation available: resource variability is intrinsic.',
     TRUE, 'P90 wind resource year', 'Wind speed -1SD (~-5%) vs P50 long-run mean',
     'Annual wind speed vs P50 (%)', -5.0),
    ('RISK-RE-024', 2, 3, 'M3_contractual', 'C1_none',
     'O&M cost escalation: base case O&M schedule locked via OEM LTSA / balance-of-plant O&M contract with CPI-linked escalators. Stress scenario: O&M costs increase by +10% above base (driven by out-of-scope blade repairs, crew transfer vessel day rates, offshore access weather windows, or insurance hardening). Offshore O&M is materially more exposed to cost inflation than onshore solar; residual exposure on out-of-scope items and major component replacement.',
     TRUE, 'O&M cost stress (+10%)', 'O&M opex +10% above base case',
     'O&M opex vs budget (%)', 110.0)
) AS v(risk_id, likelihood, severity, mit_party, mit_capital, commentary,
       sensitised, sens_name, stress, monitoring_kpi, monitoring_threshold)
WHERE d.slug = 'north-sea-owf'
ON CONFLICT (deal_id, risk_id) DO UPDATE SET
    status = EXCLUDED.status,
    likelihood = EXCLUDED.likelihood,
    severity = EXCLUDED.severity,
    mitigation_party_score = EXCLUDED.mitigation_party_score,
    mitigation_capital_score = EXCLUDED.mitigation_capital_score,
    commentary = EXCLUDED.commentary,
    assessed_by = EXCLUDED.assessed_by,
    assessed_at = EXCLUDED.assessed_at,
    trend = EXCLUDED.trend,
    sensitised_at_origination = EXCLUDED.sensitised_at_origination,
    sensitivity_name = EXCLUDED.sensitivity_name,
    stress_applied = EXCLUDED.stress_applied,
    monitoring_kpi = EXCLUDED.monitoring_kpi,
    monitoring_threshold = EXCLUDED.monitoring_threshold,
    updated_at = now();

-- ─── End of seed ──────────────────────────────────────────────────────────────
