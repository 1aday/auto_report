"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Activity, Users, Target } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { StyledMetricCard } from "@/components/ui/metric-card"

interface WeeklyData {
  week_start: string
  sessions: number
  demo_submit: number
  vf_signup: number
  signup_conversion_rate: number
  demo_conversion_rate: number
  sessions_vs_prev_pct: number | null
  sessions_vs_4w_pct: number | null
  sessions_vs_12w_pct: number | null
  demo_submit_vs_prev_pct: number | null
  demo_submit_vs_4w_pct: number | null
  demo_submit_vs_12w_pct: number | null
  vf_signup_vs_prev_pct: number | null
  vf_signup_vs_4w_pct: number | null
  vf_signup_vs_12w_pct: number | null
}

// Fetch weekly data from public.wk_totals
const useWeeklyData = () => {
  return useQuery({
    queryKey: ["simplified-ga4-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_totals")
        .select(`
          week_start,
          sessions,
          demo_submit,
          vf_signup,
          signup_conversion_rate,
          demo_conversion_rate,
          sessions_vs_prev_pct,
          sessions_vs_4w_pct,
          sessions_vs_12w_pct,
          demo_submit_vs_prev_pct,
          demo_submit_vs_4w_pct,
          demo_submit_vs_12w_pct,
          vf_signup_vs_prev_pct,
          vf_signup_vs_4w_pct,
          vf_signup_vs_12w_pct
        `)
        .order("week_start", { ascending: false })

      if (error) throw error
      
      console.log(`[Simplified GA4] Fetched ${data?.length || 0} weeks of data`)
      return data as WeeklyData[]
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Format helpers
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toLocaleString()
}

const formatPercentage = (value: number | null) => {
  if (value === null || value === undefined) return "—"
  const formatted = value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`
  return formatted
}

// Get background heat map color for percentage
const getHeatMapBgColor = (value: number | null) => {
  if (value === null) return "transparent"
  const absValue = Math.abs(value)
  if (value > 0) {
    // Green shades for positive
    if (absValue > 20) return "rgba(34, 197, 94, 0.5)"
    if (absValue > 10) return "rgba(34, 197, 94, 0.4)"
    if (absValue > 5) return "rgba(34, 197, 94, 0.3)"
    return "rgba(34, 197, 94, 0.2)"
  } else if (value < 0) {
    // Red shades for negative
    if (absValue > 20) return "rgba(239, 68, 68, 0.5)"
    if (absValue > 10) return "rgba(239, 68, 68, 0.4)"
    if (absValue > 5) return "rgba(239, 68, 68, 0.3)"
    return "rgba(239, 68, 68, 0.2)"
  }
  return "transparent"
}



export function SimplifiedGA4Dashboard() {
  const { data, isLoading, error } = useWeeklyData()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Failed to load data</p>
        </CardContent>
      </Card>
    )
  }

  const latestWeek = data?.[0]
  const previousWeek = data?.[1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">GA4 Analytics Overview</h2>
        <p className="text-muted-foreground">
          Weekly performance metrics from Google Analytics 4
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StyledMetricCard
          title="Sessions"
          value={latestWeek?.sessions || 0}
          previousValue={previousWeek?.sessions}
          change={latestWeek?.sessions_vs_prev_pct || null}
          icon={Activity}
          color="primary"
        />
        <StyledMetricCard
          title="VF Signups"
          value={latestWeek?.vf_signup || 0}
          previousValue={previousWeek?.vf_signup}
          change={latestWeek?.vf_signup_vs_prev_pct || null}
          icon={Users}
          color="purple"
        />
        <StyledMetricCard
          title="Demo Submissions"
          value={latestWeek?.demo_submit || 0}
          previousValue={previousWeek?.demo_submit}
          change={latestWeek?.demo_submit_vs_prev_pct || null}
          icon={Target}
          color="blue"
        />
      </div>

      {/* Weekly table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Weekly Performance Details</CardTitle>
          <CardDescription className="text-xs">
            Comprehensive breakdown with week-over-week and moving average comparisons
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                {/* Header grouping row */}
                <tr className="border-b border-border/50">
                  <th className="px-3 py-1.5"></th>
                  <th colSpan={4} className="px-2 py-1.5 text-center bg-primary/5 border-x border-border/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Sessions</span>
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 text-center bg-purple-500/5 border-x border-border/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-500/80">Signups</span>
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 text-center bg-blue-500/5 border-x border-border/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500/80">Demos</span>
                  </th>
                  <th colSpan={2} className="px-2 py-1.5 text-center bg-emerald-500/5 border-r border-border/30">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500/80">Conversions</span>
                  </th>
                </tr>
                {/* Individual column headers */}
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-xs">Week</th>
                  {/* Sessions columns */}
                  <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">Sessions</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">WoW</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">4W</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">12W</th>
                  {/* Signups columns */}
                  <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">Signups</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">WoW</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">4W</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">12W</th>
                  {/* Demos columns */}
                  <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">Demos</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">WoW</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">4W</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">12W</th>
                  {/* Conversion columns */}
                  <th className="text-right px-2 py-2 font-medium text-xs bg-emerald-500/5">Signup %</th>
                  <th className="text-right px-2 py-2 font-medium text-xs bg-emerald-500/5">Demo %</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((week, index) => {
                  const weekDate = new Date(week.week_start)
                  const endDate = new Date(weekDate)
                  endDate.setDate(endDate.getDate() + 6)
                  
                  // Calculate ISO week number (Monday start)
                  const getISOWeek = (date: Date) => {
                    const d = new Date(date)
                    d.setHours(0, 0, 0, 0)
                    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
                    const yearStart = new Date(d.getFullYear(), 0, 1)
                    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
                    return weekNumber
                  }
                  const weekNumber = getISOWeek(weekDate)
                  
                  return (
                    <tr 
                      key={week.week_start}
                      className={cn(
                        "border-b border-border/30 transition-colors",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10",
                        index === 0 && "bg-primary/8"
                      )}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-base font-semibold tabular-nums text-primary/80">
                            W{weekNumber.toString().padStart(2, '0')}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            <div>{format(weekDate, "MMM dd")} - {format(endDate, "MMM dd")}</div>
                            <div className="text-[10px] opacity-70">{format(weekDate, "yyyy")}</div>
                          </div>
                        </div>
                      </td>
                      {/* Sessions */}
                      <td className="text-right px-2 py-1.5 tabular-nums font-medium">{formatNumber(week.sessions)}</td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.sessions_vs_prev_pct) }}>
                          {formatPercentage(week.sessions_vs_prev_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.sessions_vs_4w_pct) }}>
                          {formatPercentage(week.sessions_vs_4w_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.sessions_vs_12w_pct) }}>
                          {formatPercentage(week.sessions_vs_12w_pct)}
                        </div>
                      </td>
                      {/* Signups */}
                      <td className="text-right px-2 py-1.5 tabular-nums font-medium">{formatNumber(week.vf_signup)}</td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.vf_signup_vs_prev_pct) }}>
                          {formatPercentage(week.vf_signup_vs_prev_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.vf_signup_vs_4w_pct) }}>
                          {formatPercentage(week.vf_signup_vs_4w_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.vf_signup_vs_12w_pct) }}>
                          {formatPercentage(week.vf_signup_vs_12w_pct)}
                        </div>
                      </td>
                      {/* Demos */}
                      <td className="text-right px-2 py-1.5 tabular-nums font-medium">{formatNumber(week.demo_submit)}</td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.demo_submit_vs_prev_pct) }}>
                          {formatPercentage(week.demo_submit_vs_prev_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.demo_submit_vs_4w_pct) }}>
                          {formatPercentage(week.demo_submit_vs_4w_pct)}
                        </div>
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="text-right tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: getHeatMapBgColor(week.demo_submit_vs_12w_pct) }}>
                          {formatPercentage(week.demo_submit_vs_12w_pct)}
                        </div>
                      </td>
                      {/* Conversions */}
                      <td className="px-2 py-1.5">
                        <div className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: '#6b7280' }}>
                          {week.signup_conversion_rate.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[60px]"
                          style={{ backgroundColor: '#6b7280' }}>
                          {week.demo_conversion_rate.toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}