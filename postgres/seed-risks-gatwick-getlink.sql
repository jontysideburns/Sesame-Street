-- ═══════════════════════════════════════════════════════════════════════════════
-- Deal risk register seed — Gatwick + Getlink (from Fitch rating reports)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Sources:
--   Gatwick  — Fitch, 21 Nov 2025: "Fitch Rates Gatwick Airport Finance Plc's
--              Notes 'BB'; Outlook Stable" (final rating on GBP475m 2030 GAF bond)
--              plus 12 Nov 2025 expected-rating commentary + affirmation of
--              Gatwick Funding Ltd Class A notes at 'BBB+'/Stable.
--   Getlink  — Fitch, 04 Apr 2024: "Fitch Affirms CLEF and Getlink; Revises
--              Outlook on Getlink's Bond to Positive" (CLEF BBB/Stable;
--              GET EUR850m bond BB/Positive).
--
-- Scoring: likelihood 1-5, severity 1-6. Fitch qualitative descriptors mapped:
--   Stronger        ≈ L2/S2-3
--   Midrange        ≈ L3/S3
--   High Midrange   ≈ L3/S4
--   Weaker          ≈ L4/S4
--
-- Idempotent: ON CONFLICT (deal_id, risk_id) DO UPDATE keeps re-runs safe.
-- Apply with:
--   docker exec -i docker-postgres-1 psql -U sesame -d sesamestreet < postgres/seed-risks-gatwick-getlink.sql

-- ─── GATWICK AIRPORT ──────────────────────────────────────────────────────────

INSERT INTO deal_risk_register (deal_id, risk_id, status, likelihood, severity,
    mitigation_party_score, mitigation_capital_score, commentary, assessed_by,
    assessed_at, trend, monitoring_kpi, monitoring_threshold)
SELECT d.id, v.risk_id, 'assessed', v.likelihood, v.severity,
       v.mit_party, v.mit_capital, v.commentary,
       'Fitch Ratings — GAF 21 Nov 2025 BB/Stable; GF affirmed BBB+/Stable',
       '2025-11-21 13:11:00+00'::timestamptz, 'stable',
       v.monitoring_kpi, v.monitoring_threshold
