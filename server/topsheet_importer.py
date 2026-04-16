"""
TopSheet Import Pipeline
========================
Reads the expanded TopSheet Excel template and imports data into the database.

Supported sheets:
  1. Deal Identity          → deals table (direct columns)
  2. Structure & Terms      → deals table (direct columns)
  4. Ratings               → deals table (direct columns)
  6. Covenant Config        → covenant_thresholds table
  8. Sources & Uses         → deals.sources_and_uses (JSONB)
  9. Risk Register          → risk_register_entries table
  10. Stress Config         → deals.stress_parameters (JSONB)
  14. Key Outputs           → deals table (direct columns)
  16. Base Case             → forecast_case_periods (management_case, priority 1, drives grade)
  17. Management Case       → forecast_case_periods (lender_case, priority 2, secondary)
  18. Downside Case         → forecast_case_periods (combined_downside, priority 3, floor/alarm)
  19. Actuals               → actual_periods table
  23. Metadata              → deals table (direct columns)
"""

import io
import json
import logging
from datetime import date, datetime
from typing import Any

import openpyxl

log = logging.getLogger(__name__)

# ── Columns that exist on the deals table (used to filter key-value imports) ──
DEALS_COLUMNS = {
    "borrower_legal_name", "borrower_trading_name", "borrower_lei",
    "borrower_jurisdiction", "borrower_registered_number", "project_codename",
    "approved_auditors", "sic_code", "sector_label", "sub_sector_label",
    "ticcs_classification", "sponsor_name", "sponsor_fund", "parent_group",
    "ownership_structure", "consortium_members", "country", "reporting_currency",
    "counterparties", "structure_type", "origination_type", "seniority",
    "security_type", "security_summary", "origination_date", "commitment_date",
    "first_drawdown_date", "cod_date", "cod_months", "maturity_date",
    "weighted_average_life", "contract_length_months", "fiscal_year_end_month",
    "concession_expiry_date", "regulatory_period_current", "reporting_periodicity",
    "total_drawn", "our_commitment", "our_drawn", "our_holding_pct",
    "pricing_type", "pricing_margin_bps", "reference_rate", "coupon_rate",
    "amortisation_profile", "call_protection", "governing_law", "syndicated",
    "number_of_lenders", "facility_agent", "security_trustee",
    "coc_regime_exists", "coc_definition", "coc_consequence",
    "coc_prepayment_basis", "coc_permitted_transfers", "coc_consent_threshold",
    "sources_and_uses", "enterprise_value",
    "capital_structure_instruments", "capital_structure_classes",
    "capital_structure_entities", "cashflow_waterfall",
    "reserve_accounts", "liquidity_facilities",
    "moodys_rating", "moodys_outlook", "moodys_watch",
    "sp_rating", "sp_outlook", "sp_watch",
    "fitch_rating", "fitch_outlook", "fitch_watch",
    "internal_credit_score", "performance_grade", "ma_eligibility",
    "rating_trigger_configured", "rating_trigger_threshold",
    "rating_trigger_consequence",
    "no_hard_covenant_dscr", "no_hard_covenant_icr", "proxy_default_flag",
    "sector_kpis_static", "stress_parameters", "named_scenarios",
    "unlevered_irr", "levered_equity_irr", "moic", "all_in_cost_of_debt",
    "ebitda_margin_lifetime", "tax_leakage_rate", "upfront_economics",
    "collateral_assessment",
    "revenue_pricing_mechanism", "revenue_volume_mechanism",
    "revenue_duration_category", "revenue_risk_composite", "revenue_risk_level",
    "equity_cure_available", "equity_cure_regime",
    "overall_covenant_status", "compliance_status", "distribution_status",
    "consecutive_lockup_periods", "assigned_ham", "assigned_pm",
    # v8 Distribution Mechanics (Tab 1)
    "distribution_frequency", "distribution_calculation_basis",
    "distribution_waterfall_position", "sweep_before_distribution",
    "sweep_in_dscr", "trapped_cash_mechanism", "trapped_cash_release",
    "lockup_cure_window_days", "lockup_escalation_periods",
    "lockup_escalation_consequence",
    "development_phases", "rollout_plan",
    "hedging_policy", "hedging_portfolio",
    "model_version", "model_date",
    # core existing columns also updatable via topsheet
    "name", "borrower", "sector", "deal_type", "region", "currency",
    "facility_amount", "phase", "summary", "deal_overview", "revenue_risk",
}

# ── Line item display name → scenario_metrics JSON key ───────────────────────
LINE_ITEM_KEYS = {
    # Cashflow
    "total revenue": "total_revenue",
    "gpu revenue": "gpu_revenue",
    "storage revenue": "storage_revenue",
    "footprint charges": "footprint_charges",
    "energy recharge": "energy_recharge",
    "other revenue": "other_revenue",
    "amortisation of deferred income": "amort_deferred_income",
    "total operating costs": "total_operating_costs",
    "mip charges": "mip_charges",
    "energy cost": "energy_cost",
    "management fee": "management_fee",
    "business rates": "business_rates",
    "insurance": "insurance",
    "security": "security_cost",
    "professional fees": "professional_fees",
    "standing charges for grid": "grid_standing_charges",
    "per kw footprint charge cost": "footprint_cost",
    "other operating costs": "other_operating_costs",
    "ebitda": "ebitda",
    "capital expenditure": "capital_expenditure",
    "movement in working capital": "working_capital_movement",
    "working capital movement": "working_capital_movement",
    "movement in reserve accounts": "reserve_account_movement",
    "reserve account movement": "reserve_account_movement",
    "pre-finance pre-tax cashflow": "pre_finance_pre_tax_cf",
    "tax paid": "tax_paid",
    "pre-finance post-tax cashflow": "pre_finance_post_tax_cf",
    "interest on cash balances": "interest_on_cash",
    "customer pre-payment": "customer_prepayment",
    "senior debt drawdown": "senior_debt_drawdown",
    "junior debt drawdown": "junior_debt_drawdown",
    "equity drawdown": "equity_drawdown",
    "total funding": "total_funding",
    "cfads (cash flow available for senior ds)": "cfads",
    "cfads": "cfads",
    "senior debt interest & commitment fees": "senior_interest",
    "senior debt repayment": "senior_repayment",
    "senior debt service": "senior_debt_service",
    "cf available for junior debt service": "cf_available_junior",
    "junior debt interest & commitment fees": "junior_interest",
    "junior debt repayment": "junior_repayment",
    "junior debt service": "junior_debt_service",
    "net cashflow": "net_cashflow",
    "cash b/f": "cash_bf",
    "distributions": "distributions",
    "cash c/f": "cash_cf",
    # Balance sheet
    "total fixed assets": "total_fixed_assets",
    "retained earnings": "retained_earnings",
    "senior debt outstanding": "senior_debt_outstanding",
    "junior debt outstanding": "junior_debt_outstanding",
    "cash": "cash_balance",
    "senior net debt": "senior_net_debt",
    "total net debt": "total_net_debt",
    # Annualised
    "rolling 12-month ebitda": "rolling_12m_ebitda",
    "rolling 12-month cfads": "rolling_12m_cfads",
    "rolling 12-month senior ds": "rolling_12m_senior_ds",
    "rolling 12-month total ds": "rolling_12m_total_ds",
    # Ratios
    "senior quarterly dscr": "senior_quarterly_dscr",
    "senior annual dscr": "senior_annual_dscr",
    "total quarterly dscr": "total_quarterly_dscr",
    "total annual dscr": "total_annual_dscr",
    "ltv (npv)": "ltv_npv",
    "senior net debt / ebitda": "senior_net_debt_ebitda",
    "total net debt / ebitda": "total_net_debt_ebitda",
    "ebitda margin": "ebitda_margin",
    "interest cover ratio": "interest_cover_ratio",
    # Sector KPIs
    "gpu utilisation (%)": "gpu_utilisation_pct",
    "leased capacity (%)": "leased_capacity_pct",
    "construction completion (%)": "construction_completion_pct",
    "power usage (kw)": "power_usage_kw",
    "pue": "pue_actual",
    "number of gpus deployed": "gpu_count_deployed",
}

SCENARIO_MAP = {
    "16. Base Case": "management_case",       # Management Case (priority 1, drives grade)
    "17. Management Case": "lender_case",     # Lender Case (priority 2, secondary comparator)
    "18. Downside Case": "combined_downside", # Combined Downside (priority 3, floor/alarm)
}

