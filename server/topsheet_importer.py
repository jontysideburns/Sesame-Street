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
  16. Base Case             → forecast_case_periods (scenario: base)
  17. Management Case       → forecast_case_periods (scenario: management)
  18. Downside Case         → forecast_case_periods (scenario: downside)
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
    "16. Base Case": "base",
    "17. Management Case": "management",
    "18. Downside Case": "downside",
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
        })

    return {"covenants": covenants, "proxy_flags": proxy_flags}


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
    Parse Risk Register sheet.
    Row 4 = header: Risk ID, Risk Name, Category, Likelihood, Severity, Score,
                    Trend, Sensitised at IC?, Sensitivity Detail, Stress Applied
    """
    risks = []
    header_found = False
    for row in ws.iter_rows(values_only=True):
        if not header_found:
            if row and str(row[0] or "").strip().lower() == "risk id":
                header_found = True
            continue
        if not row or not row[0]:
            continue
        risk_id = str(row[0]).strip()
        if not risk_id or risk_id.upper().startswith("LAYER"):
            continue
        risks.append({
            "risk_id": risk_id,
            "risk_name": _val(row[1]) if len(row) > 1 else None,
            "risk_category": _val(row[2]) if len(row) > 2 else None,
            "likelihood": _val(row[3]) if len(row) > 3 else None,
            "severity": _val(row[4]) if len(row) > 4 else None,
            "score": _num(row[5]) if len(row) > 5 else None,
            "trend": _val(row[6]) if len(row) > 6 else None,
            "sensitised_at_origination": _bool(_val(row[7])) if len(row) > 7 else False,
            "sensitivity_name": _val(row[8]) if len(row) > 8 else None,
            "stress_description": _val(row[9]) if len(row) > 9 else None,
            "stress_parameters": json.dumps({"raw": _val(row[9])}) if (len(row) > 9 and row[9]) else None,
        })
    return risks


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
    case_type = scenario  # 'base', 'management', 'downside'
    drives_monitoring = scenario == "base"

    case = conn.execute(
        "SELECT id FROM forecast_cases WHERE deal_id=%s AND case_type=%s",
        (deal_id, case_type),
    ).fetchone()
    if not case:
        conn.execute(
            """INSERT INTO forecast_cases
               (deal_id, case_key, case_name, case_type, drives_monitoring, owner_name, summary, created_at)
               VALUES (%s,%s,%s,%s,%s,'TopSheet Import','Imported from TopSheet template',NOW())""",
            (deal_id, case_key, f"{case_type.title()} Case", case_type, drives_monitoring),
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


def _upsert_risk_entries(conn, deal_id: int, risks: list[dict],
                          errors: list[str]) -> int:
    count = 0
    for risk in risks:
        if not risk.get("risk_id"):
            continue
        existing = conn.execute(
            "SELECT id FROM risk_register_entries WHERE deal_id=%s AND risk_id=%s",
            (deal_id, risk["risk_id"]),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE risk_register_entries
                   SET risk_name=%s, risk_category=%s, likelihood=%s, severity=%s,
                       score=%s, trend=%s, sensitised_at_origination=%s,
                       sensitivity_name=%s, stress_description=%s, stress_parameters=%s
                   WHERE id=%s""",
                (
                    risk.get("risk_name"), risk.get("risk_category"),
                    risk.get("likelihood"), risk.get("severity"),
                    risk.get("score"), risk.get("trend"),
                    risk.get("sensitised_at_origination", False),
                    risk.get("sensitivity_name"), risk.get("stress_description"),
                    risk.get("stress_parameters"), existing["id"],
                ),
            )
        else:
            # Insert with required fields — use defaults for mandatory columns
            conn.execute(
                """INSERT INTO risk_register_entries
                   (deal_id, risk_id, risk_name, risk_category, likelihood, severity,
                    score, trend, sensitised_at_origination, sensitivity_name,
                    stress_description, stress_parameters,
                    probability, impact, status, owner_name, title, summary,
                    mitigant, next_review_date, opened_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                           'possible','medium','open','TopSheet Import',
                           %s,'Imported from TopSheet template',
                           'To be assessed', NOW()::date, NOW())""",
                (
                    deal_id, risk["risk_id"], risk.get("risk_name"),
                    risk.get("risk_category") or "general",
                    risk.get("likelihood"), risk.get("severity"),
                    risk.get("score"), risk.get("trend"),
                    risk.get("sensitised_at_origination", False),
                    risk.get("sensitivity_name"), risk.get("stress_description"),
                    risk.get("stress_parameters"),
                    risk.get("risk_name") or risk["risk_id"],
                ),
            )
        count += 1
    return count


# ── Main entry point ──────────────────────────────────────────────────────────

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

    # Risk Register
    if "9. Risk Register" in sheet_names:
        risks = parse_risk_register_sheet(wb["9. Risk Register"])
        n = _upsert_risk_entries(conn, deal_id, risks, errors)
        counts["risk_entries"] = n

    return {
        "ok": len(errors) == 0,
        "deal_id": deal_id,
        "deal_name": deal["name"],
        "counts": counts,
        "errors": errors,
        "warnings": [e for e in errors if "skipped" in e.lower()],
    }