FROM deals d, (VALUES
    ('RISK-AP-001', 3, 4, 'M3_contractual', 'C1_none',
     'Second-largest UK airport; leisure-focused O&D. Fitch "High Midrange" volume risk. Traffic historically less resilient than EMEA peers to economic downturns, improving via LCC mix and long-term airline contracts.',
     'Passenger volume (m pax)', NULL::numeric),
    ('RISK-AP-005', 2, 3, 'M1_none', 'C1_none',
     'Competes with Heathrow (hub/long-haul) and Stansted (LCC). Strong 15m-person catchment (London / SE UK); differentiated but route overlap exists.',
     NULL, NULL::numeric),
    ('RISK-PG-001', 2, 3, 'M3_contractual', 'C1_none',
     'Light-handed regulation via CAA. 2025-29 commitments framework: gross yield rises at CPI-1% in years 1-2, CPI in years 3-4. Default tariff with bilateral pricing flexibility.',
     NULL, NULL::numeric),
    ('RISK-CF-015', 3, 4, 'M3_contractual', 'C3_contractual_backstop',
     'Reliance on bullet debt across GF and GAF creates refinancing risk. GAF single GBP475m bullet 2030 (refinanced Apr-2026 GBP450m bond). GF: no maturities until 2026; maturities fairly evenly spread thereafter. Track record of capital markets access. GBP250m undrawn liquidity facility at GF.',
     NULL, NULL::numeric),
    ('RISK-ST-008', 4, 4, 'M1_none', 'C1_none',
     'GAF debt rated BB — notched TWICE below consolidated BBB+ profile due to structural subordination to GF ring-fenced group and reliance on a single asset (GF). Fitch views GAF cash flow as having "minimal or no diversity".',
     NULL, NULL::numeric),
    ('RISK-ST-003', 3, 3, 'M3_contractual', 'C4_funded_reserve',
     'GAF debt service reliant on dividends upstreamed from GF ring-fenced group. GBP70m pandemic-era DSRA removed (credit negative); mitigated by shareholder public commitment to maintain 6 months of debt service as cash at GAF.',
     'GAF cash balance (months DS)', 6.0),
    ('RISK-CF-010', 3, 4, 'M1_none', 'C1_none',
     'Consolidated Fitch net debt/EBITDA peaks 7.2x in 2027 under rating case (below 7.7x GAF downgrade trigger). GF downgrade trigger: >6.5x sustained. GF currently below 6.5x in rating case.',
     'Consolidated net debt / EBITDA (x)', 7.7),
    ('RISK-CF-007', 2, 3, 'M3_contractual', 'C1_none',
     'Investment programme is large but modular. Management retains flexibility to adjust capex and equity distributions in response to softer traffic. Short- and medium-term maintenance needs well defined.',
     NULL, NULL::numeric),
    ('RISK-MK-001', 3, 4, 'M1_none', 'C1_none',
     'Leisure-oriented O&D exposure to discretionary travel demand. Fitch notes historically less resilient than EMEA peers to downturns, though LCC mix and contract framework have improved resilience.',
     NULL, NULL::numeric),
    ('RISK-CF-011', 1, 2, 'M1_none', 'C1_none',
     'Per Fitch: "no material exposure to interest-rate risk" — debt is fixed-rate, bullet.',
     NULL, NULL::numeric),
    ('RISK-MK-002', 2, 3, 'M3_contractual', 'C3_contractual_backstop',
     'Low-inflation scenario risk: tariff commitments rise at CPI-1% (years 1-2 of 2025-29) and CPI (years 3-4), so a sustained below-trend CPI would compress regulated yield growth. Partially mitigated: CPI-linked tariff uplift partly hedges revenue against inflation mis-match. Note: platform data shows GF + GAF debt stack is entirely fixed-rate, so the hedge is on the revenue side rather than through inflation-linked debt.',
     'Annualised UK CPI (%)', 2.0),
    ('RISK-MK-005', 3, 3, 'M1_none', 'C1_none',
     'Oil / jet fuel price exposure: Gatwick does not consume fuel directly, but sustained high oil prices feed through airline cost bases into higher airfares, compressing discretionary leisure demand at an O&D airport. Transmission is indirect but material given LCC-heavy traffic mix. No contractual mitigation at Gatwick level; some airline fuel hedging absorbs short-term spikes.',
     'Brent crude (USD/bbl)', 100.0),
    ('RISK-MK-017', 3, 3, 'M1_none', 'C1_none',
     'UK GDP / economic growth sensitivity: Gatwick passenger volumes are strongly correlated with UK discretionary consumer spending and outbound leisure travel. A UK recession or sustained sub-trend growth compresses traffic regardless of regulated tariff uplift. Complements broader cycle exposure (RISK-MK-001); tracked separately to monitor country-specific GDP rather than global cycle.',
     'UK real GDP growth (% YoY)', 1.0)
) AS v(risk_id, likelihood, severity, mit_party, mit_capital, commentary, monitoring_kpi, monitoring_threshold)
WHERE d.slug = 'gatwick-airport'
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
    monitoring_kpi = EXCLUDED.monitoring_kpi,
    monitoring_threshold = EXCLUDED.monitoring_threshold,
    updated_at = now();

-- ─── GETLINK / EUROTUNNEL ─────────────────────────────────────────────────────

INSERT INTO deal_risk_register (deal_id, risk_id, status, likelihood, severity,
    mitigation_party_score, mitigation_capital_score, commentary, assessed_by,
    assessed_at, trend, monitoring_kpi, monitoring_threshold)
SELECT d.id, v.risk_id, 'assessed', v.likelihood, v.severity,
       v.mit_party, v.mit_capital, v.commentary,
       'Fitch Ratings — CLEF BBB/Stable, GET BB/Positive (04 Apr 2024)',
       '2024-04-04 12:07:00+00'::timestamptz, 'stable',
       v.monitoring_kpi, v.monitoring_threshold
