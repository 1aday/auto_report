"use client"

/**
 * KPI Dashboard Component
 * 
 * IMPORTANT: Before using this component, run CREATE_PUBLIC_VIEWS.sql in Supabase
 * to create public schema views that point to the analytics schema materialized views.
 * This is necessary because Supabase JS client can only access public or graphql_public schemas.
 */

import React, { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useQuery } from "@tanstack/react-query"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { motion } from "framer-motion"
import {
  TrendingDown,
  TrendingUp,
  Activity,
  UserPlus,
  FileText,
  RefreshCw,
  Minus,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { predictWeeklyTotal } from "@/lib/projection"
import { calculateWeekProgress, getWeekProgressLabel, isCurrentWeek as checkIsCurrentWeek } from "@/lib/week-progress"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Data type from analytics.wk_totals materialized view
interface WeeklyData {
  week_start: string
  sessions: number
  demo_submit: number
  vf_signup: number
  signup_conversion_rate: number
  demo_conversion_rate: number
  sessions_vs_prev: number | null
  sessions_vs_prev_pct: number | null
  sessions_vs_4w_pct: number | null
  sessions_vs_12w_pct: number | null
  demo_submit_vs_prev: number | null
  demo_submit_vs_prev_pct: number | null
  demo_submit_vs_4w_pct: number | null
  demo_submit_vs_12w_pct: number | null
  vf_signup_vs_prev: number | null
  vf_signup_vs_prev_pct: number | null
  vf_signup_vs_4w_pct: number | null
  vf_signup_vs_12w_pct: number | null
}

// Configuration for data fetching
const DATA_FETCH_CONFIG = {
  // Set to null to fetch all data, or specify a number to limit
  MAX_WEEKS: null as number | null,
  // Set to true to see how much data is being fetched
  LOG_DATA_COUNT: true,
}

// Fetch data from materialized view with all calculated columns
// NOTE: Run CREATE_PUBLIC_VIEWS.sql first to create public.wk_totals view
// that points to analytics.wk_totals materialized view
const useWeeklyData = () => {
  return useQuery({
    queryKey: ["weekly-kpi-data"],
    queryFn: async () => {
      let query = supabase
        .from("wk_totals")  // Public view pointing to analytics.wk_totals
        .select(`
          week_start,
          sessions,
          demo_submit,
          vf_signup,
          signup_conversion_rate,
          demo_conversion_rate,
          sessions_vs_prev,
          sessions_vs_prev_pct,
          sessions_vs_4w_pct,
          sessions_vs_12w_pct,
          demo_submit_vs_prev,
          demo_submit_vs_prev_pct,
          demo_submit_vs_4w_pct,
          demo_submit_vs_12w_pct,
          vf_signup_vs_prev,
          vf_signup_vs_prev_pct,
          vf_signup_vs_4w_pct,
          vf_signup_vs_12w_pct
        `)
        .order("week_start", { ascending: false })
      
      // Apply limit if configured
      if (DATA_FETCH_CONFIG.MAX_WEEKS !== null) {
        query = query.limit(DATA_FETCH_CONFIG.MAX_WEEKS)
      }
      
      const { data, error } = await query

      if (error) throw error
      
      // Log data count if configured
      if (DATA_FETCH_CONFIG.LOG_DATA_COUNT && data) {
        console.log(`[KPI Dashboard] Fetched ${data.length} weeks of data from public.wk_totals`)
        if (data.length > 0) {
          const earliest = data[data.length - 1].week_start
          const latest = data[0].week_start
          console.log(`[KPI Dashboard] Date range: ${earliest} to ${latest}`)
          console.log(`[KPI Dashboard] If you're missing data, check:`)
          console.log(`  1. Run CHECK_ALL_DATA.sql in Supabase to verify data exists`)
          console.log(`  2. Run CREATE_PUBLIC_VIEWS.sql if public.wk_totals doesn't exist`)
        }
      }
      
      return data as WeeklyData[]
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Format number with commas
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined) return "—"
  return new Intl.NumberFormat("en-US").format(num)
}

// Format percentage with color
const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  return formatted
}

// Get background heat map color for percentage (more vibrant)
const getHeatMapBgColor = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "transparent"
  const absValue = Math.abs(value)
  if (value > 0) {
    // Brighter emerald tones
    if (absValue > 20) return "rgba(16, 185, 129, 0.65)" // emerald-500
    if (absValue > 10) return "rgba(16, 185, 129, 0.55)"
    if (absValue > 5) return "rgba(16, 185, 129, 0.45)"
    return "rgba(16, 185, 129, 0.35)"
  } else if (value < 0) {
    // Brighter rose tones
    if (absValue > 20) return "rgba(244, 63, 94, 0.65)" // rose-500
    if (absValue > 10) return "rgba(244, 63, 94, 0.55)"
    if (absValue > 5) return "rgba(244, 63, 94, 0.45)"
    return "rgba(244, 63, 94, 0.35)"
  }
  return "transparent"
}

// Keep old function for non-heatmap uses
const getPercentageColor = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "text-muted-foreground"
  if (value > 10) return "text-green-600 dark:text-green-400"
  if (value > 0) return "text-green-500 dark:text-green-500"
  if (value < -10) return "text-red-600 dark:text-red-400"
  if (value < 0) return "text-red-500 dark:text-red-500"
  return "text-gray-500"
}

