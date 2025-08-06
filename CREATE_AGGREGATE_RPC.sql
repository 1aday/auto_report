-- Optional: Create an RPC function for server-side aggregation
-- This improves performance by aggregating data on the database side
-- Run this in your Supabase SQL editor if you want server-side aggregation

CREATE OR REPLACE FUNCTION public.aggregate_weekly_by_dimension(
  dimension_column text,
  dimension_value text
)
RETURNS TABLE (
  week_start date,
  sessions bigint,
  demo_submit bigint,
  vf_signup bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate dimension_column to prevent SQL injection
  IF dimension_column NOT IN (
    'session_campaign_name',
    'session_source', 
    'session_medium',
    'session_default_channel_grouping',
    'first_user_source'
  ) THEN
    RAISE EXCEPTION 'Invalid dimension column: %', dimension_column;
  END IF;

  -- Use dynamic SQL with proper escaping
  RETURN QUERY EXECUTE format(
    'SELECT 
      week_start,
      SUM(sessions)::bigint as sessions,
      SUM(demo_submit)::bigint as demo_submit,
      SUM(vf_signup)::bigint as vf_signup
    FROM public.weekly_breakdown
    WHERE %I = %L
    GROUP BY week_start
    ORDER BY week_start DESC',
    dimension_column,
    dimension_value
  );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.aggregate_weekly_by_dimension(text, text) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.aggregate_weekly_by_dimension(text, text) IS 
'Aggregates weekly metrics by a specific dimension value, summing across all other dimensions';