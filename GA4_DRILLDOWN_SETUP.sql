/* ===========================================================
   GA-4 WEEKLY DRILL-DOWNS – the lean way
   ===========================================================

We already have `analytics.weekly_breakdown` (7-dim raw aggregate).

👉  We do NOT need four permanent tables + IDs + RLS + timestamps.
    The data is fully derived, so the natural choice is
    four MATERIALISED VIEWS ― lighter, self-refreshing,
    zero risk of drift.

    1. analytics.wk_totals         (site-wide KPIs)
    2. analytics.wk_by_channel     (adds channel)
    3. analytics.wk_by_src_med     (source × medium)
    4. analytics.wk_by_campaign    (src + med + camp + kw + first-src)

Run the DDL below **once**.  Then schedule a nightly
`REFRESH MATERIALIZED VIEW`.  Cursor / Supabase REST can
read the views directly – no RLS hoops.

After the DDL you'll see quick row-count checks so you know
the views exist and have data.
================================================================ */

CREATE SCHEMA IF NOT EXISTS analytics;

/* 0 ────────────────────────────────── SITE-WIDE TOTALS */
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_totals CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_totals AS
SELECT
  week_start,
  SUM(sessions)     AS sessions,
  SUM(demo_submit)  AS demo_submit,
  SUM(vf_signup)    AS vf_signup
FROM analytics.weekly_breakdown
GROUP BY 1;
CREATE UNIQUE INDEX wk_totals_pk ON analytics.wk_totals(week_start);

/* 1 ──────────────────────────────── BY CHANNEL GROUPING */
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_channel CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_channel AS
SELECT
  week_start,
  session_default_channel_grouping AS channel,
  SUM(sessions)     AS sessions,
  SUM(demo_submit)  AS demo_submit,
  SUM(vf_signup)    AS vf_signup
FROM analytics.weekly_breakdown
GROUP BY 1,2;
CREATE UNIQUE INDEX wk_by_channel_pk
  ON analytics.wk_by_channel(week_start, channel);

/* 2 ──────────────────────────────── SOURCE × MEDIUM */
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_src_med CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_src_med AS
SELECT
  week_start,
  session_source AS src,
  session_medium AS med,
  SUM(sessions)     AS sessions,
  SUM(demo_submit)  AS demo_submit,
  SUM(vf_signup)    AS vf_signup
FROM analytics.weekly_breakdown
GROUP BY 1,2,3;
CREATE UNIQUE INDEX wk_by_src_med_pk
  ON analytics.wk_by_src_med(week_start, src, med);

/* 3 ─────────────────── CAMPAIGN + KW + FIRST-TOUCH SRC */
DROP MATERIALIZED VIEW IF EXISTS analytics.wk_by_campaign CASCADE;
CREATE MATERIALIZED VIEW analytics.wk_by_campaign AS
SELECT
  week_start,
  session_source        AS src,
  session_medium        AS med,
  session_campaign_name AS camp,
  session_keyword       AS kw,
  first_user_source     AS first_src,
  SUM(sessions)     AS sessions,
  SUM(demo_submit)  AS demo_submit,
  SUM(vf_signup)    AS vf_signup
FROM analytics.weekly_breakdown
GROUP BY 1,2,3,4,5,6;
CREATE UNIQUE INDEX wk_by_campaign_pk
  ON analytics.wk_by_campaign(week_start, src, med, camp, kw, first_src);

/* ───────────────────────────── initial refresh */
REFRESH MATERIALIZED VIEW analytics.wk_totals;
REFRESH MATERIALIZED VIEW analytics.wk_by_channel;
REFRESH MATERIALIZED VIEW analytics.wk_by_src_med;
REFRESH MATERIALIZED VIEW analytics.wk_by_campaign;

/* ───────────────────────────── sanity check */
SELECT 'wk_totals'      AS view, COUNT(*) FROM analytics.wk_totals
UNION ALL
SELECT 'wk_by_channel', COUNT(*) FROM analytics.wk_by_channel
UNION ALL
SELECT 'wk_by_src_med', COUNT(*) FROM analytics.wk_by_src_med
UNION ALL
SELECT 'wk_by_campaign', COUNT(*) FROM analytics.wk_by_campaign;

/* ===========================================================
   Notes for Cursor / Next.js
   -----------------------------------------------------------
   • No ID columns, no timestamps: data is derived + immutable.
   • No RLS needed – these are read-only aggregates.
   • Client can query:
       SELECT * FROM analytics.wk_by_src_med ORDER BY week_start DESC;
   • Add nightly cron:
       REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.wk_totals;
       … (repeat for the other three)
   • If you really must keep permanent tables, create them as
     logical replicas of the views (`INSERT INTO tbl SELECT * FROM view`),
     but that's redundant 99 % of the time.
============================================================= */

/* ===========================================================
   OPTIONAL: Scheduled refresh using pg_cron (if available)
   -----------------------------------------------------------
   If your Supabase instance has pg_cron enabled, you can
   schedule automatic refreshes:
   
   SELECT cron.schedule(
     'refresh-analytics-views',
     '0 2 * * *',  -- Daily at 2 AM
     $$
       REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.wk_totals;
       REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.wk_by_channel;
       REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.wk_by_src_med;
       REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.wk_by_campaign;
     $$
   );
============================================================= */