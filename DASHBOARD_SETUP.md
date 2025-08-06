# GA-4 Weekly KPI Dashboard Setup

## Overview
A stunning, Apple-inspired analytics dashboard with real-time data visualization, heat maps, and trend analysis. The dashboard displays weekly KPIs for Sessions, Demo Submissions, and Sign-ups with week-over-week, 4-week, and 12-week comparisons.

## Features
- **Beautiful Design**: Apple-level design aesthetics with smooth animations and transitions
- **Heat Map Visualization**: Color-coded percentage changes (green for positive, red for negative)
- **Interactive Charts**: Toggle between trend analysis and week-over-week comparisons
- **Responsive Layout**: Perfectly optimized for all screen sizes
- **Real-time Updates**: Auto-refresh every minute
- **Advanced Filtering**: Column filters, global search, and sorting
- **Dark Mode Support**: Fully themed for both light and dark modes

## Setup Instructions

### 1. Environment Configuration
Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

To get these values:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings > API
4. Copy the Project URL and anon/public key

### 2. Database Setup
Run this SQL in your Supabase SQL editor to create the required table:

```sql
-- Create the analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create the weekly totals table
CREATE TABLE IF NOT EXISTS analytics.wk_totals (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  
  -- Sessions metrics
  sessions INTEGER,
  sessions_vs_prev INTEGER,
  sessions_vs_prev_pct DECIMAL(5,2),
  sessions_vs_4w_avg INTEGER,
  sessions_vs_4w_avg_pct DECIMAL(5,2),
  sessions_vs_12w_avg INTEGER,
  sessions_vs_12w_avg_pct DECIMAL(5,2),
  
  -- Demo submit metrics
  demo_submit INTEGER,
  demo_submit_vs_prev INTEGER,
  demo_submit_vs_prev_pct DECIMAL(5,2),
  demo_submit_vs_4w_avg INTEGER,
  demo_submit_vs_4w_avg_pct DECIMAL(5,2),
  demo_submit_vs_12w_avg INTEGER,
  demo_submit_vs_12w_avg_pct DECIMAL(5,2),
  
  -- VF signup metrics
  vf_signup INTEGER,
  vf_signup_vs_prev INTEGER,
  vf_signup_vs_prev_pct DECIMAL(5,2),
  vf_signup_vs_4w_avg INTEGER,
  vf_signup_vs_4w_avg_pct DECIMAL(5,2),
  vf_signup_vs_12w_avg INTEGER,
  vf_signup_vs_12w_avg_pct DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on week_start for faster queries
CREATE INDEX idx_wk_totals_week_start ON analytics.wk_totals(week_start DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE analytics.wk_totals ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access (adjust as needed)
CREATE POLICY "Allow public read access" ON analytics.wk_totals
  FOR SELECT USING (true);
```

### 3. Accessing the Dashboard
Navigate to `/dashboard` in your application to view the GA-4 Weekly KPI Dashboard.

## Demo Mode
The dashboard automatically runs in demo mode with sample data when:
- Supabase is not configured
- The environment variables are not set
- There's an error connecting to the database

This allows you to preview the dashboard's functionality without setting up a database.

## Data Format
The dashboard expects data in the following format from the `analytics.wk_totals` table:

| Column | Type | Description |
|--------|------|-------------|
| week_start | DATE | Start date of the week |
| sessions | INTEGER | Total sessions for the week |
| sessions_vs_prev | INTEGER | Change vs previous week |
| sessions_vs_prev_pct | DECIMAL | Percentage change vs previous week |
| sessions_vs_4w_avg | INTEGER | Change vs 4-week average |
| sessions_vs_4w_avg_pct | DECIMAL | Percentage change vs 4-week average |
| sessions_vs_12w_avg | INTEGER | Change vs 12-week average |
| sessions_vs_12w_avg_pct | DECIMAL | Percentage change vs 12-week average |
| demo_submit | INTEGER | Total demo submissions |
| demo_submit_vs_* | ... | Similar metrics for demo submissions |
| vf_signup | INTEGER | Total VF sign-ups |
| vf_signup_vs_* | ... | Similar metrics for sign-ups |

## Customization

### Color Scheme
The dashboard uses your app's primary color (lime-green by default) defined in `globals.css`. The heat map colors are:
- **Positive changes**: Progressive green shades
- **Negative changes**: Progressive red shades
- **Neutral (0%)**: Light gray

### Refresh Rate
By default, the dashboard refreshes every 60 seconds. You can adjust this in the `useWeeklyKpiData` hook:

```typescript
refetchInterval: 60000, // Change this value (in milliseconds)
```

## Troubleshooting

### Connection Issues
If you see "Demo Mode Active":
1. Check your `.env.local` file has the correct Supabase credentials
2. Verify your Supabase project is active
3. Check the browser console for any error messages

### No Data Showing
If connected but no data appears:
1. Verify the `analytics.wk_totals` table exists
2. Check that the table contains data
3. Ensure RLS policies allow read access

### Performance
For optimal performance with large datasets:
1. Ensure the `idx_wk_totals_week_start` index exists
2. Consider materializing the view if calculations are complex
3. Limit the query to the most recent 26 weeks (6 months)

## Technology Stack
- **React 19** with Next.js 15
- **TanStack Table** for advanced data grid features
- **Recharts** for beautiful, responsive charts
- **Framer Motion** for smooth animations
- **Tailwind CSS** for styling
- **Supabase** for real-time database
- **TypeScript** for type safety

## License
This dashboard component is part of your application and follows your project's license.