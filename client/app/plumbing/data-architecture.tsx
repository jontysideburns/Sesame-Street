"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA ARCHITECTURE — interactive schema visualisation for the Plumbing tab.
   Uses the app's CSS variable design tokens (--ink, --accent, --panel, etc.)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Schema definitions ────────────────────────────────────────────────────

interface Column {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;     // "table.column"
  unique?: boolean;
  nullable?: boolean;
  note?: string;
}

interface Table {
  name: string;
  label: string;
  group: string;        // Template 3 / Template 1 / Template 2 / Analytics / Core
  description: string;
  columns: Column[];
}

interface Relationship {
  from: string;
  to: string;
  label: string;
  type: "1:N" | "1:1" | "N:M";
}

const TABLES: Table[] = [
  // ── Core ───────────────────────────────────────────────────────────────
  {
    name: "deals",
    label: "Deals",
    group: "Core",
    description: "Master deal record — 170+ fields covering identity, structure, ratings, covenants, KPIs, stress config",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "slug", type: "TEXT", unique: true },
      { name: "name", type: "TEXT" },
      { name: "borrower", type: "TEXT" },
      { name: "sector", type: "TEXT" },
      { name: "deal_type", type: "TEXT" },
      { name: "facility_amount", type: "BIGINT" },
      { name: "exposure", type: "BIGINT" },
      { name: "grade", type: "TEXT" },
      { name: "overall_covenant_status", type: "TEXT", note: "performing / lockup / trigger / default" },
      { name: "distribution_status", type: "TEXT", note: "permitted / blocked" },
      { name: "metrics", type: "JSONB" },
      { name: "…", type: "", note: "170+ fields total" },
    ],
  },

  // ── Template 3: Deal Structure ─────────────────────────────────────────
  {
    name: "capital_structure_instruments",
    label: "Capital Structure",
    group: "Template 3",
    description: "F.2A — one row per debt instrument per deal (term loans, RCFs, bonds, etc.)",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "instrument_name", type: "TEXT" },
      { name: "instrument_type", type: "TEXT", note: "senior_term / rcf / capex / mezz / bond" },
      { name: "waterfall_priority", type: "INTEGER" },
      { name: "committed_amount", type: "DECIMAL" },
      { name: "drawn_amount", type: "DECIMAL" },
      { name: "margin_bps", type: "INTEGER" },
      { name: "maturity_date", type: "DATE" },
      { name: "our_holding", type: "DECIMAL" },
      { name: "status", type: "TEXT" },
    ],
  },
  {
    name: "enforcement_classes",
    label: "Enforcement Classes",
    group: "Template 3",
    description: "F.2A.3 — creditor classes with ratio definitions and covenant thresholds",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "class_name", type: "TEXT" },
      { name: "class_code", type: "TEXT", unique: true },
      { name: "priority", type: "INTEGER" },
      { name: "ratio_definitions", type: "JSONB" },
      { name: "covenant_thresholds", type: "JSONB" },
    ],
  },
  {
    name: "corporate_entities",
    label: "Corporate Entities",
    group: "Template 3",
    description: "F.2A.4 — entity map (opco, holdco, SPV, issuer, etc.)",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "entity_name", type: "TEXT" },
      { name: "entity_type", type: "TEXT" },
      { name: "jurisdiction", type: "VARCHAR(2)" },
      { name: "securitisation_boundary", type: "BOOLEAN" },
      { name: "intercompany_loans", type: "JSONB" },
    ],
  },
  {
    name: "deal_counterparties",
    label: "Counterparties",
    group: "Template 3",
    description: "F.4 — key counterparties with dependency and replacement risk",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "name", type: "TEXT" },
      { name: "counterparty_type", type: "TEXT" },
      { name: "credit_rating", type: "TEXT" },
      { name: "replacement_risk", type: "TEXT" },
      { name: "contract_value", type: "DECIMAL" },
    ],
  },
  {
    name: "deal_reserve_accounts",
    label: "Reserve Accounts",
    group: "Template 3",
    description: "F.2A.2.6 — DSRA, MRA, capex reserves with funding status",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "account_name", type: "TEXT" },
      { name: "account_type", type: "TEXT" },
      { name: "required_balance", type: "DECIMAL" },
      { name: "current_balance", type: "DECIMAL" },
      { name: "funded_status", type: "TEXT" },
    ],
  },
  {
    name: "hedge_portfolio",
    label: "Hedge Portfolio",
    group: "Template 3",
    description: "F.16 — IRS, caps, floors, FX hedges with MTM valuations",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "hedge_type", type: "TEXT" },
      { name: "notional", type: "DECIMAL" },
      { name: "maturity", type: "DATE" },
      { name: "fixed_rate", type: "DECIMAL" },
      { name: "mark_to_market", type: "DECIMAL" },
    ],
  },
  {
    name: "deal_development_phases",
    label: "Development Phases",
    group: "Template 3",
    description: "F.15 — capex phases with budget tracking and variance",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "phase_name", type: "TEXT" },
      { name: "capex_budget", type: "DECIMAL" },
      { name: "actual_spend", type: "DECIMAL" },
      { name: "variance_pct", type: "DECIMAL" },
      { name: "status", type: "TEXT" },
    ],
  },
  {
    name: "investor_allocations",
    label: "Investor Allocations",
    group: "Template 3",
    description: "F.14 — who holds what across tranches and mandates",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "investor_name", type: "TEXT" },
      { name: "tranche", type: "TEXT" },
      { name: "amount", type: "DECIMAL" },
      { name: "pct_of_mandate", type: "DECIMAL" },
    ],
  },
  {
    name: "intercreditor_terms",
    label: "Intercreditor Terms",
    group: "Template 3",
    description: "F.2A.8 — one row per deal, standstill, turnover, enforcement priority",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id", unique: true },
      { name: "governing_law", type: "TEXT" },
      { name: "standstill_period", type: "TEXT" },
      { name: "enforcement_priority", type: "TEXT" },
      { name: "non_petition_clause", type: "BOOLEAN" },
    ],
  },

  // ── Template 1: Financial Forecast ─────────────────────────────────────
  {
    name: "deal_financial_template",
    label: "Financial Template",
    group: "Template 1",
    description: "Sector template and custom line labels for revenue, cost, capex, KPIs",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id", unique: true },
      { name: "sector_template", type: "TEXT" },
      { name: "revenue_line_labels", type: "JSONB" },
      { name: "cost_line_labels", type: "JSONB" },
      { name: "capex_line_labels", type: "JSONB" },
      { name: "growth_capex_labels", type: "JSONB" },
      { name: "maintenance_capex_labels", type: "JSONB" },
      { name: "sector_kpi_labels", type: "JSONB" },
    ],
  },
  {
    name: "forecast_cases",
    label: "Forecast Cases",
    group: "Template 1",
    description: "Management, credit/lender, combined-downside and single-variant stress scenarios per deal. Stress cases link back to deal_risk_register via driving_risk_id.",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "case_key", type: "TEXT", unique: true },
      { name: "case_name", type: "TEXT" },
      { name: "case_type", type: "TEXT" },
      { name: "scenario_kind", type: "TEXT" },
      { name: "stress_label", type: "TEXT" },
      { name: "driving_risk_id", type: "UUID", fk: "deal_risk_register.id" },
      { name: "drives_monitoring", type: "BOOLEAN" },
    ],
  },
  {
    name: "forecast_case_versions",
    label: "Forecast Versions",
    group: "Template 1",
    description: "Version history for each forecast case. Frozen at IC approval; reforecast = new version, old stays as history.",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "forecast_case_id", type: "INTEGER", fk: "forecast_cases.id" },
      { name: "version_number", type: "INTEGER" },
      { name: "is_active", type: "BOOLEAN" },
      { name: "effective_from", type: "DATE" },
    ],
  },
  {
    name: "forecast_period_items",
    label: "Forecast Grid",
    group: "Template 1",
    description: "Normalised (version × period × line_key) grid holding financial-line AND KPI forecasts. Line keys like 'sector_kpi_1' are KPI expectations; 'total_revenue', 'senior_dscr' etc. are financial lines.",
    columns: [
      { name: "id", type: "BIGSERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "forecast_case_version_id", type: "INTEGER", fk: "forecast_case_versions.id" },
      { name: "reporting_period_id", type: "INTEGER", fk: "deal_reporting_periods.id" },
      { name: "line_key", type: "TEXT" },
      { name: "value", type: "NUMERIC" },
    ],
  },
  {
    name: "forecast_case_periods",
    label: "Forecast Periods (legacy)",
    group: "Template 1",
    description: "Legacy period-level scenario_metrics JSONB. Still populated for historical deals; new ingestion writes to forecast_period_items instead.",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "forecast_case_version_id", type: "INTEGER", fk: "forecast_case_versions.id" },
      { name: "period_key", type: "TEXT" },
      { name: "scenario_metrics", type: "JSONB" },
    ],
  },
  {
    name: "actual_periods",
    label: "Actual Periods",
    group: "Template 1",
    description: "Borrower-reported actuals with source hierarchy and extraction confidence",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "period_flag", type: "TEXT", unique: true },
      { name: "period_label", type: "TEXT" },
      { name: "actual_metrics", type: "JSONB" },
      { name: "borrower_reported_ratios", type: "JSONB" },
      { name: "platform_computed_ratios", type: "JSONB" },
      { name: "source_hierarchy", type: "TEXT" },
    ],
  },
  {
    name: "financial_periods",
    label: "Financial Periods",
    group: "Template 1",
    description: "Reported financial periods with expected vs reported metrics",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "period_key", type: "TEXT", unique: true },
      { name: "reported_metrics", type: "JSONB" },
      { name: "expected_metrics", type: "JSONB" },
    ],
  },

  // ── Template 2: Risk Register ──────────────────────────────────────────
  {
    name: "risk_taxonomy",
    label: "Risk Taxonomy",
    group: "Template 2",
    description: "226-risk master register — reference data for all risk categories",
    columns: [
      { name: "risk_id", type: "VARCHAR(10)", pk: true },
      { name: "risk_name", type: "TEXT" },
      { name: "category_code", type: "VARCHAR(4)" },
      { name: "category_name", type: "TEXT" },
      { name: "sub_sector", type: "TEXT" },
      { name: "key_indicators", type: "TEXT" },
    ],
  },
  {
    name: "deal_risk_register",
    label: "Deal Risk Register",
    group: "Template 2",
    description: "Per-deal risk assessments — 30+ columns with mitigation scoring (M1-M5, C1-C5)",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "risk_id", type: "VARCHAR(10)", fk: "risk_taxonomy.risk_id" },
      { name: "likelihood", type: "INTEGER", note: "1-5" },
      { name: "severity", type: "INTEGER", note: "1-5" },
      { name: "risk_score", type: "INTEGER", note: "generated: L × S" },
      { name: "risk_level", type: "TEXT", note: "generated: negligible → fatal" },
      { name: "mitigation_party_score", type: "TEXT", note: "M1-M5" },
      { name: "mitigation_capital_score", type: "TEXT", note: "C1-C5" },
      { name: "sensitivity_name", type: "TEXT" },
      { name: "monitoring_kpi", type: "TEXT" },
    ],
  },
  {
    name: "deal_risk_register_history",
    label: "Risk Register History",
    group: "Template 2",
    description: "Audit trail of risk assessment changes",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "risk_id", type: "VARCHAR(10)" },
      { name: "risk_score", type: "INTEGER" },
      { name: "risk_level", type: "TEXT" },
      { name: "superseded_by", type: "UUID" },
    ],
  },

  // ── Analytics ──────────────────────────────────────────────────────────
  {
    name: "covenant_thresholds",
    label: "Covenant Thresholds",
    group: "Analytics",
    description: "Configured covenant levels per deal — lockup, trigger, default thresholds",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "covenant_name", type: "TEXT" },
      { name: "ratio_name", type: "TEXT" },
      { name: "direction", type: "TEXT", note: "min / max" },
      { name: "lockup_level", type: "DECIMAL" },
      { name: "trigger_level", type: "DECIMAL" },
      { name: "default_level", type: "DECIMAL" },
    ],
  },
  {
    name: "covenant_tests",
    label: "Covenant Tests",
    group: "Analytics",
    description: "Test results — 4-tier status per covenant per period",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "actual_period_id", type: "INTEGER", fk: "actual_periods.id" },
      { name: "covenant_name", type: "TEXT" },
      { name: "ratio_value", type: "DECIMAL" },
      { name: "tier_status", type: "TEXT", note: "performing / lockup / trigger / default" },
      { name: "headroom_to_lockup", type: "DECIMAL" },
      { name: "headroom_to_default", type: "DECIMAL" },
    ],
  },
  {
    name: "financial_variances",
    label: "Financial Variances",
    group: "Analytics",
    description: "Forecast vs actual variance analysis per metric per period",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "financial_period_id", type: "INTEGER", fk: "financial_periods.id" },
      { name: "metric_key", type: "TEXT" },
      { name: "reported_value", type: "NUMERIC" },
      { name: "expected_value", type: "NUMERIC" },
      { name: "variance_pct", type: "NUMERIC" },
      { name: "materiality", type: "TEXT" },
    ],
  },
  {
    name: "deal_assessments",
    label: "Deal Assessments",
    group: "Analytics",
    description: "Composite performance grade (1-6) from covenant + variance + risk + compliance",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "financial_period_id", type: "INTEGER", fk: "financial_periods.id" },
      { name: "grade", type: "TEXT" },
      { name: "overall_score", type: "NUMERIC" },
      { name: "covenant_score", type: "INTEGER" },
      { name: "variance_score", type: "INTEGER" },
      { name: "trend_score", type: "INTEGER" },
      { name: "compliance_score", type: "INTEGER" },
    ],
  },
  {
    name: "distribution_assessments",
    label: "Distribution Assessments",
    group: "Analytics",
    description: "Distribution permission checks — blockers, lockup state, capacity",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "distribution_status", type: "TEXT" },
      { name: "lockup_state", type: "TEXT" },
      { name: "blocker_count", type: "INTEGER" },
      { name: "failed_conditions", type: "JSONB" },
    ],
  },
  {
    name: "trend_records",
    label: "Trend Records",
    group: "Analytics",
    description: "Multi-period trend detection with severity classification",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "deal_id", type: "INTEGER", fk: "deals.id" },
      { name: "metric_key", type: "TEXT" },
      { name: "direction", type: "TEXT", note: "improving / stable / deteriorating" },
      { name: "severity", type: "TEXT" },
      { name: "total_change_pct", type: "NUMERIC" },
    ],
  },
];

