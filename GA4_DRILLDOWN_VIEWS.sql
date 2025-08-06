-- =====================================================
-- GA4 DRILL-DOWN VIEWS FOR CAMPAIGN ANALYSIS
-- =====================================================
-- These views aggregate data by different dimensions for drill-down analysis
-- Run this SQL in your Supabase SQL editor
-- IMPORTANT: This fetches ALL available data with no limits
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.ga4_by_campaign CASCADE;
DROP VIEW IF EXISTS public.ga4_by_medium CASCADE;
DROP VIEW IF EXISTS public.ga4_by_channel CASCADE;
DROP VIEW IF EXISTS public.ga4_by_first_source CASCADE;

-- =====================================================
-- 1. BY CAMPAIGN VIEW
-- =====================================================
CREATE VIEW public.ga4_by_campaign AS
WITH campaign_sessions AS (
  SELECT 
    week_start,
    session_campaign_name as campaign,
    SUM(sessions) as total_sessions,
    SUM(engaged_sessions) as engaged_sessions,
    SUM(new_users) as new_users,
    AVG(average_session_duration) as avg_session_duration,
    SUM(active_users) as active_users
  FROM public.ga4_sessions
  GROUP BY week_start, session_campaign_name
),
campaign_events AS (
  SELECT 
    week_start,
    session_campaign_name as campaign,
    event_name,
    SUM(event_count) as event_count
  FROM public.ga4_events
  GROUP BY week_start, session_campaign_name, event_name
),
campaign_pivot AS (
  SELECT 
    week_start,
    campaign,
    SUM(CASE WHEN event_name = 'demo_submit' THEN event_count ELSE 0 END) as demo_submits,
    SUM(CASE WHEN event_name = 'vf_signup' THEN event_count ELSE 0 END) as signups,
    SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) as page_views
  FROM campaign_events
  GROUP BY week_start, campaign
)
SELECT 
  s.week_start,
  s.campaign,
  s.total_sessions,
  s.engaged_sessions,
  s.new_users,
  ROUND(s.avg_session_duration::numeric, 2) as avg_session_duration,
  s.active_users,
  COALESCE(e.demo_submits, 0) as demo_submits,
  COALESCE(e.signups, 0) as signups,
  COALESCE(e.page_views, 0) as page_views,
  -- Calculate conversion rates
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.demo_submits, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as demo_conversion_rate,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.signups, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as signup_conversion_rate
FROM campaign_sessions s
LEFT JOIN campaign_pivot e ON s.week_start = e.week_start AND s.campaign = e.campaign
ORDER BY s.week_start DESC, s.total_sessions DESC;

-- =====================================================
-- 2. BY MEDIUM VIEW
-- =====================================================
CREATE VIEW public.ga4_by_medium AS
WITH medium_sessions AS (
  SELECT 
    week_start,
    session_medium as medium,
    SUM(sessions) as total_sessions,
    SUM(engaged_sessions) as engaged_sessions,
    SUM(new_users) as new_users,
    AVG(average_session_duration) as avg_session_duration,
    SUM(active_users) as active_users
  FROM public.ga4_sessions
  GROUP BY week_start, session_medium
),
medium_events AS (
  SELECT 
    week_start,
    session_medium as medium,
    event_name,
    SUM(event_count) as event_count
  FROM public.ga4_events
  GROUP BY week_start, session_medium, event_name
),
medium_pivot AS (
  SELECT 
    week_start,
    medium,
    SUM(CASE WHEN event_name = 'demo_submit' THEN event_count ELSE 0 END) as demo_submits,
    SUM(CASE WHEN event_name = 'vf_signup' THEN event_count ELSE 0 END) as signups,
    SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) as page_views
  FROM medium_events
  GROUP BY week_start, medium
)
SELECT 
  s.week_start,
  s.medium,
  s.total_sessions,
  s.engaged_sessions,
  s.new_users,
  ROUND(s.avg_session_duration::numeric, 2) as avg_session_duration,
  s.active_users,
  COALESCE(e.demo_submits, 0) as demo_submits,
  COALESCE(e.signups, 0) as signups,
  COALESCE(e.page_views, 0) as page_views,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.demo_submits, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as demo_conversion_rate,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.signups, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as signup_conversion_rate
FROM medium_sessions s
LEFT JOIN medium_pivot e ON s.week_start = e.week_start AND s.medium = e.medium
ORDER BY s.week_start DESC, s.total_sessions DESC;

