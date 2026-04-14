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

from dataclasses import dataclass
from typing import Iterable


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
