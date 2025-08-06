# GA4 Drill-Down Analytics Setup

## Overview
This setup adds drill-down analytics capabilities to your GA4 data, allowing you to analyze performance by:
- Campaign
- Medium  
- Channel Grouping
- First User Source

## Setup Instructions

### 1. Create the Views on Supabase

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `GA4_DRILLDOWN_VIEWS.sql`
4. Paste and run it in the SQL editor
5. You should see a success message and a row count for each view

### 2. Verify the Views

Run this query to check that all views were created successfully:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'ga4_by_%';
```

You should see:
- `ga4_by_campaign`
- `ga4_by_medium`
- `ga4_by_channel`
- `ga4_by_first_source`

### 3. Access the New Dashboard

Navigate to `/analytics/drilldown` in your application to access the new drill-down analytics dashboard.

## Features

### Campaign Analysis
- View performance metrics by campaign name
- Track sessions, conversions, and engagement rates
- Compare week-over-week performance

### Medium Analysis
- Analyze traffic sources by medium (organic, cpc, email, etc.)
- Identify top-performing channels
- Monitor conversion rates by medium

### Channel Grouping
- Default Google Analytics channel groupings
- Comprehensive performance metrics
- Easy comparison across channels

### First User Source
- Track original acquisition sources
- Understand user journey from first touchpoint
- Measure long-term value by source

## Metrics Available

Each drill-down view includes:
- **Total Sessions**: Number of sessions
- **Engaged Sessions**: Sessions with engagement
- **New Users**: First-time visitors
- **Average Session Duration**: Time spent on site
- **Demo Submits**: Number of demo form submissions
- **Signups**: Number of user signups
- **Conversion Rates**: Calculated percentages for demos and signups

## Troubleshooting

If you encounter issues:

1. **No data showing**: Ensure your `ga4_events` and `ga4_sessions` tables have data
2. **Permission errors**: Run the GRANT statements in the SQL file
3. **View not found**: Re-run the CREATE VIEW statements

## Testing

To test with sample data:

```sql
-- Insert sample session data
INSERT INTO public.ga4_sessions (
  week_start, 
  session_campaign_name,
  session_source,
  session_medium,
  session_keyword,
  session_default_channel_grouping,
  first_user_source,
  sessions,
  engaged_sessions,
  new_users,
  average_session_duration,
  active_users
) VALUES 
  ('2024-01-01', 'summer_sale', 'google', 'cpc', 'shoes', 'Paid Search', 'google', 100, 80, 30, 180, 90),
  ('2024-01-01', 'email_blast', 'newsletter', 'email', '', 'Email', 'newsletter', 50, 45, 10, 240, 48);

-- Insert sample event data
INSERT INTO public.ga4_events (
  week_start,
  event_name,
  session_default_channel_grouping,
  session_source,
  session_medium,
  session_campaign_name,
  session_keyword,
  first_user_source,
  event_count
) VALUES
  ('2024-01-01', 'demo_submit', 'Paid Search', 'google', 'cpc', 'summer_sale', 'shoes', 'google', 5),
  ('2024-01-01', 'vf_signup', 'Email', 'newsletter', 'email', 'email_blast', '', 'newsletter', 3);
```