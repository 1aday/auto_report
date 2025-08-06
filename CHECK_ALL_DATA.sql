-- =====================================================
-- CHECK ALL AVAILABLE DATA IN YOUR SUPABASE DATABASE
-- =====================================================
-- Run these queries in your Supabase SQL Editor to verify
-- how much data you have and if it's all accessible
-- =====================================================

-- 1. CHECK RAW DATA IN ga4_events
SELECT 
    'ga4_events' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week,
    DATE_PART('day', MAX(week_start) - MIN(week_start)) / 7 as weeks_span
FROM public.ga4_events;

-- 2. CHECK RAW DATA IN ga4_sessions  
SELECT 
    'ga4_sessions' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week,
    DATE_PART('day', MAX(week_start) - MIN(week_start)) / 7 as weeks_span
FROM public.ga4_sessions;

-- 3. CHECK IF analytics.weekly_breakdown EXISTS
SELECT 
    'analytics.weekly_breakdown' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week
FROM analytics.weekly_breakdown;

-- 4. CHECK IF analytics.wk_totals EXISTS
SELECT 
    'analytics.wk_totals' as view_name,
    COUNT(*) as total_rows,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week
FROM analytics.wk_totals;

-- 5. CHECK IF public.wk_totals VIEW EXISTS
SELECT 
    'public.wk_totals' as view_name,
    COUNT(*) as total_rows,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week
FROM public.wk_totals;

-- 6. CHECK DRILL-DOWN VIEWS
SELECT 
    'ga4_by_campaign' as view_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start) as earliest_week,
    MAX(week_start) as latest_week
FROM public.ga4_by_campaign;

-- 7. VERIFY WEEK DISTRIBUTION
SELECT 
    week_start,
    COUNT(*) as records_per_week
FROM public.ga4_events
GROUP BY week_start
ORDER BY week_start DESC;

-- 8. CHECK FOR DATA GAPS
WITH week_series AS (
    SELECT generate_series(
        (SELECT MIN(week_start) FROM public.ga4_events),
        (SELECT MAX(week_start) FROM public.ga4_events),
        '7 days'::interval
    )::date as expected_week
),
actual_weeks AS (
    SELECT DISTINCT week_start FROM public.ga4_events
)
SELECT 
    ws.expected_week as missing_week
FROM week_series ws
LEFT JOIN actual_weeks aw ON ws.expected_week = aw.week_start
WHERE aw.week_start IS NULL
ORDER BY ws.expected_week;

-- =====================================================
-- IF YOU SEE ERRORS:
-- =====================================================
-- 1. "relation does not exist" for analytics.* tables:
--    Run GA4_DRILLDOWN_SETUP.sql first
--
-- 2. "relation does not exist" for public.wk_totals:
--    Run CREATE_PUBLIC_VIEWS.sql
--
-- 3. "relation does not exist" for ga4_by_* views:
--    Run GA4_DRILLDOWN_VIEWS.sql
-- =====================================================