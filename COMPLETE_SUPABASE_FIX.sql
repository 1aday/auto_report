-- =====================================================
-- COMPLETE SUPABASE FIX FOR GA4 DASHBOARDS
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- It will check for and create all necessary views
-- =====================================================

-- STEP 1: CHECK EXISTING DATA
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Starting complete Supabase fix...';
  RAISE NOTICE '====================================';
END $$;

-- Check if we have data in ga4_events
SELECT 
    'CHECK: ga4_events table' as step,
    COUNT(*) as total_records,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start)::text as earliest_week,
    MAX(week_start)::text as latest_week
FROM public.ga4_events;

-- Check if we have data in ga4_sessions
SELECT 
    'CHECK: ga4_sessions table' as step,
    COUNT(*) as total_records,
    COUNT(DISTINCT week_start) as unique_weeks,
    MIN(week_start)::text as earliest_week,
    MAX(week_start)::text as latest_week
FROM public.ga4_sessions;

-- STEP 2: CREATE ANALYTICS SCHEMA IF NOT EXISTS
-- =====================================================
CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO anon, authenticated;

-- STEP 3: CREATE OR REPLACE MATERIALIZED VIEWS IN ANALYTICS SCHEMA
-- =====================================================
-- Check if weekly_breakdown exists, if not create a simple one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'analytics' AND matviewname = 'weekly_breakdown'
  ) THEN
    -- Create a basic weekly_breakdown from ga4_sessions and ga4_events
    EXECUTE '
    CREATE MATERIALIZED VIEW analytics.weekly_breakdown AS
    WITH sessions_agg AS (
      SELECT 
        week_start,
        session_source,
        session_medium,
        session_campaign_name,
        session_keyword,
        session_default_channel_grouping,
        first_user_source,
        SUM(sessions) as sessions,
        SUM(engaged_sessions) as engaged_sessions,
        SUM(new_users) as new_users
      FROM public.ga4_sessions
      GROUP BY 1,2,3,4,5,6,7
    ),
    events_agg AS (
      SELECT 
        week_start,
        session_source,
        session_medium,
        session_campaign_name,
        session_keyword,
        session_default_channel_grouping,
        first_user_source,
        SUM(CASE WHEN event_name = ''demo_submit'' THEN event_count ELSE 0 END) as demo_submit,
        SUM(CASE WHEN event_name = ''vf_signup'' THEN event_count ELSE 0 END) as vf_signup,
        SUM(CASE WHEN event_name = ''vf_customer_conversion'' THEN event_count ELSE 0 END) as vf_customer_conversion
      FROM public.ga4_events
      GROUP BY 1,2,3,4,5,6,7
    )
    SELECT 
      COALESCE(s.week_start, e.week_start) as week_start,
      COALESCE(s.session_source, e.session_source) as session_source,
      COALESCE(s.session_medium, e.session_medium) as session_medium,
      COALESCE(s.session_campaign_name, e.session_campaign_name) as session_campaign_name,
      COALESCE(s.session_keyword, e.session_keyword) as session_keyword,
      COALESCE(s.session_default_channel_grouping, e.session_default_channel_grouping) as session_default_channel_grouping,
      COALESCE(s.first_user_source, e.first_user_source) as first_user_source,
      COALESCE(s.sessions, 0) as sessions,
      COALESCE(e.demo_submit, 0) as demo_submit,
      COALESCE(e.vf_signup, 0) as vf_signup,
      COALESCE(e.vf_customer_conversion, 0) as vf_customer_conversion
    FROM sessions_agg s
    FULL OUTER JOIN events_agg e 
      ON s.week_start = e.week_start
      AND s.session_source = e.session_source
      AND s.session_medium = e.session_medium
      AND s.session_campaign_name = e.session_campaign_name
      AND s.session_keyword = e.session_keyword
      AND s.session_default_channel_grouping = e.session_default_channel_grouping
      AND s.first_user_source = e.first_user_source
    ';
    
    CREATE INDEX idx_weekly_breakdown_week ON analytics.weekly_breakdown(week_start);
    RAISE NOTICE ''Created analytics.weekly_breakdown materialized view'';
  END IF;
END $$;

-- Create or replace wk_totals
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_totals CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_totals AS
SELECT
  week_start,
  SUM(sessions) AS sessions,
  SUM(demo_submit) AS demo_submit,
  SUM(vf_signup) AS vf_signup,
  SUM(vf_customer_conversion) AS vf_customer_conversion