-- =====================================================
-- 3. BY CHANNEL GROUPING VIEW
-- =====================================================
CREATE VIEW public.ga4_by_channel AS
WITH channel_sessions AS (
  SELECT 
    week_start,
    session_default_channel_grouping as channel,
    SUM(sessions) as total_sessions,
    SUM(engaged_sessions) as engaged_sessions,
    SUM(new_users) as new_users,
    AVG(average_session_duration) as avg_session_duration,
    SUM(active_users) as active_users
  FROM public.ga4_sessions
  GROUP BY week_start, session_default_channel_grouping
),
channel_events AS (
  SELECT 
    week_start,
    session_default_channel_grouping as channel,
    event_name,
    SUM(event_count) as event_count
  FROM public.ga4_events
  GROUP BY week_start, session_default_channel_grouping, event_name
),
channel_pivot AS (
  SELECT 
    week_start,
    channel,
    SUM(CASE WHEN event_name = 'demo_submit' THEN event_count ELSE 0 END) as demo_submits,
    SUM(CASE WHEN event_name = 'vf_signup' THEN event_count ELSE 0 END) as signups,
    SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) as page_views
  FROM channel_events
  GROUP BY week_start, channel
)
SELECT 
  s.week_start,
  s.channel,
  s.total_sessions,
  s.engaged_sessions,
  s.new_users,
  ROUND(s.avg_session_duration::numeric, 2) as avg_session_duration,
  s.active_users,
  COALESCE(e.demo_submits, 0) as demo_submits,
  COALESCE(e.signups, 0) as signups,
  COALESCE(e.page_views, 0) as page_views,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.demo_submits, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as demo_conversion_rate,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.signups, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as signup_conversion_rate
FROM channel_sessions s
LEFT JOIN channel_pivot e ON s.week_start = e.week_start AND s.channel = e.channel
ORDER BY s.week_start DESC, s.total_sessions DESC;

-- =====================================================
-- 4. BY FIRST USER SOURCE VIEW
-- =====================================================
CREATE VIEW public.ga4_by_first_source AS
WITH source_sessions AS (
  SELECT 
    week_start,
    first_user_source as first_source,
    SUM(sessions) as total_sessions,
    SUM(engaged_sessions) as engaged_sessions,
    SUM(new_users) as new_users,
    AVG(average_session_duration) as avg_session_duration,
    SUM(active_users) as active_users
  FROM public.ga4_sessions
  GROUP BY week_start, first_user_source
),
source_events AS (
  SELECT 
    week_start,
    first_user_source as first_source,
    event_name,
    SUM(event_count) as event_count
  FROM public.ga4_events
  GROUP BY week_start, first_user_source, event_name
),
source_pivot AS (
  SELECT 
    week_start,
    first_source,
    SUM(CASE WHEN event_name = 'demo_submit' THEN event_count ELSE 0 END) as demo_submits,
    SUM(CASE WHEN event_name = 'vf_signup' THEN event_count ELSE 0 END) as signups,
    SUM(CASE WHEN event_name = 'page_view' THEN event_count ELSE 0 END) as page_views
  FROM source_events
  GROUP BY week_start, first_source
)
SELECT 
  s.week_start,
  s.first_source,
  s.total_sessions,
  s.engaged_sessions,
  s.new_users,
  ROUND(s.avg_session_duration::numeric, 2) as avg_session_duration,
  s.active_users,
  COALESCE(e.demo_submits, 0) as demo_submits,
  COALESCE(e.signups, 0) as signups,
  COALESCE(e.page_views, 0) as page_views,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.demo_submits, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as demo_conversion_rate,
  CASE 
    WHEN s.total_sessions > 0 
    THEN ROUND((COALESCE(e.signups, 0)::numeric / s.total_sessions) * 100, 2)
    ELSE 0 
  END as signup_conversion_rate
FROM source_sessions s
LEFT JOIN source_pivot e ON s.week_start = e.week_start AND s.first_source = e.first_source
ORDER BY s.week_start DESC, s.total_sessions DESC;

-- =====================================================
-- Grant permissions (if needed)
-- =====================================================
GRANT SELECT ON public.ga4_by_campaign TO anon, authenticated;
GRANT SELECT ON public.ga4_by_medium TO anon, authenticated;
GRANT SELECT ON public.ga4_by_channel TO anon, authenticated;
GRANT SELECT ON public.ga4_by_first_source TO anon, authenticated;

-- =====================================================
-- Verify views were created
-- =====================================================
SELECT 
  'ga4_by_campaign' as view_name, 
  COUNT(*) as row_count 
FROM public.ga4_by_campaign
UNION ALL
SELECT 
  'ga4_by_medium', 
  COUNT(*) 
FROM public.ga4_by_medium
UNION ALL
SELECT 
  'ga4_by_channel', 
  COUNT(*) 
FROM public.ga4_by_channel
UNION ALL
SELECT 
  'ga4_by_first_source', 
  COUNT(*) 
FROM public.ga4_by_first_source;