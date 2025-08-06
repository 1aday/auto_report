# 🔍 Complete Data Fetching Fix for GA4 Dashboards

## The Issue
You have many weeks of data in `ga4_events` and `ga4_sessions` that aren't showing up in your dashboards.

## Quick Diagnosis

### 1. First, verify how much data you actually have:

Run this in your Supabase SQL Editor:

```sql
-- Check your actual data
SELECT 
    'ga4_events' as source,
    COUNT(DISTINCT week_start) as total_weeks,
    MIN(week_start) as first_week,
    MAX(week_start) as last_week
FROM public.ga4_events
UNION ALL
SELECT 
    'ga4_sessions' as source,
    COUNT(DISTINCT week_start) as total_weeks,
    MIN(week_start) as first_week,
    MAX(week_start) as last_week
FROM public.ga4_sessions;
```

## Solutions

### Solution 1: Ensure All Views Are Created

The dashboards use several views that need to exist. Run these SQL files in order:

1. **GA4_DRILLDOWN_VIEWS.sql** - Creates views for drill-down analytics
2. **CREATE_PUBLIC_VIEWS.sql** - Creates public views for KPI dashboard  

### Solution 2: Check Component Data Fetching

I've already removed limits from:
- ✅ `ga4-weekly-kpi-dashboard.tsx` - Removed `.limit(26)`
- ✅ `kpi-dashboard.tsx` - Already set to fetch all (`MAX_WEEKS: null`)
- ✅ `ga4-analytics-dashboard.tsx` - No database limit
- ✅ `ga4-drilldown-analytics.tsx` - No database limit

### Solution 3: Force Complete Data Refresh

If data still isn't showing, try these steps:

1. **Clear React Query Cache**: Add this temporary button to force refresh:

```tsx
// Add to any dashboard component temporarily
<button onClick={() => {
  queryClient.invalidateQueries();
  window.location.reload();
}}>
  Force Refresh All Data
</button>
```

2. **Check Browser Console**: Look for any errors about:
   - Missing tables/views
   - Permission issues
   - Data parsing errors

### Solution 4: Direct Database Query Test

Test if the views are working by running this in Supabase SQL Editor:

```sql
-- This is what your app is trying to fetch
SELECT * FROM public.wk_totals ORDER BY week_start DESC;
SELECT * FROM public.ga4_by_campaign ORDER BY week_start DESC LIMIT 5;
SELECT * FROM public.ga4_by_medium ORDER BY week_start DESC LIMIT 5;
```

## Common Issues & Fixes

### Issue 1: Views Don't Exist
**Error**: `relation "public.wk_totals" does not exist`
**Fix**: Run the SQL files mentioned above

### Issue 2: No Data in Views
**Error**: Views exist but return 0 rows
**Fix**: Check if source tables have data:
```sql
SELECT COUNT(*) FROM analytics.weekly_breakdown;
```

### Issue 3: Permissions
**Error**: `permission denied for table`
**Fix**: Grant permissions:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO anon, authenticated;
```

### Issue 4: Stale Data
**Fix**: Refresh materialized views:
```sql
REFRESH MATERIALIZED VIEW analytics.wk_totals;
REFRESH MATERIALIZED VIEW analytics.wk_by_channel;
REFRESH MATERIALIZED VIEW analytics.wk_by_src_med;
REFRESH MATERIALIZED VIEW analytics.wk_by_campaign;
```

## Verification

After fixing, verify all data is accessible:

1. Check the browser console for the log messages showing data counts
2. Look for messages like: `[Drill-Down: ga4_by_campaign] Fetched X records`
3. Verify the week count matches your expectations

## Still Not Working?

If data is still missing:

1. **Check RLS Policies**: 
```sql
-- Disable RLS temporarily to test
ALTER TABLE public.ga4_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga4_sessions DISABLE ROW LEVEL SECURITY;
```

2. **Check Connection**: Ensure your Supabase environment variables are correct in `.env.local`

3. **Check Data Format**: Ensure `week_start` dates are in the correct format (YYYY-MM-DD)

## Expected Result

After these fixes, your dashboards should show:
- ✅ ALL weeks from your `ga4_events` table
- ✅ ALL weeks from your `ga4_sessions` table  
- ✅ Complete historical data with no artificial limits
- ✅ Proper calculations for all time periods