FROM analytics.weekly_breakdown
GROUP BY week_start;

CREATE UNIQUE INDEX wk_totals_pk ON analytics.wk_totals(week_start);

-- Create or replace wk_by_channel
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_channel CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_channel AS
SELECT
  week_start,
  session_default_channel_grouping AS channel,
  SUM(sessions) AS sessions,
  SUM(demo_submit) AS demo_submit,
  SUM(vf_signup) AS vf_signup,
  SUM(vf_customer_conversion) AS vf_customer_conversion
FROM analytics.weekly_breakdown
GROUP BY week_start, session_default_channel_grouping;

CREATE UNIQUE INDEX wk_by_channel_pk ON analytics.wk_by_channel(week_start, channel);

-- Create or replace wk_by_src_med
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_src_med CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_src_med AS
SELECT
  week_start,
  session_source AS src,
  session_medium AS med,
  SUM(sessions) AS sessions,
  SUM(demo_submit) AS demo_submit,
  SUM(vf_signup) AS vf_signup,
  SUM(vf_customer_conversion) AS vf_customer_conversion
FROM analytics.weekly_breakdown
GROUP BY week_start, session_source, session_medium;

CREATE UNIQUE INDEX wk_by_src_med_pk ON analytics.wk_by_src_med(week_start, src, med);

-- Create or replace wk_by_campaign
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_campaign CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_campaign AS
SELECT
  week_start,
  session_source AS src,
  session_medium AS med,
  session_campaign_name AS camp,
  session_keyword AS kw,
  first_user_source AS first_src,
  SUM(sessions) AS sessions,
  SUM(demo_submit) AS demo_submit,
  SUM(vf_signup) AS vf_signup,
  SUM(vf_customer_conversion) AS vf_customer_conversion
FROM analytics.weekly_breakdown
GROUP BY week_start, session_source, session_medium, session_campaign_name, session_keyword, first_user_source;

CREATE UNIQUE INDEX wk_by_campaign_pk ON analytics.wk_by_campaign(week_start, src, med, camp, kw, first_src);

-- Refresh all materialized views
REFRESH MATERIALIZED VIEW analytics.wk_totals;
REFRESH MATERIALIZED VIEW analytics.wk_by_channel;
REFRESH MATERIALIZED VIEW analytics.wk_by_src_med;
REFRESH MATERIALIZED VIEW analytics.wk_by_campaign;

-- STEP 4: CREATE PUBLIC VIEWS WITH CALCULATIONS
-- =====================================================
-- Drop existing public views if they exist
DROP VIEW IF EXISTS public.wk_totals CASCADE;
DROP VIEW IF EXISTS public.wk_by_channel CASCADE;
DROP VIEW IF EXISTS public.wk_by_src_med CASCADE;
DROP VIEW IF EXISTS public.wk_by_campaign CASCADE;

