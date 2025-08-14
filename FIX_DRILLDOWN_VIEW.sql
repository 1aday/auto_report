-- =====================================================
-- FIX: Create public.weekly_breakdown view for drill-down analysis
-- Run this in your Supabase SQL Editor
-- =====================================================

-- First, check if analytics.weekly_breakdown exists
SELECT 
  'Checking analytics.weekly_breakdown' as step,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'analytics' 
    AND table_name = 'weekly_breakdown'
  ) as exists;

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.weekly_breakdown CASCADE;

-- Create public view that mirrors analytics.weekly_breakdown
CREATE VIEW public.weekly_breakdown AS
SELECT 
  week_start,
  session_source,
  session_medium,
  session_campaign_name,
  session_keyword,
  session_default_channel_grouping,
  first_user_source,
  sessions,
  demo_submit,
  vf_signup,
  vf_customer_conversion
FROM analytics.weekly_breakdown;

-- Grant permissions for the view
GRANT SELECT ON public.weekly_breakdown TO anon, authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.weekly_breakdown IS 'Public view of analytics.weekly_breakdown for drill-down analysis by campaign, source, channel, and first user source';

-- Verify the view was created and has data
SELECT 
  'View created successfully!' as status,
  COUNT(*) as total_rows,
  COUNT(DISTINCT week_start) as unique_weeks,
  COUNT(DISTINCT session_campaign_name) as unique_campaigns,
  COUNT(DISTINCT session_source) as unique_sources,
  COUNT(DISTINCT session_default_channel_grouping) as unique_channels,
  COUNT(DISTINCT first_user_source) as unique_first_sources,
  MIN(week_start) as earliest_week,
  MAX(week_start) as latest_week
FROM public.weekly_breakdown;

-- Show sample data
SELECT * FROM public.weekly_breakdown 
ORDER BY week_start DESC 
LIMIT 5;