"use client"

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
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
// Recharts imports removed - not currently used
// import {
//   Area,
//   AreaChart,
//   Bar,
//   BarChart,
//   CartesianGrid,
//   Cell,
//   Line,
//   LineChart,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts"
// import { format } from "date-fns" - not currently used
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowDown,
  ArrowUp,
  TrendingDown,
  TrendingUp,
  Activity,
  FileText,
  UserPlus,

  Download,
  RefreshCw,
  ChevronDown,
  Eye,

  Globe,
  Hash,
  Megaphone,

  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,

  CardHeader,

} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
// import { Skeleton } from "@/components/ui/skeleton" - not currently used
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,

  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {

  TooltipProvider,

} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator" - not currently used

// Base types for raw data from materialized views
interface BaseMetrics {
  week_start: string
  sessions: number
  demo_submit: number
  vf_signup: number
}

// Unused interface definitions (commented out)
// interface SiteWideRaw extends BaseMetrics {}
// 
// interface ChannelRaw extends BaseMetrics {
//   channel: string
// }
// 
// interface SourceMediumRaw extends BaseMetrics {
//   src: string
//   med: string
// }
// 
// interface CampaignRaw extends BaseMetrics {
//   src: string
//   med: string
//   camp: string | null
//   kw: string | null
//   first_src: string | null
// }

// Enhanced types with calculated percentages (commented out - not currently used)
// interface EnhancedMetrics {
//   week: string
//   sessions: number
//   sessions_wow_pct: number
//   sessions_4w_pct: number
//   sessions_12w_pct: number
//   demo_submit: number
//   demo_submit_wow_pct: number
//   demo_submit_4w_pct: number
//   demo_submit_12w_pct: number
//   vf_signup: number
//   vf_signup_wow_pct: number
//   vf_signup_4w_pct: number
//   vf_signup_12w_pct: number
// }

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// Helper function to calculate moving average
const calculateMovingAverage = (data: number[], window: number): number => {
  if (data.length < window) return data.reduce((a, b) => a + b, 0) / data.length
  const windowData = data.slice(0, window)
  return windowData.reduce((a, b) => a + b, 0) / window
}