const RELATIONSHIPS: Relationship[] = [
  // Template 3 → deals
  { from: "capital_structure_instruments", to: "deals", label: "deal_id", type: "1:N" },
  { from: "enforcement_classes", to: "deals", label: "deal_id", type: "1:N" },
  { from: "corporate_entities", to: "deals", label: "deal_id", type: "1:N" },
  { from: "deal_counterparties", to: "deals", label: "deal_id", type: "1:N" },
  { from: "deal_reserve_accounts", to: "deals", label: "deal_id", type: "1:N" },
  { from: "hedge_portfolio", to: "deals", label: "deal_id", type: "1:N" },
  { from: "deal_development_phases", to: "deals", label: "deal_id", type: "1:N" },
  { from: "investor_allocations", to: "deals", label: "deal_id", type: "1:N" },
  { from: "intercreditor_terms", to: "deals", label: "deal_id", type: "1:1" },
  // Template 1 → deals
  { from: "deal_financial_template", to: "deals", label: "deal_id", type: "1:1" },
  { from: "forecast_cases", to: "deals", label: "deal_id", type: "1:N" },
  { from: "actual_periods", to: "deals", label: "deal_id", type: "1:N" },
  { from: "financial_periods", to: "deals", label: "deal_id", type: "1:N" },
  // Template 1 chains
  { from: "forecast_case_versions", to: "forecast_cases", label: "forecast_case_id", type: "1:N" },
  { from: "forecast_period_items", to: "forecast_case_versions", label: "forecast_case_version_id", type: "1:N" },
  { from: "forecast_case_periods", to: "forecast_case_versions", label: "version_id", type: "1:N" },
  // Template 2
  { from: "deal_risk_register", to: "deals", label: "deal_id", type: "1:N" },
  { from: "deal_risk_register", to: "risk_taxonomy", label: "risk_id", type: "1:N" },
  { from: "deal_risk_register_history", to: "deals", label: "deal_id", type: "1:N" },
  // KPI stress attribution — forecast_cases link back to the motivating risk
  { from: "forecast_cases", to: "deal_risk_register", label: "driving_risk_id", type: "1:N" },
  // Analytics
  { from: "covenant_thresholds", to: "deals", label: "deal_id", type: "1:N" },
  { from: "covenant_tests", to: "deals", label: "deal_id", type: "1:N" },
  { from: "covenant_tests", to: "actual_periods", label: "actual_period_id", type: "1:N" },
  { from: "financial_variances", to: "financial_periods", label: "financial_period_id", type: "1:N" },
  { from: "deal_assessments", to: "deals", label: "deal_id", type: "1:N" },
  { from: "distribution_assessments", to: "deals", label: "deal_id", type: "1:N" },
  { from: "trend_records", to: "deals", label: "deal_id", type: "1:N" },
];