-- Create public.wk_totals with all calculations
CREATE VIEW public.wk_totals AS
WITH calculations AS (
  SELECT 
    week_start,
    sessions,
    demo_submit,
    vf_signup,
    LAG(sessions, 1) OVER (ORDER BY week_start) AS prev_sessions,
    LAG(demo_submit, 1) OVER (ORDER BY week_start) AS prev_demos,
    LAG(vf_signup, 1) OVER (ORDER BY week_start) AS prev_signups,
    AVG(sessions) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_sessions_4w,
    AVG(demo_submit) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_demos_4w,
    AVG(vf_signup) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_signups_4w,
    AVG(sessions) OVER (ORDER BY week_start ROWS BETWEEN 12 PRECEDING AND 1 PRECEDING) AS avg_sessions_12w,
    AVG(demo_submit) OVER (ORDER BY week_start ROWS BETWEEN 12 PRECEDING AND 1 PRECEDING) AS avg_demos_12w,
    AVG(vf_signup) OVER (ORDER BY week_start ROWS BETWEEN 12 PRECEDING AND 1 PRECEDING) AS avg_signups_12w
  FROM analytics.wk_totals
)
SELECT 
  week_start,
  sessions,
  demo_submit,
  vf_signup,
  sessions - prev_sessions AS sessions_vs_prev,
  CASE 
    WHEN prev_sessions > 0 THEN ROUND(((sessions - prev_sessions)::numeric / prev_sessions) * 100, 1)
    ELSE NULL 
  END AS sessions_vs_prev_pct,
  CASE 
    WHEN avg_sessions_4w > 0 THEN ROUND(((sessions - avg_sessions_4w)::numeric / avg_sessions_4w) * 100, 1)
    ELSE NULL 
  END AS sessions_vs_4w_pct,
  CASE 
    WHEN avg_sessions_12w > 0 THEN ROUND(((sessions - avg_sessions_12w)::numeric / avg_sessions_12w) * 100, 1)
    ELSE NULL 
  END AS sessions_vs_12w_pct,
  demo_submit - prev_demos AS demo_submit_vs_prev,
  CASE 
    WHEN prev_demos > 0 THEN ROUND(((demo_submit - prev_demos)::numeric / prev_demos) * 100, 1)
    ELSE NULL 
  END AS demo_submit_vs_prev_pct,
  CASE 
    WHEN avg_demos_4w > 0 THEN ROUND(((demo_submit - avg_demos_4w)::numeric / avg_demos_4w) * 100, 1)
    ELSE NULL 
  END AS demo_submit_vs_4w_pct,
  CASE 
    WHEN avg_demos_12w > 0 THEN ROUND(((demo_submit - avg_demos_12w)::numeric / avg_demos_12w) * 100, 1)
    ELSE NULL 
  END AS demo_submit_vs_12w_pct,
  vf_signup - prev_signups AS vf_signup_vs_prev,
  CASE 
    WHEN prev_signups > 0 THEN ROUND(((vf_signup - prev_signups)::numeric / prev_signups) * 100, 1)
    ELSE NULL 
  END AS vf_signup_vs_prev_pct,
  CASE 
    WHEN avg_signups_4w > 0 THEN ROUND(((vf_signup - avg_signups_4w)::numeric / avg_signups_4w) * 100, 1)
    ELSE NULL 
  END AS vf_signup_vs_4w_pct,
  CASE 
    WHEN avg_signups_12w > 0 THEN ROUND(((vf_signup - avg_signups_12w)::numeric / avg_signups_12w) * 100, 1)
    ELSE NULL 
  END AS vf_signup_vs_12w_pct
FROM calculations;

-- Create other public views as pass-through
CREATE VIEW public.wk_by_channel AS SELECT * FROM analytics.wk_by_channel;
CREATE VIEW public.wk_by_src_med AS SELECT * FROM analytics.wk_by_src_med;
CREATE VIEW public.wk_by_campaign AS SELECT * FROM analytics.wk_by_campaign;

-- STEP 5: CREATE DRILL-DOWN VIEWS FOR GA4 ANALYTICS
-- =====================================================
DROP VIEW IF EXISTS public.ga4_by_campaign CASCADE;
DROP VIEW IF EXISTS public.ga4_by_medium CASCADE;
DROP VIEW IF EXISTS public.ga4_by_channel CASCADE;
DROP VIEW IF EXISTS public.ga4_by_first_source CASCADE;

-- By Campaign
CREATE VIEW public.ga4_by_campaign AS
SELECT
    gs.week_start,
    gs.session_campaign_name AS campaign,
    SUM(gs.sessions) AS total_sessions,
    SUM(gs.engaged_sessions) AS engaged_sessions,
    SUM(gs.new_users) AS new_users,
    AVG(gs.average_session_duration) AS avg_session_duration,
    SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END) AS demo_submits,
    SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END) AS signups,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS demo_conversion_rate,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS signup_conversion_rate
FROM
    public.ga4_sessions gs
LEFT JOIN
    public.ga4_events ge ON gs.week_start = ge.week_start
    AND gs.session_campaign_name = ge.session_campaign_name
    AND gs.session_source = ge.session_source
    AND gs.session_medium = ge.session_medium
GROUP BY
    gs.week_start,
    gs.session_campaign_name
ORDER BY
    gs.week_start DESC, total_sessions DESC;

-- By Medium
CREATE VIEW public.ga4_by_medium AS
SELECT
    gs.week_start,
    gs.session_medium AS medium,
    SUM(gs.sessions) AS total_sessions,
    SUM(gs.engaged_sessions) AS engaged_sessions,
    SUM(gs.new_users) AS new_users,
    AVG(gs.average_session_duration) AS avg_session_duration,
    SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END) AS demo_submits,
    SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END) AS signups,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS demo_conversion_rate,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS signup_conversion_rate