// Function to enhance raw data with calculated percentages
function enhanceWithPercentages<T extends BaseMetrics>(
  data: T[],
  groupBy?: (item: T) => string
): (T & { 
  week: string
  sessions_wow_pct: number
  sessions_4w_pct: number
  sessions_12w_pct: number
  demo_submit_wow_pct: number
  demo_submit_4w_pct: number
  demo_submit_12w_pct: number
  vf_signup_wow_pct: number
  vf_signup_4w_pct: number
  vf_signup_12w_pct: number
})[] {
  // Sort by week_start descending
  const sorted = [...data].sort((a, b) => 
    new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
  )

  // Group data if groupBy function is provided
  const groups = groupBy ? {} as Record<string, T[]> : { all: sorted }
  
  if (groupBy) {
    sorted.forEach(item => {
      const key = groupBy(item)
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
  }

  const enhanced: (T & { 
    week: string
    sessions_wow_pct: number
    sessions_4w_pct: number
    sessions_12w_pct: number
    demo_submit_wow_pct: number
    demo_submit_4w_pct: number
    demo_submit_12w_pct: number
    vf_signup_wow_pct: number
    vf_signup_4w_pct: number
    vf_signup_12w_pct: number
  })[] = []

  Object.entries(groups).forEach(([, groupData]) => {
    groupData.forEach((item, index) => {
      const weekNum = Math.floor((new Date(item.week_start).getTime() - new Date(new Date(item.week_start).getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
      const week = `${new Date(item.week_start).getFullYear()}|${String(weekNum).padStart(2, '0')}`

      // Get historical data for this group
      const historicalSessions = groupData.slice(index).map(d => d.sessions)
      const historicalDemos = groupData.slice(index).map(d => d.demo_submit)
      const historicalSignups = groupData.slice(index).map(d => d.vf_signup)

      // Calculate WoW (previous week)
      const prevWeek = groupData[index + 1]
      const sessions_wow_pct = prevWeek ? calculatePercentageChange(item.sessions, prevWeek.sessions) : 0
      const demo_submit_wow_pct = prevWeek ? calculatePercentageChange(item.demo_submit, prevWeek.demo_submit) : 0
      const vf_signup_wow_pct = prevWeek ? calculatePercentageChange(item.vf_signup, prevWeek.vf_signup) : 0

      // Calculate vs 4-week average
      const sessions4wAvg = calculateMovingAverage(historicalSessions.slice(1, 5), 4)
      const demos4wAvg = calculateMovingAverage(historicalDemos.slice(1, 5), 4)
      const signups4wAvg = calculateMovingAverage(historicalSignups.slice(1, 5), 4)
      
      const sessions_4w_pct = calculatePercentageChange(item.sessions, sessions4wAvg)
      const demo_submit_4w_pct = calculatePercentageChange(item.demo_submit, demos4wAvg)
      const vf_signup_4w_pct = calculatePercentageChange(item.vf_signup, signups4wAvg)

      // Calculate vs 12-week average
      const sessions12wAvg = calculateMovingAverage(historicalSessions.slice(1, 13), 12)
      const demos12wAvg = calculateMovingAverage(historicalDemos.slice(1, 13), 12)
      const signups12wAvg = calculateMovingAverage(historicalSignups.slice(1, 13), 12)
      
      const sessions_12w_pct = calculatePercentageChange(item.sessions, sessions12wAvg)
      const demo_submit_12w_pct = calculatePercentageChange(item.demo_submit, demos12wAvg)
      const vf_signup_12w_pct = calculatePercentageChange(item.vf_signup, signups12wAvg)

      enhanced.push({
        ...item,
        week,
        sessions_wow_pct,
        sessions_4w_pct,
        sessions_12w_pct,
        demo_submit_wow_pct,
        demo_submit_4w_pct,
        demo_submit_12w_pct,
        vf_signup_wow_pct,
        vf_signup_4w_pct,
        vf_signup_12w_pct,
      })
    })
  })

  // Sort final results by week_start descending
  return enhanced.sort((a, b) => {
    const aItem = a as T & { week_start: string }
    const bItem = b as T & { week_start: string }
    return new Date(bItem.week_start).getTime() - new Date(aItem.week_start).getTime()
  })
}

// Heat map color function
const getHeatMapColor = (value: number, isDark: boolean) => {
  if (value === null || value === undefined || isNaN(value)) return "transparent"
  if (value === 0) return isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"
  
  const absValue = Math.abs(value)
  const intensity = Math.min(absValue / 20, 1) // Cap at 20% for max intensity
  
  if (value > 0) {
    // Lime green for positive (using the primary color)
    return isDark 
      ? `rgba(132, 204, 22, ${0.15 + intensity * 0.5})` // lime-500 with opacity
      : `rgba(101, 163, 13, ${0.08 + intensity * 0.4})` // lime-600 with opacity
  } else {
    // Red for negative
    return isDark
      ? `rgba(239, 68, 68, ${0.15 + intensity * 0.5})` // red-500 with opacity
      : `rgba(220, 38, 38, ${0.08 + intensity * 0.4})` // red-600 with opacity
  }
}

// Format percentage
const formatPercentage = (value: number) => {
  if (value === null || value === undefined || isNaN(value)) return "—"
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

// Format number with commas
const formatNumber = (value: number) => {
  if (value === null || value === undefined || isNaN(value)) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

// Custom cell renderer for heat map cells
const HeatMapCell: React.FC<{ value: number; isDark: boolean }> = ({ value, isDark }) => {
  const color = getHeatMapColor(value, isDark)
  const textColor = Math.abs(value) > 10 
    ? (value > 0 ? "rgb(101, 163, 13)" : "rgb(220, 38, 38)")
    : undefined

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-2 py-1.5 rounded text-xs font-medium"
      style={{
        backgroundColor: color,
        color: textColor,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex items-center gap-0.5">
        {value !== 0 && Math.abs(value) > 5 && (
          value > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )
        )}
        {formatPercentage(value)}
      </div>
    </motion.div>
  )
}

// Data fetching hooks
const useSiteWideKPIs = () => {
  return useQuery({
    queryKey: ["site-wide-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_totals")
        .select("*")
        .order("week_start", { ascending: false })

      if (error) throw error
      return enhanceWithPercentages(data || [])
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

const useChannelData = () => {
  return useQuery({
    queryKey: ["channel-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_by_channel")
        .select("*")
        .order("week_start", { ascending: false })
        .order("sessions", { ascending: false })
        .limit(2000) // Limit to top channels by sessions

      if (error) throw error
      return enhanceWithPercentages(data || [], item => item.channel)
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

const useSourceMediumData = () => {
  return useQuery({
    queryKey: ["source-medium-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_by_src_med")
        .select("*")
        .order("week_start", { ascending: false })
        .order("sessions", { ascending: false })
        .limit(3000) // Limit to top source/medium combinations

      if (error) throw error
      return enhanceWithPercentages(data || [], item => `${item.src}|${item.med}`)
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

const useCampaignData = () => {
  return useQuery({
    queryKey: ["campaign-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_by_campaign")
        .select("*")
        .order("week_start", { ascending: false })
        .order("sessions", { ascending: false })
        .limit(3000) // Limit to top campaigns

      if (error) throw error
      return enhanceWithPercentages(data || [], item => 
        `${item.src}|${item.med}|${item.camp || 'null'}|${item.kw || 'null'}|${item.first_src || 'null'}`
      )
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Table component
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  isLoading: boolean
  searchPlaceholder?: string
  filterColumns?: string[]
}

function DataTable<T>({ data, columns, isLoading, searchPlaceholder = "Search...", filterColumns = [] }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {filterColumns.map((column) => (
          <Select
            key={column}
            value={(table.getColumn(column)?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn(column)?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={`Filter ${column}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {column}s</SelectItem>
              {Array.from(new Set(data.map((row) => (row as Record<string, unknown>)[column]))).map((value) => (
                <SelectItem key={String(value)} value={String(value)}>
                  {String(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Columns
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <span className="text-primary">
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="p-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-2 py-2 text-xs">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function GA4WeeklyDrilldownDashboard() {
  const [selectedView, setSelectedView] = useState<"sitewide" | "channel" | "source" | "campaign">("sitewide")
  
  // Fetch all data
  const siteWideQuery = useSiteWideKPIs()
  const channelQuery = useChannelData()
  const sourceMediumQuery = useSourceMediumData()
  const campaignQuery = useCampaignData()

  // Check if dark mode
  const isDark = useMemo(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
    }
    return false
  }, [])

  // Define columns for each view
  const siteWideColumns = useMemo<ColumnDef<BaseMetrics & { 
    week: string
    sessions_wow_pct: number
    sessions_4w_pct: number
    sessions_12w_pct: number
    demo_submit_wow_pct: number
    demo_submit_4w_pct: number
    demo_submit_12w_pct: number
    vf_signup_wow_pct: number
    vf_signup_4w_pct: number
    vf_signup_12w_pct: number
  }>[]>(
    () => [
      {
        accessorKey: "week",
        header: "Week",
        cell: ({ row }) => <div className="font-medium">{row.getValue("week")}</div>,
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("sessions"))}</div>,
      },
      {
        accessorKey: "sessions_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "sessions_4w_pct",
        header: "vs 4W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_4w_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "sessions_12w_pct",
        header: "vs 12W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_12w_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit",
        header: "Demos",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("demo_submit"))}</div>,
      },
      {
        accessorKey: "demo_submit_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit_4w_pct",
        header: "vs 4W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_4w_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit_12w_pct",
        header: "vs 12W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_12w_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup",
        header: "Sign-ups",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("vf_signup"))}</div>,
      },
      {
        accessorKey: "vf_signup_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup_4w_pct",
        header: "vs 4W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_4w_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup_12w_pct",
        header: "vs 12W %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_12w_pct")} isDark={isDark} />,
      },
    ],
    [isDark]
  )

  const channelColumns = useMemo<ColumnDef<BaseMetrics & { 
    week: string
    sessions_wow_pct: number
    sessions_4w_pct: number
    sessions_12w_pct: number
    demo_submit_wow_pct: number
    demo_submit_4w_pct: number
    demo_submit_12w_pct: number
    vf_signup_wow_pct: number
    vf_signup_4w_pct: number
    vf_signup_12w_pct: number
    channel?: string
  }>[]>(
    () => [
      {
        accessorKey: "week",
        header: "Week",
        cell: ({ row }) => <div className="font-medium">{row.getValue("week")}</div>,
      },
      {
        accessorKey: "channel",
        header: "Channel",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue("channel")}
          </Badge>
        ),
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("sessions"))}</div>,
      },
      {
        accessorKey: "sessions_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit",
        header: "Demos",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("demo_submit"))}</div>,
      },
      {
        accessorKey: "demo_submit_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup",
        header: "Sign-ups",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("vf_signup"))}</div>,
      },
      {
        accessorKey: "vf_signup_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_wow_pct")} isDark={isDark} />,
      },
    ],
    [isDark]
  )

  const sourceMediumColumns = useMemo<ColumnDef<BaseMetrics & { 
    week: string
    sessions_wow_pct: number
    sessions_4w_pct: number
    sessions_12w_pct: number
    demo_submit_wow_pct: number
    demo_submit_4w_pct: number
    demo_submit_12w_pct: number
    vf_signup_wow_pct: number
    vf_signup_4w_pct: number
    vf_signup_12w_pct: number
    src?: string
    med?: string
  }>[]>(
    () => [
      {
        accessorKey: "week",
        header: "Week",
        cell: ({ row }) => <div className="font-medium">{row.getValue("week")}</div>,
      },
      {
        accessorKey: "src",
        header: "Source",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue("src")}
          </Badge>
        ),
      },
      {
        accessorKey: "med",
        header: "Medium",
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {row.getValue("med")}
          </Badge>
        ),
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("sessions"))}</div>,
      },
      {
        accessorKey: "sessions_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit",
        header: "Demos",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("demo_submit"))}</div>,
      },
      {
        accessorKey: "demo_submit_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup",
        header: "Sign-ups",
        cell: ({ row }) => <div className="font-semibold text-right">{formatNumber(row.getValue("vf_signup"))}</div>,
      },
      {
        accessorKey: "vf_signup_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_wow_pct")} isDark={isDark} />,
      },
    ],
    [isDark]
  )

  const campaignColumns = useMemo<ColumnDef<BaseMetrics & { 
    week: string
    sessions_wow_pct: number
    sessions_4w_pct: number
    sessions_12w_pct: number
    demo_submit_wow_pct: number
    demo_submit_4w_pct: number
    demo_submit_12w_pct: number
    vf_signup_wow_pct: number
    vf_signup_4w_pct: number
    vf_signup_12w_pct: number
    camp?: string | null
    kw?: string | null
    first_src?: string | null
    src?: string
    med?: string
  }>[]>(
    () => [
      {
        accessorKey: "week",
        header: "Week",
        cell: ({ row }) => <div className="font-medium text-xs">{row.getValue("week")}</div>,
      },
      {
        accessorKey: "src",
        header: "Source",
        cell: ({ row }) => <div className="text-xs">{row.getValue("src")}</div>,
      },
      {
        accessorKey: "med",
        header: "Medium",
        cell: ({ row }) => <div className="text-xs">{row.getValue("med")}</div>,
      },
      {
        accessorKey: "camp",
        header: "Campaign",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.getValue("camp") || "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "kw",
        header: "Keyword",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">{row.getValue("kw") || "—"}</div>
        ),
      },
      {
        accessorKey: "first_src",
        header: "First Touch",
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {row.getValue("first_src") || "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: ({ row }) => <div className="font-semibold text-right text-xs">{formatNumber(row.getValue("sessions"))}</div>,
      },
      {
        accessorKey: "sessions_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("sessions_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "demo_submit",
        header: "Demos",
        cell: ({ row }) => <div className="font-semibold text-right text-xs">{formatNumber(row.getValue("demo_submit"))}</div>,
      },
      {
        accessorKey: "demo_submit_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("demo_submit_wow_pct")} isDark={isDark} />,
      },
      {
        accessorKey: "vf_signup",
        header: "Sign-ups",
        cell: ({ row }) => <div className="font-semibold text-right text-xs">{formatNumber(row.getValue("vf_signup"))}</div>,
      },
      {
        accessorKey: "vf_signup_wow_pct",
        header: "WoW %",
        cell: ({ row }) => <HeatMapCell value={row.getValue("vf_signup_wow_pct")} isDark={isDark} />,
      },
    ],
    [isDark]
  )

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const data = siteWideQuery.data
    if (!data || data.length === 0) return null
    const latest = data[0]
    return {
      sessions: {
        total: latest.sessions,
        change: latest.sessions_wow_pct,
      },
      demos: {
        total: latest.demo_submit,
        change: latest.demo_submit_wow_pct,
      },
      signups: {
        total: latest.vf_signup,
        change: latest.vf_signup_wow_pct,
      },
    }
  }, [siteWideQuery.data])

  // Metric card component
  const MetricCard: React.FC<{
    title: string
    value: number
    change: number
    icon: React.ReactNode
    color: string
  }> = ({ title, value, change, icon, color }) => {
    const isPositive = change > 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">{formatNumber(value)}</h3>
                  <Badge
                    variant={isPositive ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                    {formatPercentage(change)}
                  </Badge>
                </div>
              </div>
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: `${color}20` }}
              >
                {React.isValidElement(icon) 
                  ? React.cloneElement(icon as React.ReactElement<{ className?: string; style?: React.CSSProperties }>, {
                      className: "w-5 h-5",
                      style: { color },
                    })
                  : icon}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <TooltipProvider>
      <div className="w-full space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              GA-4 Weekly Drill-Downs
            </h1>
            <p className="text-muted-foreground mt-1">Weekly performance analysis with real-time data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                siteWideQuery.refetch()
                channelQuery.refetch()
                sourceMediumQuery.refetch()
                campaignQuery.refetch()
              }}
              variant="outline"
              size="sm"
              disabled={siteWideQuery.isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", siteWideQuery.isLoading && "animate-spin")} />
              Refresh All
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Sessions This Week"
              value={summaryStats.sessions.total}
              change={summaryStats.sessions.change}
              icon={<Activity />}
              color="rgb(132, 204, 22)"
            />
            <MetricCard
              title="Demo Submissions"
              value={summaryStats.demos.total}
              change={summaryStats.demos.change}
              icon={<FileText />}
              color="rgb(59, 130, 246)"
            />
            <MetricCard
              title="VF Sign-ups"
              value={summaryStats.signups.total}
              change={summaryStats.signups.change}
              icon={<UserPlus />}
              color="rgb(168, 85, 247)"
            />
          </div>
        )}

        {/* Main Content */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as "sitewide" | "channel" | "source" | "campaign")} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="sitewide" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Site-wide
                </TabsTrigger>
                <TabsTrigger value="channel" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Channel
                </TabsTrigger>
                <TabsTrigger value="source" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Source × Medium
                </TabsTrigger>
                <TabsTrigger value="campaign" className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  Campaign
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {selectedView === "sitewide" && (
              <DataTable
                data={siteWideQuery.data || []}
                columns={siteWideColumns}
                isLoading={siteWideQuery.isLoading}
                searchPlaceholder="Search weeks..."
              />
            )}
            {selectedView === "channel" && (
              <DataTable
                data={channelQuery.data || []}
                columns={channelColumns}
                isLoading={channelQuery.isLoading}
                searchPlaceholder="Search channels..."
                filterColumns={["channel"]}
              />
            )}
            {selectedView === "source" && (
              <DataTable
                data={sourceMediumQuery.data || []}
                columns={sourceMediumColumns}
                isLoading={sourceMediumQuery.isLoading}
                searchPlaceholder="Search sources..."
                filterColumns={["src", "med"]}
              />
            )}
            {selectedView === "campaign" && (
              <DataTable
                data={campaignQuery.data || []}
                columns={campaignColumns}
                isLoading={campaignQuery.isLoading}
                searchPlaceholder="Search campaigns or keywords..."
                filterColumns={["camp", "first_src"]}
              />
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Using Materialized Views</p>
              <p className="text-xs text-muted-foreground">
                Data is served from lightweight materialized views. Percentages are calculated client-side for maximum flexibility.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}