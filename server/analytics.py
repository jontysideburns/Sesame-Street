"""
Analytics Engine — Phase 3
==========================
Computes variance reports, covenant tests, ratio reconciliation and
consecutive lockup tracking against actual_periods data.

Entry point:
    run_analytics_for_period(conn, deal_id, period_flag)
        → AnalyticsResult with all sub-results

Individual engines:
    compute_variance_report()   actual vs forecast base case
    run_covenant_tests()        all covenant_thresholds against actual ratios
    reconcile_ratios()          borrower-reported vs platform-computed
    update_consecutive_lockup() scan history, update deals column
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger(__name__)

# ── Materiality thresholds (metric-aware) ─────────────────────────────────────

_RATIO_METRICS = {
    "senior_quarterly_dscr", "senior_annual_dscr",
    "total_quarterly_dscr", "total_annual_dscr",
    "interest_cover_ratio", "ltv_npv",
    "senior_net_debt_ebitda", "total_net_debt_ebitda", "ebitda_margin",
}

_MATERIALITY_THRESHOLDS = {
    # metric_key: (critical_pct, material_pct, notable_pct)
    # Ratios — tighter tolerances
    "senior_quarterly_dscr":    (5.0,  2.5,  1.0),
    "senior_annual_dscr":       (5.0,  2.5,  1.0),
    "total_quarterly_dscr":     (5.0,  2.5,  1.0),
    "total_annual_dscr":        (5.0,  2.5,  1.0),
    "interest_cover_ratio":     (5.0,  2.5,  1.0),
    "ltv_npv":                  (5.0,  2.5,  1.0),
    # Revenue / EBITDA / CFADS — standard
    "total_revenue":            (10.0, 5.0,  2.5),
    "ebitda":                   (10.0, 5.0,  2.5),
    "cfads":                    (10.0, 5.0,  2.5),
    "senior_debt_service":      (5.0,  2.5,  1.0),
    # Default for everything else
    "_default":                 (12.0, 6.0,  3.0),
}


def _materiality(metric_key: str, variance_pct: float) -> str:
    thresholds = _MATERIALITY_THRESHOLDS.get(metric_key, _MATERIALITY_THRESHOLDS["_default"])
    crit, mat, notable = thresholds
    abs_pct = abs(variance_pct)
    if abs_pct >= crit:
        return "critical"
    if abs_pct >= mat:
        return "material"
    if abs_pct >= notable:
        return "notable"
    return "minor"


# ── Covenant tier evaluation ──────────────────────────────────────────────────

def _covenant_tier(value: float, direction: str,
                   lockup: float | None, trigger: float | None,
                   default: float | None) -> str:
    """
    Returns: performing | distribution_lockup | trigger_event | event_of_default
    direction: 'min' (higher is better) or 'max' (lower is better)
    """
    def breaches(threshold: float | None) -> bool:
        if threshold is None:
            return False
        return value < threshold if direction == "min" else value > threshold

    if breaches(default):
        return "event_of_default"
    if breaches(trigger):
        return "trigger_event"
    if breaches(lockup):
        return "distribution_lockup"
    return "performing"


def _headroom(value: float, threshold: float | None, direction: str) -> float | None:
    if threshold is None:
        return None
    if direction == "min":
        return round(value - threshold, 6)
    return round(threshold - value, 6)


# ── Helper: load actual_period row ───────────────────────────────────────────

def _load_actual(conn, deal_id: int, period_flag: str) -> dict | None:
    row = conn.execute(
        "SELECT * FROM actual_periods WHERE deal_id=%s AND period_flag=%s",
        (deal_id, period_flag),
    ).fetchone()
    return dict(row) if row else None


def _load_forecast_metrics(conn, deal_id: int, period_flag: str) -> dict:
    """Load base case forecast scenario_metrics for a period."""
    row = conn.execute(
        """
        SELECT fcp.scenario_metrics
        FROM forecast_case_periods fcp
        JOIN forecast_case_versions fcv ON fcv.id = fcp.forecast_case_version_id
        JOIN forecast_cases fc ON fc.id = fcv.forecast_case_id
        WHERE fc.deal_id = %s
          AND fc.case_type = 'base'
          AND fcv.is_active = TRUE
          AND fcp.period_key = %s
        """,
        (deal_id, period_flag),
    ).fetchone()
    if not row:
        return {}
    m = row["scenario_metrics"]
    return m if isinstance(m, dict) else json.loads(m)


# ── 1. Variance Report ────────────────────────────────────────────────────────

@dataclass
class VarianceResult:
    period_flag: str
    variances: list[dict] = field(default_factory=list)
    summary_score: float = 80.0
    errors: list[str] = field(default_factory=list)


def compute_variance_report(conn, deal_id: int, period_flag: str) -> VarianceResult:
    """
    Compare actual_metrics in actual_periods against base case forecast_case_periods.
    Returns VarianceResult with per-metric variances and a summary score.
    """
    result = VarianceResult(period_flag=period_flag)

    actual = _load_actual(conn, deal_id, period_flag)
    if not actual:
        result.errors.append(f"No actual period found for {period_flag}")
        return result

    actual_metrics = actual["actual_metrics"]
    if isinstance(actual_metrics, str):
        actual_metrics = json.loads(actual_metrics)

    forecast_metrics = _load_forecast_metrics(conn, deal_id, period_flag)

    if not forecast_metrics:
        result.errors.append(f"No base case forecast found for {period_flag} — variance computed vs zero baseline")

    variances = []
    for metric_key, actual_value in actual_metrics.items():
        if not isinstance(actual_value, (int, float)):
            continue
        expected_value = forecast_metrics.get(metric_key)
        if expected_value is None:
            continue  # Only compute where forecast exists

        expected = float(expected_value)
        actual_v = float(actual_value)
        variance_value = round(actual_v - expected, 4)
        variance_pct = round((variance_value / expected * 100), 4) if expected != 0 else 0.0
        direction = "flat" if variance_value == 0 else ("up" if variance_value > 0 else "down")
        mat = _materiality(metric_key, variance_pct)

        # Determine if adverse (down is bad for revenue/DSCR, up is bad for costs/debt)
        cost_metrics = {
            "total_operating_costs", "capital_expenditure", "tax_paid",
            "senior_debt_service", "junior_debt_service", "senior_net_debt",
            "total_net_debt", "ltv_npv",
        }
        adverse = (direction == "down" and metric_key not in cost_metrics) or \
                  (direction == "up" and metric_key in cost_metrics)

        variances.append({
            "metric_key": metric_key,
            "actual_value": actual_v,
            "expected_value": expected,
            "variance_value": variance_value,
            "variance_pct": variance_pct,
            "direction": direction,
            "adverse": adverse,
            "materiality": mat,
        })

    result.variances = variances

    # Summary score: start at 100, penalise adverse variances
    _penalties = {"critical": 35, "material": 22, "notable": 10, "minor": 3}
    adverse_variances = [v for v in variances if v["adverse"]]
    if adverse_variances:
        avg_penalty = sum(_penalties[v["materiality"]] for v in adverse_variances) / len(adverse_variances)
        result.summary_score = max(0.0, round(100.0 - avg_penalty, 2))
    else:
        result.summary_score = 100.0 if variances else 80.0

    return result


# ── 2. Covenant Test Runner ───────────────────────────────────────────────────

@dataclass
class CovenantTestResult:
    period_flag: str
    tests: list[dict] = field(default_factory=list)
    worst_tier: str = "performing"
    errors: list[str] = field(default_factory=list)


_TIER_RANK = {
    "performing": 0,
    "distribution_lockup": 1,
    "trigger_event": 2,
    "event_of_default": 3,
}


def run_covenant_tests(conn, deal_id: int, period_flag: str) -> CovenantTestResult:
    """
    Evaluate all configured covenant_thresholds against actual_periods data.
    Writes results to covenant_tests table. Returns CovenantTestResult.
    """
    result = CovenantTestResult(period_flag=period_flag)

    actual = _load_actual(conn, deal_id, period_flag)
    if not actual:
        result.errors.append(f"No actual period found for {period_flag}")
        return result

    actual_id = actual["id"]

    # Merge metrics and ratios — platform uses platform_computed_ratios preferentially
    actual_metrics: dict = actual["actual_metrics"] or {}
    if isinstance(actual_metrics, str):
        actual_metrics = json.loads(actual_metrics)

    platform_ratios: dict = actual["platform_computed_ratios"] or {}
    if isinstance(platform_ratios, str):
        platform_ratios = json.loads(platform_ratios)

    borrower_ratios: dict = actual["borrower_reported_ratios"] or {}
    if isinstance(borrower_ratios, str):
        borrower_ratios = json.loads(borrower_ratios)

    # Merged value lookup: platform_computed > actual_metrics
    def get_ratio_value(ratio_name: str) -> float | None:
        v = platform_ratios.get(ratio_name) or actual_metrics.get(ratio_name)
        return float(v) if v is not None else None

    # Load configured covenants
    thresholds = conn.execute(
        "SELECT * FROM covenant_thresholds WHERE deal_id = %s ORDER BY covenant_category, covenant_name",
        (deal_id,),
    ).fetchall()

    if not thresholds:
        result.errors.append("No covenant_thresholds configured for this deal — import the TopSheet first")
        return result

    worst_rank = 0

    for thresh in thresholds:
        ratio_name = thresh["ratio_name"]
        direction = thresh["direction"] or "min"
        lockup = thresh["lockup_level"]
        trigger = thresh["trigger_level"]
        default_l = thresh["default_level"]

        platform_value = get_ratio_value(ratio_name)
        borrower_value = borrower_ratios.get(ratio_name)
        if borrower_value is not None:
            borrower_value = float(borrower_value)

        # Use platform value for testing; fall back to borrower if unavailable
        test_value = platform_value if platform_value is not None else borrower_value

        if test_value is None:
            # Cannot test — no data
            tier_status = "not_assessed"
        else:
            tier_status = _covenant_tier(test_value, direction, lockup, trigger, default_l)

        rank = _TIER_RANK.get(tier_status, 0)
        if rank > worst_rank:
            worst_rank = rank
            result.worst_tier = tier_status

        h_lockup = _headroom(test_value, lockup, direction) if test_value is not None else None
        h_trigger = _headroom(test_value, trigger, direction) if test_value is not None else None
        h_default = _headroom(test_value, default_l, direction) if test_value is not None else None

        # Compute components for DSCR-like ratios from actual_metrics
        components = _build_components(ratio_name, actual_metrics)

        test_record = {
            "actual_period_id": actual_id,
            "deal_id": deal_id,
            "covenant_threshold_id": thresh["id"],
            "covenant_name": thresh["covenant_name"],
            "test_type": thresh["test_type"],
            "ratio_value": test_value,
            "borrower_reported_value": borrower_value,
            "lockup_threshold": float(lockup) if lockup is not None else None,
            "trigger_threshold": float(trigger) if trigger is not None else None,
            "default_threshold": float(default_l) if default_l is not None else None,
            "tier_status": tier_status,
            "headroom_to_lockup": h_lockup,
            "headroom_to_trigger": h_trigger,
            "headroom_to_default": h_default,
            "components": json.dumps(components) if components else None,
        }

        # Upsert into covenant_tests
        existing = conn.execute(
            """SELECT id FROM covenant_tests
               WHERE actual_period_id=%s AND covenant_threshold_id=%s""",
            (actual_id, thresh["id"]),
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE covenant_tests
                   SET ratio_value=%s, borrower_reported_value=%s,
                       tier_status=%s, headroom_to_lockup=%s,
                       headroom_to_trigger=%s, headroom_to_default=%s,
                       components=%s
                   WHERE id=%s""",
                (
                    test_record["ratio_value"],
                    test_record["borrower_reported_value"],
                    tier_status,
                    h_lockup, h_trigger, h_default,
                    test_record["components"],
                    existing["id"],
                ),
            )
        else:
            conn.execute(
                """INSERT INTO covenant_tests
                   (actual_period_id, deal_id, covenant_threshold_id, covenant_name,
                    test_type, ratio_value, borrower_reported_value,
                    lockup_threshold, trigger_threshold, default_threshold,
                    tier_status, headroom_to_lockup, headroom_to_trigger,
                    headroom_to_default, components)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    actual_id, deal_id, thresh["id"],
                    test_record["covenant_name"], test_record["test_type"],
                    test_record["ratio_value"], test_record["borrower_reported_value"],
                    test_record["lockup_threshold"], test_record["trigger_threshold"],
                    test_record["default_threshold"],
                    tier_status, h_lockup, h_trigger, h_default,
                    test_record["components"],
                ),
            )

        result.tests.append(test_record)

    return result


def _build_components(ratio_name: str, metrics: dict) -> dict | None:
    """Build numerator/denominator detail for known ratios."""
    _component_map = {
        "senior_quarterly_dscr": ("cfads", "senior_debt_service"),
        "senior_annual_dscr": ("rolling_12m_cfads", "rolling_12m_senior_ds"),
        "total_quarterly_dscr": ("cfads", "junior_debt_service"),
        "total_annual_dscr": ("rolling_12m_cfads", "rolling_12m_total_ds"),
        "interest_cover_ratio": ("ebitda", "senior_interest"),
        "senior_net_debt_ebitda": ("senior_net_debt", "rolling_12m_ebitda"),
        "total_net_debt_ebitda": ("total_net_debt", "rolling_12m_ebitda"),
        "ebitda_margin": ("ebitda", "total_revenue"),
    }
    mapping = _component_map.get(ratio_name)
    if not mapping:
        return None
    num_key, den_key = mapping
    num = metrics.get(num_key)
    den = metrics.get(den_key)
    if num is None and den is None:
        return None
    return {
        "numerator_label": num_key,
        "numerator_value": float(num) if num is not None else None,
        "denominator_label": den_key,
        "denominator_value": float(den) if den is not None else None,
    }


# ── 3. Ratio Reconciliation ───────────────────────────────────────────────────

@dataclass
class ReconciliationResult:
    period_flag: str
    reconciliations: list[dict] = field(default_factory=list)
    overall_status: str = "matched"
    errors: list[str] = field(default_factory=list)


_RECONCILIATION_TOLERANCES = {
    "senior_quarterly_dscr":  0.02,   # ±0.02x
    "senior_annual_dscr":     0.02,
    "total_quarterly_dscr":   0.02,
    "total_annual_dscr":      0.02,
    "interest_cover_ratio":   0.02,
    "ltv_npv":                0.01,   # ±1%
    "ebitda_margin":          0.01,
    "_default":               0.05,   # ±5%
}

_RECON_STATUS_RANK = {
    "matched": 0,
    "minor_variance": 1,
    "material_variance": 2,
    "unreconciled": 3,
}


def reconcile_ratios(conn, deal_id: int, period_flag: str) -> ReconciliationResult:
    """
    Compare borrower_reported_ratios vs platform_computed_ratios in actual_periods.
    Platform ratios are computed from actual_metrics components where possible.
    Updates actual_periods.ratio_reconciliation_status and ratio_reconciliation_detail.
    """
    result = ReconciliationResult(period_flag=period_flag)

    actual = _load_actual(conn, deal_id, period_flag)
    if not actual:
        result.errors.append(f"No actual period found for {period_flag}")
        return result

    actual_metrics: dict = actual["actual_metrics"] or {}
    if isinstance(actual_metrics, str):
        actual_metrics = json.loads(actual_metrics)

    borrower_ratios: dict = actual["borrower_reported_ratios"] or {}
    if isinstance(borrower_ratios, str):
        borrower_ratios = json.loads(borrower_ratios)

    # Compute platform ratios from components
    platform_ratios = _compute_platform_ratios(actual_metrics)

    reconciliations = []
    worst_rank = 0

    all_ratio_keys = set(borrower_ratios.keys()) | set(platform_ratios.keys())

    for ratio_key in sorted(all_ratio_keys):
        borrower_val = borrower_ratios.get(ratio_key)
        platform_val = platform_ratios.get(ratio_key)

        if borrower_val is None and platform_val is None:
            continue

        if borrower_val is None:
            status = "unreconciled"
            variance = None
            variance_pct = None
        elif platform_val is None:
            # Can't compute platform side — record borrower value only
            status = "unreconciled"
            variance = None
            variance_pct = None
        else:
            b = float(borrower_val)
            p = float(platform_val)
            variance = round(b - p, 6)
            variance_pct = round((variance / p * 100), 4) if p != 0 else 0.0
            tol = _RECONCILIATION_TOLERANCES.get(ratio_key, _RECONCILIATION_TOLERANCES["_default"])
            abs_var = abs(variance_pct / 100) if ratio_key not in _RATIO_METRICS else abs(variance)
            if abs_var <= tol * 0.5:
                status = "matched"
            elif abs_var <= tol:
                status = "minor_variance"
            else:
                status = "material_variance"

        rank = _RECON_STATUS_RANK.get(status, 0)
        if rank > worst_rank:
            worst_rank = rank
            result.overall_status = status

        reconciliations.append({
            "ratio_key": ratio_key,
            "borrower_reported": float(borrower_val) if borrower_val is not None else None,
            "platform_computed": float(platform_val) if platform_val is not None else None,
            "variance": variance,
            "variance_pct": variance_pct,
            "status": status,
        })

    result.reconciliations = reconciliations

    # Write back to actual_periods
    conn.execute(
        """UPDATE actual_periods
           SET platform_computed_ratios=%s,
               ratio_reconciliation_status=%s,
               ratio_reconciliation_detail=%s,
               updated_at=NOW()
           WHERE deal_id=%s AND period_flag=%s""",
        (
            json.dumps(platform_ratios),
            result.overall_status,
            json.dumps(reconciliations),
            deal_id,
            period_flag,
        ),
    )

    return result


def _compute_platform_ratios(metrics: dict) -> dict:
    """
    Compute ratio values from raw cashflow/balance sheet components.
    Returns {ratio_key: computed_value}.
    """
    def get(key: str) -> float | None:
        v = metrics.get(key)
        return float(v) if v is not None else None

    ratios: dict[str, float] = {}

    cfads = get("cfads")
    senior_ds = get("senior_debt_service")
    total_ds_q = (get("senior_debt_service") or 0) + (get("junior_debt_service") or 0)
    ebitda = get("ebitda")
    revenue = get("total_revenue")
    senior_interest = get("senior_interest")
    r12_cfads = get("rolling_12m_cfads")
    r12_senior_ds = get("rolling_12m_senior_ds")
    r12_total_ds = get("rolling_12m_total_ds")
    r12_ebitda = get("rolling_12m_ebitda")
    senior_net_debt = get("senior_net_debt")
    total_net_debt = get("total_net_debt")

    if cfads is not None and senior_ds and senior_ds != 0:
        ratios["senior_quarterly_dscr"] = round(cfads / senior_ds, 4)

    if cfads is not None and total_ds_q and total_ds_q != 0:
        ratios["total_quarterly_dscr"] = round(cfads / total_ds_q, 4)

    if r12_cfads is not None and r12_senior_ds and r12_senior_ds != 0:
        ratios["senior_annual_dscr"] = round(r12_cfads / r12_senior_ds, 4)

    if r12_cfads is not None and r12_total_ds and r12_total_ds != 0:
        ratios["total_annual_dscr"] = round(r12_cfads / r12_total_ds, 4)

    if ebitda is not None and senior_interest and senior_interest != 0:
        ratios["interest_cover_ratio"] = round(ebitda / senior_interest, 4)

    if ebitda is not None and revenue and revenue != 0:
        ratios["ebitda_margin"] = round(ebitda / revenue, 4)

    if senior_net_debt is not None and r12_ebitda and r12_ebitda != 0:
        ratios["senior_net_debt_ebitda"] = round(senior_net_debt / r12_ebitda, 4)

    if total_net_debt is not None and r12_ebitda and r12_ebitda != 0:
        ratios["total_net_debt_ebitda"] = round(total_net_debt / r12_ebitda, 4)

    return ratios


# ── 4. Consecutive Lockup Tracker ─────────────────────────────────────────────

def update_consecutive_lockup(conn, deal_id: int) -> int:
    """
    Scan covenant_tests history ordered by period_flag.
    Count how many consecutive most-recent periods have any covenant in
    distribution_lockup, trigger_event, or event_of_default tier.
    Updates deals.consecutive_lockup_periods and deals.overall_covenant_status.
    Returns the count.
    """
    # Get all periods with covenant tests, ordered newest first
    rows = conn.execute(
        """
        SELECT ap.period_flag,
               MAX(CASE ct.tier_status
                   WHEN 'event_of_default'  THEN 3
                   WHEN 'trigger_event'     THEN 2
                   WHEN 'distribution_lockup' THEN 1
                   ELSE 0 END) AS worst_rank
        FROM actual_periods ap
        JOIN covenant_tests ct ON ct.actual_period_id = ap.id
        WHERE ap.deal_id = %s
        GROUP BY ap.period_flag
        ORDER BY ap.period_flag DESC
        """,
        (deal_id,),
    ).fetchall()

    consecutive = 0
    for row in rows:
        if row["worst_rank"] >= 1:  # Any lockup or worse
            consecutive += 1
        else:
            break  # Chain broken — stop counting

    # Determine overall status from most recent period
    overall_status = "performing"
    if rows:
        rank = rows[0]["worst_rank"]
        if rank == 3:
            overall_status = "event_of_default"
        elif rank == 2:
            overall_status = "trigger_event"
        elif rank == 1:
            overall_status = "distribution_lockup"

    conn.execute(
        """UPDATE deals
           SET consecutive_lockup_periods=%s, overall_covenant_status=%s
           WHERE id=%s""",
        (consecutive, overall_status, deal_id),
    )

    return consecutive


# ── Orchestrator ──────────────────────────────────────────────────────────────

@dataclass
class AnalyticsResult:
    deal_id: int
    period_flag: str
    variance: VarianceResult | None = None
    covenant_tests: CovenantTestResult | None = None
    reconciliation: ReconciliationResult | None = None
    consecutive_lockup_periods: int = 0
    overall_covenant_status: str = "performing"
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "deal_id": self.deal_id,
            "period_flag": self.period_flag,
            "variance": {
                "summary_score": self.variance.summary_score if self.variance else None,
                "variance_count": len(self.variance.variances) if self.variance else 0,
                "adverse_count": sum(1 for v in (self.variance.variances or []) if v["adverse"]),
                "variances": self.variance.variances if self.variance else [],
                "errors": self.variance.errors if self.variance else [],
            },
            "covenant_tests": {
                "worst_tier": self.covenant_tests.worst_tier if self.covenant_tests else "not_assessed",
                "test_count": len(self.covenant_tests.tests) if self.covenant_tests else 0,
                "lockup_count": sum(
                    1 for t in (self.covenant_tests.tests or [])
                    if t["tier_status"] in ("distribution_lockup", "trigger_event", "event_of_default")
                ),
                "tests": self.covenant_tests.tests if self.covenant_tests else [],
                "errors": self.covenant_tests.errors if self.covenant_tests else [],
            },
            "reconciliation": {
                "overall_status": self.reconciliation.overall_status if self.reconciliation else "not_assessed",
                "reconciliation_count": len(self.reconciliation.reconciliations) if self.reconciliation else 0,
                "material_variance_count": sum(
                    1 for r in (self.reconciliation.reconciliations or [])
                    if r["status"] in ("material_variance", "unreconciled")
                ),
                "reconciliations": self.reconciliation.reconciliations if self.reconciliation else [],
                "errors": self.reconciliation.errors if self.reconciliation else [],
            },
            "consecutive_lockup_periods": self.consecutive_lockup_periods,
            "overall_covenant_status": self.overall_covenant_status,
            "errors": self.errors,
        }


def run_analytics_for_period(conn, deal_id: int, period_flag: str) -> AnalyticsResult:
    """
    Run all analytics for a given deal and period in sequence:
      1. Variance report (actual vs base case forecast)
      2. Covenant tests (all configured thresholds)
      3. Ratio reconciliation (borrower-reported vs platform-computed)
      4. Consecutive lockup update (deal-level)

    All writes happen within the caller's transaction.
    """
    result = AnalyticsResult(deal_id=deal_id, period_flag=period_flag)

    try:
        result.variance = compute_variance_report(conn, deal_id, period_flag)
    except Exception as e:
        result.errors.append(f"Variance computation failed: {e}")
        log.exception("Variance computation error deal=%s period=%s", deal_id, period_flag)

    try:
        result.reconciliation = reconcile_ratios(conn, deal_id, period_flag)
    except Exception as e:
        result.errors.append(f"Ratio reconciliation failed: {e}")
        log.exception("Reconciliation error deal=%s period=%s", deal_id, period_flag)

    try:
        result.covenant_tests = run_covenant_tests(conn, deal_id, period_flag)
    except Exception as e:
        result.errors.append(f"Covenant testing failed: {e}")
        log.exception("Covenant test error deal=%s period=%s", deal_id, period_flag)

    try:
        result.consecutive_lockup_periods = update_consecutive_lockup(conn, deal_id)
        result.overall_covenant_status = (
            result.covenant_tests.worst_tier
            if result.covenant_tests else "performing"
        )
    except Exception as e:
        result.errors.append(f"Lockup tracking failed: {e}")
        log.exception("Lockup tracking error deal=%s", deal_id)

    return result