FROM
    public.ga4_sessions gs
LEFT JOIN
    public.ga4_events ge ON gs.week_start = ge.week_start
    AND gs.session_medium = ge.session_medium
GROUP BY
    gs.week_start,
    gs.session_medium
ORDER BY
    gs.week_start DESC, total_sessions DESC;

-- By Channel
CREATE VIEW public.ga4_by_channel AS
SELECT
    gs.week_start,
    gs.session_default_channel_grouping AS channel,
    SUM(gs.sessions) AS total_sessions,
    SUM(gs.engaged_sessions) AS engaged_sessions,
    SUM(gs.new_users) AS new_users,
    AVG(gs.average_session_duration) AS avg_session_duration,
    SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END) AS demo_submits,
    SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END) AS signups,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS demo_conversion_rate,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS signup_conversion_rate
FROM
    public.ga4_sessions gs
LEFT JOIN
    public.ga4_events ge ON gs.week_start = ge.week_start
    AND gs.session_default_channel_grouping = ge.session_default_channel_grouping
GROUP BY
    gs.week_start,
    gs.session_default_channel_grouping
ORDER BY
    gs.week_start DESC, total_sessions DESC;

-- By First Source
CREATE VIEW public.ga4_by_first_source AS
SELECT
    gs.week_start,
    gs.first_user_source AS first_source,
    SUM(gs.sessions) AS total_sessions,
    SUM(gs.engaged_sessions) AS engaged_sessions,
    SUM(gs.new_users) AS new_users,
    AVG(gs.average_session_duration) AS avg_session_duration,
    SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END) AS demo_submits,
    SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END) AS signups,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'demo_submit' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS demo_conversion_rate,
    CASE 
        WHEN SUM(gs.sessions) > 0 
        THEN (SUM(CASE WHEN ge.event_name = 'vf_signup' THEN ge.event_count ELSE 0 END)::numeric / SUM(gs.sessions)) * 100
        ELSE 0
    END AS signup_conversion_rate
FROM
    public.ga4_sessions gs
LEFT JOIN
    public.ga4_events ge ON gs.week_start = ge.week_start
    AND gs.first_user_source = ge.first_user_source
GROUP BY
    gs.week_start,
    gs.first_user_source
ORDER BY
    gs.week_start DESC, total_sessions DESC;

-- STEP 6: GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;

-- STEP 7: VERIFY EVERYTHING WORKS
-- =====================================================
-- Check public.wk_totals
SELECT 
    'VERIFY: public.wk_totals' as check_name,
    COUNT(*) as total_weeks,
    MIN(week_start)::text as earliest_week,
    MAX(week_start)::text as latest_week
FROM public.wk_totals;

-- Check drill-down views
SELECT 
    'VERIFY: ga4_by_campaign' as check_name,
    COUNT(DISTINCT week_start) as unique_weeks,
    COUNT(*) as total_rows
FROM public.ga4_by_campaign;

SELECT 
    'VERIFY: ga4_by_medium' as check_name,
    COUNT(DISTINCT week_start) as unique_weeks,
    COUNT(*) as total_rows
FROM public.ga4_by_medium;

SELECT 
    'VERIFY: ga4_by_channel' as check_name,
    COUNT(DISTINCT week_start) as unique_weeks,
    COUNT(*) as total_rows
FROM public.ga4_by_channel;

SELECT 
    'VERIFY: ga4_by_first_source' as check_name,
    COUNT(DISTINCT week_start) as unique_weeks,
    COUNT(*) as total_rows
FROM public.ga4_by_first_source;

-- Final check - sample data from wk_totals with calculations
SELECT 
    week_start,
    sessions,
    sessions_vs_prev_pct,
    demo_submit,
    demo_submit_vs_prev_pct,
    vf_signup,
    vf_signup_vs_prev_pct
FROM public.wk_totals
ORDER BY week_start DESC
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'COMPLETE! All views have been created/updated.';
  RAISE NOTICE 'Your dashboards should now show ALL available data.';
  RAISE NOTICE '';
  RAISE NOTICE 'Check the results above to verify:';
  RAISE NOTICE '1. All views have data';
  RAISE NOTICE '2. Week ranges match your expectations';
  RAISE NOTICE '3. Calculations are working (see _pct columns)';
  RAISE NOTICE '====================================';
END $$;