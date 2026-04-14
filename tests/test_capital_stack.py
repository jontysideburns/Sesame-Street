"""Unit tests for Capital Stack -- engine test cases.

Six test cases from the implementation-plan spec plus the two Gatwick
scenarios as acceptance criteria (their numbers must match the worked-example
documents committed in docs/).

Run with:  python tests/test_capital_stack.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.capital_structure_engine import (
    assign_cashflow_priority_ranks,
    build_capital_stack,
    build_metrics,
    change_of_control_coverage,
    compute_attributable_equity,
    gross_up_facility,
    validate_capital_stack,
)


PASS = "[PASS]"
FAIL = "[FAIL]"
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    marker = PASS if ok else FAIL
    print(f"  {marker} {name}")
    if detail:
        print(f"         {detail}")


def approx(a: float, b: float, tol: float = 0.5) -> bool:
    return abs(float(a) - float(b)) <= tol


# -- Test 1: Wigmore Solar (simple single-level OpCo) --
def test_wigmore_solar():
    print("\n--- Test 1: Wigmore Solar (single-level OpCo, 150m EV, 100m senior) ---")
    deal = {
        "slug": "wigmore-solar",
        "name": "Wigmore Solar",
        "currency": "GBP",
        "enterprise_value": 150_000_000,
        "valuation_date": "2026-04-14",
        "valuation_method": "mark_to_model",
        "valuation_entity": "Wigmore Solar OpCo Limited",
    }
    instruments = [{
        "instrument_name": "Senior Secured Note",
        "instrument_type": "senior_term",
        "entity_level": "opco",
        "entity_name": "Wigmore Solar OpCo Limited",
        "ownership_pct": 100,
        "drawn_amount": 100_000_000,
        "our_holding": 100_000_000,
        "pari_passu_group": "Senior",
        "security_ranking": "Senior Secured",
    }]
    entities = [{
        "entity_name": "Wigmore Solar OpCo Limited",
        "entity_type": "opco",
        "ownership_pct": 100,
        "within_security_perimeter": True,
    }]
    stack = build_capital_stack(deal, instruments, entities, ebitda=12_000_000)

    check("1 layer (senior)", len(stack["layers"]) == 1)
    check("Rank 1 assigned", instruments[0]["cashflow_priority_rank"] == 1)
    check("Senior LTV ~ 66.7%", approx(stack["metrics"]["senior_ltv_pct"], 66.7, 0.1))
    check("Residual equity 50m", approx(stack["residual_equity"], 50_000_000, 1000))
    check("No parallel claims", stack["parallel_claims"] == [])
    check("Our total holding 100m", stack["our_position"]["total_holding"] == 100_000_000)
    check("Zero validation findings", len(stack["warnings"]) == 0,
          f"warnings: {stack['warnings']}")


# -- Test 2: Gatwick Rev.2 (actual -- common GAF MidCo) --
def test_gatwick_rev2():
    print("\n--- Test 2: Gatwick Rev.2 (OpCo 3,364.6m + MidCo 475m, EV 6.5bn) ---")
    deal = {
        "slug": "gatwick-airport",
        "name": "Gatwick Airport",
        "currency": "GBP",
        "enterprise_value": 6_500_000_000,
        "valuation_date": "2026-04-14",
        "valuation_method": "mark_to_model",
        "valuation_entity": "Gatwick Airport Limited",
    }
    opco_bonds_m = [300.0, 300.0, 627.2, 350.0, 300.0, 350.0, 250.0, 300.0, 180.1, 203.3, 204.0]
    total_opco_m = sum(opco_bonds_m)
    our_factor = 125.0 / total_opco_m
    instruments = [
        {
            "instrument_name": f"Class A bond #{i+1}",
            "instrument_type": "senior_term",
            "entity_level": "opco",
            "entity_name": "Gatwick Funding Limited",
            "ownership_pct": 100,
            "drawn_amount": v * 1e6,
            "our_holding": v * 1e6 * our_factor,
            "pari_passu_group": "Class A",
        }
        for i, v in enumerate(opco_bonds_m)
    ]
    instruments.append({
        "instrument_name": "GAF 6% 2030 Bond",
        "instrument_type": "senior_term",
        "entity_level": "midco",
        "entity_name": "Gatwick Airport Finance plc (GAF)",
        "ownership_pct": 100,
        "drawn_amount": 475e6,
        "our_holding": 0,
        "pari_passu_group": "GAF MidCo",
    })
    entities = [
        {"entity_name": "Gatwick Airport Limited", "entity_type": "opco",
         "ownership_pct": 100, "within_security_perimeter": True},
        {"entity_name": "Gatwick Funding Limited", "entity_type": "issuer",
         "ownership_pct": 100, "within_security_perimeter": True},
        {"entity_name": "Ivy Holdco Limited", "entity_type": "bidco",
         "ownership_pct": 100, "within_security_perimeter": True,
         "parent_entity": "Gatwick Airport Finance plc (GAF)"},
        {"entity_name": "Gatwick Airport Finance plc (GAF)", "entity_type": "midco",
         "ownership_pct": 100, "within_security_perimeter": True},
    ]
    stack = build_capital_stack(deal, instruments, entities, ebitda=571_000_000)

    check("2 layers (OpCo + MidCo)", len(stack["layers"]) == 2)
    check("Rank 1 = 11 bonds", stack["layers"][0]["instrument_count"] == 11)
    check("Rank 1 debt 3,364.6m", approx(stack["layers"][0]["debt_total"], 3_364_600_000))
    check("Rank 2 = GAF bond", stack["layers"][1]["instrument_count"] == 1)
    check("Rank 2 debt 475m", approx(stack["layers"][1]["debt_total"], 475_000_000))
    check("OpCo residual 3,135.4m",
          approx(stack["layers"][0]["residual_after_debt"], 3_135_400_000))
    check("Final residual 2,660.4m",
          approx(stack["residual_equity"], 2_660_400_000))
    check("Senior LTV 51.8%", approx(stack["metrics"]["senior_ltv_pct"], 51.8, 0.05))
    check("Consolidated LTV 59.1%",
          approx(stack["metrics"]["consolidated_ltv_pct"], 59.1, 0.05))
    check("Consolidated leverage 6.72x",
          approx(stack["metrics"]["consolidated_leverage_x"], 6.72, 0.02))
    check("No parallel claims", stack["parallel_claims"] == [])
    check("Grossed-up = consolidated (no pledge)",
          stack["metrics"]["grossed_up_equivalent_debt"]
          == stack["metrics"]["consolidated_debt_total"])
    check("Our holding 125m",
          approx(stack["our_position"]["total_holding"], 125_000_000, 1.0))
    check("Our dominant rank = 1", stack["our_position"]["dominant_rank"] == 1)
    check("Debt senior to us = 0", stack["our_position"]["debt_senior_to_us"] == 0)
    check("Subordinated cushion 475m",
          approx(stack["our_position"]["subordinated_cushion"], 475_000_000))
    check("True equity cushion 2,660m",
          approx(stack["our_position"]["true_equity_cushion"], 2_660_400_000))
    check("Total cushion 3,135.4m",
          approx(stack["our_position"]["total_cushion_below_us"], 3_135_400_000))


# -- Test 3: Gatwick GIP-only NAV variant (shareholder-level debt) --
def test_gatwick_gip_nav():
    print("\n--- Test 3: Gatwick GIP-only NAV (475m secured on GIP's 49.99%) ---")
    deal = {
        "slug": "gatwick-airport-gip-scenario",
        "name": "Gatwick (GIP NAV scenario)",
        "currency": "GBP",
        "enterprise_value": 6_500_000_000,
        "valuation_date": "2026-04-14",
        "valuation_method": "mark_to_model",
        "valuation_entity": "Gatwick Airport Limited",
    }
    opco_bonds_m = [300.0, 300.0, 627.2, 350.0, 300.0, 350.0, 250.0, 300.0, 180.1, 203.3, 204.0]
    total_opco_m = sum(opco_bonds_m)
    our_factor = 125.0 / total_opco_m
    instruments = [
        {
            "instrument_name": f"Class A bond #{i+1}",
            "instrument_type": "senior_term",
            "entity_level": "opco",
            "entity_name": "Gatwick Funding Limited",
            "ownership_pct": 100,
            "drawn_amount": v * 1e6,
            "our_holding": v * 1e6 * our_factor,
            "pari_passu_group": "Class A",
        }
        for i, v in enumerate(opco_bonds_m)
    ]
    instruments.append({
        "instrument_name": "GIP NAV Facility",
        "instrument_type": "senior_term",
        "entity_level": "holdco",
        "entity_name": "GIP Gatwick Holdings Ltd",
        "ownership_pct": 49.99,
        "drawn_amount": 475e6,
        "our_holding": 0,
        "pledged_share_entity": "GIP Gatwick Holdings Ltd",
        "pledged_share_pct": 49.99,
    })
    entities = [
        {"entity_name": "Gatwick Airport Limited", "entity_type": "opco",
         "ownership_pct": 100, "within_security_perimeter": True},
        {"entity_name": "Ivy Holdco Limited", "entity_type": "bidco",
         "ownership_pct": 100, "within_security_perimeter": True},
        {"entity_name": "GIP Gatwick Holdings Ltd", "entity_type": "holdco",
         "ownership_pct": 49.99, "within_security_perimeter": False},
    ]
    stack = build_capital_stack(deal, instruments, entities, ebitda=571_000_000)

    check("1 layer in main stack (OpCo only)", len(stack["layers"]) == 1)
    check("Parallel claims: 1 (GIP NAV)", len(stack["parallel_claims"]) == 1)
    check("OpCo residual 3,135.4m",
          approx(stack["layers"][0]["residual_after_debt"], 3_135_400_000))
    check("Consolidated leverage 5.89x (unchanged)",
          approx(stack["metrics"]["consolidated_leverage_x"], 5.89, 0.02))

    gu = stack["parallel_claims"][0]
    check("Gross-up factor ~ 2.0", approx(gu["gross_up_factor"], 2.0004, 0.001))
    check("Grossed-up equivalent ~ 950m",
          approx(gu["grossed_up_equivalent"], 950_190_038, 1_000_000),
          f"got {gu['grossed_up_equivalent']:,.0f}")
    check("Consolidated-equivalent leverage 7.56x",
          approx(stack["metrics"]["grossed_up_equivalent_leverage_x"], 7.56, 0.02))
    check("Consolidated-equivalent LTV 66.4%",
          approx(stack["metrics"]["grossed_up_equivalent_ltv_pct"], 66.4, 0.2))

    check("CoC list has 1 entry", len(stack["change_of_control"]) == 1)
    coc = stack["change_of_control"][0]
    check("Pledged value ~ 1,567m", approx(coc["pledged_value"], 1_567_376_660, 1_000_000))
    check("LTV on pledge ~ 30.3%", approx(coc["ltv_on_pledge_pct"], 30.3, 0.1))
    check("Status = amber (30.3% > 30%)", coc["status"] == "amber",
          f"got {coc['status']}")


# -- Test 4: Project Alpha Port-style (HoldCo + OpCo, 100% ownership) --
def test_opco_plus_holdco_100pct():
    print("\n--- Test 4: OpCo + HoldCo (both 100% owned, different ranks) ---")
    deal = {"slug": "alpha-port", "name": "Alpha Port", "currency": "EUR",
            "enterprise_value": 800_000_000, "valuation_date": "2026-04-14",
            "valuation_method": "dcf", "valuation_entity": "Alpha Port OpCo"}
    instruments = [
        {"instrument_name": "Senior", "instrument_type": "senior_term",
         "entity_level": "opco", "entity_name": "Alpha Port OpCo",
         "ownership_pct": 100, "drawn_amount": 400e6, "our_holding": 50e6},
        {"instrument_name": "HoldCo bond", "instrument_type": "senior_term",
         "entity_level": "holdco", "entity_name": "Alpha Port HoldCo",
         "ownership_pct": 100, "drawn_amount": 100e6, "our_holding": 0},
    ]
    entities = [
        {"entity_name": "Alpha Port OpCo", "entity_type": "opco",
         "ownership_pct": 100, "within_security_perimeter": True},
        {"entity_name": "Alpha Port HoldCo", "entity_type": "holdco",
         "ownership_pct": 100, "within_security_perimeter": True},
    ]
    stack = build_capital_stack(deal, instruments, entities)

    check("2 layers", len(stack["layers"]) == 2)
    check("OpCo rank 1", stack["layers"][0]["rank"] == 1)
    check("HoldCo rank 2", stack["layers"][1]["rank"] == 2)
    check("Senior LTV = 50%", stack["metrics"]["senior_ltv_pct"] == 50.0)
    check("Consolidated LTV = 62.5%", stack["metrics"]["consolidated_ltv_pct"] == 62.5)
    check("Residual equity 300m",
          approx(stack["residual_equity"], 300_000_000, 1000))


# -- Test 5: 75% MajHoldCo -- NAV pledged on 75% stake --
def test_75pct_majhold():
    print("\n--- Test 5: 75% MajHoldCo -- NAV pledged on 75% stake ---")
    deal = {"slug": "test-d", "currency": "GBP", "enterprise_value": 1_000_000_000,
            "valuation_date": "2026-04-14", "valuation_method": "multiples",
            "valuation_entity": "Test OpCo"}
    instruments = [
        {"instrument_name": "OpCo Senior", "instrument_type": "senior_term",
         "entity_level": "opco", "entity_name": "Test OpCo", "ownership_pct": 100,
         "drawn_amount": 500e6, "our_holding": 100e6},
        {"instrument_name": "MajHoldCo NAV Facility", "instrument_type": "senior_term",
         "entity_level": "majority_holdco", "entity_name": "Fund HoldCo",
         "ownership_pct": 75, "drawn_amount": 200e6, "our_holding": 0,
         "pledged_share_entity": "Fund HoldCo", "pledged_share_pct": 75},
    ]
    entities = [
        {"entity_name": "Test OpCo", "entity_type": "opco", "ownership_pct": 100,
         "within_security_perimeter": True},
        {"entity_name": "Fund HoldCo", "entity_type": "majority_holdco",
         "ownership_pct": 75, "within_security_perimeter": True},
    ]
    stack = build_capital_stack(deal, instruments, entities)

    check("Gross-up factor 1.333", approx(
        stack["parallel_claims"][0]["gross_up_factor"], 1.3333, 0.001))
    check("Grossed-up equivalent 266.67m", approx(
        stack["parallel_claims"][0]["grossed_up_equivalent"], 266_666_666, 1000))
    check("Consolidated LTV = 50%", stack["metrics"]["consolidated_ltv_pct"] == 50.0)
    check("Grossed-up LTV ~ 76.7%",
          approx(stack["metrics"]["grossed_up_equivalent_ltv_pct"], 76.7, 0.1))


# -- Test 6: Negative test -- pari-passu group with mismatched ranks --
def test_pari_passu_mismatch():
    print("\n--- Test 6: Negative -- pari-passu group with mismatched ranks ---")
    deal = {"slug": "bad", "currency": "GBP", "enterprise_value": 100e6}
    instruments = [
        {"instrument_name": "A1", "entity_level": "opco", "pari_passu_group": "A",
         "drawn_amount": 50e6, "cashflow_priority_rank": 1},
        {"instrument_name": "A2", "entity_level": "opco", "pari_passu_group": "A",
         "drawn_amount": 50e6, "cashflow_priority_rank": 2},
    ]
    entities = [
        {"entity_name": "OpCo", "entity_type": "opco", "ownership_pct": 100,
         "within_security_perimeter": True},
    ]
    warnings = validate_capital_stack(deal, instruments, entities)
    errors = [w for w in warnings if w["severity"] == "error"]
    check("At least one error", len(errors) >= 1)
    check("Error mentions pari-passu group A",
          any("group 'A'" in e["message"] for e in errors))


# -- Test 7a: security_ranking validation (blank + non-standard) --
def test_security_ranking_validation():
    print("\n--- Test 7a: security_ranking blank / non-standard warnings ---")
    deal = {"slug": "sr-test", "currency": "GBP", "enterprise_value": 500e6,
            "valuation_date": "2026-04-14", "valuation_method": "dcf",
            "valuation_entity": "Test OpCo"}
    entities = [{"entity_name": "Test OpCo", "entity_type": "opco",
                 "ownership_pct": 100, "within_security_perimeter": True}]
    instruments = [
        # (a) blank security_ranking — should warn
        {"instrument_name": "Senior Note A", "entity_level": "opco",
         "entity_name": "Test OpCo", "ownership_pct": 100, "drawn_amount": 200e6},
        # (b) non-standard value — should warn
        {"instrument_name": "Junior Note B", "entity_level": "opco",
         "entity_name": "Test OpCo", "ownership_pct": 100, "drawn_amount": 50e6,
         "security_ranking": "2nd ranking bond"},
        # (c) valid standard value — no warning
        {"instrument_name": "Senior Note C", "entity_level": "opco",
         "entity_name": "Test OpCo", "ownership_pct": 100, "drawn_amount": 100e6,
         "security_ranking": "Senior Secured"},
        # (d) case variation of valid value — no warning (case-insensitive)
        {"instrument_name": "Note D", "entity_level": "opco",
         "entity_name": "Test OpCo", "ownership_pct": 100, "drawn_amount": 50e6,
         "security_ranking": "SENIOR UNSECURED"},
    ]
    warnings = validate_capital_stack(deal, instruments, entities)
    msgs = [w["message"] for w in warnings]

    blank_warn = [m for m in msgs if "Senior Note A" in m and "no security_ranking" in m]
    nonstd_warn = [m for m in msgs if "Junior Note B" in m and "non-standard" in m]
    c_warn = [m for m in msgs if "Senior Note C" in m and ("security_ranking" in m or "ranking" in m)]
    d_warn = [m for m in msgs if "Note D" in m and ("security_ranking" in m or "non-standard" in m)]

    check("Blank value raises warning", len(blank_warn) == 1)
    check("Non-standard value raises warning", len(nonstd_warn) == 1)
    check("Valid standard value does NOT warn", len(c_warn) == 0,
          f"unexpected: {c_warn}")
    check("Case-insensitive match does NOT warn", len(d_warn) == 0,
          f"unexpected: {d_warn}")


# -- Test 7: Validation -- missing EV --
def test_missing_ev():
    print("\n--- Test 7: Validation -- missing EV warn ---")
    deal = {"slug": "no-ev", "currency": "GBP"}
    instruments = [{"instrument_name": "Senior", "entity_level": "opco",
                    "ownership_pct": 100, "drawn_amount": 100e6}]
    entities = [{"entity_name": "OpCo", "entity_type": "opco", "ownership_pct": 100,
                 "within_security_perimeter": True}]
    warnings = validate_capital_stack(deal, instruments, entities)
    ev_warns = [w for w in warnings if "Enterprise Value" in w["message"]]
    check("EV-missing warning raised", len(ev_warns) == 1)


if __name__ == "__main__":
    print("=" * 72)
    print("CAPITAL STACK -- Phase 3 engine tests")
    print("=" * 72)
    test_wigmore_solar()
    test_gatwick_rev2()
    test_gatwick_gip_nav()
    test_opco_plus_holdco_100pct()
    test_75pct_majhold()
    test_pari_passu_mismatch()
    test_security_ranking_validation()
    test_missing_ev()

    print("\n" + "=" * 72)
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"RESULTS: {passed}/{total} passed")
    if passed < total:
        print("\nFAILURES:")
        for name, ok, detail in results:
            if not ok:
                print(f"  {FAIL} {name}  {detail}")
        sys.exit(1)
    print("ALL TESTS PASSED")
    sys.exit(0)
