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
import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
} from "recharts"
import { format } from "date-fns"
import { motion } from "framer-motion"
import {
  TrendingDown,
  TrendingUp,
  Activity,
  UserPlus,
  FileText,
  RefreshCw,
  Calendar,
  Minus,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { predictWeeklyTotal, pacingVsReference } from "@/lib/projection"
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

// Get background heat map color for percentage
const getHeatMapBgColor = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "transparent"
  const absValue = Math.abs(value)
  if (value > 0) {
    // Green shades for positive
    if (absValue > 20) return "rgba(34, 197, 94, 0.5)" // green-500
    if (absValue > 10) return "rgba(34, 197, 94, 0.4)"
    if (absValue > 5) return "rgba(34, 197, 94, 0.3)"
    return "rgba(34, 197, 94, 0.2)"
  } else if (value < 0) {
    // Red shades for negative
    if (absValue > 20) return "rgba(239, 68, 68, 0.5)" // red-500
    if (absValue > 10) return "rgba(239, 68, 68, 0.4)"
    if (absValue > 5) return "rgba(239, 68, 68, 0.3)"
    return "rgba(239, 68, 68, 0.2)"
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
const getTrendIcon = (value: number | null | undefined) => {
  if (value === null || value === undefined) return <Minus className="h-4 w-4" />
  if (value > 0) return <TrendingUp className="h-4 w-4" />
  if (value < 0) return <TrendingDown className="h-4 w-4" />
  return <Minus className="h-4 w-4" />
}

// Metric card component with progress tracking
const MetricCard = ({ 
  title, 
  icon: Icon, 
  current, 
  previous, 
  changePct,
  weekStart,
  color = "primary"
}: {
  title: string
  icon: React.ElementType
  current: number
  previous: number | null
  changePct: number | null
  weekStart: string
  color?: string
}) => {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  }

  // Calculate week progress
  const weekStartDate = new Date(weekStart)
  const now = new Date()
  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  
  const isCurrentWeek = now >= weekStartDate && now <= weekEndDate
  const daysElapsed = isCurrentWeek ? Math.max(1, Math.ceil((now.getTime() - weekStartDate.getTime()) / (24 * 60 * 60 * 1000))) : 7
  const weekProgress = (daysElapsed / 7) * 100
  
  // NEW: projection & pacing based on weekday multipliers
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const projectedTotal = isCurrentWeek
    ? predictWeeklyTotal(current, todayName)
    : current
  
  const paceIndicator = isCurrentWeek && previous
    ? pacingVsReference(current, previous, todayName)
    : changePct  // fallback for non-current weeks

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("relative overflow-hidden", `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur-sm")}>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold tabular-nums">
                {formatNumber(current)}
              </div>
              {isCurrentWeek && (
                <div className="text-xs text-muted-foreground mt-1">
                  {todayName} ({daysElapsed}/7 days) • 
                  Projected: <span className="font-medium text-foreground">{formatNumber(projectedTotal)}</span>
                </div>
              )}
            </div>
            
            {isCurrentWeek && weekProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Week progress</span>
                  <span className="font-medium">{Math.round(weekProgress)}%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${weekProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-1">
              <div className={cn("flex items-center gap-1", getPercentageColor(paceIndicator || changePct))}>
                {getTrendIcon(paceIndicator || changePct)}
                <span className="font-semibold">
                  {formatPercentage(paceIndicator || changePct)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {isCurrentWeek ? "projected vs last week" : "vs last week"}
              </span>
            </div>
            
            {previous !== null && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>Last week total: {formatNumber(previous)}</span>
                  {isCurrentWeek && projectedTotal !== current && (
                    <Badge variant={projectedTotal > previous ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
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
                <div className="text-base font-semibold tabular-nums text-primary/80">W{weekNumber.toString().padStart(2, '0')}</div>
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
              className="text-right tabular-nums text-sm text-white px-1 py-0.5 rounded"
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
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Header grouping row */}
            <tr className="border-b border-border/50">
              <th className="px-3 py-1.5"></th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-primary/5 border-x border-border/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Sessions</span>
              </th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-purple-500/5 border-x border-border/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Signups</span>
              </th>
              <th colSpan={4} className="px-2 py-1.5 text-center bg-blue-500/5 border-x border-border/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Demos</span>
              </th>
              <th colSpan={2} className="px-2 py-1.5 text-center bg-emerald-500/5 border-x border-border/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Conversions</span>
              </th>
            </tr>
            {/* Column headers */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/30">
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
                        isFirstColumn ? "px-3 py-2.5 text-left font-medium text-xs" : "px-2 py-1.5 text-left font-medium text-xs",
                        isFirstColumn && "sticky left-0 bg-background z-10 border-r border-border/50",
                        isSessionsGroup && "bg-primary/5",
                        isSignupsGroup && "bg-purple-500/5",
                        isDemosGroup && "bg-blue-500/5",
                        isConversionsGroup && "bg-emerald-500/5",
                        (idx === 4 || idx === 8 || idx === 12) && "border-r border-border/30"
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
                    "border-b border-border/30",
                    index % 2 === 0 ? "bg-background" : "bg-muted/10",
                    index === 0 && "font-semibold bg-primary/8 border-b-2 border-primary/20"
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
                          isFirstColumn && "sticky left-0 bg-inherit z-10 border-r border-border/50",
                          isSessionsGroup && index % 2 === 0 && "bg-primary/3",
                          isSessionsGroup && index % 2 === 1 && "bg-primary/5",
                          isSignupsGroup && index % 2 === 0 && "bg-purple-500/3",
                          isSignupsGroup && index % 2 === 1 && "bg-purple-500/5",
                          isDemosGroup && index % 2 === 0 && "bg-blue-500/3",
                          isDemosGroup && index % 2 === 1 && "bg-blue-500/5",
                          isConversionsGroup && index % 2 === 0 && "bg-emerald-500/3",
                          isConversionsGroup && index % 2 === 1 && "bg-emerald-500/5",
                          (idx === 4 || idx === 8 || idx === 12) && "border-r border-border/30"
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

// Chart component with dual axis
const TrendChart = ({ data }: { data: WeeklyData[] }) => {
  const chartData = useMemo(() => {
    // Helper to get ISO week number (Monday start)
    const getISOWeek = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const yearStart = new Date(d.getFullYear(), 0, 1)
      const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return weekNumber
    }
    
    return [...data].reverse().map((item) => ({
      week: `W${getISOWeek(new Date(item.week_start)).toString().padStart(2, '0')}`,
      fullDate: format(new Date(item.week_start), "MMM dd"),
      Sessions: item.sessions,
      Demos: item.demo_submit,
      Signups: item.vf_signup,
    }))
  }, [data])

  // Custom tooltip with elegant design
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm p-3 rounded-lg border border-border/50 shadow-xl">
          <p className="font-semibold text-xs text-foreground mb-2.5">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: { color: string; name: string; value: number }, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm shadow-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[11px] text-muted-foreground font-medium">{entry.name}</span>
                </div>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                  {formatNumber(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-2 px-6 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Weekly Performance</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80 mt-0.5">
              Tracking {data.length} weeks of key metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div className="bg-background/50 rounded-lg p-4 backdrop-blur-sm [&_svg]:outline-none [&_svg]:focus:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart 
              data={chartData}
              margin={{ top: 20, right: 55, left: 5, bottom: 5 }}
              style={{ outline: 'none' }}
            >
              <defs>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="1 4" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.08}
                vertical={false}
                horizontalPoints={[0, 50, 100, 150, 200, 250]}
              />
              
              <XAxis 
                dataKey="week" 
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 10,
                  fontWeight: 500
                }}
                axisLine={{ 
                  stroke: 'hsl(var(--border))', 
                  strokeOpacity: 0.1,
                  strokeWidth: 1
                }}
                tickLine={false}
                dy={5}
              />
              
              {/* Left Y-axis for Sessions */}
              <YAxis 
                yAxisId="sessions"
                orientation="left"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 9,
                  fontWeight: 400
                }}
                axisLine={false}
                tickLine={false}
                width={48}
                dx={-5}
                tickFormatter={(value) => {
                  if (value === 0) return '0'
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                  return value.toString()
                }}
              />
              
              {/* Right Y-axis for Conversions */}
              <YAxis 
                yAxisId="conversions"
                orientation="right"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))', 
                  fontSize: 9,
                  fontWeight: 400
                }}
                axisLine={false}
                tickLine={false}
                width={35}
                dx={5}
              />
              
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ 
                  fill: 'hsl(var(--muted))', 
                  fillOpacity: 0.1,
                  radius: 4
                }}
                animationDuration={200}
              />
              
              {/* Sessions as gradient bars */}
              <Bar
                yAxisId="sessions"
                dataKey="Sessions"
                fill="#84cc16"
                fillOpacity={0.8}
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationBegin={0}
                maxBarSize={45}
              />
              
              {/* Signups as smooth line */}
              <Line
                yAxisId="conversions"
                type="monotone"
                dataKey="Signups"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={{ 
                  fill: '#a855f7', 
                  strokeWidth: 0, 
                  r: 3.5
                }}
                activeDot={{ 
                  r: 5,
                  strokeWidth: 0,
                  fill: '#a855f7'
                }}
                animationDuration={1000}
                animationBegin={200}
              />
              
              {/* Demos as smooth line */}
              <Line
                yAxisId="conversions"
                type="monotone"
                dataKey="Demos"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ 
                  fill: '#3b82f6', 
                  strokeWidth: 0, 
                  r: 3.5
                }}
                activeDot={{ 
                  r: 5,
                  strokeWidth: 0,
                  fill: '#3b82f6'
                }}
                animationDuration={1000}
                animationBegin={400}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Elegant legend */}
        <div className="flex items-center justify-center gap-6 mt-4 px-4">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="w-3 h-3 rounded transition-colors" style={{ backgroundColor: '#84cc16' }} />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Sessions
            </span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <div className="flex items-center gap-2 group cursor-default">
            <div className="w-8 h-0.5 rounded-full transition-all" style={{ backgroundColor: '#a855f7aa' }} />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Signups
            </span>
          </div>
          <div className="w-px h-3 bg-border/50" />
          <div className="flex items-center gap-2 group cursor-default">
            <div className="w-8 h-0.5 rounded-full transition-all" style={{ backgroundColor: '#3b82f6aa' }} />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Demos
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Weekly KPIs Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time performance metrics with weekly comparisons
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </motion.div>

        {/* Latest Week Badge */}
        {latestWeek && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <Calendar className="h-3 w-3 mr-2" />
              Latest Week: {format(new Date(latestWeek.week_start), "MMM dd, yyyy")}
            </Badge>
          </motion.div>
        )}

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
                weekStart={latestWeek.week_start}
                color="primary"
              />
              <MetricCard
                title="VF Signups"
                icon={UserPlus}
                current={latestWeek.vf_signup}
                previous={previousWeek?.vf_signup || null}
                changePct={latestWeek.vf_signup_vs_prev_pct}
                weekStart={latestWeek.week_start}
                color="purple"
              />
              <MetricCard
                title="Demo Submissions"
                icon={FileText}
                current={latestWeek.demo_submit}
                previous={previousWeek?.demo_submit || null}
                changePct={latestWeek.demo_submit_vs_prev_pct}
                weekStart={latestWeek.week_start}
                color="blue"
              />
            </div>
          )
        )}

        {/* Chart */}
        {isLoading ? (
          <Skeleton className="h-[400px]" />
        ) : (
          data && <TrendChart data={data} />
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