-- =====================================================
-- CHECK DATA AVAILABILITY IN GA4 TABLES
-- =====================================================
-- Run these queries to see how much data you have available
-- =====================================================

-- 1. Check total weeks of data in ga4_events
SELECT 
  'ga4_events' as table_name,
  COUNT(DISTINCT week_start) as total_weeks,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week,
  COUNT(*) as total_records
FROM public.ga4_events;

-- 2. Check total weeks of data in ga4_sessions
SELECT 
  'ga4_sessions' as table_name,
  COUNT(DISTINCT week_start) as total_weeks,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week,
  COUNT(*) as total_records
FROM public.ga4_sessions;

-- 3. Check weekly breakdown if exists
SELECT 
  'weekly_breakdown' as table_name,
  COUNT(DISTINCT week_start) as total_weeks,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week,
  COUNT(*) as total_records
FROM analytics.weekly_breakdown
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'analytics' 
  AND table_name = 'weekly_breakdown'
);

-- 4. Check wk_totals materialized view
SELECT 
  'wk_totals' as view_name,
  COUNT(*) as total_weeks,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM analytics.wk_totals
WHERE EXISTS (
  SELECT 1 
  FROM pg_matviews 
  WHERE schemaname = 'analytics' 
  AND matviewname = 'wk_totals'
);

-- 5. Week-by-week record count to see data distribution
SELECT 
  week_start,
  COUNT(*) as records_per_week,
  COUNT(DISTINCT event_name) as unique_events,
  SUM(event_count) as total_events
FROM public.ga4_events
GROUP BY week_start
ORDER BY week_start DESC;

-- 6. Check if public views exist and have data
SELECT 
  'public.ga4_by_campaign' as view_name,
  COUNT(DISTINCT week_start) as total_weeks,
  COUNT(*) as total_records
FROM public.ga4_by_campaign
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'ga4_by_campaign'
)
UNION ALL
SELECT 
  'public.ga4_by_medium',
  COUNT(DISTINCT week_start),
  COUNT(*)
FROM public.ga4_by_medium
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'ga4_by_medium'
)
UNION ALL
SELECT 
  'public.ga4_by_channel',
  COUNT(DISTINCT week_start),
  COUNT(*)
FROM public.ga4_by_channel
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'ga4_by_channel'
)
UNION ALL
SELECT 
  'public.ga4_by_first_source',
  COUNT(DISTINCT week_start),
  COUNT(*)
FROM public.ga4_by_first_source
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'ga4_by_first_source'
);

-- 7. Check data gaps - find missing weeks
WITH week_series AS (
  SELECT generate_series(
    (SELECT MIN(week_start) FROM public.ga4_events),
    (SELECT MAX(week_start) FROM public.ga4_events),
    '7 days'::interval
  )::date as week
),
actual_weeks AS (
  SELECT DISTINCT week_start FROM public.ga4_events
)
SELECT 
  ws.week as missing_week
FROM week_series ws
LEFT JOIN actual_weeks aw ON ws.week = aw.week_start
WHERE aw.week_start IS NULL
ORDER BY ws.week;

-- 8. Summary statistics
SELECT 
  'Summary Statistics' as report,
  (SELECT COUNT(DISTINCT week_start) FROM public.ga4_events) as total_weeks_events,
  (SELECT COUNT(DISTINCT week_start) FROM public.ga4_sessions) as total_weeks_sessions,
  (SELECT MIN(week_start) FROM public.ga4_events) as earliest_date,
  (SELECT MAX(week_start) FROM public.ga4_events) as latest_date,
  (SELECT COUNT(*) FROM public.ga4_events) as total_event_records,
  (SELECT COUNT(*) FROM public.ga4_sessions) as total_session_records;