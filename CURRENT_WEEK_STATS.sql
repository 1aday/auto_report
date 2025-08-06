-- Get current week's stats (sessions, vf_signups, demo_submits)
-- Run this in Supabase SQL Editor

-- Option 1: Get the latest week's data (most recent week_start)
WITH latest_week AS (
  SELECT MAX(week_start) as current_week
  FROM ga4_sessions
)
SELECT 
  lw.current_week,
  -- Format week display
  'Week ' || EXTRACT(WEEK FROM lw.current_week) || ' (' || 
  TO_CHAR(lw.current_week, 'Mon DD') || ' - ' || 
  TO_CHAR(lw.current_week + INTERVAL '6 days', 'Mon DD') || ')' AS week_display,
  
  -- Sessions count (sum of all sessions for the week)
  COALESCE(s.total_sessions, 0) AS sessions,
  
  -- VF Signups count
  COALESCE(vf.total_signups, 0) AS vf_signups,
  
  -- Demo Submissions count
  COALESCE(d.total_demos, 0) AS demo_submits,
  
  -- Conversion rates
  CASE 
    WHEN COALESCE(s.total_sessions, 0) > 0 
    THEN ROUND((COALESCE(vf.total_signups, 0)::DECIMAL / s.total_sessions) * 100, 2)
    ELSE 0
  END AS signup_conversion_rate,
  
  CASE 
    WHEN COALESCE(s.total_sessions, 0) > 0 
    THEN ROUND((COALESCE(d.total_demos, 0)::DECIMAL / s.total_sessions) * 100, 2)
    ELSE 0
  END AS demo_conversion_rate

FROM latest_week lw
LEFT JOIN (
  -- Sum all sessions for the week
  SELECT 
    week_start,
    SUM(sessions) as total_sessions
  FROM ga4_sessions
  GROUP BY week_start
) s ON s.week_start = lw.current_week
LEFT JOIN (
  -- Count VF signups
  SELECT 
    week_start,
    SUM(event_count) as total_signups
  FROM ga4_events
  WHERE event_name = 'vf_signup'
  GROUP BY week_start
) vf ON vf.week_start = lw.current_week
LEFT JOIN (
  -- Count Demo submissions
  SELECT 
    week_start,
    SUM(event_count) as total_demos
  FROM ga4_events
  WHERE event_name = 'demo_submit'
  GROUP BY week_start
) d ON d.week_start = lw.current_week;

-- =====================================================
-- Option 2: Get ALL weeks with running totals
-- =====================================================
SELECT 
  week_start,
  'W' || LPAD(EXTRACT(WEEK FROM week_start)::TEXT, 2, '0') || 
  ' (' || TO_CHAR(week_start, 'Mon DD - ') || 
  TO_CHAR(week_start + INTERVAL '6 days', 'Mon DD') || ')' AS week,
  
  -- Metrics for each week
  sessions,
  vf_signups,
  demo_submits,
  
  -- Conversion rates
  ROUND((vf_signups::DECIMAL / NULLIF(sessions, 0)) * 100, 2) AS signup_conv_pct,
  ROUND((demo_submits::DECIMAL / NULLIF(sessions, 0)) * 100, 2) AS demo_conv_pct,
  
  -- Running totals
  SUM(sessions) OVER (ORDER BY week_start) AS cumulative_sessions,
  SUM(vf_signups) OVER (ORDER BY week_start) AS cumulative_signups,
  SUM(demo_submits) OVER (ORDER BY week_start) AS cumulative_demos

FROM (
  SELECT 
    COALESCE(s.week_start, e.week_start) AS week_start,
    COALESCE(s.session_count, 0) AS sessions,
    COALESCE(e.vf_signup_count, 0) AS vf_signups,
    COALESCE(e.demo_submit_count, 0) AS demo_submits
  FROM (
    -- Sessions by week
    SELECT 
      week_start,
      SUM(sessions) as session_count
    FROM ga4_sessions
    GROUP BY week_start
  ) s
  FULL OUTER JOIN (
    -- Events by week
    SELECT 
      week_start,
      SUM(CASE WHEN event_name = 'vf_signup' THEN event_count ELSE 0 END) as vf_signup_count,
      SUM(CASE WHEN event_name = 'demo_submit' THEN event_count ELSE 0 END) as demo_submit_count
    FROM ga4_events
    WHERE event_name IN ('vf_signup', 'demo_submit')
    GROUP BY week_start
  ) e ON s.week_start = e.week_start
) combined
ORDER BY week_start DESC;

-- =====================================================
-- Option 3: Quick check - just the numbers for latest week
-- =====================================================
SELECT 
  (SELECT SUM(sessions) FROM ga4_sessions WHERE week_start = (SELECT MAX(week_start) FROM ga4_sessions)) as sessions_this_week,
  (SELECT SUM(event_count) FROM ga4_events WHERE event_name = 'vf_signup' AND week_start = (SELECT MAX(week_start) FROM ga4_events)) as vf_signups_this_week,
  (SELECT SUM(event_count) FROM ga4_events WHERE event_name = 'demo_submit' AND week_start = (SELECT MAX(week_start) FROM ga4_events)) as demos_this_week;

-- =====================================================
-- Option 4: Compare this week vs last week
-- =====================================================
WITH weeks AS (
  SELECT DISTINCT week_start 
  FROM ga4_sessions 
  ORDER BY week_start DESC 
  LIMIT 2
)
SELECT 
  CASE 
    WHEN week_start = (SELECT MAX(week_start) FROM weeks) THEN 'This Week'
    ELSE 'Last Week'
  END as period,
  week_start,
  COALESCE(SUM(s.sessions), 0) as sessions,
  COALESCE(SUM(CASE WHEN e.event_name = 'vf_signup' THEN e.event_count END), 0) as vf_signups,
  COALESCE(SUM(CASE WHEN e.event_name = 'demo_submit' THEN e.event_count END), 0) as demo_submits
FROM weeks w
LEFT JOIN ga4_sessions s ON s.week_start = w.week_start
LEFT JOIN ga4_events e ON e.week_start = w.week_start 
  AND e.event_name IN ('vf_signup', 'demo_submit')
GROUP BY w.week_start
ORDER BY w.week_start DESC;