const GROUPS = ["All", "Core", "Template 3", "Template 1", "Template 2", "Analytics"] as const;
type Group = (typeof GROUPS)[number];

const GROUP_COLORS: Record<string, { accent: string; soft: string }> = {
  Core:         { accent: "var(--accent)",  soft: "var(--accent-soft)" },
  "Template 3": { accent: "var(--good)",    soft: "var(--good-soft)" },
  "Template 1": { accent: "var(--warning)", soft: "var(--warning-soft)" },
  "Template 2": { accent: "var(--critical)", soft: "var(--critical-soft)" },
  Analytics:    { accent: "#8b5cf6",         soft: "rgba(139, 92, 246, 0.14)" },
};

const API_ENDPOINTS = [
  { group: "Template 3 CRUD", endpoints: [
    { method: "GET", path: "/api/deals/{slug}/capital-structure" },
    { method: "POST", path: "/api/deals/{slug}/capital-structure" },
    { method: "PUT", path: "/api/deals/{slug}/capital-structure/{id}" },
    { method: "DELETE", path: "/api/deals/{slug}/capital-structure/{id}" },
    { method: "GET", path: "/api/deals/{slug}/enforcement-classes" },
    { method: "GET", path: "/api/deals/{slug}/corporate-entities" },
    { method: "GET", path: "/api/deals/{slug}/counterparties" },
    { method: "GET", path: "/api/deals/{slug}/reserve-accounts" },
    { method: "GET", path: "/api/deals/{slug}/hedge-portfolio" },
    { method: "GET", path: "/api/deals/{slug}/development-phases" },
    { method: "GET", path: "/api/deals/{slug}/investor-allocations" },
    { method: "PUT", path: "/api/deals/{slug}/intercreditor" },
    { method: "PUT", path: "/api/deals/{slug}/financial-template" },
  ]},
  { group: "Portfolio Aggregation", endpoints: [
    { method: "GET", path: "/api/portfolio/capital-summary" },
    { method: "GET", path: "/api/portfolio/maturity-profile" },
    { method: "GET", path: "/api/portfolio/counterparty-exposure" },
    { method: "GET", path: "/api/portfolio/hedge-summary" },
    { method: "GET", path: "/api/portfolio/development-status" },
    { method: "GET", path: "/api/portfolio/investor-book" },
    { method: "GET", path: "/api/portfolio/sector-concentration" },
    { method: "GET", path: "/api/portfolio/risk-heatmap" },
    { method: "GET", path: "/api/portfolio/weak-mitigation" },
  ]},
  { group: "Analytics Engines", endpoints: [
    { method: "POST", path: "/api/deals/{slug}/analytics/run-covenant-tests" },
    { method: "POST", path: "/api/deals/{slug}/analytics/run-variance" },
    { method: "GET", path: "/api/deals/{slug}/analytics/risk-score" },
    { method: "GET", path: "/api/portfolio/analytics/risk-scores" },
    { method: "POST", path: "/api/deals/{slug}/analytics/compute-grade" },
    { method: "POST", path: "/api/deals/{slug}/analytics/assess-distribution" },
    { method: "POST", path: "/api/deals/{slug}/analytics/detect-trends" },
  ]},
  { group: "TopSheet", endpoints: [
    { method: "GET", path: "/api/deals/{slug}/topsheet" },
    { method: "GET", path: "/api/deals/{slug}/risk-register" },
    { method: "PUT", path: "/api/deals/{slug}/risk-register/{risk_id}" },
    { method: "POST", path: "/api/deals/{slug}/risk-register/initialise" },
  ]},
];