CASE_TYPE_PRIORITY = {
    "management_case": 1,
    "lender_case": 2,
    "combined_downside": 3,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _val(v: Any) -> Any:
    """Strip whitespace from strings; return None for empty/BLANK."""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        if v.upper() in ("", "BLANK", "N/A", "-"):
            return None
    return v


def _num(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _bool(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    s = str(v).strip().upper()
    if s in ("TRUE", "YES", "1"):
        return True
    if s in ("FALSE", "NO", "0"):
        return False
    return None


def _date(v: Any) -> date | None:
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.date() if isinstance(v, datetime) else v
    try:
        return datetime.strptime(str(v).strip(), "%Y-%m-%d").date()
    except ValueError:
        pass
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(v).strip(), fmt).date()
        except ValueError:
            continue
    return None


def _period_flag_to_label(flag: str) -> str:
    """Convert '2026Q1' → 'Q1 2026'."""
    if len(flag) == 6 and flag[:4].isdigit() and flag[4] == "Q":
        return f"Q{flag[5]} {flag[:4]}"
    return flag


def _line_item_key(label: str) -> str | None:
    """Map display label → JSON key, stripping indentation."""
    clean = label.strip().lower()
    return LINE_ITEM_KEYS.get(clean)


def _coerce_for_column(col: str, v: Any) -> Any:
    """Coerce a value to the right Python type for a deals column."""
    if v is None:
        return None
    date_cols = {
        "origination_date", "commitment_date", "first_drawdown_date",
        "cod_date", "maturity_date", "concession_expiry_date", "model_date",
    }
    bool_cols = {
        "syndicated", "coc_regime_exists", "equity_cure_available",
        "no_hard_covenant_dscr", "no_hard_covenant_icr", "proxy_default_flag",
        "rating_trigger_configured",
    }
    int_cols = {
        "cod_months", "contract_length_months", "fiscal_year_end_month",
        "number_of_lenders", "pricing_margin_bps", "performance_grade",
        "consecutive_lockup_periods",
    }
    jsonb_cols = {
        "consortium_members", "coc_permitted_transfers", "sources_and_uses",
        "capital_structure_instruments", "capital_structure_classes",
        "capital_structure_entities", "cashflow_waterfall", "reserve_accounts",
        "liquidity_facilities", "sector_kpis_static", "stress_parameters",
        "named_scenarios", "collateral_assessment", "counterparties",
        "equity_cure_regime", "development_phases", "rollout_plan",
        "hedging_policy", "hedging_portfolio",
    }
    array_cols = {"approved_auditors"}

    if col in date_cols:
        return _date(v)
    if col in bool_cols:
        return _bool(v)
    if col in int_cols:
        n = _num(v)
        return int(n) if n is not None else None
    if col in jsonb_cols:
        if isinstance(v, (dict, list)):
            return json.dumps(v)
        if isinstance(v, str):
            try:
                json.loads(v)
                return v
            except (json.JSONDecodeError, ValueError):
                return json.dumps({"raw": v})
        return None
    if col in array_cols:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return None
    # Decimal columns
    if col in {
        "weighted_average_life", "our_holding_pct", "coupon_rate",
        "enterprise_value", "total_drawn", "our_commitment", "our_drawn",
        "unlevered_irr", "levered_equity_irr", "moic", "all_in_cost_of_debt",
        "ebitda_margin_lifetime", "tax_leakage_rate", "upfront_economics",
        "facility_amount",
    }:
        return _num(v)
    # Default: string
    return str(v).strip() if v is not None else None


# ── Sheet parsers ─────────────────────────────────────────────────────────────

def parse_key_value_sheet(ws) -> dict[str, Any]:
    """
    Parse sheets where row 4 is the header (Field, Type, Req, Value, Notes, DB Field)
    and data values are in column D (index 3).
    Returns {db_column: raw_value}.
    """
    result: dict[str, Any] = {}
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            # Detect header row
            if row and str(row[0] or "").strip().lower() == "field":
                header_found = True
            continue
        if not row or row[0] is None:
            continue
        field_name = str(row[0]).strip()
        # Skip section headers (no dot in name, all caps or starts with F.)
        if field_name.startswith("F.") or field_name.isupper():
            continue
        # DB Field is col 6 (index 5): "topsheet.column_name"
        db_ref = str(row[5]).strip() if len(row) > 5 and row[5] else f"topsheet.{field_name}"
        col = db_ref.replace("topsheet.", "").strip()
        if col not in DEALS_COLUMNS:
            continue
        raw = _val(row[3]) if len(row) > 3 else None
        if raw is not None:
            result[col] = raw
    return result


def parse_sources_uses_sheet(ws) -> dict[str, Any]:
    """Parse Sources & Uses sheet into a JSONB-ready dict."""
    data: dict[str, Any] = {}
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            if row and str(row[0] or "").strip().lower() == "field":
                header_found = True
            continue
        if not row or row[0] is None:
            continue
        field = str(row[0]).strip()
        if field.startswith("F.") or not field or field.isupper():
            continue
        raw = _val(row[3]) if len(row) > 3 else None
        if raw is not None:
            data[field] = _num(raw) if _num(raw) is not None else raw
    return {"sources_and_uses": json.dumps(data)} if data else {}


def parse_stress_config_sheet(ws) -> dict[str, Any]:
    """Parse Stress Config sheet into deals.stress_parameters JSONB."""
    params: list[dict] = []
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            if row and str(row[0] or "").strip().lower() == "parameter":
                header_found = True
            continue
        if not row or row[0] is None:
            continue
        param = str(row[0]).strip()
        if not param or param.isupper():
            continue
        params.append({
            "parameter": param,
            "start_value": _num(row[1]) if len(row) > 1 else None,
            "flex": _num(row[2]) if len(row) > 2 else None,
            "modelled_value": _num(row[3]) if len(row) > 3 else None,
            "notes": str(row[4]).strip() if len(row) > 4 and row[4] else None,
        })
    return {"stress_parameters": json.dumps(params)} if params else {}


def parse_covenant_sheet(ws) -> dict:
    """
    Parse Covenant Config sheet.
    Returns {
        'covenants': [list of covenant dicts],
        'proxy_flags': {no_hard_covenant_dscr, no_hard_covenant_icr, proxy_default_flag},
    }
    """
    covenants = []
    proxy_flags: dict[str, Any] = {}
    header_found = False
    in_proxy_section = False
    in_rating_section = False

    for row in ws.iter_rows(values_only=True):
        if not row:
            continue
        first = str(row[0] or "").strip()

        if not header_found:
            if first.lower() == "covenant name":
                header_found = True
            continue

        # Detect section breaks
        if "NO-HARD-COVENANT" in first.upper():
            in_proxy_section = True
            in_rating_section = False
            continue
        if "RATING-BASED TRIGGER" in first.upper():
            in_proxy_section = False
            in_rating_section = True
            continue

        if in_proxy_section:
            col = first.lower()
            val = _bool(_val(row[2]) if len(row) > 2 else None)
            if col in ("no_hard_covenant_dscr", "no_hard_covenant_icr", "proxy_default_flag"):
                proxy_flags[col] = val
            continue

        if in_rating_section:
            continue  # Handled via key-value sheets

        # Standard covenant row
        if not first or first.startswith("F."):
            continue

        def thresh(v):
            raw = _val(v)
            return _num(raw) if raw is not None else None

        # NOTE: this parser predates the v8 template and uses its own column
        # order. For the public Tab 8 layout, use ``parse_covenant_thresholds_v8``
        # below which reads ``ratio_level`` as well.
        covenants.append({
            "covenant_name": first,
            "ratio_name": _val(row[1]) if len(row) > 1 else None,
            "covenant_category": _val(row[2]) if len(row) > 2 else None,
            "test_type": _val(row[3]) if len(row) > 3 else None,
            "direction": _val(row[4]) if len(row) > 4 else None,
            "lockup_level": thresh(row[5]) if len(row) > 5 else None,
            "trigger_level": thresh(row[6]) if len(row) > 6 else None,
            "default_level": thresh(row[7]) if len(row) > 7 else None,
            "composition_tag": _val(row[8]) if len(row) > 8 else None,
            "test_frequency": _val(row[9]) if len(row) > 9 else None,
            "ratio_level": _val(row[11]) if len(row) > 11 else None,
        })

    return {"covenants": covenants, "proxy_flags": proxy_flags}


def parse_covenant_thresholds_v8(ws) -> list[dict]:
    """Parse Tab 8 (Covenant Thresholds) in the v8 template layout.

    Columns (0-indexed): 0 Covenant Name, 1 Ratio Name, 2 Category,
    3 Test Type, 4 Direction, 5 Test Frequency, 6 Enforcement Class,
    7 Lockup Level, 8 Trigger Level, 9 Default Level,
    10 Equity Cure Available, 11 Ratio Level (v8 addition).
    """
    col_map = {
        "covenant_name": 0, "ratio_name": 1, "covenant_category": 2,
        "test_type": 3, "direction": 4, "test_frequency": 5,
        "enforcement_class": 6, "lockup_level": 7, "trigger_level": 8,
        "default_level": 9, "equity_cure_available": 10,
        "ratio_level": 11,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["lockup_level"] = _num(r.get("lockup_level"))
        r["trigger_level"] = _num(r.get("trigger_level"))
        r["default_level"] = _num(r.get("default_level"))
        r["equity_cure_available"] = _bool(r.get("equity_cure_available"))
    return rows


def parse_forecast_sheet(ws) -> dict[str, dict[str, Any]]:
    """
    Parse a forecast sheet (Base/Management/Downside).
    Returns {period_flag: {metric_key: value}}.
    Row 4 = header: [None, 'Line Item', 'Min', 'Max', 'Average', '2024Q1', ...]
    Data rows: col[0] = category tag, col[1] = line item, col[5+] = values.
    """
    periods: dict[str, dict[str, Any]] = {}
    period_flags: list[str] = []

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 3:  # Row 4 (0-indexed = 3) — header
            # Periods start at column index 5
            for cell in row[5:]:
                flag = _val(cell)
                if flag:
                    period_flags.append(str(flag).strip())
                    periods[str(flag).strip()] = {}
            continue

        if i < 4 or not row:
            continue

        category = str(row[0] or "").strip().upper()
        if category not in ("CF", "BS", "AN", "RT", "KPI"):
            continue

        label = str(row[1] or "").strip()
        key = _line_item_key(label)
        if not key:
            continue

        for j, flag in enumerate(period_flags):
            col_idx = 5 + j
            if col_idx >= len(row):
                break
            v = _num(row[col_idx])
            if v is not None:
                periods[flag][key] = v

    # Remove empty periods
    return {f: m for f, m in periods.items() if m}


def parse_actuals_sheet(ws) -> list[dict]:
    """
    Parse Actuals sheet.
    Returns list of actual period dicts, one per populated column.
    Row 4 = header: [None, 'Line Item', 'Period 1', 'Period 2', ...]
    META rows (rows 5-12): metadata per period.
    CF/BS rows: actual financial values.
    """
    n_periods = 0
    meta: dict[int, dict] = {}   # col_offset → metadata
    metrics: dict[int, dict] = {}  # col_offset → {key: value}

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 3:  # Header row
            n_periods = sum(1 for c in row[2:] if c is not None)
            for j in range(n_periods):
                meta[j] = {}
                metrics[j] = {}
            continue

        if i < 4 or not row:
            continue

        category = str(row[0] or "").strip().upper()
        label = str(row[1] or "").strip()

        if category == "META":
            meta_map = {
                "Period Label": "period_label",
                "Period End Date": "period_end",
                "Source Document": "source_document_name",
                "Source Document Type": "source_document_type",
                "Received Date": "received_date",
                "Extraction Confidence": "extraction_confidence",
                "Approval Tier": "approval_tier",
                "Approved By": "approved_by",
            }
            field = meta_map.get(label)
            if field:
                for j in range(n_periods):
                    v = _val(row[2 + j]) if (2 + j) < len(row) else None
                    if v is not None:
                        if field in ("period_end", "received_date"):
                            v = _date(v)
                        elif field == "extraction_confidence":
                            v = _num(v)
                        meta[j][field] = v

        elif category in ("CF", "BS", "AN", "RT", "KPI"):
            key = _line_item_key(label)
            if key:
                # CF/BS/AN go into actual_metrics; RT into borrower_reported_ratios
                dest = "ratios" if category == "RT" else "metrics"
                for j in range(n_periods):
                    v = _num(row[2 + j]) if (2 + j) < len(row) else None
                    if v is not None:
                        metrics[j].setdefault(dest, {})[key] = v

    # Build result list — only include periods that have at least a period_label
    results = []
    for j in range(n_periods):
        m = meta[j]
        if not m.get("period_label"):
            continue
        period_label = m["period_label"]
        period_end = m.get("period_end")
        # Derive period_flag from label e.g. 'Q1 2026' → '2026Q1'
        period_flag = _label_to_flag(period_label)
        period_start = _period_start(period_end) if period_end else None

        results.append({
            "period_label": period_label,
            "period_flag": period_flag,
            "period_start": period_start,
            "period_end": period_end,
            "period_frequency": "quarterly",  # default; could be derived
            "source_document_name": m.get("source_document_name"),
            "source_document_type": m.get("source_document_type"),
            "received_date": m.get("received_date"),
            "extraction_confidence": m.get("extraction_confidence"),
            "approval_tier": m.get("approval_tier"),
            "approved_by": m.get("approved_by"),
            "actual_metrics": json.dumps(metrics[j].get("metrics", {})),
            "borrower_reported_ratios": json.dumps(metrics[j].get("ratios", {})),
        })
    return results


def parse_risk_register_sheet(ws) -> list[dict]:
    """
    Parse Risk Register sheet (Template 2).
    30 columns per risk row — matches the deal_risk_register table.
    Columns: #, Risk ID, Risk Name, Description, Typical Sectors, Present,
    Likelihood, Severity, Score, Risk Level, Trend, Motivated Party (M1-M5),
    Motivated Party Detail, Capital at Risk (C1-C5), Capital Type, Capital Provider,
    Capital Amount, Capital Expiry, Capital Detail, Sensitised?, Sensitivity Name,
    Stress DSCR Min, Min DSCR Year, Stress DSCR Avg, Stress Collateral Ratio,
    Monitoring KPI, Monitoring Threshold, Commentary, Assessed By, Assessed Date.
    """
    risks = []
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            if row and str(row[0] or "").strip().lower() in ("#", "risk id"):
                header_found = True
                # Detect whether col 0 is '#' (row number) or 'Risk ID'
                # If '#', risk_id is col 1; if 'Risk ID', it's col 0
                if str(row[0] or "").strip() == "#":
                    continue  # skip header
                else:
                    continue
            continue
        if not row:
            continue
        # Determine offset — if col 0 is a number, risk_id is col 1
        offset = 0
        try:
            int(row[0])
            offset = 1
        except (TypeError, ValueError):
            offset = 0
        risk_id = _val(row[offset]) if len(row) > offset else None
        if not risk_id or not str(risk_id).startswith("RISK-"):
            continue

        def _c(idx):
            real = offset + idx
            return _val(row[real]) if len(row) > real else None

        present = _c(4)  # column F: Present (Yes/No/N/A)
        if present and str(present).strip().upper() == "YES":
            status = "assessed"
        elif present and str(present).strip().upper() in ("NO", "N/A"):
            status = "not_applicable"
        else:
            status = "not_yet_assessed"

        mitigation_party_raw = _c(10)  # column L
        mitigation_party_score = None
        if mitigation_party_raw:
            mp = str(mitigation_party_raw).strip().upper()
            mp_map = {"M1": "M1_none", "M2": "M2_reputational", "M3": "M3_contractual",
                       "M4": "M4_direct_economic", "M5": "M5_rated_sovereign"}
            mitigation_party_score = mp_map.get(mp[:2], mitigation_party_raw)

        mitigation_capital_raw = _c(12)  # column N
        mitigation_capital_score = None
        if mitigation_capital_raw:
            mc = str(mitigation_capital_raw).strip().upper()
            mc_map = {"C1": "C1_none", "C2": "C2_comfort", "C3": "C3_contractual_backstop",
                       "C4": "C4_funded_reserve", "C5": "C5_unconditional_guarantee"}
            mitigation_capital_score = mc_map.get(mc[:2], mitigation_capital_raw)

        risks.append({
            "risk_id": str(risk_id).strip(),
            "status": status,
            "likelihood": _num(_c(5)),
            "severity": _num(_c(6)),
            "trend": _c(9),
            "mitigation_party_score": mitigation_party_score,
            "mitigation_party_detail": _c(11),
            "mitigation_capital_score": mitigation_capital_score,
            "mitigation_capital_type": _c(13),
            "mitigation_capital_provider": _c(14),
            "mitigation_capital_amount": _num(_c(15)),
            "mitigation_capital_expiry": _date(_c(16)),
            "mitigation_capital_detail": _c(17),
            "sensitised_at_origination": _bool(_c(18)),
            "sensitivity_name": _c(19),
            "stress_dscr_min": _num(_c(20)),
            "stress_dscr_avg": _num(_c(22)),
            "monitoring_kpi": _c(24),
            "monitoring_threshold": _num(_c(25)),
            "commentary": _c(26),
            "assessed_by": _c(27),
            "assessed_at": _date(_c(28)),
        })
    return risks


# ── Table-format sheet parsers (Template 3 — Deal Structure) ─────────────────

def parse_table_sheet(ws, column_map: dict[str, int], skip_header: bool = True) -> list[dict]:
    """
    Generic parser for table-format sheets.
    column_map: {field_name: column_index (0-based)}.
    Reads rows until an empty first-mapped column.
    """
    rows_out = []
    header_skipped = False
    for row in ws.iter_rows(values_only=True):
        if not header_skipped and skip_header:
            # Skip until we find the header row
            if row and any(row):
                first = str(row[0] or "").strip().lower()
                # Detect header by checking if it matches expected field labels
                if any(kw in first for kw in ("name", "instrument", "entity", "counterparty",
                                                "account", "hedge", "phase", "investor",
                                                "class", "#", "no.")):
                    header_skipped = True
                    continue
            continue
        if not row:
            continue
        # Find the first mapped column to check for emptiness
        first_col = min(column_map.values())
        if row[first_col] is None or str(row[first_col]).strip() == "":
            continue
        record = {}
        for field, col_idx in column_map.items():
            if col_idx < len(row):
                record[field] = _val(row[col_idx])
            else:
                record[field] = None
        rows_out.append(record)
    return rows_out


def parse_capital_structure_sheet(ws) -> list[dict]:
    """Parse Sheet 3: Capital Structure (one row per instrument).

    v8: also reads the capital-structure taxonomy columns R\u2013Y (entity_level
    through cashflow_priority_rank). These are optional — if the sheet was
    authored against an older template the new fields simply stay None.
    v9: adds instrument-economics columns AB\u2013AH (coupon, base rate at
    issuance, spread, benchmark spread, payment frequency, upfront fee,
    commitment fee). Also optional.
    """
    col_map = {
        "instrument_name": 0, "instrument_type": 1, "waterfall_priority": 2,
        "enforcement_class": 3, "committed_amount": 4, "drawn_amount": 5,
        "currency": 6, "start_date": 7, "maturity_date": 8,
        "interest_type": 9, "base_rate": 10, "margin_bps": 11,
        "repayment_type": 12, "our_holding": 13, "our_holding_pct": 14,
        "dsra_months": 15, "status": 16, "notes": 17,
        # v8: capital-structure taxonomy
        "entity_level": 18, "entity_name": 19, "ownership_pct": 20,
        "structural_seniority": 21, "ratio_consolidation_level": 22,
        "intercompany_lender": 23, "subordination_agreement": 24,
        "cashflow_priority_rank": 25,
        # v9: instrument economics
        "coupon_bps": 26,
        "base_rate_at_issuance_bps": 27,
        "spread_bps": 28,
        "benchmark_spread_bps": 29,
        "payment_frequency": 30,
        "upfront_fee_bps": 31,
        "commitment_fee_pct_of_margin": 32,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["committed_amount"] = _num(r.get("committed_amount"))
        r["drawn_amount"] = _num(r.get("drawn_amount"))
        r["margin_bps"] = int(_num(r["margin_bps"])) if _num(r.get("margin_bps")) is not None else None
        r["our_holding"] = _num(r.get("our_holding"))
        r["our_holding_pct"] = _num(r.get("our_holding_pct"))
        r["dsra_months"] = int(_num(r["dsra_months"])) if _num(r.get("dsra_months")) is not None else None
        r["waterfall_priority"] = int(_num(r["waterfall_priority"])) if _num(r.get("waterfall_priority")) is not None else None
        r["start_date"] = _date(r.get("start_date"))
        r["maturity_date"] = _date(r.get("maturity_date"))
        # v8 coercions
        r["ownership_pct"] = _num(r.get("ownership_pct"))
        r["structural_seniority"] = int(_num(r["structural_seniority"])) if _num(r.get("structural_seniority")) is not None else None
        r["subordination_agreement"] = _bool(r.get("subordination_agreement"))
        r["cashflow_priority_rank"] = int(_num(r["cashflow_priority_rank"])) if _num(r.get("cashflow_priority_rank")) is not None else None
        # v9 coercions — all optional
        for int_col in ("coupon_bps", "base_rate_at_issuance_bps", "spread_bps",
                        "benchmark_spread_bps", "upfront_fee_bps"):
            v = _num(r.get(int_col))
            r[int_col] = int(v) if v is not None else None
        r["commitment_fee_pct_of_margin"] = _num(r.get("commitment_fee_pct_of_margin"))
        pf = r.get("payment_frequency")
        r["payment_frequency"] = str(pf).strip() if pf else None
    return rows


def parse_margin_ratchets_sheet(ws) -> list[dict]:
    """Parse Tab 2b: Margin Ratchets.

    One row per tier. ratchet_kind=base_margin for absolute-margin tiers
    (time- or covenant-triggered). ratchet_kind=esg_adjustment for signed
    bps deltas applied on top of the active base tier when linked SPTs
    are met or missed.

    Rows are linked to the instrument on Tab 2 via instrument_ref which
    must match the Tab 2 instrument_name exactly.
    """
    col_map = {
        "instrument_ref": 0,
        "step_order": 1,
        "ratchet_kind": 2,
        "trigger_type": 3,
        "trigger_metric": 4,
        "trigger_operator": 5,
        "trigger_threshold": 6,
        "trigger_threshold_upper": 7,
        "effective_from": 8,
        "effective_to": 9,
        "adjustment_mode": 10,
        "margin_bps": 11,
        "pik_portion_bps": 12,
        "step_type": 13,
        "notes": 14,
    }
    rows: list[dict] = []
    header_skipped = False
    for row in ws.iter_rows(values_only=True):
        if not row or not any(row):
            continue
        first = str(row[0] or "").strip().lower()
        if not header_skipped:
            if first in ("instrument_ref", "instrument") or "ref" in first:
                header_skipped = True
                continue
            # Skip title / guidance rows until we hit the header
            continue
        if first in ("", "must match an instrument name on tab 2 exactly"):
            continue  # guidance row
        rec: dict = {}
        for field, col_idx in col_map.items():
            rec[field] = _val(row[col_idx]) if col_idx < len(row) else None
        if not rec.get("instrument_ref") or not rec.get("ratchet_kind"):
            continue

        # Coercions
        for int_col in ("step_order", "margin_bps", "pik_portion_bps"):
            v = _num(rec.get(int_col))
            rec[int_col] = int(v) if v is not None else None
        for num_col in ("trigger_threshold", "trigger_threshold_upper"):
            rec[num_col] = _num(rec.get(num_col))
        for date_col in ("effective_from", "effective_to"):
            rec[date_col] = _date(rec.get(date_col))
        for txt_col in ("instrument_ref", "ratchet_kind", "trigger_type",
                        "trigger_metric", "trigger_operator", "adjustment_mode",
                        "step_type", "notes"):
            v = rec.get(txt_col)
            rec[txt_col] = str(v).strip() if v is not None else None
        rows.append(rec)
    return rows


def _upsert_margin_ratchets(conn, deal_id: int, rows: list[dict], errors: list[str]) -> int:
    """Write margin-ratchet rows into capital_structure_margin_ratchets.

    Resolves each row's instrument_ref to a capital_structure_instruments.id
    by matching on (deal_id, instrument_name). Replaces all existing ratchets
    for instruments that appear in the sheet (cascading replace pattern to
    keep the sheet authoritative).
    """
    if not rows:
        return 0

    # Look up all instruments for this deal
    inst_rows = conn.execute(
        "SELECT id, instrument_name FROM capital_structure_instruments WHERE deal_id = %s",
        (deal_id,),
    ).fetchall()
    inst_by_name = {r["instrument_name"]: str(r["id"]) for r in inst_rows}

    # Group input rows by instrument
    by_instrument: dict[str, list[dict]] = {}
    for row in rows:
        ref = row["instrument_ref"]
        if ref not in inst_by_name:
            errors.append(
                f"Margin ratchet references instrument '{ref}' but no matching row "
                f"found on Tab 2 for this deal — skipping."
            )
            continue
        by_instrument.setdefault(inst_by_name[ref], []).append(row)

    written = 0
    for instrument_id, instrument_rows in by_instrument.items():
        # Replace existing ratchets for this instrument
        conn.execute(
            "DELETE FROM capital_structure_margin_ratchets WHERE instrument_id = %s",
            (instrument_id,),
        )
        for row in instrument_rows:
            # Default adjustment_mode if caller left it blank
            adj_mode = row.get("adjustment_mode")
            if not adj_mode:
                adj_mode = "additive" if row.get("ratchet_kind") == "esg_adjustment" else "absolute"
            conn.execute(
                """INSERT INTO capital_structure_margin_ratchets
                     (instrument_id, step_order, ratchet_kind, trigger_type,
                      trigger_metric, trigger_operator, trigger_threshold,
                      trigger_threshold_upper, effective_from, effective_to,
                      adjustment_mode, margin_bps, pik_portion_bps, step_type, notes)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    instrument_id, row["step_order"], row["ratchet_kind"],
                    row["trigger_type"], row.get("trigger_metric"),
                    row.get("trigger_operator"), row.get("trigger_threshold"),
                    row.get("trigger_threshold_upper"),
                    row.get("effective_from"), row.get("effective_to"),
                    adj_mode, row["margin_bps"], row.get("pik_portion_bps"),
                    row.get("step_type") or "initial", row.get("notes"),
                ),
            )
            written += 1
    return written


def parse_enforcement_classes_sheet(ws) -> list[dict]:
    """Parse Sheet 4: Enforcement Classes."""
    col_map = {
        "class_name": 0, "class_code": 1, "priority": 2,
        "included_instruments": 3, "ratio_definitions": 4,
        "covenant_thresholds": 5, "notes": 6,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["priority"] = int(_num(r["priority"])) if _num(r.get("priority")) is not None else None
        for jfield in ("included_instruments", "ratio_definitions", "covenant_thresholds"):
            v = r.get(jfield)
            if v and isinstance(v, str):
                try:
                    r[jfield] = json.loads(v)
                except json.JSONDecodeError:
                    r[jfield] = None
    return rows


def parse_entity_map_sheet(ws) -> list[dict]:
    """Parse Sheet 5: Entity Map (legacy shape).

    Kept for backwards compatibility with the legacy internal sheet shape.
    For the public v8 template (7. Corporate Entities) use
    ``parse_corporate_entities_v8``.
    """
    col_map = {
        "entity_name": 0, "entity_type": 1, "parent_entity": 2,
        "position": 3, "jurisdiction": 4, "securitisation_boundary": 5,
        "intercompany_loans": 6, "ring_fenced": 7, "notes": 8,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["securitisation_boundary"] = _bool(r.get("securitisation_boundary"))
        r["ring_fenced"] = _bool(r.get("ring_fenced"))
        v = r.get("intercompany_loans")
        if v and isinstance(v, str):
            try:
                r["intercompany_loans"] = json.loads(v)
            except json.JSONDecodeError:
                r["intercompany_loans"] = None
    return rows


def parse_corporate_entities_v8(ws) -> list[dict]:
    """Parse Tab 7 (Corporate Entities) in the v8 template layout.

    Columns (0-indexed): 0 Entity Name, 1 Type, 2 Parent Entity, 3 Jurisdiction,
    4 Ring-Fenced, 5 Securitisation Boundary, then v8 additions: 6 Ownership %,
    7 Ownership Type, 8 Control Type, 9 Consolidation Method, 10 Within
    Security Perimeter, 11 Ratio Level.
    """
    col_map = {
        "entity_name": 0, "entity_type": 1, "parent_entity": 2,
        "jurisdiction": 3, "ring_fenced": 4, "securitisation_boundary": 5,
        "ownership_pct": 6, "ownership_type": 7, "control_type": 8,
        "consolidation_method": 9, "within_security_perimeter": 10,
        "ratio_level": 11,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["ring_fenced"] = _bool(r.get("ring_fenced"))
        r["securitisation_boundary"] = _bool(r.get("securitisation_boundary"))
        r["ownership_pct"] = _num(r.get("ownership_pct"))
        r["within_security_perimeter"] = _bool(r.get("within_security_perimeter"))
    return rows


def parse_counterparties_sheet(ws) -> list[dict]:
    """Parse Sheet 8: Counterparties."""
    col_map = {
        "name": 0, "counterparty_type": 1, "credit_rating": 2,
        "lei": 3, "dependency_narrative": 4, "replacement_risk": 5,
        "contract_expiry": 6, "contract_value": 7, "notes": 8,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["contract_expiry"] = _date(r.get("contract_expiry"))
        r["contract_value"] = _num(r.get("contract_value"))
    return rows


def parse_reserve_accounts_sheet(ws) -> list[dict]:
    """Parse Sheet 10: Reserve Accounts."""
    col_map = {
        "account_name": 0, "account_type": 1, "sizing_basis": 2,
        "required_balance": 3, "current_balance": 4, "funded_status": 5,
        "funding_method": 6, "provider": 7, "linked_instrument": 8,
        "expiry": 9, "notes": 10,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["required_balance"] = _num(r.get("required_balance"))
        r["current_balance"] = _num(r.get("current_balance"))
        r["expiry"] = _date(r.get("expiry"))
    return rows


def parse_hedge_portfolio_sheet(ws) -> list[dict]:
    """Parse Sheet 12a: Hedge Portfolio."""
    col_map = {
        "hedge_type": 0, "notional": 1, "pct_of_debt": 2,
        "start_date": 3, "maturity": 4, "fixed_rate": 5,
        "counterparty": 6, "counterparty_rating": 7,
        "mark_to_market": 8, "mtm_date": 9, "notes": 10,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["notional"] = _num(r.get("notional"))
        r["pct_of_debt"] = _num(r.get("pct_of_debt"))
        r["fixed_rate"] = _num(r.get("fixed_rate"))
        r["mark_to_market"] = _num(r.get("mark_to_market"))
        r["start_date"] = _date(r.get("start_date"))
        r["maturity"] = _date(r.get("maturity"))
        r["mtm_date"] = _date(r.get("mtm_date"))
    return rows


def parse_development_phases_sheet(ws) -> list[dict]:
    """Parse Sheet 15: Development Phases."""
    col_map = {
        "phase_name": 0, "phase_number": 1, "capex_budget": 2,
        "start_date": 3, "target_end_date": 4, "actual_end_date": 5,
        "status": 6, "actual_spend": 7, "description": 8, "notes": 9,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["phase_number"] = int(_num(r["phase_number"])) if _num(r.get("phase_number")) is not None else None
        r["capex_budget"] = _num(r.get("capex_budget"))
        r["actual_spend"] = _num(r.get("actual_spend"))
        r["start_date"] = _date(r.get("start_date"))
        r["target_end_date"] = _date(r.get("target_end_date"))
        r["actual_end_date"] = _date(r.get("actual_end_date"))
        budget = r.get("capex_budget")
        spend = r.get("actual_spend")
        r["variance"] = (budget - spend) if budget is not None and spend is not None else None
    return rows


def parse_investor_allocations_sheet(ws) -> list[dict]:
    """Parse Sheet 17: Investor Allocations."""
    col_map = {
        "investor_name": 0, "account_mandate": 1, "tranche": 2,
        "amount": 3, "mandate_size": 4, "pct_of_mandate": 5, "notes": 6,
    }
    rows = parse_table_sheet(ws, col_map)
    for r in rows:
        r["amount"] = _num(r.get("amount"))
        r["mandate_size"] = _num(r.get("mandate_size"))
        r["pct_of_mandate"] = _num(r.get("pct_of_mandate"))
    return rows


def parse_intercreditor_sheet(ws) -> dict:
    """Parse Sheet 18: Intercreditor Terms (key-value format)."""
    field_map = {
        "governing law": "governing_law",
        "standstill period": "standstill_period",
        "turnover provisions": "turnover_provisions",
        "permitted junior payments": "permitted_junior_payments",
        "security release conditions": "security_release_conditions",
        "non-petition clause": "non_petition_clause",
        "enforcement priority": "enforcement_priority",
    }
    result = {}
    for row in ws.iter_rows(values_only=True):
        if not row or row[0] is None:
            continue
        label = str(row[0]).strip().lower()
        if label in field_map:
            col = field_map[label]
            val = _val(row[1]) if len(row) > 1 else None
            if col == "non_petition_clause":
                val = _bool(val)
            result[col] = val
    return result


def parse_line_labels_sheet(ws) -> dict:
    """Parse Line Labels configuration sheet from Template 1."""
    labels = {
        "sector_template": None,
        "revenue_line_labels": [],
        "cost_line_labels": [],
        "capex_line_labels": [],
        "sector_kpi_labels": [],
    }
    current_section = None
    section_map = {
        "revenue": "revenue_line_labels",
        "cost": "cost_line_labels",
        "capex": "capex_line_labels",
        "kpi": "sector_kpi_labels",
        "sector kpi": "sector_kpi_labels",
    }
    for row in ws.iter_rows(values_only=True):
        if not row:
            continue
        first = str(row[0] or "").strip()
        first_lower = first.lower()
        if first_lower.startswith("sector template") or first_lower.startswith("sector:"):
            labels["sector_template"] = _val(row[1]) if len(row) > 1 else _val(first.split(":")[-1])
            continue
        for key, field in section_map.items():
            if key in first_lower and ("line" in first_lower or "label" in first_lower or "kpi" in first_lower):
                current_section = field
                break
        else:
            if current_section and first and not first_lower.startswith("f.") and not first.isupper():
                labels[current_section].append(first)
    return labels


# ── Period helpers ────────────────────────────────────────────────────────────

def _label_to_flag(label: str) -> str:
    """'Q1 2026' → '2026Q1', 'H1 2026' → '2026H1', '2026Q1' → '2026Q1'."""
    label = label.strip()
    # Already in flag format
    if len(label) >= 6 and label[:4].isdigit():
        return label
    parts = label.split()
    if len(parts) == 2:
        period, year = parts[0], parts[1]
        if year.isdigit():
            return f"{year}{period}"
    return label.replace(" ", "")


def _period_start(period_end: date) -> date:
    """Derive approximate period start from period end (quarterly assumed)."""
    from calendar import monthrange
    m = period_end.month
    q_start_month = ((m - 1) // 3) * 3 + 1
    return date(period_end.year, q_start_month, 1)


# ── Database writers ──────────────────────────────────────────────────────────

def _update_deals_columns(conn, deal_id: int, updates: dict[str, Any],
                           errors: list[str]) -> int:
    """Apply a dict of column→value to the deals table."""
    if not updates:
        return 0
    coerced = {}
    for col, raw in updates.items():
        if col not in DEALS_COLUMNS:
            continue
        try:
            coerced[col] = _coerce_for_column(col, raw)
        except Exception as e:
            errors.append(f"Column '{col}': coercion failed — {e}")
    if not coerced:
        return 0
    set_clause = ", ".join(f"{c} = %s" for c in coerced)
    values = list(coerced.values()) + [deal_id]
    conn.execute(f"UPDATE deals SET {set_clause} WHERE id = %s", values)
    return len(coerced)


def _upsert_covenant_thresholds(conn, deal_id: int, covenants: list[dict],
                                 proxy_flags: dict, errors: list[str]) -> int:
    count = 0
    # Upsert proxy flags into deals table
    if proxy_flags:
        flag_updates = {k: v for k, v in proxy_flags.items() if v is not None}
        if flag_updates:
            _update_deals_columns(conn, deal_id, flag_updates, errors)

    for cov in covenants:
        if not cov.get("covenant_name") or not cov.get("ratio_name"):
            continue
        # Check if exists
        existing = conn.execute(
            "SELECT id FROM covenant_thresholds WHERE deal_id = %s AND ratio_name = %s",
            (deal_id, cov["ratio_name"]),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE covenant_thresholds
                   SET covenant_name=%s, covenant_category=%s, test_type=%s,
                       direction=%s, lockup_level=%s, trigger_level=%s,
                       default_level=%s, composition_tag=%s, test_frequency=%s,
                       updated_at=NOW()
                   WHERE id=%s""",
                (
                    cov["covenant_name"], cov.get("covenant_category"),
                    cov.get("test_type"), cov.get("direction"),
                    cov.get("lockup_level"), cov.get("trigger_level"),
                    cov.get("default_level"), cov.get("composition_tag"),
                    cov.get("test_frequency"), existing["id"],
                ),
            )
        else:
            conn.execute(
                """INSERT INTO covenant_thresholds
                   (deal_id, covenant_name, ratio_name, covenant_category, test_type,
                    direction, lockup_level, trigger_level, default_level,
                    composition_tag, test_frequency)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    deal_id, cov["covenant_name"], cov["ratio_name"],
                    cov.get("covenant_category"), cov.get("test_type"),
                    cov.get("direction"), cov.get("lockup_level"),
                    cov.get("trigger_level"), cov.get("default_level"),
                    cov.get("composition_tag"), cov.get("test_frequency"),
                ),
            )
        count += 1
    return count


def _upsert_forecast_periods(conn, deal_id: int, scenario: str,
                              periods: dict[str, dict], errors: list[str]) -> int:
    if not periods:
        return 0

    # Find or create forecast_case
    case_key = f"{deal_id}-{scenario}"
    case_type = scenario  # 'management_case', 'lender_case', 'combined_downside'
    priority = CASE_TYPE_PRIORITY.get(case_type, 1)
    drives_monitoring = case_type == "management_case"

    case = conn.execute(
        "SELECT id FROM forecast_cases WHERE deal_id=%s AND case_type=%s",
        (deal_id, case_type),
    ).fetchone()
    if not case:
        display_name = case_type.replace("_", " ").title()
        conn.execute(
            """INSERT INTO forecast_cases
               (deal_id, case_key, case_name, case_type, comparison_priority,
                drives_monitoring, owner_name, summary, created_at)
               VALUES (%s,%s,%s,%s,%s,%s,'TopSheet Import','Imported from TopSheet template',NOW())""",
            (deal_id, case_key, display_name, case_type, priority, drives_monitoring),
        )
        case = conn.execute(
            "SELECT id FROM forecast_cases WHERE deal_id=%s AND case_type=%s",
            (deal_id, case_type),
        ).fetchone()

    # Find or create active version
    version = conn.execute(
        "SELECT id FROM forecast_case_versions WHERE forecast_case_id=%s AND is_active=TRUE",
        (case["id"],),
    ).fetchone()
    if not version:
        conn.execute(
            """INSERT INTO forecast_case_versions
               (forecast_case_id, version_number, version_label, version_status,
                source_domain, summary, effective_from, activated_at, is_active)
               VALUES (%s,1,'v1','active','topsheet_import',
                       'Imported from TopSheet template', NOW(), NOW(), TRUE)""",
            (case["id"],),
        )
        version = conn.execute(
            "SELECT id FROM forecast_case_versions WHERE forecast_case_id=%s AND is_active=TRUE",
            (case["id"],),
        ).fetchone()

    count = 0
    for period_flag, metrics in periods.items():
        period_label = _period_flag_to_label(period_flag)
        existing = conn.execute(
            "SELECT id FROM forecast_case_periods WHERE forecast_case_version_id=%s AND period_key=%s",
            (version["id"], period_flag),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE forecast_case_periods
                   SET scenario_metrics=%s, scenario_summary='Updated via TopSheet import'
                   WHERE id=%s""",
                (json.dumps(metrics), existing["id"]),
            )
        else:
            conn.execute(
                """INSERT INTO forecast_case_periods
                   (forecast_case_version_id, period_key, period_label, scenario_metrics, scenario_summary)
                   VALUES (%s,%s,%s,%s,'Imported from TopSheet template')""",
                (version["id"], period_flag, period_label, json.dumps(metrics)),
            )
        count += 1
    return count


def _upsert_actual_periods(conn, deal_id: int, actuals: list[dict],
                            errors: list[str]) -> int:
    count = 0
    for actual in actuals:
        if not actual.get("period_flag") or not actual.get("period_end"):
            errors.append(f"Actual period '{actual.get('period_label')}' missing period_end — skipped")
            continue
        existing = conn.execute(
            """SELECT id FROM actual_periods
               WHERE deal_id=%s AND period_flag=%s AND source_hierarchy='certificate'""",
            (deal_id, actual["period_flag"]),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE actual_periods
                   SET period_label=%s, period_end=%s, actual_metrics=%s,
                       borrower_reported_ratios=%s, source_document_name=%s,
                       source_document_type=%s, received_date=%s,
                       extraction_confidence=%s, approval_tier=%s,
                       approved_by=%s, updated_at=NOW()
                   WHERE id=%s""",
                (
                    actual["period_label"], actual["period_end"],
                    actual["actual_metrics"], actual["borrower_reported_ratios"],
                    actual.get("source_document_name"), actual.get("source_document_type"),
                    actual.get("received_date"), actual.get("extraction_confidence"),
                    actual.get("approval_tier"), actual.get("approved_by"),
                    existing["id"],
                ),
            )
        else:
            period_start = actual.get("period_start") or _period_start(actual["period_end"])
            conn.execute(
                """INSERT INTO actual_periods
                   (deal_id, period_label, period_flag, period_start, period_end,
                    period_frequency, source_document_name, source_document_type,
                    received_date, extraction_confidence, approval_tier, approved_by,
                    source_hierarchy, actual_metrics, borrower_reported_ratios,
                    platform_computed_ratios, sector_kpis, created_at, updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'certificate',%s,%s,'{}','{}',NOW(),NOW())""",
                (
                    deal_id, actual["period_label"], actual["period_flag"],
                    period_start, actual["period_end"],
                    actual.get("period_frequency", "quarterly"),
                    actual.get("source_document_name"), actual.get("source_document_type"),
                    actual.get("received_date"), actual.get("extraction_confidence"),
                    actual.get("approval_tier"), actual.get("approved_by"),
                    actual["actual_metrics"], actual["borrower_reported_ratios"],
                ),
            )
        count += 1
    return count


def _upsert_risk_register(conn, deal_id: int, risks: list[dict],
                           errors: list[str]) -> int:
    """Upsert into deal_risk_register (the 226-risk per-deal table)."""
    count = 0
    for risk in risks:
        risk_id = risk.get("risk_id")
        if not risk_id:
            continue
        # Verify risk_id exists in taxonomy
        exists = conn.execute(
            "SELECT 1 FROM risk_taxonomy WHERE risk_id=%s", (risk_id,)
        ).fetchone()
        if not exists:
            errors.append(f"Risk ID '{risk_id}' not found in taxonomy — skipped")
            continue

        likelihood = int(_num(risk["likelihood"])) if _num(risk.get("likelihood")) is not None else None
        severity = int(_num(risk["severity"])) if _num(risk.get("severity")) is not None else None

        conn.execute(
            """INSERT INTO deal_risk_register
               (deal_id, risk_id, status, likelihood, severity, trend,
                mitigation_party_score, mitigation_party_detail,
                mitigation_capital_score, mitigation_capital_type,
                mitigation_capital_provider, mitigation_capital_amount,
                mitigation_capital_expiry, mitigation_capital_detail,
                sensitised_at_origination, sensitivity_name,
                stress_dscr_min, stress_dscr_avg,
                monitoring_kpi, monitoring_threshold,
                commentary, assessed_by, assessed_at, updated_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
               ON CONFLICT (deal_id, risk_id) DO UPDATE SET
                status=EXCLUDED.status, likelihood=EXCLUDED.likelihood,
                severity=EXCLUDED.severity, trend=EXCLUDED.trend,
                mitigation_party_score=EXCLUDED.mitigation_party_score,
                mitigation_party_detail=EXCLUDED.mitigation_party_detail,
                mitigation_capital_score=EXCLUDED.mitigation_capital_score,
                mitigation_capital_type=EXCLUDED.mitigation_capital_type,
                mitigation_capital_provider=EXCLUDED.mitigation_capital_provider,
                mitigation_capital_amount=EXCLUDED.mitigation_capital_amount,
                mitigation_capital_expiry=EXCLUDED.mitigation_capital_expiry,
                mitigation_capital_detail=EXCLUDED.mitigation_capital_detail,
                sensitised_at_origination=EXCLUDED.sensitised_at_origination,
                sensitivity_name=EXCLUDED.sensitivity_name,
                stress_dscr_min=EXCLUDED.stress_dscr_min,
                stress_dscr_avg=EXCLUDED.stress_dscr_avg,
                monitoring_kpi=EXCLUDED.monitoring_kpi,
                monitoring_threshold=EXCLUDED.monitoring_threshold,
                commentary=EXCLUDED.commentary,
                assessed_by=EXCLUDED.assessed_by,
                assessed_at=EXCLUDED.assessed_at,
                updated_at=NOW()""",
            (
                deal_id, risk_id, risk["status"],
                likelihood, severity, risk.get("trend"),
                risk.get("mitigation_party_score"), risk.get("mitigation_party_detail"),
                risk.get("mitigation_capital_score"), risk.get("mitigation_capital_type"),
                risk.get("mitigation_capital_provider"), risk.get("mitigation_capital_amount"),
                risk.get("mitigation_capital_expiry"), risk.get("mitigation_capital_detail"),
                risk.get("sensitised_at_origination", False), risk.get("sensitivity_name"),
                risk.get("stress_dscr_min"), risk.get("stress_dscr_avg"),
                risk.get("monitoring_kpi"), risk.get("monitoring_threshold"),
                risk.get("commentary"), risk.get("assessed_by"), risk.get("assessed_at"),
            ),
        )
        count += 1
    return count


def _replace_child_table(conn, deal_id: int, table: str, rows: list[dict],
                          errors: list[str]) -> int:
    """Delete-and-replace strategy for child table rows."""
    if not rows:
        return 0
    conn.execute(f"DELETE FROM {table} WHERE deal_id = %s", (deal_id,))
    count = 0
    for row in rows:
        cols = [k for k, v in row.items() if v is not None]
        if not cols:
            continue
        placeholders = ", ".join(["%s"] * (len(cols) + 1))
        col_names = "deal_id, " + ", ".join(cols)
        values = [deal_id] + [row[c] for c in cols]
        # Convert dicts/lists to JSON strings for JSONB columns
        for i, v in enumerate(values):
            if isinstance(v, (dict, list)):
                values[i] = json.dumps(v)
        try:
            conn.execute(
                f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})",
                values,
            )
            count += 1
        except Exception as e:
            errors.append(f"{table}: insert failed — {e}")
    return count


def _upsert_intercreditor(conn, deal_id: int, data: dict,
                           errors: list[str]) -> int:
    """Upsert intercreditor terms (one row per deal)."""
    if not data:
        return 0
    cols = [k for k, v in data.items() if v is not None]
    if not cols:
        return 0
    existing = conn.execute(
        "SELECT id FROM intercreditor_terms WHERE deal_id=%s", (deal_id,)
    ).fetchone()
    if existing:
        set_clause = ", ".join(f"{c}=%s" for c in cols)
        values = [data[c] for c in cols] + [deal_id]
        conn.execute(
            f"UPDATE intercreditor_terms SET {set_clause}, updated_at=NOW() WHERE deal_id=%s",
            values,
        )
    else:
        col_names = "deal_id, " + ", ".join(cols)
        placeholders = ", ".join(["%s"] * (len(cols) + 1))
        values = [deal_id] + [data[c] for c in cols]
        conn.execute(
            f"INSERT INTO intercreditor_terms ({col_names}) VALUES ({placeholders})",
            values,
        )
    return 1


def _upsert_financial_template(conn, deal_id: int, labels: dict,
                                errors: list[str]) -> int:
    """Upsert deal_financial_template (one row per deal)."""
    if not labels:
        return 0
    existing = conn.execute(
        "SELECT id FROM deal_financial_template WHERE deal_id=%s", (deal_id,)
    ).fetchone()
    sector = labels.get("sector_template")
    rev = json.dumps(labels.get("revenue_line_labels", []))
    cost = json.dumps(labels.get("cost_line_labels", []))
    capex = json.dumps(labels.get("capex_line_labels", []))
    kpi = json.dumps(labels.get("sector_kpi_labels", []))
    if existing:
        conn.execute(
            """UPDATE deal_financial_template
               SET sector_template=%s, revenue_line_labels=%s, cost_line_labels=%s,
                   capex_line_labels=%s, sector_kpi_labels=%s, updated_at=NOW()
               WHERE deal_id=%s""",
            (sector, rev, cost, capex, kpi, deal_id),
        )
    else:
        conn.execute(
            """INSERT INTO deal_financial_template
               (deal_id, sector_template, revenue_line_labels, cost_line_labels,
                capex_line_labels, sector_kpi_labels)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (deal_id, sector, rev, cost, capex, kpi),
        )
    return 1


# ── Main entry point ──────────────────────────────────────────────────────────

def parse_kpi_scenario_series_sheet(ws) -> list[dict]:
    """Parse the 'KPI Scenario Series' tab (Tab 9 in v9 template).

    Columns:
      1 kpi_key          (e.g. sector_kpi_1)
      2 kpi_label        (human label)
      3 scenario_kind    (management_case | single_variant_stress | combined_downside | credit_case | lender_case | custom)
      4 stress_label     (human name for single_variant_stress scenarios)
      5 driving_risk_ref (RISK-XX-NNN matching a deal_risk_register.risk_id — optional)
      6 period_flag      (e.g. FY2026)
      7 value            (numeric)

    Returns a list of dicts with the above keys. Sparse rows allowed — rows where
    kpi_key, scenario_kind, period_flag, or value are empty are skipped.
    """
    rows: list[dict] = []
    header_row = 2
    data_start = 3

    for row in ws.iter_rows(min_row=data_start, values_only=True):
        if not row or not any(row):
            continue
        if len(row) < 7:
            continue
        kpi_key = _val(row[0])
        scenario_kind = _val(row[2])
        period_flag = _val(row[5])
        value = _num(row[6])

        if not kpi_key or not scenario_kind or not period_flag or value is None:
            continue

        rows.append({
            "kpi_key": str(kpi_key).strip(),
            "kpi_label": str(_val(row[1]) or kpi_key).strip(),
            "scenario_kind": str(scenario_kind).strip().lower(),
            "stress_label": str(_val(row[3]) or "").strip() or None,
            "driving_risk_ref": str(_val(row[4]) or "").strip() or None,
            "period_flag": str(period_flag).strip(),
            "value": value,
        })
    return rows


def _upsert_kpi_scenario_series(conn, deal_id: int, rows: list[dict], errors: list[str]) -> int:
    """Write KPI scenario series rows into forecast_period_items.

    For each (scenario_kind, stress_label, driving_risk_ref) combination, find
    or create a forecast_case + active forecast_case_version. Then write one
    forecast_period_items row per (period, kpi_key) trajectory point.

    Returns the count of forecast_period_items rows written or confirmed present.
    """
    if not rows:
        return 0

    # Group rows by the scenario they belong to — each distinct combo = one forecast_case
    def scenario_signature(r: dict) -> tuple[str, str | None, str | None]:
        if r["scenario_kind"] == "single_variant_stress":
            return ("single_variant_stress", r.get("stress_label"), r.get("driving_risk_ref"))
        return (r["scenario_kind"], None, None)

    grouped: dict[tuple, list[dict]] = {}
    for r in rows:
        grouped.setdefault(scenario_signature(r), []).append(r)

    written = 0

    for (scenario_kind, stress_label, risk_ref), group_rows in grouped.items():
        # 1) Resolve driving_risk_id by matching on risk_id (text key) within this deal
        driving_risk_id = None
        if risk_ref:
            r = conn.execute(
                "SELECT id FROM deal_risk_register WHERE deal_id = %s AND risk_id = %s",
                (deal_id, risk_ref),
            ).fetchone()
            if r:
                driving_risk_id = r["id"]
            else:
                errors.append(
                    f"KPI scenario references risk '{risk_ref}' but no matching "
                    f"deal_risk_register.risk_id found for this deal — stress case "
                    f"will be created without a driving_risk link."
                )

        # 2) Find or create the forecast_case
        # Canonical case_key by scenario kind + optional stress label
        if scenario_kind == "management_case":
            case_key = "management_case"
            case_name = "Management Case (IC baseline)"
        elif scenario_kind == "combined_downside":
            case_key = "combined_downside"
            case_name = "Combined downside"
        elif scenario_kind == "single_variant_stress":
            # Stable key from stress_label slug
            slug_source = (stress_label or risk_ref or "unnamed").lower()
            slug = "".join(ch if ch.isalnum() else "_" for ch in slug_source).strip("_")[:60]
            case_key = f"stress_{slug}"
            case_name = f"Stress — {stress_label or risk_ref or 'unnamed'}"
        elif scenario_kind in ("credit_case", "lender_case"):
            case_key = scenario_kind
            case_name = "Credit case" if scenario_kind == "credit_case" else "Lender case"
        else:
            case_key = scenario_kind
            case_name = scenario_kind.replace("_", " ").title()

        # Decide case_type for backward-compat column
        case_type_map = {
            "management_case": "management_case",
            "combined_downside": "combined_downside",
            "single_variant_stress": "single_variant_stress",
            "credit_case": "credit_case",
            "lender_case": "lender_case",
        }
        case_type = case_type_map.get(scenario_kind, scenario_kind)

        existing = conn.execute(
            "SELECT id FROM forecast_cases WHERE deal_id = %s AND case_key = %s",
            (deal_id, case_key),
        ).fetchone()
        if existing:
            forecast_case_id = existing["id"]
            # Update driving_risk_id / stress_label if we now have them and they were empty
            conn.execute(
                """UPDATE forecast_cases
                     SET scenario_kind = %s,
                         driving_risk_id = COALESCE(driving_risk_id, %s),
                         stress_label = COALESCE(stress_label, %s)
                   WHERE id = %s""",
                (scenario_kind, driving_risk_id, stress_label, forecast_case_id),
            )
        else:
            r = conn.execute(
                """INSERT INTO forecast_cases
                     (deal_id, case_key, case_name, case_type, scenario_kind,
                      comparison_priority, drives_monitoring, owner_name, summary, created_at,
                      driving_risk_id, stress_label)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s)
                   RETURNING id""",
                (
                    deal_id, case_key, case_name, case_type, scenario_kind,
                    1 if scenario_kind == "management_case" else 3,
                    False,
                    "TopSheet importer",
                    f"{case_name} imported from KPI Scenario Series tab.",
                    driving_risk_id, stress_label,
                ),
            ).fetchone()
            forecast_case_id = r["id"]

        # 3) Find or create the active forecast_case_version
        active_version = conn.execute(
            """SELECT id FROM forecast_case_versions
               WHERE forecast_case_id = %s AND is_active = TRUE
               ORDER BY version_number DESC LIMIT 1""",
            (forecast_case_id,),
        ).fetchone()
        if active_version:
            version_id = active_version["id"]
        else:
            next_num = conn.execute(
                "SELECT COALESCE(MAX(version_number), 0) + 1 AS n FROM forecast_case_versions WHERE forecast_case_id = %s",
                (forecast_case_id,),
            ).fetchone()["n"]
            r = conn.execute(
                """INSERT INTO forecast_case_versions
                     (forecast_case_id, version_number, version_label, version_status,
                      source_domain, summary, effective_from, activated_at, is_active)
                   VALUES (%s, %s, %s, 'active', 'topsheet_import',
                           'Auto-created from KPI Scenario Series import.',
                           CURRENT_DATE, NOW(), TRUE)
                   RETURNING id""",
                (forecast_case_id, next_num, f"Imported v{next_num}"),
            ).fetchone()
            version_id = r["id"]

        # 4) Insert forecast_period_items rows, resolving period_id from period_flag
        for row in group_rows:
            period = conn.execute(
                "SELECT id FROM deal_reporting_periods WHERE deal_id = %s AND period_flag = %s",
                (deal_id, row["period_flag"]),
            ).fetchone()
            if not period:
                errors.append(
                    f"KPI scenario row references period_flag '{row['period_flag']}' "
                    f"but no matching deal_reporting_periods entry — skipping."
                )
                continue

            # Ensure line_item_definitions knows this key
            conn.execute(
                """INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, unit)
                   VALUES (%s, 'sector_kpi', %s, 99, FALSE, 'count')
                   ON CONFLICT (line_key) DO NOTHING""",
                (row["kpi_key"], row["kpi_label"]),
            )

            conn.execute(
                """INSERT INTO forecast_period_items
                     (deal_id, forecast_case_version_id, reporting_period_id, line_key, value)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key)
                   DO UPDATE SET value = EXCLUDED.value""",
                (deal_id, version_id, period["id"], row["kpi_key"], row["value"]),
            )

            # Update deal_line_item_labels with the human label
            conn.execute(
                """INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal, is_active)
                   VALUES (%s, %s, %s,
                           COALESCE(SUBSTRING(%s FROM 'sector_kpi_(\\d+)')::INTEGER, 99),
                           TRUE)
                   ON CONFLICT (deal_id, line_key) DO UPDATE
                     SET display_label = EXCLUDED.display_label
                   WHERE deal_line_item_labels.display_label IS NULL
                      OR deal_line_item_labels.display_label = deal_line_item_labels.line_key""",
                (deal_id, row["kpi_key"], row["kpi_label"], row["kpi_key"]),
            )
            written += 1

    return written


def import_topsheet(conn, deal_slug: str, file_bytes: bytes) -> dict:
    """
    Parse and import a TopSheet Excel file for the given deal slug.
    Returns an ImportResult dict with counts and any errors.
    """
    errors: list[str] = []
    counts: dict[str, int] = {}

    # Resolve deal
    deal = conn.execute(
        "SELECT id, name FROM deals WHERE slug = %s", (deal_slug,)
    ).fetchone()
    if not deal:
        return {"ok": False, "errors": [f"Deal not found: {deal_slug}"], "counts": {}}

    deal_id = deal["id"]

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception as e:
        return {"ok": False, "errors": [f"Failed to open workbook: {e}"], "counts": {}}

    sheet_names = wb.sheetnames

    # Key-value sheets → deals columns
    kv_updates: dict[str, Any] = {}
    for sheet_name in ("1. Deal Identity", "2. Structure & Terms", "4. Ratings",
                       "14. Key Outputs", "23. Metadata"):
        if sheet_name in sheet_names:
            kv_updates.update(parse_key_value_sheet(wb[sheet_name]))

    # Sources & Uses → deals.sources_and_uses
    if "8. Sources & Uses" in sheet_names:
        kv_updates.update(parse_sources_uses_sheet(wb["8. Sources & Uses"]))

    # Stress Config → deals.stress_parameters
    if "10. Stress Config" in sheet_names:
        kv_updates.update(parse_stress_config_sheet(wb["10. Stress Config"]))

    # Apply all deals column updates
    n = _update_deals_columns(conn, deal_id, kv_updates, errors)
    counts["deals_columns_updated"] = n

    # Covenant Config
    if "6. Covenant Config" in sheet_names:
        cov_data = parse_covenant_sheet(wb["6. Covenant Config"])
        n = _upsert_covenant_thresholds(
            conn, deal_id, cov_data["covenants"], cov_data["proxy_flags"], errors
        )
        counts["covenant_thresholds"] = n

    # Forecast sheets
    for sheet_name, scenario in SCENARIO_MAP.items():
        if sheet_name in sheet_names:
            periods = parse_forecast_sheet(wb[sheet_name])
            n = _upsert_forecast_periods(conn, deal_id, scenario, periods, errors)
            counts[f"forecast_{scenario}"] = n

    # Actuals
    if "19. Actuals" in sheet_names:
        actuals = parse_actuals_sheet(wb["19. Actuals"])
        n = _upsert_actual_periods(conn, deal_id, actuals, errors)
        counts["actual_periods"] = n

    # Risk Register (Template 2 — uses deal_risk_register table)
    risk_sheet_names = ("Risk Register", "9. Risk Register")
    for rsn in risk_sheet_names:
        if rsn in sheet_names:
            risks = parse_risk_register_sheet(wb[rsn])
            n = _upsert_risk_register(conn, deal_id, risks, errors)
            counts["risk_register"] = n
            break

    # ── Template 3: Table-format child sheets ──

    # Capital Structure (Tab 2 in v9, Sheet 3 legacy)
    for sn in ("2. Capital Structure", "3. Capital Structure", "Capital Structure"):
        if sn in sheet_names:
            rows = parse_capital_structure_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "capital_structure_instruments", rows, errors)
            counts["capital_structure"] = n
            break

    # Margin Ratchets (Tab 2b) — must run AFTER capital_structure so instrument
    # IDs exist for the instrument_ref lookup
    for sn in ("2b. Margin Ratchets", "Margin Ratchets"):
        if sn in sheet_names:
            ratchet_rows = parse_margin_ratchets_sheet(wb[sn])
            n = _upsert_margin_ratchets(conn, deal_id, ratchet_rows, errors)
            counts["margin_ratchets"] = n
            break

    # Enforcement Classes (Sheet 4)
    for sn in ("4. Enforcement Classes", "Enforcement Classes"):
        if sn in sheet_names:
            rows = parse_enforcement_classes_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "enforcement_classes", rows, errors)
            counts["enforcement_classes"] = n
            break

    # Entity Map (Sheet 5)
    for sn in ("5. Entity Map", "Entity Map"):
        if sn in sheet_names:
            rows = parse_entity_map_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "corporate_entities", rows, errors)
            counts["corporate_entities"] = n
            break

    # Counterparties (Sheet 8)
    for sn in ("8. Counterparties", "Counterparties"):
        if sn in sheet_names:
            rows = parse_counterparties_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "deal_counterparties", rows, errors)
            counts["counterparties"] = n
            break

    # Reserve Accounts (Sheet 10)
    for sn in ("10. Reserve Accounts", "Reserve Accounts"):
        if sn in sheet_names:
            rows = parse_reserve_accounts_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "deal_reserve_accounts", rows, errors)
            counts["reserve_accounts"] = n
            break

    # Hedge Portfolio (Sheet 12a)
    for sn in ("12a. Hedge Portfolio", "Hedge Portfolio"):
        if sn in sheet_names:
            rows = parse_hedge_portfolio_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "hedge_portfolio", rows, errors)
            counts["hedge_portfolio"] = n
            break

    # Development Phases (Sheet 15)
    for sn in ("15. Development", "Development"):
        if sn in sheet_names:
            rows = parse_development_phases_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "deal_development_phases", rows, errors)
            counts["development_phases"] = n
            break

    # Investor Allocations (Sheet 17)
    for sn in ("17. Investor Allocation", "Investor Allocation"):
        if sn in sheet_names:
            rows = parse_investor_allocations_sheet(wb[sn])
            n = _replace_child_table(conn, deal_id, "investor_allocations", rows, errors)
            counts["investor_allocations"] = n
            break

    # Intercreditor Terms (Sheet 18)
    for sn in ("18. Intercreditor", "Intercreditor"):
        if sn in sheet_names:
            data = parse_intercreditor_sheet(wb[sn])
            n = _upsert_intercreditor(conn, deal_id, data, errors)
            counts["intercreditor"] = n
            break

    # ── Template 1: Line Labels ──
    for sn in ("Line Labels", "Labels"):
        if sn in sheet_names:
            labels = parse_line_labels_sheet(wb[sn])
            n = _upsert_financial_template(conn, deal_id, labels, errors)
            counts["financial_template"] = n
            break

    # ── KPI Scenario Series (management case + stress cases) ──
    for sn in ("9. KPI Scenario Series", "KPI Scenario Series"):
        if sn in sheet_names:
            kpi_rows = parse_kpi_scenario_series_sheet(wb[sn])
            n = _upsert_kpi_scenario_series(conn, deal_id, kpi_rows, errors)
            counts["kpi_scenario_series"] = n
            break

    return {
        "ok": len(errors) == 0,
        "deal_id": deal_id,
        "deal_name": deal["name"],
        "counts": counts,
        "errors": errors,
        "warnings": [e for e in errors if "skipped" in e.lower()],
    }
