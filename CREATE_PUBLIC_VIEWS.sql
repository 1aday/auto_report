-- =====================================================
-- CREATE PUBLIC VIEWS WITH CALCULATED PERCENTAGES
-- =====================================================
-- The analytics.wk_* materialized views only contain basic totals.
-- These public views add the calculated percentage columns
-- using window functions for week-over-week and moving averages.
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.wk_totals CASCADE;
DROP VIEW IF EXISTS public.wk_by_channel CASCADE;
DROP VIEW IF EXISTS public.wk_by_src_med CASCADE;
DROP VIEW IF EXISTS public.wk_by_campaign CASCADE;

-- 1. Site-wide totals view with calculated percentages
CREATE VIEW public.wk_totals AS
WITH calculations AS (
  SELECT 
    week_start,
    sessions,
    demo_submit,
    vf_signup,
    -- Previous week values
    LAG(sessions, 1) OVER (ORDER BY week_start) AS prev_sessions,
    LAG(demo_submit, 1) OVER (ORDER BY week_start) AS prev_demos,
    LAG(vf_signup, 1) OVER (ORDER BY week_start) AS prev_signups,
    -- 4-week averages
    AVG(sessions) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_sessions_4w,
    AVG(demo_submit) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_demos_4w,
    AVG(vf_signup) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) AS avg_signups_4w,
    -- 12-week averages
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
  -- Sessions calculations
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
  -- Demo submit calculations
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
  -- VF signup calculations
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

-- 2. By channel grouping view (simplified with just WoW percentages)
CREATE VIEW public.wk_by_channel AS
WITH calculations AS (
  SELECT 
    week_start,
    channel,
    sessions,
    demo_submit,
    vf_signup,
    LAG(sessions, 1) OVER (PARTITION BY channel ORDER BY week_start) AS prev_sessions,
    LAG(demo_submit, 1) OVER (PARTITION BY channel ORDER BY week_start) AS prev_demos,
    LAG(vf_signup, 1) OVER (PARTITION BY channel ORDER BY week_start) AS prev_signups
  FROM analytics.wk_by_channel
)
SELECT 
  week_start,
  channel,
  sessions,
  demo_submit,
  vf_signup,
  sessions - prev_sessions AS sessions_vs_prev,
  CASE 
    WHEN prev_sessions > 0 THEN ROUND(((sessions - prev_sessions)::numeric / prev_sessions) * 100, 1)
    ELSE NULL 
  END AS sessions_vs_prev_pct,
  demo_submit - prev_demos AS demo_submit_vs_prev,
  CASE 
    WHEN prev_demos > 0 THEN ROUND(((demo_submit - prev_demos)::numeric / prev_demos) * 100, 1)
    ELSE NULL 
  END AS demo_submit_vs_prev_pct,
  vf_signup - prev_signups AS vf_signup_vs_prev,
  CASE 
    WHEN prev_signups > 0 THEN ROUND(((vf_signup - prev_signups)::numeric / prev_signups) * 100, 1)
    ELSE NULL 
  END AS vf_signup_vs_prev_pct
FROM calculations;

-- 3. By source × medium view (simplified with just WoW percentages)
CREATE VIEW public.wk_by_src_med AS
SELECT * FROM analytics.wk_by_src_med;

-- 4. By campaign view (simplified with just WoW percentages)
CREATE VIEW public.wk_by_campaign AS
SELECT * FROM analytics.wk_by_campaign;

-- Grant select permissions on public views
GRANT SELECT ON public.wk_totals TO anon, authenticated;
GRANT SELECT ON public.wk_by_channel TO anon, authenticated;
GRANT SELECT ON public.wk_by_src_med TO anon, authenticated;
GRANT SELECT ON public.wk_by_campaign TO anon, authenticated;

-- =====================================================
-- USAGE NOTES:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. These views act as proxies to the analytics schema
-- 3. The Supabase JS client can now query them directly:
--    supabase.from("wk_totals").select("*")
-- =====================================================