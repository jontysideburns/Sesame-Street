"""Capital structure engine — cashflow priority ranking + proportional consolidation.

The two jobs this module does:

1. ``assign_cashflow_priority_ranks`` — fill in ``cashflow_priority_rank`` on
   instruments where it has not been set manually. The rank reflects the
   priority of claim on cashflows. Rank 1 is the first claim; shareholder
   loans and intercompany loans are left unranked (None).

2. ``proportional_consolidation`` — the right way to roll up cashflows and
   debt across a group with partial ownership. Accounting's IFRS full
   consolidation (100% of subsidiary cashflows less minority interest) is
   NOT appropriate for credit ratios — it overstates EBITDA. Apply the
   ownership percentage to BOTH cashflows AND debt.

Both engines are intentionally pure (no DB access) so they can be unit-tested
cheaply. The callers in ``server/main.py`` and ``server/topsheet_importer.py``
persist the results.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date as _date
from typing import Iterable, Optional


# Structural hierarchy. Index 0 is closest to the cashflows, higher indices
# are further away (one layer of structural subordination per step).
LEVEL_ORDER = [
    "opco",
    "midco",
    "holdco",
    "majority_holdco",
    "minority_holdco",
]

# Instrument types that are not ranked — they sit behind external debt.
SHAREHOLDER_LOAN_TYPES = {"shl", "shareholder_loan"}

# Security rankings that imply contractual subordination within the same
# structural level (i.e. same-level +1 rank).
SUBORDINATED_RANKINGS = {
    "subordinated",
    "subordinated holdco",
    "mezzanine",
    "second lien",
}


def _is_shareholder_loan(instrument: dict) -> bool:
    itype = (instrument.get("instrument_type") or instrument.get("type") or "").lower()
    return itype in SHAREHOLDER_LOAN_TYPES


def _is_intercompany(instrument: dict) -> bool:
    lender = instrument.get("intercompany_lender")
    return lender is not None and str(lender).strip() != ""


def _is_external_debt(instrument: dict) -> bool:
    return not _is_shareholder_loan(instrument) and not _is_intercompany(instrument)


def _is_contractually_subordinated(instrument: dict) -> bool:
    enforcement = (instrument.get("enforcement_class") or "").lower()
    if "junior" in enforcement or "sub" in enforcement:
        return True
    ranking = (instrument.get("security_ranking") or "").lower()
    return any(tag in ranking for tag in SUBORDINATED_RANKINGS)


def assign_cashflow_priority_ranks(instruments: list[dict]) -> list[dict]:
    """Auto-assign ``cashflow_priority_rank`` on instruments where it is None.

    Rules (see SKILL spec section 10):
    - Walk levels in ``LEVEL_ORDER``. The first level that has external debt
      anchors the rank 1 position. Each subsequent level that also has
      external debt bumps the base rank by +1 (structural subordination).
    - Shareholder loans and intercompany loans stay None (not ranked).
    - Contractually subordinated instruments (mezzanine / second lien /
      subordinated / junior enforcement class) get +1 vs their level's base.
    - A ``minority_holdco`` level gets an extra +1 *iff* OpCo debt exists.
    - Instruments that already have a ``cashflow_priority_rank`` set are
      left untouched (manual overrides win).

    Returns the same list with ``cashflow_priority_rank`` filled in.
    """
    # Find the first level that actually has external debt.
    first_claim_level = None
    for level in LEVEL_ORDER:
        has_external = any(
            (i.get("entity_level") or "").lower() == level and _is_external_debt(i)
            for i in instruments
        )
        if has_external:
            first_claim_level = level
            break

    # Shareholder loans and intercompany loans are always unranked, regardless
    # of what level they sit at. Do a pre-pass so they always have the key set.
    for i in instruments:
        if i.get("cashflow_priority_rank") is None and (
            _is_shareholder_loan(i) or _is_intercompany(i)
        ):
            i["cashflow_priority_rank"] = None

    if first_claim_level is None:
        return instruments  # no ranked debt at all

    has_opco_external = any(
        (i.get("entity_level") or "").lower() == "opco" and _is_external_debt(i)
        for i in instruments
    )

    base_rank = 1
    prev_had_debt = False

    for level in LEVEL_ORDER:
        level_instruments = [
            i for i in instruments if (i.get("entity_level") or "").lower() == level
        ]
        external = [i for i in level_instruments if _is_external_debt(i)]

        if not external:
            continue

        if level != first_claim_level and prev_had_debt:
            base_rank += 1

        for instrument in level_instruments:
            if instrument.get("cashflow_priority_rank") is not None:
                continue  # manual override

            if _is_shareholder_loan(instrument):
                instrument["cashflow_priority_rank"] = None
                continue

            if _is_intercompany(instrument):
                instrument["cashflow_priority_rank"] = None
                continue

            rank = base_rank

            if _is_contractually_subordinated(instrument):
                rank += 1

            # Minority HoldCo penalty — only when OpCo-level debt exists.
            if level == "minority_holdco" and has_opco_external:
                rank += 1

            instrument["cashflow_priority_rank"] = rank

        prev_had_debt = True

    return instruments


# ─── Proportional consolidation ─────────────────────────────────────────────


@dataclass
class EntityFinancials:
    """Minimal shape needed by the consolidation helper.

    One instance per entity. ``ownership_pct`` is the *economic* share
    (0–100) that the consolidating entity has in this entity's cashflows
    and debt. For wholly-owned entities pass 100.0.
    """

    entity_name: str
    ownership_pct: float
    ebitda: float = 0.0
    cfads: float = 0.0
    debt: float = 0.0
    debt_service: float = 0.0
    within_perimeter: bool = True


def proportional_consolidation(entities: Iterable[EntityFinancials]) -> dict:
    """Return the proportionally-consolidated roll-up.

    For each entity within the security perimeter, multiply each financial
    figure by (ownership_pct / 100) and sum. Intercompany balances must
    already be removed from the inputs (they net to zero on consolidation).

    Returns a dict with the consolidated totals and the derived ratios:
    ``{"ebitda", "cfads", "debt", "debt_service", "dscr", "net_debt_ebitda"}``.

    CRITICAL: do NOT pass accounting-consolidated numbers (IFRS full
    consolidation less minority interest). That would double-count — this
    function already applies the ownership share. Pass each entity's
    100%-basis numbers and its ownership share separately.
    """
    ebitda = 0.0
    cfads = 0.0
    debt = 0.0
    ds = 0.0

    for e in entities:
        if not e.within_perimeter:
            continue
        share = max(0.0, min(1.0, (e.ownership_pct or 0) / 100.0))
        ebitda += share * (e.ebitda or 0)
        cfads += share * (e.cfads or 0)
        debt += share * (e.debt or 0)
        ds += share * (e.debt_service or 0)

    dscr = (cfads / ds) if ds else None
    nd_ebitda = (debt / ebitda) if ebitda else None

    return {
        "ebitda": ebitda,
        "cfads": cfads,
        "debt": debt,
        "debt_service": ds,
        "dscr": round(dscr, 3) if dscr is not None else None,
        "net_debt_ebitda": round(nd_ebitda, 3) if nd_ebitda is not None else None,
    }


# ─── Cross-validation helpers (warnings/errors, not persisted) ──────────────


def validate_capital_structure(
    instruments: list[dict], entities: list[dict]
) -> list[dict]:
    """Return a list of validation findings.

    Each finding is ``{"severity": "warn"|"error", "message": str,
    "subject": str}``. The caller decides whether to block ingest or
    just surface in the UI.
    """
    findings: list[dict] = []
    entity_names = {(e.get("entity_name") or "").strip() for e in entities}

    for inst in instruments:
        name = inst.get("instrument_name") or "(unnamed)"
        level = (inst.get("entity_level") or "").lower()

        if not level:
            findings.append({
                "severity": "warn",
                "message": f"Instrument '{name}' has no entity_level assigned.",
                "subject": name,
            })

        if level in ("majority_holdco", "minority_holdco"):
            own = inst.get("ownership_pct")
            if own is None or own == 100:
                findings.append({
                    "severity": "warn",
                    "message": (
                        f"Instrument '{name}' sits at {level} — expected "
                        f"ownership_pct < 100 but got {own}."
                    ),
                    "subject": name,
                })

        ent_name = (inst.get("entity_name") or "").strip()
        if ent_name and ent_name not in entity_names:
            findings.append({
                "severity": "warn",
                "message": (
                    f"Instrument '{name}' references entity '{ent_name}' "
                    "which is not in Tab 7 (Corporate Entities)."
                ),
                "subject": name,
            })

    # Pari-passu consistency
    groups: dict[str, list[dict]] = {}
    for inst in instruments:
        grp = (inst.get("pari_passu_group") or "").strip()
        if grp:
            groups.setdefault(grp, []).append(inst)
    for grp, group_insts in groups.items():
        ranks = {i.get("cashflow_priority_rank") for i in group_insts}
        ranks.discard(None)
        if len(ranks) > 1:
            findings.append({
                "severity": "error",
                "message": (
                    f"Pari-passu group '{grp}' has inconsistent "
                    f"cashflow_priority_rank values: {sorted(ranks)}."
                ),
                "subject": grp,
            })

    # HoldCo-at-rank-1 sanity check
    has_opco_external = any(
        (i.get("entity_level") or "").lower() == "opco" and _is_external_debt(i)
        for i in instruments
    )
    if has_opco_external:
        for inst in instruments:
            level = (inst.get("entity_level") or "").lower()
            if level in ("holdco", "majority_holdco") and inst.get("cashflow_priority_rank") == 1:
                findings.append({
                    "severity": "error",
                    "message": (
                        f"Instrument '{inst.get('instrument_name')}' is at "
                        f"{level} but ranked 1 while OpCo-level debt exists."
                    ),
                    "subject": inst.get("instrument_name") or "(unnamed)",
                })

    return findings


# ════════════════════════════════════════════════════════════════════════════
# Capital Stack feature (Phase 3) — walked stack, metrics, change-of-control
# ════════════════════════════════════════════════════════════════════════════
#
# The Capital Stack takes the v8 taxonomy on instruments and entities, an
# Enterprise Value anchor from Tab 1 Valuation & Equity, and produces:
#
#   1. A tiered "layer" walk from the senior-most debt up to the residual
#      equity, with totals and our-holding columns on each layer.
#   2. Parallel claims — pledged-share debts that sit outside the consolidated
#      chain (e.g. NAV facilities secured only on one shareholder's stake).
#   3. Leverage metrics in two lenses (per user decision #3):
#        (a) CTA-consolidated headline — in-perimeter debt / EV (and / EBITDA
#            when EBITDA is known)
#        (b) Grossed-up consolidated-equivalent — adds parallel claims at
#            gross-up factor 1 / pledged_share_pct to reflect the economic
#            distribution-coverage burden.
#   4. Our-position summary: where we sit in the waterfall and what sits
#      below us.
#   5. Change-of-control coverage on any pledged-share debt (amber > 30%,
#      red > 50%, per user decision #5).
#   6. Validation warnings (missing EV, stale valuation date, etc.).
#
# Per user decision #4, the stack is LINEAR. Two separate claims via different
# legal vehicles would be recorded as two separate deals in the platform.


def gross_up_facility(
    instrument: dict,
    debtor_ownership_pct: Optional[float] = None,
) -> dict:
    """Compute the grossed-up consolidated-equivalent of a pledged-share debt.

    When a debt is secured on a partial shareholding (e.g. an NAV facility on a
    49.99% stake), it has to be serviced out of that shareholder's slice of
    distributions only. Economically, the operating company has to distribute
    1/pledged_share_pct × more to service £1 of this debt than it would for a
    common MidCo debt of the same size.

    Formula:  gross_up_factor = 1 / (pledged_share_pct / 100)  =  100 / pct
              equivalent_debt = face_value × gross_up_factor

    Returns ``{"gross_up_factor": float, "equivalent_debt": float}``. For
    normal (non-pledged) debt, gross_up_factor = 1.0.
    """
    face = float(instrument.get("drawn_amount") or 0)
    pledged_pct = instrument.get("pledged_share_pct")
    if pledged_pct is None:
        pledged_pct = debtor_ownership_pct
    if pledged_pct is None or pledged_pct <= 0 or pledged_pct >= 100:
        return {"gross_up_factor": 1.0, "equivalent_debt": face}
    gross_up = 100.0 / float(pledged_pct)
    return {"gross_up_factor": round(gross_up, 4), "equivalent_debt": face * gross_up}


def compute_attributable_equity(
    instruments: list[dict],
    ev: float,
) -> list[dict]:
    """Build the rank-ordered layer walk from the asset up to residual equity.

    Groups in-perimeter debt by cashflow_priority_rank. Starting from EV,
    subtracts each rank's debt total in ascending rank order (rank 1 first).
    The residual after the final rank is the equity attributable to the top
    of the chain.

    Pledged-share debts (parallel claims) are excluded from this walk.
    Shareholder / intercompany loans (rank=None) are ignored here — they sit
    at the top of the chain with the residual equity.

    Returns a list of layer dicts, each:
      {rank, entity_level, entity_name, debt_total, debt_our,
       instrument_count, instruments, inherited_value, residual_after_debt}
    """
    main = [
        i for i in instruments
        if not i.get("pledged_share_pct")
        and i.get("cashflow_priority_rank") is not None
    ]
    ranks_map: dict[int, list[dict]] = {}
    for i in main:
        r = int(i["cashflow_priority_rank"])
        ranks_map.setdefault(r, []).append(i)

    layers: list[dict] = []
    current_value = float(ev or 0)
    for rank in sorted(ranks_map.keys()):
        group = ranks_map[rank]
        debt_total = sum(float(i.get("drawn_amount") or 0) for i in group)
        debt_our = sum(float(i.get("our_holding") or 0) for i in group)
        # Canonical entity for display: most common (entity_level, entity_name)
        cnt = Counter(
            ((i.get("entity_level") or "").lower(), i.get("entity_name") or "")
            for i in group
        )
        canonical_level, canonical_name = cnt.most_common(1)[0][0]
        inherited = current_value
        residual = inherited - debt_total
        layers.append({
            "rank": rank,
            "entity_level": canonical_level,
            "entity_name": canonical_name,
            "debt_total": debt_total,
            "debt_our": debt_our,
            "instrument_count": len(group),
            "instruments": group,
            "inherited_value": inherited,
            "residual_after_debt": residual,
        })
        current_value = residual

    return layers


def build_metrics(
    instruments: list[dict],
    ev: float,
    ebitda: Optional[float] = None,
) -> dict:
    """Compute the two leverage lenses (per user decision #3).

    - CTA-consolidated headline: sum of in-perimeter debt (ignoring
      pledged-share parallel claims).
    - Grossed-up consolidated-equivalent: CTA headline + Σ grossed-up face
      of each parallel claim.

    Ratios (LTV and leverage) are produced for both lenses where inputs are
    available. EBITDA is optional — when null, leverage ratios are omitted.
    """
    senior_debt = 0.0
    consolidated_debt = 0.0
    parallel_gu_total = 0.0

    for inst in instruments:
        face = float(inst.get("drawn_amount") or 0)
        rank = inst.get("cashflow_priority_rank")
        pledged = inst.get("pledged_share_pct")

        if pledged:
            gu = gross_up_facility(inst)
            parallel_gu_total += gu["equivalent_debt"]
            continue

        if rank is not None:
            consolidated_debt += face
        if rank == 1:
            senior_debt += face

    grossed_up_total = consolidated_debt + parallel_gu_total

    def pct(num, den):
        if not den:
            return None
        return round((num / den) * 100, 1)

    def ratio(num, den):
        if not den:
            return None
        return round(num / den, 2)

    return {
        "senior_debt_total": round(senior_debt, 2),
        "consolidated_debt_total": round(consolidated_debt, 2),
        "parallel_claims_grossed_up": round(parallel_gu_total, 2),
        "grossed_up_equivalent_debt": round(grossed_up_total, 2),
        "senior_ltv_pct": pct(senior_debt, ev),
        "consolidated_ltv_pct": pct(consolidated_debt, ev),
        "grossed_up_equivalent_ltv_pct": pct(grossed_up_total, ev),
        "consolidated_leverage_x": ratio(consolidated_debt, ebitda),
        "grossed_up_equivalent_leverage_x": ratio(grossed_up_total, ebitda),
    }


def change_of_control_coverage(
    instrument: dict,
    equity_value_at_pledge_level: float,
) -> Optional[dict]:
    """Compute the LTV on a pledged shareholding for a shareholder-level debt.

    Applies only when the instrument has ``pledged_share_pct`` populated.
    The pledged value is the portion of equity attributable to the pledged
    share at the entity level where the pledge bites (typically the OpCo
    residual equity × pledged_share_pct).

    Thresholds (per user decision #5):
        green    LTV ≤ 30%
        amber    30% < LTV ≤ 50%
        red      LTV > 50%

    Returns None if no pledge is set or the inputs are insufficient.
    """
    pledged_pct = instrument.get("pledged_share_pct")
    if not pledged_pct or pledged_pct <= 0:
        return None
    face = float(instrument.get("drawn_amount") or 0)
    if face <= 0 or equity_value_at_pledge_level <= 0:
        return None
    pledged_value = equity_value_at_pledge_level * (float(pledged_pct) / 100.0)
    if pledged_value <= 0:
        return None
    ltv = (face / pledged_value) * 100
    if ltv > 50:
        status = "red"
    elif ltv > 30:
        status = "amber"
    else:
        status = "green"
    gu = gross_up_facility(instrument)
    return {
        "instrument_name": instrument.get("instrument_name"),
        "debtor_entity": instrument.get("entity_name"),
        "pledged_share_entity": instrument.get("pledged_share_entity"),
        "pledged_share_pct": float(pledged_pct),
        "face_value": face,
        "pledged_value": round(pledged_value, 2),
        "ltv_on_pledge_pct": round(ltv, 1),
        "status": status,
        "gross_up_factor": gu["gross_up_factor"],
        "grossed_up_equivalent": round(gu["equivalent_debt"], 2),
    }


def validate_capital_stack(
    deal: dict,
    instruments: list[dict],
    entities: list[dict],
    today: Optional[_date] = None,
) -> list[dict]:
    """Extend v8 validate_capital_structure with Capital Stack-specific checks.

    - Missing Enterprise Value on the deal → warn.
    - Valuation date > 12 months old → warn (stale).
    - Shareholder-level debt with no pledged_share_pct → warn.
    - Shareholder-level debt with no pledged_share_entity → warn.
    """
    findings = list(validate_capital_structure(instruments, entities))

    ev = deal.get("enterprise_value")
    try:
        ev_num = float(ev) if ev is not None else 0
    except (ValueError, TypeError):
        ev_num = 0
    if ev_num <= 0:
        findings.append({
            "severity": "warn",
            "message": (
                "Deal has no Enterprise Value — capital stack cannot compute "
                "LTV or equity cushion. Populate Tab 1 VALUATION & EQUITY."
            ),
            "subject": deal.get("slug") or deal.get("name") or "deal",
        })

    val_date = deal.get("valuation_date")
    if val_date:
        try:
            d = val_date if isinstance(val_date, _date) else _date.fromisoformat(str(val_date))
            today = today or _date.today()
            age_days = (today - d).days
            if age_days > 365:
                findings.append({
                    "severity": "warn",
                    "message": (
                        f"Valuation date is {age_days} days old (> 12 months) — "
                        "consider refreshing the Enterprise Value."
                    ),
                    "subject": deal.get("slug") or "deal",
                })
        except Exception:
            pass

    for inst in instruments:
        if inst.get("pledged_share_entity") and not inst.get("pledged_share_pct"):
            findings.append({
                "severity": "warn",
                "message": (
                    f"Instrument '{inst.get('instrument_name')}' has a "
                    "pledged_share_entity but no pledged_share_pct — "
                    "grossed-up leverage cannot be computed."
                ),
                "subject": inst.get("instrument_name") or "(unnamed)",
            })
        if inst.get("pledged_share_pct") and not inst.get("pledged_share_entity"):
            findings.append({
                "severity": "warn",
                "message": (
                    f"Instrument '{inst.get('instrument_name')}' has a "
                    "pledged_share_pct but no pledged_share_entity — cannot "
                    "identify which stake secures the debt."
                ),
                "subject": inst.get("instrument_name") or "(unnamed)",
            })

    return findings


def build_capital_stack(
    deal: dict,
    instruments: list[dict],
    entities: list[dict],
    ev: Optional[float] = None,
    ebitda: Optional[float] = None,
) -> dict:
    """Build the full capital stack view for a deal.

    Top-level helper combining rank assignment, layer walk, metrics, parallel
    claims, change-of-control, our-position summary, and validation.

    Parameters
    ----------
    deal : dict
        Must contain at least slug, name, currency, enterprise_value,
        valuation_date, valuation_method, valuation_entity.
    instruments : list[dict]
        Capital structure instruments from the deal (with v8/v9 taxonomy
        fields populated).
    entities : list[dict]
        Corporate entities for the deal (Tab 7 with v8 fields).
    ev : float, optional
        Enterprise Value override. Defaults to deal.enterprise_value.
    ebitda : float, optional
        Current EBITDA for leverage ratios. Optional — leverage omitted if
        not supplied.

    Returns
    -------
    dict
        StackView dict suitable for JSON serialisation by the API layer.
    """
    if ev is None:
        ev = float(deal.get("enterprise_value") or 0)

    # Ensure ranks are populated (manual overrides respected)
    assign_cashflow_priority_ranks(instruments)

    layers = compute_attributable_equity(instruments, ev)
    residual_equity = layers[-1]["residual_after_debt"] if layers else ev

    parallel_claims = []
    coc_list = []
    opco_equity = layers[0]["residual_after_debt"] if layers else ev
    for inst in instruments:
        if inst.get("pledged_share_pct"):
            gu = gross_up_facility(inst)
            parallel_claims.append({
                "instrument_name": inst.get("instrument_name"),
                "debtor_entity": inst.get("entity_name"),
                "pledged_share_entity": inst.get("pledged_share_entity"),
                "pledged_share_pct": float(inst.get("pledged_share_pct")),
                "face_value": float(inst.get("drawn_amount") or 0),
                "our_holding": float(inst.get("our_holding") or 0),
                "gross_up_factor": gu["gross_up_factor"],
                "grossed_up_equivalent": round(gu["equivalent_debt"], 2),
            })
            coc = change_of_control_coverage(inst, opco_equity)
            if coc:
                coc_list.append(coc)

    metrics = build_metrics(instruments, ev, ebitda)

    # Our position summary
    our_inst = [i for i in instruments if float(i.get("our_holding") or 0) > 0]
    our_total = sum(float(i.get("our_holding") or 0) for i in our_inst)
    our_ranks = sorted({
        i.get("cashflow_priority_rank") for i in our_inst
        if i.get("cashflow_priority_rank") is not None
    })
    dominant_rank = our_ranks[0] if our_ranks else None
    our_position = {
        "total_holding": round(our_total, 2),
        "dominant_rank": dominant_rank,
        "all_ranks_held": our_ranks,
        "instrument_count": len(our_inst),
        "pledged_share_exposure": sum(
            float(i.get("our_holding") or 0)
            for i in our_inst
            if i.get("pledged_share_pct")
        ),
    }
    if dominant_rank is not None:
        senior_to_us = sum(
            float(i.get("drawn_amount") or 0)
            for i in instruments
            if not i.get("pledged_share_pct")
            and i.get("cashflow_priority_rank") is not None
            and i.get("cashflow_priority_rank") < dominant_rank
        )
        pari_at_rank_total = sum(
            float(i.get("drawn_amount") or 0)
            for i in instruments
            if not i.get("pledged_share_pct")
            and i.get("cashflow_priority_rank") == dominant_rank
        )
        our_at_rank = sum(
            float(i.get("our_holding") or 0)
            for i in instruments
            if i.get("cashflow_priority_rank") == dominant_rank
        )
        subordinated = sum(
            float(i.get("drawn_amount") or 0)
            for i in instruments
            if not i.get("pledged_share_pct")
            and i.get("cashflow_priority_rank") is not None
            and i.get("cashflow_priority_rank") > dominant_rank
        )
        our_position.update({
            "debt_senior_to_us": round(senior_to_us, 2),
            "pari_passu_with_us_ex_our": round(pari_at_rank_total - our_at_rank, 2),
            "subordinated_cushion": round(subordinated, 2),
            "true_equity_cushion": round(residual_equity, 2),
            "total_cushion_below_us": round(subordinated + residual_equity, 2),
        })

    warnings = validate_capital_stack(deal, instruments, entities)

    return {
        "deal_slug": deal.get("slug"),
        "deal_name": deal.get("name"),
        "currency": deal.get("currency"),
        "valuation": {
            "enterprise_value": ev,
            "date": deal.get("valuation_date"),
            "method": deal.get("valuation_method"),
            "entity": deal.get("valuation_entity"),
        },
        "layers": [
            {
                "rank": lyr["rank"],
                "entity_level": lyr["entity_level"],
                "entity_name": lyr["entity_name"],
                "debt_total": round(lyr["debt_total"], 2),
                "debt_our": round(lyr["debt_our"], 2),
                "instrument_count": lyr["instrument_count"],
                "inherited_value": round(lyr["inherited_value"], 2),
                "residual_after_debt": round(lyr["residual_after_debt"], 2),
            }
            for lyr in layers
        ],
        "residual_equity": round(residual_equity, 2),
        "parallel_claims": parallel_claims,
        "metrics": metrics,
        "our_position": our_position,
        "change_of_control": coc_list,
        "warnings": warnings,
    }