// ── Components ────────────────────────────────────────────────────────────

function TableCard({ table, isSelected, onClick }: { table: Table; isSelected: boolean; onClick: () => void }) {
  const colors = GROUP_COLORS[table.group] || GROUP_COLORS.Core;
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? colors.soft : "var(--panel)",
        border: `1px solid ${isSelected ? colors.accent : "var(--line)"}`,
        borderRadius: "var(--radius-card)",
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: isSelected ? "var(--shadow-soft)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: colors.accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "0.76rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: colors.accent,
          }}
        >
          {table.group}
        </span>
      </div>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
        {table.label}
      </h3>
      <code style={{ fontSize: "0.78rem", color: "var(--ink-soft)", fontFamily: "monospace" }}>
        {table.name}
      </code>
      <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 8, marginBottom: 0 }}>
        {table.description}
      </p>
    </div>
  );
}

function ColumnDetail({ table }: { table: Table }) {
  const colors = GROUP_COLORS[table.group] || GROUP_COLORS.Core;
  const rels = RELATIONSHIPS.filter((r) => r.from === table.name);

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-panel)",
        padding: "24px",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: colors.accent,
          }}
        />
        <span
          style={{
            fontSize: "0.76rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: colors.accent,
          }}
        >
          {table.group}
        </span>
      </div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 4px", color: "var(--ink)" }}>
        {table.label}
      </h2>
      <code style={{ fontSize: "0.84rem", color: "var(--ink-soft)" }}>{table.name}</code>
      <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.5 }}>
        {table.description}
      </p>

      {/* Columns */}
      <div style={{ marginTop: 20, borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
          <thead>
            <tr style={{ background: colors.soft }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: colors.accent, borderBottom: "1px solid var(--line)" }}>Column</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: colors.accent, borderBottom: "1px solid var(--line)" }}>Type</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: colors.accent, borderBottom: "1px solid var(--line)" }}>Constraints</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: colors.accent, borderBottom: "1px solid var(--line)" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((col, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 14px", fontFamily: "monospace", fontWeight: col.pk ? 700 : 400, color: "var(--ink)" }}>
                  {col.pk && <span style={{ color: colors.accent, marginRight: 4 }}>PK</span>}
                  {col.fk && <span style={{ color: "var(--warning)", marginRight: 4 }}>FK</span>}
                  {col.name}
                </td>
                <td style={{ padding: "8px 14px", fontFamily: "monospace", color: "var(--ink-soft)", fontSize: "0.82rem" }}>
                  {col.type}
                </td>
                <td style={{ padding: "8px 14px", fontSize: "0.82rem" }}>
                  {col.pk && <span className="badge neutral badge-sm" style={{ marginRight: 4 }}>PK</span>}
                  {col.fk && <span className="badge warning badge-sm" style={{ marginRight: 4 }}>FK → {col.fk}</span>}
                  {col.unique && <span className="badge good badge-sm">UNIQUE</span>}
                </td>
                <td style={{ padding: "8px 14px", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                  {col.note || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Relationships */}
      {rels.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: "0.84rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-soft)", marginBottom: 10 }}>
            Relationships
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rels.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: "var(--accent-soft)",
                  fontSize: "0.84rem",
                }}
              >
                <span className="badge neutral badge-sm">{r.type}</span>
                <code style={{ color: "var(--ink)" }}>{r.from}</code>
                <span style={{ color: "var(--ink-soft)" }}>→</span>
                <code style={{ color: "var(--accent)" }}>{r.to}</code>
                <span style={{ color: "var(--ink-soft)", marginLeft: "auto", fontSize: "0.78rem" }}>
                  via {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "var(--good)",
    POST: "var(--accent)",
    PUT: "var(--warning)",
    DELETE: "var(--critical)",
  };
  const bgs: Record<string, string> = {
    GET: "var(--good-soft)",
    POST: "var(--accent-soft)",
    PUT: "var(--warning-soft)",
    DELETE: "var(--critical-soft)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 52,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: colors[method] || "var(--ink)",
        background: bgs[method] || "var(--accent-soft)",
      }}
    >
      {method}
    </span>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export default function DataArchitecture() {
  const [activeGroup, setActiveGroup] = useState<Group>("All");
  const [selectedTable, setSelectedTable] = useState<string>("deals");
  const [activeTab, setActiveTab] = useState<"schema" | "api" | "relationships">("schema");

  const filteredTables =
    activeGroup === "All" ? TABLES : TABLES.filter((t) => t.group === activeGroup);
  const selected = TABLES.find((t) => t.name === selectedTable) || TABLES[0];

  const filteredRels =
    activeGroup === "All"
      ? RELATIONSHIPS
      : RELATIONSHIPS.filter((r) => {
          const fromTable = TABLES.find((t) => t.name === r.from);
          const toTable = TABLES.find((t) => t.name === r.to);
          return fromTable?.group === activeGroup || toTable?.group === activeGroup;
        });

  return (
    <>
      {/* Group filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`subnav-link${activeGroup === g ? " active" : ""}`}
          >
            {g}
            {g !== "All" && (
              <span style={{ marginLeft: 6, opacity: 0.7, fontSize: "0.78rem" }}>
                ({TABLES.filter((t) => t.group === g).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab switch: Schema / API / Relationships */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {(["schema", "api", "relationships"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`mini-button${activeTab === tab ? "" : " subtle"}`}
          >
            {tab === "schema" ? "Schema Explorer" : tab === "api" ? "API Endpoints" : "Relationships"}
          </button>
        ))}
      </div>

      {/* ── Schema Explorer ──────────────────────────────────────────── */}
      {activeTab === "schema" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, alignItems: "start" }}>
          {/* Left: table cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
            {filteredTables.map((t) => (
              <TableCard
                key={t.name}
                table={t}
                isSelected={selectedTable === t.name}
                onClick={() => setSelectedTable(t.name)}
              />
            ))}
          </div>
          {/* Right: column detail */}
          <div style={{ position: "sticky", top: 20 }}>
            <ColumnDetail table={selected} />
          </div>
        </div>
      )}

      {/* ── API Endpoints ────────────────────────────────────────────── */}
      {activeTab === "api" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {API_ENDPOINTS.map((group) => (
            <div
              key={group.group}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-card)",
                padding: "20px 22px",
              }}
            >
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 14px" }}>
                {group.group}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.endpoints.map((ep, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: i % 2 === 0 ? "transparent" : "var(--accent-soft)",
                    }}
                  >
                    <MethodBadge method={ep.method} />
                    <code style={{ fontSize: "0.84rem", color: "var(--ink)" }}>{ep.path}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div
            style={{
              background: "var(--accent-soft)",
              borderRadius: "var(--radius-card)",
              padding: "16px 22px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>38</span>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>
              total API endpoints across CRUD, portfolio aggregation, analytics engines, and TopSheet projection
            </span>
          </div>
        </div>
      )}

      {/* ── Relationships ────────────────────────────────────────────── */}
      {activeTab === "relationships" && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-panel)",
            padding: "24px",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {(["1:N", "1:1"] as const).map((type) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.84rem" }}>
                <span className={`badge ${type === "1:1" ? "good" : "neutral"} badge-sm`}>{type}</span>
                <span style={{ color: "var(--ink-soft)" }}>
                  {type === "1:1" ? "One-to-one" : "One-to-many"} ({filteredRels.filter((r) => r.type === type).length})
                </span>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ background: "var(--accent-soft)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>From</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>Type</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>To</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>Via</th>
                </tr>
              </thead>
              <tbody>
                {filteredRels.map((r, i) => {
                  const fromTable = TABLES.find((t) => t.name === r.from);
                  const toTable = TABLES.find((t) => t.name === r.to);
                  const fromColor = GROUP_COLORS[fromTable?.group || "Core"];
                  const toColor = GROUP_COLORS[toTable?.group || "Core"];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: fromColor.accent, marginRight: 8 }} />
                        <code
                          style={{ color: "var(--ink)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--line)" }}
                          onClick={() => { setSelectedTable(r.from); setActiveTab("schema"); }}
                        >
                          {r.from}
                        </code>
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <span className={`badge ${r.type === "1:1" ? "good" : "neutral"} badge-sm`}>{r.type}</span>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: toColor.accent, marginRight: 8 }} />
                        <code
                          style={{ color: "var(--ink)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--line)" }}
                          onClick={() => { setSelectedTable(r.to); setActiveTab("schema"); }}
                        >
                          {r.to}
                        </code>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <code style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>{r.label}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginTop: 24,
        }}
      >
        {[
          { label: "Tables", value: TABLES.length, color: "var(--accent)" },
          { label: "Relationships", value: RELATIONSHIPS.length, color: "var(--ink-soft)" },
          { label: "API Endpoints", value: 38, color: "var(--good)" },
          { label: "Risk Taxonomy", value: "226", color: "var(--critical)" },
          { label: "Templates", value: 3, color: "var(--warning)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-card)",
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-soft)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
