"""Unit tests for KPI scenarios as first-class time series.

Covers:
- parser for the "9. KPI Scenario Series" tab
- scenario signature grouping logic used by the importer
- end-to-end API shape assertions against the running DB (Gatwick worked example)

Run with:  python tests/test_kpi_scenarios.py
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from urllib import request as _req, error as _err

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


PASS = "[PASS]"
FAIL = "[FAIL]"
results: list[tuple[str, bool, str]] = []


def _assert(name: str, condition: bool, detail: str = "") -> None:
    results.append((name, condition, detail))
    mark = PASS if condition else FAIL
    print(f"{mark} {name}" + (f"  :: {detail}" if detail else ""))


# ── 1) Parser tests (pure logic, no DB) ────────────────────────────────────

class _FakeSheet:
    """Minimal openpyxl-compatible shim for parser tests."""
    def __init__(self, rows):
        self._rows = rows

    def iter_rows(self, min_row=2, values_only=True):
        for row in self._rows[min_row - 1:]:
            yield row


def test_parser_basic():
    from server.topsheet_importer import parse_kpi_scenario_series_sheet
    header = ("kpi_key", "kpi_label", "scenario_kind", "stress_label",
              "driving_risk_ref", "period_flag", "value")
    rows = [
        header,
        header,  # Excel template has header on row 2
        ("sector_kpi_1", "Passengers (m)", "management_case", None, None, "FY2026", 45.0),
        ("sector_kpi_1", "Passengers (m)", "management_case", None, None, "FY2027", 47.0),
        ("sector_kpi_1", "Passengers (m)", "single_variant_stress",
         "Pandemic shock", "RISK-AP-001", "FY2026", 15.0),
        # Row with missing value — should be skipped
        ("sector_kpi_2", "Retail", "management_case", None, None, "FY2026", None),
        # Blank row — should be skipped
        (None, None, None, None, None, None, None),
    ]
    ws = _FakeSheet(rows)
    parsed = parse_kpi_scenario_series_sheet(ws)

    _assert("parser: drops blanks and rows with missing value", len(parsed) == 3,
            f"got {len(parsed)} rows")
    _assert("parser: management_case row has correct kpi_key",
            parsed[0]["kpi_key"] == "sector_kpi_1")
    _assert("parser: scenario_kind is lowercased",
            parsed[2]["scenario_kind"] == "single_variant_stress")
    _assert("parser: stress_label retained for single_variant rows",
            parsed[2]["stress_label"] == "Pandemic shock")
    _assert("parser: driving_risk_ref retained",
            parsed[2]["driving_risk_ref"] == "RISK-AP-001")
    _assert("parser: value coerced to float",
            isinstance(parsed[0]["value"], float) and parsed[0]["value"] == 45.0)


def test_parser_ignores_empty_kpi_key():
    from server.topsheet_importer import parse_kpi_scenario_series_sheet
    rows = [
        ("h",) * 7, ("h",) * 7,
        ("", "label", "management_case", None, None, "FY2026", 45.0),
    ]
    parsed = parse_kpi_scenario_series_sheet(_FakeSheet(rows))
    _assert("parser: row with empty kpi_key is skipped", len(parsed) == 0)


# ── 2) End-to-end API assertions against running DB (Gatwick) ──────────────
# These only run if localhost:4000 is reachable. If not, skipped with a note.

def _fetch_gatwick_topsheet() -> dict | None:
    try:
        with _req.urlopen("http://localhost:4000/api/deals/gatwick-airport/topsheet", timeout=5) as r:
            return json.load(r)
    except (_err.URLError, TimeoutError, OSError):
        return None


def test_api_gatwick_kpi_scenarios():
    ts = _fetch_gatwick_topsheet()
    if ts is None:
        _assert("api: Gatwick topsheet reachable", False,
                "server not running on :4000 — skipping live assertions")
        return

    _assert("api: Gatwick topsheet reachable", True)

    ks = ts.get("kpiScenarios")
    _assert("api: kpiScenarios field present on response", isinstance(ks, list))
    if not isinstance(ks, list):
        return

    _assert("api: Gatwick has 5 KPIs with scenarios", len(ks) == 5,
            f"got {len(ks)} KPIs")

    passengers = next((k for k in ks if k["kpi_key"] == "sector_kpi_1"), None)
    _assert("api: sector_kpi_1 is Passengers", passengers is not None)
    if not passengers:
        return

    _assert("api: sector_kpi_1 has management_case",
            passengers["management_case"] is not None)
    _assert("api: sector_kpi_1 management_case has 9 periods",
            len(passengers["management_case"]["series"]) == 9,
            f"got {len(passengers['management_case']['series'])} periods")

    downside = next((s for s in passengers["stress_cases"]
                     if s["scenario_kind"] == "combined_downside"), None)
    _assert("api: sector_kpi_1 has combined_downside stress_case", downside is not None)
    if downside:
        _assert("api: combined_downside has 9 periods",
                len(downside["series"]) == 9)

    pandemic = next((s for s in passengers["stress_cases"]
                     if s["scenario_kind"] == "single_variant_stress"
                     and s.get("driving_risk_code") == "RISK-AP-001"), None)
    _assert("api: sector_kpi_1 has pandemic single_variant_stress linked to RISK-AP-001",
            pandemic is not None)
    if pandemic:
        _assert("api: pandemic stress has stress_label 'Pandemic passenger shock'",
                pandemic.get("stress_label") == "Pandemic passenger shock")
        _assert("api: pandemic stress has 9 periods",
                len(pandemic["series"]) == 9)
        fy2025 = next((p for p in pandemic["series"] if p["period_flag"] == "FY2025"), None)
        _assert("api: pandemic stress FY2025 value is 15.0 (sharp shock)",
                fy2025 is not None and fy2025["value"] == 15.0,
                f"got {fy2025}")

    # KPIs other than passengers should have no pandemic stress — it's single-variant
    retail = next((k for k in ks if k["kpi_key"] == "sector_kpi_2"), None)
    if retail:
        pandemic_on_retail = [s for s in retail["stress_cases"]
                              if s["scenario_kind"] == "single_variant_stress"]
        _assert("api: pandemic stress does NOT appear on sector_kpi_2 (Net Retail per PAX)",
                len(pandemic_on_retail) == 0,
                f"unexpected stresses: {[s.get('stress_label') for s in pandemic_on_retail]}")


def test_api_old_table_dropped():
    """Sanity: any code path that still referenced deal_kpi_targets would now fail.
    Check the portfolio endpoint (which uses the completeness counter) still returns 200."""
    try:
        with _req.urlopen("http://localhost:4000/api/portfolio", timeout=5) as r:
            _assert("api: /api/portfolio still returns 200 after deal_kpi_targets drop",
                    r.status == 200, f"status={r.status}")
    except (_err.URLError, TimeoutError, OSError) as e:
        _assert("api: /api/portfolio reachable", False, f"error: {e}")


# ── Runner ─────────────────────────────────────────────────────────────────

def main():
    test_parser_basic()
    test_parser_ignores_empty_kpi_key()
    test_api_gatwick_kpi_scenarios()
    test_api_old_table_dropped()

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print()
    print(f"Summary: {passed}/{total} passed")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
