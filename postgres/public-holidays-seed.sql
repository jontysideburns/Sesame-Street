-- Public holidays seed data for 7 jurisdictions (2024-2030)
-- Generated automatically. DO NOT EDIT BY HAND.

CREATE TABLE IF NOT EXISTS public_holidays (
    id              SERIAL PRIMARY KEY,
    jurisdiction    TEXT NOT NULL,
    holiday_date    DATE NOT NULL,
    holiday_name    TEXT NOT NULL,
    UNIQUE(jurisdiction, holiday_date)
);

-- =============================================================================
-- GB -- United Kingdom (England & Wales)
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-03-29', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-04-01', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-05-06', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-05-27', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-08-26', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2024-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-04-18', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-04-21', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-05-05', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-05-26', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-08-25', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2025-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-04-03', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-04-06', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-05-04', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-05-25', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-08-31', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2026-12-28', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-03-26', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-03-29', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-05-03', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-05-31', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-08-30', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-12-27', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2027-12-28', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-01-03', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-04-14', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-04-17', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-05-01', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-05-29', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-08-28', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2028-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-03-30', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-04-02', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-05-07', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-05-28', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-08-27', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2029-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-04-19', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-04-22', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-05-06', 'Early May Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-05-27', 'Spring Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-08-26', 'Summer Bank Holiday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('GB', '2030-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- US -- United States (Federal)
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-01-15', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-02-19', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-05-27', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-07-04', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-09-02', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-10-14', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-11-11', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-11-28', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-01-20', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-02-17', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-05-26', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-07-04', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-09-01', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-10-13', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-11-11', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-11-27', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-01-19', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-02-16', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-05-25', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-07-03', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-09-07', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-10-12', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-11-11', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-11-26', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-01-18', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-02-15', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-05-31', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-06-18', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-07-05', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-09-06', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-10-11', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-11-11', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-11-25', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-12-24', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2027-12-31', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-01-17', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-02-21', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-05-29', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-07-04', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-09-04', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-10-09', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-11-10', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-11-23', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-01-15', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-02-19', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-05-28', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-07-04', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-09-03', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-10-08', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-11-12', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-11-22', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-01-21', 'Martin Luther King Jr. Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-02-18', 'Presidents'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-05-27', 'Memorial Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-06-19', 'Juneteenth') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-07-04', 'Independence Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-09-02', 'Labor Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-10-14', 'Columbus Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-11-11', 'Veterans Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-11-28', 'Thanksgiving Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('US', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- FR -- France
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-04-01', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-05-09', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-05-20', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-04-21', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-05-29', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-06-09', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-04-06', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-05-14', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-05-25', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-03-29', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-05-06', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-05-17', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2027-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-04-17', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-05-25', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-06-05', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-04-02', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-05-10', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-05-21', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-04-22', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-05-08', 'Victory in Europe Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-05-30', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-06-10', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-07-14', 'Bastille Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-11-11', 'Armistice Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('FR', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- DE -- Germany
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-03-29', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-04-01', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-05-09', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-05-20', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2024-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-04-18', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-04-21', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-05-29', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-06-09', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2025-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-04-03', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-04-06', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-05-14', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-05-25', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2026-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-03-26', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-03-29', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-05-06', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-05-17', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2027-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-04-14', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-04-17', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-05-25', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-06-05', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2028-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-03-30', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-04-02', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-05-10', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-05-21', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2029-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-04-19', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-04-22', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-05-30', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-06-10', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-10-03', 'Day of German Unity') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('DE', '2030-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- NL -- Netherlands
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-03-29', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-04-01', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-05-09', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-05-20', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2024-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-04-18', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-04-21', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-04-26', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-05-29', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-06-09', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2025-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-04-03', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-04-06', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-05-14', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-05-25', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2026-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-03-26', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-03-29', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-05-06', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-05-17', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2027-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-04-14', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-04-17', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-05-25', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-06-05', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2028-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-03-30', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-04-02', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-05-10', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-05-21', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2029-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-04-19', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-04-22', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-04-27', 'King''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-05-05', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-05-30', 'Ascension Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-06-10', 'Whit Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('NL', '2030-12-26', 'Boxing Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- IT -- Italy
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-04-01', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2024-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-04-21', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2025-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-04-06', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2026-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-03-29', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2027-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-04-17', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2028-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-04-02', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2029-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-04-22', 'Easter Monday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-04-25', 'Liberation Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-06-02', 'Republic Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('IT', '2030-12-26', 'St Stephen''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- ES -- Spain
-- =============================================================================

-- 2024
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-03-29', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2024-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2025
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-04-18', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2025-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2026
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-04-03', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2026-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2027
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-03-26', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2027-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2028
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-04-14', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2028-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2029
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-03-30', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2029-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- 2030
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-01-01', 'New Year''s Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-01-06', 'Epiphany') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-04-19', 'Good Friday') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-05-01', 'Labour Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-08-15', 'Assumption of Mary') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-10-12', 'National Day of Spain') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-11-01', 'All Saints'' Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-12-06', 'Constitution Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-12-08', 'Immaculate Conception') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;
INSERT INTO public_holidays (jurisdiction, holiday_date, holiday_name) VALUES ('ES', '2030-12-25', 'Christmas Day') ON CONFLICT (jurisdiction, holiday_date) DO NOTHING;

-- =============================================================================
-- Summary
-- =============================================================================
SELECT jurisdiction, COUNT(*) AS holiday_count
FROM public_holidays
GROUP BY jurisdiction
ORDER BY jurisdiction;
