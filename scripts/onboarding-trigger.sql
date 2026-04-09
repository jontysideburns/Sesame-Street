CREATE OR REPLACE FUNCTION enforce_onboarding_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_current = FALSE THEN
        RAISE EXCEPTION 'deal_onboarding_snapshot % is superseded and immutable', OLD.id;
    END IF;

    IF NEW.snapshot_date IS DISTINCT FROM OLD.snapshot_date
       OR NEW.snapshot_number IS DISTINCT FROM OLD.snapshot_number
       OR NEW.snapshot_reason IS DISTINCT FROM OLD.snapshot_reason
       OR NEW.tail_years_at_onboarding IS DISTINCT FROM OLD.tail_years_at_onboarding
       OR NEW.tail_classification_at_onboarding IS DISTINCT FROM OLD.tail_classification_at_onboarding
       OR NEW.renewal_profile_at_onboarding IS DISTINCT FROM OLD.renewal_profile_at_onboarding
       OR NEW.debt_repayment_from_renewal_pct_at_onboarding IS DISTINCT FROM OLD.debt_repayment_from_renewal_pct_at_onboarding
       OR NEW.revenue_risk_code_at_onboarding IS DISTINCT FROM OLD.revenue_risk_code_at_onboarding
       OR NEW.concession_years_remaining_at_onboarding IS DISTINCT FROM OLD.concession_years_remaining_at_onboarding
       OR NEW.entry_leverage IS DISTINCT FROM OLD.entry_leverage
       OR NEW.entry_dscr_year_1 IS DISTINCT FROM OLD.entry_dscr_year_1
       OR NEW.entry_dscr_min_life IS DISTINCT FROM OLD.entry_dscr_min_life
       OR NEW.entry_llcr IS DISTINCT FROM OLD.entry_llcr
       OR NEW.entry_loan_life_years IS DISTINCT FROM OLD.entry_loan_life_years
       OR NEW.entry_wal_years IS DISTINCT FROM OLD.entry_wal_years
       OR NEW.lender_case_dscr_min IS DISTINCT FROM OLD.lender_case_dscr_min
       OR NEW.lender_case_leverage_peak IS DISTINCT FROM OLD.lender_case_leverage_peak
       OR NEW.stress_break_even_pct IS DISTINCT FROM OLD.stress_break_even_pct
       OR NEW.stress_cases_tested IS DISTINCT FROM OLD.stress_cases_tested
       OR NEW.ic_memo_date IS DISTINCT FROM OLD.ic_memo_date
       OR NEW.ic_memo_reference IS DISTINCT FROM OLD.ic_memo_reference
       OR NEW.ic_approved_by IS DISTINCT FROM OLD.ic_approved_by
       OR NEW.ic_approval_conditions IS DISTINCT FROM OLD.ic_approval_conditions
       OR NEW.ic_vote_margin IS DISTINCT FROM OLD.ic_vote_margin
       OR NEW.entry_all_in_margin_bps IS DISTINCT FROM OLD.entry_all_in_margin_bps
       OR NEW.entry_upfront_fees_bps IS DISTINCT FROM OLD.entry_upfront_fees_bps
       OR NEW.entry_secondary_purchase_price_pct IS DISTINCT FROM OLD.entry_secondary_purchase_price_pct
       OR NEW.entry_yield_to_maturity IS DISTINCT FROM OLD.entry_yield_to_maturity
       OR NEW.expected_hold_period_years IS DISTINCT FROM OLD.expected_hold_period_years
       OR NEW.exit_strategy IS DISTINCT FROM OLD.exit_strategy
       OR NEW.entry_risk_free_rate_bps IS DISTINCT FROM OLD.entry_risk_free_rate_bps
       OR NEW.entry_credit_spread_bps IS DISTINCT FROM OLD.entry_credit_spread_bps
       OR NEW.entry_relative_value_notes IS DISTINCT FROM OLD.entry_relative_value_notes
       OR NEW.initial_risk_score IS DISTINCT FROM OLD.initial_risk_score
       OR NEW.initial_grade IS DISTINCT FROM OLD.initial_grade
       OR NEW.critical_risks_at_onboarding IS DISTINCT FROM OLD.critical_risks_at_onboarding
       OR NEW.notes IS DISTINCT FROM OLD.notes
    THEN
        RAISE EXCEPTION 'Onboarding snapshot fields are write-once. Create a new snapshot (snapshot_number = %) instead of updating this one.', OLD.snapshot_number + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_snapshot_immutability ON deal_onboarding_snapshots;
CREATE TRIGGER trg_onboarding_snapshot_immutability
    BEFORE UPDATE ON deal_onboarding_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION enforce_onboarding_snapshot_immutability();