// Get trend icon
const getTrendIcon = (value: number | null | undefined, size: number = 16) => {
  const iconClass = size === 10 ? "h-2.5 w-2.5" : size === 12 ? "h-3 w-3" : "h-4 w-4"
  if (value === null || value === undefined) return <Minus className={iconClass} />
  if (value > 0) return <TrendingUp className={iconClass} />
  if (value < 0) return <TrendingDown className={iconClass} />
  return <Minus className={iconClass} />
}

// Metric card component with comprehensive comparisons
const MetricCard = ({ 
  title, 
  icon: Icon, 
  current, 
  previous, 
  changePct,
  vs4WeekPct,
  vs12WeekPct,
  historicalData,
  weekStart,
  color = "primary"
}: {
  title: string
  icon: React.ElementType
  current: number
  previous: number | null
  changePct: number | null
  vs4WeekPct: number | null
  vs12WeekPct: number | null
  historicalData: number[]
  weekStart: string
  color?: string
}) => {
  const colorClasses = {
    primary: "from-primary/35 to-primary/12 border-primary/45",
    blue: "from-blue-500/35 to-blue-500/12 border-blue-500/45",
    purple: "from-purple-500/35 to-purple-500/14 border-purple-500/45",
    indigo: "from-indigo-500/35 to-indigo-500/14 border-indigo-500/45",
    teal: "from-teal-500/25 to-teal-500/8 border-teal-500/30",
    amber: "from-amber-500/25 to-amber-500/8 border-amber-500/30",
    rose: "from-rose-500/35 to-rose-500/14 border-rose-500/45",
  } as const

  // Progress bar color: always emerald to match positive-change green
  const universalBarGradient = "from-emerald-600 to-emerald-500"
  const projectionBorderClasses: Record<string, string> = {
    primary: "border-primary/40",
    blue: "border-blue-400/50",
    purple: "border-purple-400/50",
    indigo: "border-indigo-400/50",
    teal: "border-teal-400/50",
    amber: "border-amber-400/50",
    rose: "border-rose-400/50",
  }
  const projectionMarkerBg: Record<string, string> = {
    primary: "bg-primary/20",
    blue: "bg-blue-400/20",
    purple: "bg-purple-400/20",
    indigo: "bg-indigo-400/20",
    teal: "bg-teal-400/20",
    amber: "bg-amber-400/20",
    rose: "bg-rose-400/20",
  }

  // Calculate week progress using utility function
  const isCurrentWeek = checkIsCurrentWeek(weekStart)
  const weekProgress = calculateWeekProgress(weekStart)
  const weekProgressLabel = getWeekProgressLabel(weekProgress)
  
  // For projected comparison, we'll use the same 12-week average
  // (The vs12WeekPct is already passed as a prop)
  
  // Projection based on weekday multipliers
      const now = new Date()
    const todayName = now.toLocaleDateString('en-US', { weekday: 'long' })
    // Show projections for current week OR recent weeks (within 14 days)
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const shouldProject = isCurrentWeek || (weekStart && new Date(weekStart) > twoWeeksAgo)
    const projectedTotal = shouldProject
      ? predictWeeklyTotal(current, todayName)
      : current
  
    // Calculate projected comparisons
  const projectedVsPrev = shouldProject && previous
    ? ((projectedTotal - previous) / previous) * 100
    : changePct
  
  const projectedVs4Week = shouldProject && historicalData.length >= 4
    ? (() => {
        const last4Weeks = historicalData.slice(0, 4)
        const avg4Week = last4Weeks.reduce((sum, val) => sum + val, 0) / last4Weeks.length
        return avg4Week > 0 ? ((projectedTotal - avg4Week) / avg4Week) * 100 : null
      })()
    : vs4WeekPct
    
  const projectedVs12Week = shouldProject && historicalData.length >= 12
    ? (() => {
        const last12Weeks = historicalData.slice(0, 12)
        const avg12Week = last12Weeks.reduce((sum, val) => sum + val, 0) / last12Weeks.length
        return avg12Week > 0 ? ((projectedTotal - avg12Week) / avg12Week) * 100 : null
      })()
    : vs12WeekPct
  
  // Calculate absolute differences for actual comparisons
  const actualDiffPrev = previous !== null ? current - previous : null
  const actualDiff4Week = historicalData.length >= 4 
    ? current - (historicalData.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4)
    : null
  const actualDiff12Week = historicalData.length >= 12
    ? current - (historicalData.slice(0, 12).reduce((sum, val) => sum + val, 0) / 12)
    : null
  
  // Calculate absolute differences for projected comparisons
  const projectedDiffPrev = shouldProject && previous !== null 
    ? projectedTotal - previous 
    : null
  const projectedDiff4Week = shouldProject && historicalData.length >= 4
    ? projectedTotal - (historicalData.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4)
    : null
  const projectedDiff12Week = shouldProject && historicalData.length >= 12
    ? projectedTotal - (historicalData.slice(0, 12).reduce((sum, val) => sum + val, 0) / 12)
    : null
    
  // Format absolute difference
  const formatDiff = (diff: number | null) => {
    if (diff === null) return ""
    const sign = diff >= 0 ? "+" : "-"
    const absDiff = Math.abs(diff)
    
    // For signups/demos, round up and don't show decimals
    if (title && (title.toLowerCase().includes('signup') || title.toLowerCase().includes('demo'))) {
      return `${sign}${Math.ceil(absDiff).toLocaleString()}`
    }
    
    // For other metrics, use standard formatting
    return `${sign}${formatNumber(absDiff)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("relative overflow-hidden gap-2", `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`)}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground/90">
              {title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur-sm")}>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-0">
            <div>
              <div className="text-display font-bold tabular-nums mt-0">
                {formatNumber(current)}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption">
                {shouldProject && (
                  (() => {
                    const pc = previous ? ((projectedTotal - previous) / previous) * 100 : null
                    return (
                      <div className="text-muted-foreground">
                        Projected: <span className={cn("font-medium", pc !== null && pc >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{formatNumber(projectedTotal)}</span>
                      </div>
                    )
                  })()
                )}
                {typeof previous === 'number' && (
                  <div className="text-muted-foreground">
                    Last week: <span className="font-medium text-foreground">{formatNumber(previous)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {(isCurrentWeek || shouldProject) && (
              <div className="mt-3 space-y-3">
                {/* Progress bar only */}
                {/* The Perfect Progress Bar - Clean & Stunning */}
                <div className="space-y-2">
                  {/* Progress bar container */}
                  <div className="relative h-6 sm:h-7 md:h-8 bg-gradient-to-r from-background to-muted/20 rounded-full overflow-hidden border border-border/30 shadow-inner">
                    {(() => {
                      const maxValue = Math.max(previous || 0, projectedTotal, current) * 1.15
                      const scale = (val: number) => (val / maxValue) * 100
                      
                      return (
                        <>
                          {/* Last week's total bar - grey background reference */}
                          {previous && (
                            <div 
                              className="absolute inset-y-[25%] left-0 bg-slate-400/30 dark:bg-slate-600/40 rounded-r border border-slate-300/20 dark:border-slate-600/30"
                              style={{ width: `${scale(previous)}%` }}
                            />
                          )}
                          
                          {/* Current week progress bar - same height as previous week */}
                          <motion.div 
                            className={cn(
                              "absolute inset-y-[25%] left-0 rounded-r bg-gradient-to-r shadow-lg",
                              universalBarGradient,
                              "shadow-emerald-600/20"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${scale(current)}%` }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                          />
                          
                          {/* Dotted projection extension - aligned with bars */}
                          {shouldProject && projectedTotal > current && (
                            <div 
                              className={cn("absolute inset-y-[25%] border-2 border-dashed rounded-r", projectionBorderClasses[color as keyof typeof projectionBorderClasses] || "border-primary/40")}
                              style={{ 
                                left: `${scale(current)}%`,
                                width: `${scale(projectedTotal - current)}%`,
                                borderLeft: 'none'
                              }}
                            />
                          )}
                          
                          {/* Vertical reference lines */}
                          {previous && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-border/30 z-10"
                              style={{ left: `${scale(previous)}%` }}
                            />
                          )}
                          
                          {/* Remove projected vertical marker; keep only last week's reference line */}
                          
                          {/* Removed numeric label inside bar to avoid duplication */}
                        </>
                      )
                    })()}
                  </div>
                  
                  {/* Legend below the bar */}
                  <div className="mt-1 flex items-center gap-4 text-micro text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-5 rounded-full bg-emerald-500/80"></span>
                      <span>Current</span>
                    </div>
                    {shouldProject && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-5 h-0 border-t-2 border-dashed border-emerald-500/70 translate-y-[1px]"></span>
                        <span>Projected</span>
                      </div>
                    )}
                    {previous && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-5 rounded-full bg-slate-400/40"></span>
                        <span>Last week</span>
                      </div>
                    )}
                  </div>

                  {/* Day labels with current day highlight */}
                  <div className="flex text-[9px]">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <div 
                        key={day} 
                        className={cn(
                          "flex-1 text-center transition-colors",
                          i < Math.floor(weekProgress / 14.3) ? "text-muted-foreground" :
                          i === Math.floor(weekProgress / 14.3) ? "text-foreground font-medium" :
                          "text-muted-foreground/50"
                        )}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Status message - Clean & Separated */}
                {shouldProject && (
                  <div className="mt-2 px-2 py-1.5 bg-background/80 backdrop-blur-sm rounded-lg border border-border/30">
                    <div className="text-[11px] text-center">
                      {(() => {
                        const projComparison = (previous && previous > 0) ? 
                          ((projectedTotal - previous) / previous) * 100 : 0
                        
                        const icon = projComparison > 5 ? '↑' : projComparison > -5 ? '→' : '↓'
                        const colorClass = projComparison > 0 ? 'text-emerald-500 font-semibold' : projComparison > -5 ? 'text-muted-foreground' : 'text-destructive font-medium'
                        
                        return (
                          <span className={colorClass}>
                            {icon} Projecting {projComparison > 0 ? '+' : ''}{projComparison.toFixed(1)}% vs last week
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Comparisons Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              {/* Actual vs comparisons */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Actual
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(changePct))}>
                      {getTrendIcon(changePct, 10)}
                      <span className="text-xs font-medium">
                        {formatPercentage(changePct)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs last wk</span>
                  </div>
                  {actualDiffPrev !== null && (
                    <span className="text-[9px] text-muted-foreground/60">
                      {formatDiff(actualDiffPrev)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(vs4WeekPct))}>
                      {getTrendIcon(vs4WeekPct, 10)}
                      <span className="text-xs font-medium">
                        {formatPercentage(vs4WeekPct)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs 4wk avg</span>
                  </div>
                  {actualDiff4Week !== null && (
                    <span className="text-[9px] text-muted-foreground/60">
                      {formatDiff(actualDiff4Week)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(vs12WeekPct))}>
                      {getTrendIcon(vs12WeekPct, 10)}
                      <span className="text-xs font-medium">
                        {formatPercentage(vs12WeekPct)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs 12wk avg</span>
                  </div>
                  {actualDiff12Week !== null && (
                    <span className="text-[9px] text-muted-foreground/60">
                      {formatDiff(actualDiff12Week)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Projected comparisons (for current or recent weeks) */}
              {shouldProject && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Projected
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(projectedVsPrev))}>
                        {getTrendIcon(projectedVsPrev, 10)}
                        <span className="text-xs font-medium">
                          {formatPercentage(projectedVsPrev)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs last wk</span>
                    </div>
                    {projectedDiffPrev !== null && (
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatDiff(projectedDiffPrev)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(projectedVs4Week))}>
                        {getTrendIcon(projectedVs4Week, 10)}
                        <span className="text-xs font-medium">
                          {formatPercentage(projectedVs4Week)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs 4wk avg</span>
                    </div>
                    {projectedDiff4Week !== null && (
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatDiff(projectedDiff4Week)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(projectedVs12Week))}>
                        {getTrendIcon(projectedVs12Week, 10)}
                        <span className="text-xs font-medium">
                          {formatPercentage(projectedVs12Week)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs 12wk avg</span>
                    </div>
                    {projectedDiff12Week !== null && (
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatDiff(projectedDiff12Week)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {previous !== null && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>Last week: {formatNumber(previous)}</span>
                  {shouldProject && projectedTotal !== current && (
                    <Badge 
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        projectedTotal > previous ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
                      )}
                    >
                      <Sparkles className="h-2 w-2 mr-0.5" />
                      {projectedTotal > previous ? "Ahead" : "Behind"}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Table component
const DataTable = ({ data }: { data: WeeklyData[] }) => {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<WeeklyData>[] = useMemo(
    () => [
      {
        accessorKey: "week_start",
        header: () => <div className="font-semibold">Week</div>,
        size: 180,
        cell: ({ row }) => {
          const date = new Date(row.getValue("week_start"))
          const endDate = new Date(date)
          endDate.setDate(endDate.getDate() + 6)
                      // Calculate ISO week number (Monday start)
            const getISOWeek = (date: Date) => {
              const d = new Date(date)
              d.setHours(0, 0, 0, 0)
              // ISO week starts on Monday
              d.setDate(d.getDate() + 4 - (d.getDay() || 7))
              const yearStart = new Date(d.getFullYear(), 0, 1)
              const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
              return weekNumber
            }
            const weekNumber = getISOWeek(date)
          
          return (
            <div className="whitespace-nowrap">
              <div className="space-y-1">
              <div className="text-base font-semibold tabular-nums text-white">W{weekNumber.toString().padStart(2, '0')}</div>
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  <div className="font-medium">{format(date, "MMM dd")} - {format(endDate, "MMM dd")}</div>
                  <div className="opacity-70">{format(date, "yyyy")}</div>
                </div>
              </div>
            </div>
          )
        },
      },
      // Sessions group
      {
        accessorKey: "sessions",
        header: () => <div className="text-right font-semibold">Sessions</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums">
            {formatNumber(row.getValue("sessions"))}
          </div>
        ),
      },
      {
        accessorKey: "sessions_vs_prev_pct",
        header: () => <div className="text-right text-sm">WoW</div>,
        cell: ({ row }) => {
          const value = row.getValue("sessions_vs_prev_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "sessions_vs_4w_pct",
        header: () => <div className="text-right text-sm">4W</div>,
        cell: ({ row }) => {
          const value = row.getValue("sessions_vs_4w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded shadow-sm"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "sessions_vs_12w_pct",
        header: () => <div className="text-right text-sm">12W</div>,
        cell: ({ row }) => {
          const value = row.getValue("sessions_vs_12w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      // Signups group (moved before Demos)
      {
        accessorKey: "vf_signup",
        header: () => <div className="text-right font-semibold">Signups</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums">
            {formatNumber(row.getValue("vf_signup"))}
          </div>
        ),
      },
      {
        accessorKey: "vf_signup_vs_prev_pct",
        header: () => <div className="text-right text-sm">WoW</div>,
        cell: ({ row }) => {
          const value = row.getValue("vf_signup_vs_prev_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "vf_signup_vs_4w_pct",
        header: () => <div className="text-right text-sm">4W</div>,
        cell: ({ row }) => {
          const value = row.getValue("vf_signup_vs_4w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "vf_signup_vs_12w_pct",
        header: () => <div className="text-right text-sm">12W</div>,
        cell: ({ row }) => {
          const value = row.getValue("vf_signup_vs_12w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      // Demos group (moved to last)
      {
        accessorKey: "demo_submit",
        header: () => <div className="text-right font-semibold">Demos</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums">
            {formatNumber(row.getValue("demo_submit"))}
          </div>
        ),
      },
      {
        accessorKey: "demo_submit_vs_prev_pct",
        header: () => <div className="text-right text-sm">WoW</div>,
        cell: ({ row }) => {
          const value = row.getValue("demo_submit_vs_prev_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "demo_submit_vs_4w_pct",
        header: () => <div className="text-right text-sm">4W</div>,
        cell: ({ row }) => {
          const value = row.getValue("demo_submit_vs_4w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      {
        accessorKey: "demo_submit_vs_12w_pct",
        header: () => <div className="text-right text-sm">12W</div>,
        cell: ({ row }) => {
          const value = row.getValue("demo_submit_vs_12w_pct") as number | null
          return (
            <div 
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
              style={{ backgroundColor: getHeatMapBgColor(value) }}
            >
              {formatPercentage(value)}
            </div>
          )
        },
      },
      // Conversion Rates
      {
        accessorKey: "signup_conversion_rate",
        header: () => <div className="text-right font-semibold">Signup Conv %</div>,
        cell: ({ row }) => {
          const value = row.getValue("signup_conversion_rate") as number
          return (
            <div 
              className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: '#6b7280' 
              }}
            >
              {value.toFixed(2)}%
            </div>
          )
        },
      },
      {
        accessorKey: "demo_conversion_rate",
        header: () => <div className="text-right font-semibold">Demo Conv %</div>,
        cell: ({ row }) => {
          const value = row.getValue("demo_conversion_rate") as number
          return (
            <div 
              className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: '#6b7280' 
              }}
            >
              {value.toFixed(2)}%
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  return (
    <div className="rounded-lg border bg-card">
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full">
          <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            {/* Header grouping row */}
            <tr className="border-b border-border/20">
              <th className="px-3 py-1.5 border-r border-border/10"></th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-teal-500/10 border-r border-border/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-500">Sessions</span>
              </th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-purple-500/5 border-r border-border/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Signups</span>
              </th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-amber-500/10 border-r border-border/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Demos</span>
              </th>
              <th colSpan={2} className="px-2 py-1.5 text-center bg-emerald-500/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Conversions</span>
              </th>
            </tr>
            {/* Column headers */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/20">
                {headerGroup.headers.map((header, idx) => {
                  const isFirstColumn = idx === 0
                  const isSessionsGroup = idx >= 1 && idx <= 4
                  const isSignupsGroup = idx >= 5 && idx <= 8
                  const isDemosGroup = idx >= 9 && idx <= 12
                  const isConversionsGroup = idx >= 13 && idx <= 14
                  
                      return (
                    <th
                      key={header.id}
                        className={cn(
                          isFirstColumn ? "px-3 py-2.5 text-left font-semibold text-xs tracking-wide" : "px-2 py-1.5 text-left font-semibold text-xs tracking-wide",
                        isFirstColumn && "border-r border-border/10",
                          isSessionsGroup && "bg-teal-900/30 text-teal-300",
                          isSignupsGroup && "bg-violet-900/30 text-violet-300",
                          isDemosGroup && "bg-amber-900/30 text-amber-200",
                        isConversionsGroup && "bg-emerald-500/5",
                          idx === 4 && "border-r border-border/20",
                          idx === 8 && "border-r border-border/20",
                          idx === 12 && "border-r border-border/20",
                          idx === 13 && "border-r border-border/10"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/20",
                    index % 2 === 0 ? "bg-background" : "bg-muted/5",
                    index === 0 && "font-semibold bg-primary/5"
                  )}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const isFirstColumn = idx === 0
                    const isSessionsGroup = idx >= 1 && idx <= 4
                    const isSignupsGroup = idx >= 5 && idx <= 8
                    const isDemosGroup = idx >= 9 && idx <= 12
                    const isConversionsGroup = idx >= 13 && idx <= 14
                    
                      return (
                      <td 
                        key={cell.id} 
                        className={cn(
                          isFirstColumn ? "px-3 py-2.5" : "px-2 py-1.5",
                          isFirstColumn && "border-r border-border/10",
                          // Neutral borders only
                          "border-r border-border/10",
                          idx === 14 && "border-r-0"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// TrendChart component removed per user request

export function KPIDashboard() {
  const { data, isLoading, error, refetch } = useWeeklyData()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Get latest week data for metric cards
  const latestWeek = data?.[0]
  const previousWeek = data?.[1]

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load data</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error).message}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-white" />
              Weekly KPIs Dashboard
            </h1>
            {/* Removed descriptive subtitle per request */}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="group bg-transparent text-foreground hover:bg-foreground/10"
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2 transition-transform",
              isRefreshing && "animate-spin"
            )} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </motion.div>

        {/* Metric Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          latestWeek && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Sessions"
                icon={Activity}
                current={latestWeek.sessions}
                previous={previousWeek?.sessions || null}
                changePct={latestWeek.sessions_vs_prev_pct}
                vs4WeekPct={latestWeek.sessions_vs_4w_pct}
                vs12WeekPct={latestWeek.sessions_vs_12w_pct}
                historicalData={(data || []).map(d => d.sessions)}
                weekStart={latestWeek.week_start}
                color="teal"
              />
              <MetricCard
                title="VF Signups"
                icon={UserPlus}
                current={latestWeek.vf_signup}
                previous={previousWeek?.vf_signup || null}
                changePct={latestWeek.vf_signup_vs_prev_pct}
                vs4WeekPct={latestWeek.vf_signup_vs_4w_pct}
                vs12WeekPct={latestWeek.vf_signup_vs_12w_pct}
                historicalData={(data || []).map(d => d.vf_signup)}
                weekStart={latestWeek.week_start}
                color="purple"
              />
              <MetricCard
                title="Demo Submissions"
                icon={FileText}
                current={latestWeek.demo_submit}
                previous={previousWeek?.demo_submit || null}
                changePct={latestWeek.demo_submit_vs_prev_pct}
                vs4WeekPct={latestWeek.demo_submit_vs_4w_pct}
                vs12WeekPct={latestWeek.demo_submit_vs_12w_pct}
                historicalData={(data || []).map(d => d.demo_submit)}
                weekStart={latestWeek.week_start}
                color="amber"
              />
            </div>
          )
        )}

        {/* Data Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weekly Performance Details</CardTitle>
            <CardDescription className="text-xs">
              Comprehensive breakdown with week-over-week and moving average comparisons
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4">
                <Skeleton className="h-[400px]" />
              </div>
            ) : (
              data && <DataTable data={data} />
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