FROM deals d, (VALUES
    ('RISK-CF-002', 3, 4, 'M1_none', 'C1_none',
     'Mixed traffic: truck shuttles -46% in 2007-09 (and 2008 tunnel fire); Eurostar 97% of 2019 by 2023; passenger shuttles 85%; truck shuttles 75%. Fitch "High Midrange" volume risk. Management yield-over-volume strategy constrains near-term volume recovery.',
     'Truck shuttle volumes (% of 2019)', NULL::numeric),
    ('RISK-MK-008', 2, 3, 'M3_contractual', 'C1_none',
     'Competes with Dover Strait ferry operators; Eurotunnel differentiates on speed/reliability of shuttle and commands a premium on fares.',
     NULL, NULL::numeric),
    ('RISK-MK-006', 2, 3, 'M3_contractual', 'C1_none',
     'Shuttle fares flexible and can adapt to market conditions. Railway usage contract regulates network fares preventing full inflation pass-through. Fitch "Midrange" price risk.',
     NULL, NULL::numeric),
    ('RISK-MK-012', 3, 3, 'M1_none', 'C1_none',
     'ElecLink revenue EUR558m (2023) but cash flows exposed to UK/FR electricity price spread volatility. EUR156m provision in 2023 under concession profit-sharing clawback mechanism; potential cash-out from 2025. Fitch expects normalised EBITDA ~EUR45m post-clawback.',
     'ElecLink EBITDA (EUR m)', 45.0),
    ('RISK-CF-015', 3, 4, 'M3_contractual', 'C4_funded_reserve',
     'EUR850m single fixed-rate bullet 2025 at GET — Fitch views refinancing risk as "moderately high" due to deep subordination. Mitigated by 12-month DSRA at CLEF level and ~EUR1.6bn cash at GET group (Dec 2023), up from EUR800m.',
     'GET group cash balance (EUR m)', 850.0),
    ('RISK-ST-008', 4, 4, 'M1_none', 'C1_none',
     'GET rated BB — THREE notches below the BBB consolidated credit profile due to structural subordination to CLEF project-finance debt and "Weaker" debt-structure assessment. Subordinated, restricted access to Eurotunnel cash flows; direct access to ElecLink but income is volatile.',
     NULL, NULL::numeric),
    ('RISK-ST-004', 3, 3, 'M3_contractual', 'C1_none',
     'Consolidated-based lock-up and incurrence covenants are present but protective features diminished by sizeable baskets for additional debt and dividends. Prior-ranking non-recourse debt can be raised at subsidiaries.',
     NULL, NULL::numeric),
    ('RISK-CF-010', 3, 3, 'M1_none', 'C1_none',
     'CLEF FRC DSCR averages 1.50x 2024-49 with 1.18x minimum in 2041. Back-loaded amortisation profile; DSRA reduces from 12 to 6 months from 2039.',
     'CLEF DSCR (x)', 1.30),
    ('RISK-MK-019', 2, 3, 'M3_contractual', 'C1_none',
     'Debt almost evenly split GBP/EUR, substantially mirroring EBITDA currency mix — natural hedge at CLEF. GET EUR850m bond in EUR.',
     NULL, NULL::numeric),
    ('RISK-RL-002', 1, 4, 'M3_contractual', 'C1_none',
     'Concession to 2086 provides long-dated tail; strong UK/FR regulatory oversight of tunnel operations. Embedded ElecLink profit-sharing mechanism materially reduces upside.',
     NULL, NULL::numeric),
    ('RISK-CF-007', 2, 3, 'M3_contractual', 'C1_none',
     'Eurotunnel capex EUR140m in 2023; Fitch expects EUR150-200m/yr going forward (rolling stock maintenance/renewal). Lack of formal capex provisioning in finance docs mitigated by prudent management policy and lock-up minimum-capex test.',
     'Annual capex (EUR m)', 200.0),
    ('RISK-MK-002', 2, 3, 'M3_contractual', 'C3_contractual_backstop',
     'Low-inflation scenario risk: shuttle fares flexible but railway network fares regulated — only partial inflation pass-through. A sustained below-trend EUR/GBP CPI would compress revenue growth while fixed costs persist. Partially mitigated by the EUR4.4bn index-linked Eurotunnel term loan (principal/interest indexed), which offsets inflation mis-match between debt service and revenue.',
     'Blended UK-FR CPI (%)', 2.0),
    ('RISK-MK-017', 3, 3, 'M1_none', 'C1_none',
     'Blended UK + France GDP sensitivity: Fitch rating case explicitly uses "blended UK-France GDP" as the post-recovery volume growth driver. Cross-Channel passenger and freight flows correlate with both economies — weakness in either dampens traffic. Dual exposure reduces single-country concentration vs Gatwick but adds complexity (FX, divergent cycles).',
     'Blended UK+FR real GDP growth (% YoY)', 1.0)
) AS v(risk_id, likelihood, severity, mit_party, mit_capital, commentary, monitoring_kpi, monitoring_threshold)
WHERE d.slug = 'getlink-eurotunnel'
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
    monitoring_kpi = EXCLUDED.monitoring_kpi,
    monitoring_threshold = EXCLUDED.monitoring_threshold,
    updated_at = now();

-- ─── End of seed ──────────────────────────────────────────────────────────────
