-- Create public view for weekly_breakdown to enable drill-down analysis
-- This view allows the Supabase client to access the analytics.weekly_breakdown data

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

-- Verify the view was created
SELECT 
  'public.weekly_breakdown' as view_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT session_campaign_name) as unique_campaigns,
  COUNT(DISTINCT session_source) as unique_sources,
  COUNT(DISTINCT session_default_channel_grouping) as unique_channels,
  COUNT(DISTINCT first_user_source) as unique_first_sources
FROM public.weekly_breakdown;