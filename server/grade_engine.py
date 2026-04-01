"""
Performance Grade & Trending Engine (G.4)

Deterministic headroom-based grading and 3-period trend analysis.
Replaces the previous weighted-composite grading engine (G.3.6).

Inputs:
  - Management Case forecasts (expected_metrics from financial_periods)
  - Reported Actuals (reported_metrics from financial_periods)
  - Default / lockup thresholds (from covenant_thresholds)

Outputs:
  - Performance Grade (1-4) with full headroom breakdown
  - Performance Trending (improving / flat / deteriorating / deteriorating_rapidly / new)
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

# ---------------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------------

GRADE_LABELS = {
    1: "Outperforming",
    2: "In Line",
    3: "Below Expectation",
    4: "Below Lock-Up / Default",
}

TREND_LABELS = {
    "improving": "\u2191",          # ↑
    "flat": "\u2192",               # →
    "deteriorating": "\u2193",      # ↓
    "deteriorating_rapidly": "\u2193\u2193",  # ↓↓
    "new": "\u2605",                # ★
}

DEFAULT_DSCR_THRESHOLD_PCT = Decimal("0.10")   # 10% for grade bands
DEFAULT_COLL_THRESHOLD_PCT = Decimal("0.05")   # 5% for grade bands
DEFAULT_TREND_SMALL_PP = Decimal("2.5")
DEFAULT_DSCR_TREND_LARGE_PP = Decimal("5")
DEFAULT_COLL_TREND_LARGE_PP = Decimal("2.5")

# Proxy default DSCR when no threshold is configured (Section 2.4)
PROXY_DSCR_DEFAULT = Decimal("1.0")


# ---------------------------------------------------------------------------
# HEADROOM COMPUTATION
# ---------------------------------------------------------------------------

def compute_headroom(
    actual: Decimal,
    management: Decimal,
    default_level: Decimal,
    direction: str = "higher_is_better",
) -> dict:
    """
    Compute headroom, erosion, and erosion %.

    direction: 'higher_is_better' (DSCR) or 'lower_is_better' (ND/EBITDA, LTV).
    """
    if direction == "higher_is_better":
        expected_headroom = management - default_level
        actual_headroom = actual - default_level
    else:  # lower_is_better
        expected_headroom = default_level - management
        actual_headroom = default_level - actual

    erosion_abs = expected_headroom - actual_headroom

    if expected_headroom > 0:
        erosion_pct = erosion_abs / expected_headroom
    elif expected_headroom == 0:
        erosion_pct = Decimal("1.0") if erosion_abs > 0 else Decimal("0")
    else:
        # Management Case itself breaches default
        erosion_pct = Decimal("1.0")

    return {
        "expected_headroom": expected_headroom,
        "actual_headroom": actual_headroom,
        "erosion_abs": erosion_abs,
        "erosion_pct": erosion_pct,
    }


# ---------------------------------------------------------------------------
# COMPONENT GRADE (for one ratio)
# ---------------------------------------------------------------------------

def compute_component_grade(
    actual: Decimal,
    management: Decimal,
    default_level: Decimal,
    lockup_level: Decimal | None,
    threshold_pct: Decimal,
    direction: str = "higher_is_better",
) -> tuple[int, dict, list[str]]:
    """
    Compute the grade (1-4) for a single ratio.
    Returns (grade, headroom_dict, flags).
    """
    flags: list[str] = []
    headroom = compute_headroom(actual, management, default_level, direction)
    erosion_pct = headroom["erosion_pct"]

    # Edge case: management case itself breaches default
    if headroom["expected_headroom"] <= 0:
        flags.append("Management Case breaches default — immediate review required")
        return max(3, _breach_check(actual, default_level, lockup_level, direction)), headroom, flags

    # Grade 4: breach check (lockup or default)
    if _is_breached(actual, default_level, direction):
        return 4, headroom, flags
    if lockup_level is not None and _is_breached(actual, lockup_level, direction):
        return 4, headroom, flags

    # Grade 3: erosion > threshold, but above default
    if erosion_pct > threshold_pct:
        return 3, headroom, flags

    # Grade 1: outperformance (erosion < -threshold)
    if erosion_pct < -threshold_pct:
        return 1, headroom, flags

    # Grade 2: in line (within ± threshold)
    return 2, headroom, flags


def _is_breached(actual: Decimal, threshold: Decimal, direction: str) -> bool:
    """Check if actual has breached the threshold level."""
    if direction == "higher_is_better":
        return actual <= threshold
    else:
        return actual >= threshold


def _breach_check(
    actual: Decimal,
    default_level: Decimal,
    lockup_level: Decimal | None,
    direction: str,
) -> int:
    """Return grade 4 if breached, else 3."""
    if _is_breached(actual, default_level, direction):
        return 4
    if lockup_level is not None and _is_breached(actual, lockup_level, direction):
        return 4
    return 3


# ---------------------------------------------------------------------------
# OVERALL PERFORMANCE GRADE
# ---------------------------------------------------------------------------

def compute_performance_grade(
    dscr_actual: Decimal | None,
    dscr_management: Decimal | None,
    dscr_default: Decimal,
    dscr_lockup: Decimal | None,
    dscr_threshold_pct: Decimal,
    coll_actual: Decimal | None,
    coll_management: Decimal | None,
    coll_default: Decimal | None,
    coll_lockup: Decimal | None,
    coll_threshold_pct: Decimal,
    coll_direction: str = "lower_is_better",
) -> dict:
    """
    Compute the overall performance grade from DSCR + collateral assessments.
    Returns the full assessment dict.
    """
    flags: list[str] = []

    # --- DSCR ---
    if dscr_actual is not None and dscr_management is not None:
        dscr_grade, dscr_headroom, dscr_flags = compute_component_grade(
            dscr_actual, dscr_management, dscr_default, dscr_lockup,
            dscr_threshold_pct, "higher_is_better",
        )
        flags.extend(dscr_flags)
    else:
        dscr_grade = 2
        dscr_headroom = _empty_headroom()
        flags.append("Insufficient DSCR data — defaulting to Grade 2")

    # --- Collateral ---
    if coll_actual is not None and coll_management is not None and coll_default is not None:
        coll_grade, coll_headroom, coll_flags = compute_component_grade(
            coll_actual, coll_management, coll_default, coll_lockup,
            coll_threshold_pct, coll_direction,
        )
        flags.extend(coll_flags)
    else:
        coll_grade = 2
        coll_headroom = _empty_headroom()
        flags.append("No collateral ratio configured — skipping collateral assessment")

    overall = max(dscr_grade, coll_grade)
    determinative = "dscr" if dscr_grade >= coll_grade else "collateral"

    return {
        "performance_grade": overall,
        "grade_label": GRADE_LABELS[overall],
        "dscr_grade": dscr_grade,
        "dscr_headroom": dscr_headroom,
        "coll_grade": coll_grade,
        "coll_headroom": coll_headroom,
        "determinative_ratio": determinative,
        "flags": flags,
    }


def _empty_headroom() -> dict:
    return {
        "expected_headroom": None,
        "actual_headroom": None,
        "erosion_abs": None,
        "erosion_pct": None,
    }


# ---------------------------------------------------------------------------
# TRENDING — Delta classification
# ---------------------------------------------------------------------------

def _classify_delta(delta: Decimal, small_threshold: Decimal, large_threshold: Decimal) -> str:
    """Classify a period-to-period delta into bands."""
    if delta > large_threshold:
        return "large_positive"
    if delta > small_threshold:
        return "moderate_positive"
    if delta < -small_threshold:
        return "negative"
    return "small"


def compute_trend(
    E1: Decimal,
    E2: Decimal,
    E3: Decimal,
    small_threshold: Decimal = DEFAULT_TREND_SMALL_PP,
    large_threshold: Decimal = DEFAULT_DSCR_TREND_LARGE_PP,
) -> dict:
    """
    Compute trend from 3 consecutive headroom erosion % values.

    E1, E2, E3: headroom erosion % for periods T-2, T-1, T-0.
    Thresholds in percentage points (e.g. 2.5 means 2.5pp).
    """
    delta_1 = E2 - E1
    delta_2 = E3 - E2

    # Persistent drift: all positive and each worse than last
    persistent_drift = (E1 > 0 and E2 > E1 and E3 > E2)

    d1 = _classify_delta(delta_1, small_threshold, large_threshold)
    d2 = _classify_delta(delta_2, small_threshold, large_threshold)

    trend = _apply_trend_matrix(d1, d2, persistent_drift)

    return {
        "trend": trend,
        "trend_label": TREND_LABELS[trend],
        "erosion_series": [E1, E2, E3],
        "delta_1": delta_1,
        "delta_2": delta_2,
        "persistent_drift": persistent_drift,
    }


def _apply_trend_matrix(d1: str, d2: str, persistent_drift: bool) -> str:
    """Apply the classification matrix from the spec."""

    if d2 == "negative":
        if d1 in ("negative", "small", "moderate_positive"):
            return "improving"
        else:  # large_positive + negative = recovering from bad period
            return "flat"

    elif d2 == "small":
        if d1 == "negative":
            return "improving"
        elif d1 in ("small", "moderate_positive"):
            return "deteriorating" if persistent_drift else "flat"
        else:  # large_positive + small = decelerating but still bad
            return "deteriorating"

    elif d2 == "moderate_positive":
        if d1 == "negative":
            return "flat"
        elif d1 == "small":
            return "deteriorating"
        else:  # moderate or large
            return "deteriorating"

    else:  # d2 is large_positive
        if d1 == "negative":
            return "deteriorating"   # Recovery then large drop — volatile
        else:
            return "deteriorating_rapidly"  # SMALL/MODERATE/LARGE + LARGE = rapid


def compute_combined_trend(
    dscr_trend: str | None,
    coll_trend: str | None,
) -> str:
    """Take the worst of two component trends."""
    if dscr_trend is None and coll_trend is None:
        return "new"
    if dscr_trend is None:
        return coll_trend or "new"
    if coll_trend is None:
        return dscr_trend

    rank = {"improving": 0, "flat": 1, "deteriorating": 2, "deteriorating_rapidly": 3, "new": -1}
    if rank.get(coll_trend, -1) > rank.get(dscr_trend, -1):
        return coll_trend
    return dscr_trend


# ---------------------------------------------------------------------------
# ORCHESTRATOR — run full assessment for a deal
# ---------------------------------------------------------------------------

def _d(val: Any) -> Decimal | None:
    """Safely convert a value to Decimal."""
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def run_assessment(conn, deal_id: int) -> dict:
    """
    Run the full performance assessment for a deal.

    1. Load deal config (which metrics, thresholds)
    2. Load the 3 most recent financial periods
    3. Compute grade for the latest period
    4. Compute trend from 3-period erosion series
    5. Persist to performance_assessments table
    6. Update deals.grade

    Returns the full assessment dict.
    """
    # --- Load deal config ---
    deal = conn.execute(
        """SELECT id, slug, grade, grade_dscr_metric, grade_dscr_fallback,
                  grade_collateral_metric, grade_collateral_direction,
                  grade_dscr_threshold_pct, grade_coll_threshold_pct,
                  trend_dscr_large_pp, trend_coll_large_pp, trend_small_pp
           FROM deals WHERE id = %s""",
        [deal_id],
    ).fetchone()

    if not deal:
        raise ValueError(f"Deal {deal_id} not found")

    dscr_metric = deal["grade_dscr_metric"] or "seniorAnnualDscr"
    dscr_fallback = deal["grade_dscr_fallback"] or "seniorDscr"
    coll_metric = deal["grade_collateral_metric"] or "seniorNetDebtEbitda"
    coll_direction = deal["grade_collateral_direction"] or "lower_is_better"
    dscr_threshold = _d(deal["grade_dscr_threshold_pct"]) or DEFAULT_DSCR_THRESHOLD_PCT
    coll_threshold = _d(deal["grade_coll_threshold_pct"]) or DEFAULT_COLL_THRESHOLD_PCT
    trend_small = _d(deal["trend_small_pp"]) or DEFAULT_TREND_SMALL_PP
    trend_dscr_large = _d(deal["trend_dscr_large_pp"]) or DEFAULT_DSCR_TREND_LARGE_PP
    trend_coll_large = _d(deal["trend_coll_large_pp"]) or DEFAULT_COLL_TREND_LARGE_PP

    # --- Load covenant thresholds ---
    dscr_thresholds = _load_covenant_threshold(conn, deal_id, "cash_flow_cover")
    coll_thresholds = _load_covenant_threshold(conn, deal_id, "collateral_value")

    dscr_default = _d(dscr_thresholds["default_level"]) if dscr_thresholds else PROXY_DSCR_DEFAULT
    dscr_lockup = _d(dscr_thresholds["lockup_level"]) if dscr_thresholds else None
    coll_default = _d(coll_thresholds["default_level"]) if coll_thresholds else None
    coll_lockup = _d(coll_thresholds["lockup_level"]) if coll_thresholds else None

    # --- Load the 3 most recent financial periods ---
    periods = conn.execute(
        """SELECT id, period_key, period_label, period_end,
                  reported_metrics, expected_metrics
           FROM financial_periods
           WHERE deal_id = %s AND status IN ('approved', 'under_review')
           ORDER BY period_end DESC
           LIMIT 3""",
        [deal_id],
    ).fetchall()

    if not periods:
        raise ValueError(f"No financial periods found for deal {deal_id}")

    # Most recent period first
    latest = periods[0]
    reported = latest["reported_metrics"] or {}
    expected = latest["expected_metrics"] or {}

    # --- Extract DSCR values ---
    dscr_actual = _d(_get_metric(reported, dscr_metric, dscr_fallback))
    dscr_management = _d(_get_metric(expected, dscr_metric, dscr_fallback))
    dscr_metric_used = dscr_metric if _get_metric(reported, dscr_metric) is not None else dscr_fallback
    dscr_source = "ltm_preferred" if dscr_metric_used == dscr_metric else "quarterly_fallback"

    # --- Extract collateral values ---
    coll_actual = _d(reported.get(coll_metric))
    coll_management = _d(expected.get(coll_metric))

    # --- Compute grade ---
    grade_result = compute_performance_grade(
        dscr_actual=dscr_actual,
        dscr_management=dscr_management,
        dscr_default=dscr_default,
        dscr_lockup=dscr_lockup,
        dscr_threshold_pct=dscr_threshold,
        coll_actual=coll_actual,
        coll_management=coll_management,
        coll_default=coll_default,
        coll_lockup=coll_lockup,
        coll_threshold_pct=coll_threshold,
        coll_direction=coll_direction,
    )

    # --- Compute trend ---
    trend_result = _compute_full_trend(
        periods, dscr_metric, dscr_fallback, dscr_default, coll_metric, coll_default,
        coll_direction, trend_small, trend_dscr_large, trend_coll_large,
    )

    # --- Load prior grade for change detection ---
    prior_assessment = conn.execute(
        """SELECT performance_grade FROM performance_assessments
           WHERE deal_id = %s ORDER BY created_at DESC LIMIT 1""",
        [deal_id],
    ).fetchone()
    prior_grade = prior_assessment["performance_grade"] if prior_assessment else None
    grade_changed = prior_grade is not None and prior_grade != grade_result["performance_grade"]
    grade_direction = None
    if grade_changed:
        grade_direction = "upgrade" if grade_result["performance_grade"] < prior_grade else "downgrade"

    # --- Build the full assessment row ---
    assessment = {
        "deal_id": deal_id,
        "financial_period_id": latest["id"],
        "assessment_period": latest["period_label"],
        "performance_grade": grade_result["performance_grade"],
        "grade_label": grade_result["grade_label"],
        "prior_grade": prior_grade,
        "grade_changed": grade_changed,
        "grade_direction": grade_direction,
        # DSCR
        "dscr_metric": dscr_metric_used,
        "dscr_metric_source": dscr_source,
        "dscr_management_case": dscr_management,
        "dscr_default_level": dscr_default,
        "dscr_lockup_level": dscr_lockup,
        "dscr_actual": dscr_actual,
        "dscr_expected_headroom": grade_result["dscr_headroom"]["expected_headroom"],
        "dscr_actual_headroom": grade_result["dscr_headroom"]["actual_headroom"],
        "dscr_erosion_abs": grade_result["dscr_headroom"]["erosion_abs"],
        "dscr_erosion_pct": grade_result["dscr_headroom"]["erosion_pct"],
        "dscr_component_grade": grade_result["dscr_grade"],
        # Collateral
        "coll_metric": coll_metric,
        "coll_direction": coll_direction,
        "coll_management_case": coll_management,
        "coll_default_level": coll_default,
        "coll_lockup_level": coll_lockup,
        "coll_actual": coll_actual,
        "coll_expected_headroom": grade_result["coll_headroom"]["expected_headroom"],
        "coll_actual_headroom": grade_result["coll_headroom"]["actual_headroom"],
        "coll_erosion_abs": grade_result["coll_headroom"]["erosion_abs"],
        "coll_erosion_pct": grade_result["coll_headroom"]["erosion_pct"],
        "coll_component_grade": grade_result["coll_grade"],
        # Trend
        "performance_trend": trend_result["overall_trend"],
        "trend_label": TREND_LABELS.get(trend_result["overall_trend"], ""),
        "trend_periods": trend_result.get("trend_periods"),
        "dscr_erosion_series": trend_result.get("dscr_erosion_series"),
        "dscr_delta_1": trend_result.get("dscr_delta_1"),
        "dscr_delta_2": trend_result.get("dscr_delta_2"),
        "dscr_persistent_drift": trend_result.get("dscr_persistent_drift"),
        "dscr_trend": trend_result.get("dscr_trend"),
        "coll_erosion_series": trend_result.get("coll_erosion_series"),
        "coll_delta_1": trend_result.get("coll_delta_1"),
        "coll_delta_2": trend_result.get("coll_delta_2"),
        "coll_persistent_drift": trend_result.get("coll_persistent_drift"),
        "coll_trend": trend_result.get("coll_trend"),
        # Config
        "dscr_threshold_pct": dscr_threshold,
        "coll_threshold_pct": coll_threshold,
        "dscr_trend_large_pp": trend_dscr_large,
        "coll_trend_large_pp": trend_coll_large,
        "trend_small_pp": trend_small,
        "determinative_ratio": grade_result["determinative_ratio"],
        "flags": grade_result["flags"],
    }

    # --- Persist ---
    _persist_assessment(conn, assessment)

    # --- Update deals.grade and watchlist ---
    new_grade_label = f"{grade_result['performance_grade']} - {grade_result['grade_label']}"
    new_grade = grade_result["performance_grade"]
    new_trend = trend_result["overall_trend"]
    should_watchlist = (
        new_grade >= 3
        or new_trend in ("deteriorating", "deteriorating_rapidly")
    )
    conn.execute(
        "UPDATE deals SET grade = %s, performance_grade = %s, watchlist = %s WHERE id = %s",
        [new_grade_label, new_grade, should_watchlist, deal_id],
    )

    # --- Create alerts for grade changes and trend deterioration ---
    alerts = []
    deal_slug = deal["slug"]
    deep_link = f"/deals/{deal_slug}/assessment"

    if grade_changed:
        direction_label = "upgraded" if grade_direction == "upgrade" else "downgraded"
        alert = {
            "type": "grade_change",
            "direction": grade_direction,
            "title": f"Performance grade {direction_label}: {prior_grade} → {new_grade}",
            "summary": f"Deal {deal_slug} has been {direction_label} from Grade {prior_grade} to Grade {new_grade} ({grade_result['grade_label']}).",
            "deal_id": deal_id,
            "deal_slug": deal_slug,
            "deep_link": deep_link,
            "severity": "high" if grade_direction == "downgrade" else "info",
        }
        alerts.append(alert)

    if new_trend in ("deteriorating", "deteriorating_rapidly"):
        alert = {
            "type": "trend_warning",
            "title": f"Performance trend: {new_trend.replace('_', ' ')}",
            "summary": f"Deal {deal_slug} shows a {new_trend.replace('_', ' ')} trend in headroom erosion.",
            "deal_id": deal_id,
            "deal_slug": deal_slug,
            "deep_link": deep_link,
            "severity": "high" if new_trend == "deteriorating_rapidly" else "medium",
        }
        alerts.append(alert)

    if should_watchlist:
        reasons = []
        if new_grade >= 3:
            reasons.append(f"Grade {new_grade}")
        if new_trend in ("deteriorating", "deteriorating_rapidly"):
            reasons.append(f"trend {new_trend.replace('_', ' ')}")
        alert = {
            "type": "watchlist_flag",
            "title": "Auto-watchlisted",
            "summary": f"Deal {deal_slug} added to watchlist: {', '.join(reasons)}.",
            "deal_id": deal_id,
            "deal_slug": deal_slug,
            "deep_link": deep_link,
            "severity": "medium",
        }
        alerts.append(alert)

    assessment["_alerts"] = alerts
    conn.connection.commit()

    return _serialise(assessment)


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def _get_metric(metrics: dict, primary_key: str, fallback_key: str | None = None):
    """Get a metric value, trying primary then fallback key."""
    val = metrics.get(primary_key)
    if val is not None:
        return val
    if fallback_key:
        return metrics.get(fallback_key)
    return None


def _load_covenant_threshold(conn, deal_id: int, category: str) -> dict | None:
    """Load the first matching covenant threshold for a deal and category."""
    row = conn.execute(
        """SELECT ratio_name, direction, lockup_level, trigger_level, default_level
           FROM covenant_thresholds
           WHERE deal_id = %s AND covenant_category = %s
           ORDER BY id LIMIT 1""",
        [deal_id, category],
    ).fetchone()
    return dict(row) if row else None


def _compute_full_trend(
    periods: list,
    dscr_metric: str,
    dscr_fallback: str,
    dscr_default: Decimal,
    coll_metric: str,
    coll_default: Decimal | None,
    coll_direction: str,
    trend_small: Decimal,
    trend_dscr_large: Decimal,
    trend_coll_large: Decimal,
) -> dict:
    """Compute trending from up to 3 periods."""

    if len(periods) < 3:
        return {
            "overall_trend": "new",
            "trend_periods": [p["period_label"] for p in reversed(periods)],
            "dscr_trend": None,
            "coll_trend": None,
        }

    # Periods are ordered most-recent first; reverse for chronological [T-2, T-1, T-0]
    chronological = list(reversed(periods[:3]))
    trend_periods = [p["period_label"] for p in chronological]

    # --- DSCR erosion series ---
    dscr_erosions = []
    for p in chronological:
        reported = p["reported_metrics"] or {}
        expected = p["expected_metrics"] or {}
        actual_val = _d(_get_metric(reported, dscr_metric, dscr_fallback))
        mgmt_val = _d(_get_metric(expected, dscr_metric, dscr_fallback))
        if actual_val is not None and mgmt_val is not None:
            hd = compute_headroom(actual_val, mgmt_val, dscr_default, "higher_is_better")
            dscr_erosions.append(hd["erosion_pct"] * 100)  # Convert to pp
        else:
            dscr_erosions.append(None)

    # --- Collateral erosion series ---
    coll_erosions = []
    if coll_default is not None:
        for p in chronological:
            reported = p["reported_metrics"] or {}
            expected = p["expected_metrics"] or {}
            actual_val = _d(reported.get(coll_metric))
            mgmt_val = _d(expected.get(coll_metric))
            if actual_val is not None and mgmt_val is not None:
                hd = compute_headroom(actual_val, mgmt_val, coll_default, coll_direction)
                coll_erosions.append(hd["erosion_pct"] * 100)  # Convert to pp
            else:
                coll_erosions.append(None)

    # --- Compute DSCR trend ---
    dscr_trend_result = None
    dscr_result_data = {}
    if len(dscr_erosions) == 3 and all(e is not None for e in dscr_erosions):
        dscr_trend_result = compute_trend(
            dscr_erosions[0], dscr_erosions[1], dscr_erosions[2],
            trend_small, trend_dscr_large,
        )
        dscr_result_data = {
            "dscr_erosion_series": dscr_erosions,
            "dscr_delta_1": dscr_trend_result["delta_1"],
            "dscr_delta_2": dscr_trend_result["delta_2"],
            "dscr_persistent_drift": dscr_trend_result["persistent_drift"],
            "dscr_trend": dscr_trend_result["trend"],
        }

    # --- Compute collateral trend ---
    coll_trend_result = None
    coll_result_data = {}
    if len(coll_erosions) == 3 and all(e is not None for e in coll_erosions):
        coll_trend_result = compute_trend(
            coll_erosions[0], coll_erosions[1], coll_erosions[2],
            trend_small, trend_coll_large,
        )
        coll_result_data = {
            "coll_erosion_series": coll_erosions,
            "coll_delta_1": coll_trend_result["delta_1"],
            "coll_delta_2": coll_trend_result["delta_2"],
            "coll_persistent_drift": coll_trend_result["persistent_drift"],
            "coll_trend": coll_trend_result["trend"],
        }

    # --- Combine ---
    dscr_t = dscr_trend_result["trend"] if dscr_trend_result else None
    coll_t = coll_trend_result["trend"] if coll_trend_result else None
    overall = compute_combined_trend(dscr_t, coll_t)

    return {
        "overall_trend": overall,
        "trend_periods": trend_periods,
        **dscr_result_data,
        **coll_result_data,
    }


def _persist_assessment(conn, a: dict) -> None:
    """Insert a new performance_assessments row."""
    conn.execute(
        """INSERT INTO performance_assessments (
            deal_id, financial_period_id, assessment_period,
            performance_grade, grade_label, prior_grade, grade_changed, grade_direction,
            dscr_metric, dscr_metric_source, dscr_management_case, dscr_default_level,
            dscr_lockup_level, dscr_actual, dscr_expected_headroom, dscr_actual_headroom,
            dscr_erosion_abs, dscr_erosion_pct, dscr_component_grade,
            coll_metric, coll_direction, coll_management_case, coll_default_level,
            coll_lockup_level, coll_actual, coll_expected_headroom, coll_actual_headroom,
            coll_erosion_abs, coll_erosion_pct, coll_component_grade,
            performance_trend, trend_label, trend_periods,
            dscr_erosion_series, dscr_delta_1, dscr_delta_2, dscr_persistent_drift, dscr_trend,
            coll_erosion_series, coll_delta_1, coll_delta_2, coll_persistent_drift, coll_trend,
            dscr_threshold_pct, coll_threshold_pct, dscr_trend_large_pp,
            coll_trend_large_pp, trend_small_pp, determinative_ratio, flags
        ) VALUES (
            %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s
        )""",
        [
            a["deal_id"], a["financial_period_id"], a["assessment_period"],
            a["performance_grade"], a["grade_label"], a["prior_grade"],
            a["grade_changed"], a["grade_direction"],
            a["dscr_metric"], a["dscr_metric_source"], a["dscr_management_case"],
            a["dscr_default_level"], a["dscr_lockup_level"], a["dscr_actual"],
            a["dscr_expected_headroom"], a["dscr_actual_headroom"],
            a["dscr_erosion_abs"], a["dscr_erosion_pct"], a["dscr_component_grade"],
            a["coll_metric"], a["coll_direction"], a["coll_management_case"],
            a["coll_default_level"], a["coll_lockup_level"], a["coll_actual"],
            a["coll_expected_headroom"], a["coll_actual_headroom"],
            a["coll_erosion_abs"], a["coll_erosion_pct"], a["coll_component_grade"],
            a["performance_trend"], a["trend_label"], a.get("trend_periods"),
            a.get("dscr_erosion_series"), a.get("dscr_delta_1"), a.get("dscr_delta_2"),
            a.get("dscr_persistent_drift"), a.get("dscr_trend"),
            a.get("coll_erosion_series"), a.get("coll_delta_1"), a.get("coll_delta_2"),
            a.get("coll_persistent_drift"), a.get("coll_trend"),
            a["dscr_threshold_pct"], a["coll_threshold_pct"],
            a["dscr_trend_large_pp"], a["coll_trend_large_pp"], a["trend_small_pp"],
            a["determinative_ratio"], a.get("flags"),
        ],
    )


def _serialise(assessment: dict) -> dict:
    """Convert Decimals to floats for JSON serialisation."""
    out = {}
    for k, v in assessment.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, list):
            out[k] = [float(x) if isinstance(x, Decimal) else x for x in v]
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# PORTFOLIO-LEVEL QUERIES
# ---------------------------------------------------------------------------

def get_latest_assessment(conn, deal_id: int) -> dict | None:
    """Get the most recent performance assessment for a deal."""
    row = conn.execute(
        """SELECT * FROM performance_assessments
           WHERE deal_id = %s
           ORDER BY created_at DESC LIMIT 1""",
        [deal_id],
    ).fetchone()
    if not row:
        return None
    return _row_to_dict(row)


def get_assessment_history(conn, deal_id: int) -> list[dict]:
    """Get all assessments for a deal, most recent first."""
    rows = conn.execute(
        """SELECT * FROM performance_assessments
           WHERE deal_id = %s
           ORDER BY created_at DESC""",
        [deal_id],
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_grade_distribution(conn, organisation_id: int | None = None) -> dict:
    """
    Get portfolio-level grade distribution.
    Returns counts and exposure per grade.
    """
    query = """
        SELECT pa.performance_grade, pa.grade_label,
               COUNT(DISTINCT pa.deal_id) AS deal_count,
               COALESCE(SUM(d.exposure), 0) AS total_exposure
        FROM performance_assessments pa
        JOIN deals d ON d.id = pa.deal_id
        WHERE pa.id IN (
            SELECT DISTINCT ON (deal_id) id
            FROM performance_assessments
            ORDER BY deal_id, created_at DESC
        )
        GROUP BY pa.performance_grade, pa.grade_label
        ORDER BY pa.performance_grade
    """
    rows = conn.execute(query).fetchall()
    return {
        "distribution": [
            {
                "grade": r["performance_grade"],
                "label": r["grade_label"],
                "dealCount": r["deal_count"],
                "totalExposure": int(r["total_exposure"]),
            }
            for r in rows
        ],
    }


def get_trend_distribution(conn) -> dict:
    """Get portfolio-level trend distribution."""
    query = """
        SELECT pa.performance_trend, pa.trend_label,
               COUNT(DISTINCT pa.deal_id) AS deal_count
        FROM performance_assessments pa
        WHERE pa.id IN (
            SELECT DISTINCT ON (deal_id) id
            FROM performance_assessments
            ORDER BY deal_id, created_at DESC
        )
        GROUP BY pa.performance_trend, pa.trend_label
        ORDER BY pa.performance_trend
    """
    rows = conn.execute(query).fetchall()
    return {
        "distribution": [
            {
                "trend": r["performance_trend"],
                "label": r["trend_label"],
                "dealCount": r["deal_count"],
            }
            for r in rows
        ],
    }


def get_watchlist(conn) -> list[dict]:
    """Get all deals with grade 3+ or deteriorating trends."""
    query = """
        SELECT pa.*, d.slug, d.name AS deal_name, d.exposure, d.sector
        FROM performance_assessments pa
        JOIN deals d ON d.id = pa.deal_id
        WHERE pa.id IN (
            SELECT DISTINCT ON (deal_id) id
            FROM performance_assessments
            ORDER BY deal_id, created_at DESC
        )
        AND (pa.performance_grade >= 3
             OR pa.performance_trend IN ('deteriorating', 'deteriorating_rapidly'))
        ORDER BY pa.performance_grade DESC, pa.performance_trend DESC
    """
    rows = conn.execute(query).fetchall()
    return [
        {
            "slug": r["slug"],
            "dealName": r["deal_name"],
            "exposure": int(r["exposure"]),
            "sector": r["sector"],
            "grade": r["performance_grade"],
            "gradeLabel": r["grade_label"],
            "trend": r["performance_trend"],
            "trendLabel": r["trend_label"],
            "assessmentPeriod": r["assessment_period"],
            "determinativeRatio": r["determinative_ratio"],
        }
        for r in rows
    ]


def _row_to_dict(row) -> dict:
    """Convert a database row to a JSON-serialisable dict."""
    d = dict(row)
    out = {}
    for k, v in d.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, (datetime,)):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [float(x) if isinstance(x, Decimal) else x for x in v]
        else:
            out[k] = v
    # camelCase conversion for API output
    return _snake_to_camel(out)


def _snake_to_camel(d: dict) -> dict:
    """Convert snake_case keys to camelCase."""
    def convert(key: str) -> str:
        parts = key.split("_")
        return parts[0] + "".join(p.capitalize() for p in parts[1:])
    return {convert(k): v for k, v in d.items()}
