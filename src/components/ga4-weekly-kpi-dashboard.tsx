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
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,

  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
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

} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {

  TooltipProvider,

} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Generate mock data for demonstration (commented out - not currently used)
// const generateMockData = (): WeeklyKpiData[] => {
//   const data: WeeklyKpiData[] = []
//   const currentDate = new Date()
//   
//   for (let i = 0; i < 26; i++) {
//     const weekDate = new Date(currentDate)
//     weekDate.setDate(weekDate.getDate() - (i * 7))
//     
//     // Generate realistic-looking data with some variance
//     const sessionsBase = 25000 - (i * 200) + Math.random() * 5000
//     const demosBase = 450 - (i * 5) + Math.random() * 100
//     const signupsBase = 320 - (i * 3) + Math.random() * 80
//     
//     data.push({
//       week: `${weekDate.getFullYear()}|${String(Math.floor((weekDate.getTime() - new Date(weekDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1).padStart(2, '0')}`,
//       sessions_total: Math.floor(sessionsBase),
//       sessions_wow: Math.floor((Math.random() - 0.5) * 2000),
//       "sessions_wow_%": parseFloat(((Math.random() - 0.5) * 20).toFixed(1)),
//       sessions_vs_4w: Math.floor((Math.random() - 0.5) * 3000),
//       "sessions_vs_4w_%": parseFloat(((Math.random() - 0.5) * 15).toFixed(1)),
//       sessions_vs_12w: Math.floor((Math.random() - 0.5) * 4000),
//       "sessions_vs_12w_%": parseFloat(((Math.random() - 0.5) * 25).toFixed(1)),
//       demos_total: Math.floor(demosBase),
//       demos_wow: Math.floor((Math.random() - 0.5) * 50),
//       "demos_wow_%": parseFloat(((Math.random() - 0.5) * 15).toFixed(1)),
//       demos_vs_4w: Math.floor((Math.random() - 0.5) * 60),
//       "demos_vs_4w_%": parseFloat(((Math.random() - 0.5) * 12).toFixed(1)),
//       demos_vs_12w: Math.floor((Math.random() - 0.5) * 80),
//       "demos_vs_12w_%": parseFloat(((Math.random() - 0.5) * 18).toFixed(1)),
//       signups_total: Math.floor(signupsBase),
//       signups_wow: Math.floor((Math.random() - 0.5) * 40),
//       "signups_wow_%": parseFloat(((Math.random() - 0.5) * 18).toFixed(1)),
//       signups_vs_4w: Math.floor((Math.random() - 0.5) * 50),
//       "signups_vs_4w_%": parseFloat(((Math.random() - 0.5) * 14).toFixed(1)),
//       signups_vs_12w: Math.floor((Math.random() - 0.5) * 70),
//       "signups_vs_12w_%": parseFloat(((Math.random() - 0.5) * 20).toFixed(1)),
//     })
//   }
//   
//   return data
// }

// Types
interface WeeklyKpiData {
  week: string
  sessions_total: number
  sessions_wow: number
  "sessions_wow_%": number
  sessions_vs_4w: number
  "sessions_vs_4w_%": number
  sessions_vs_12w: number
  "sessions_vs_12w_%": number
  demos_total: number
  demos_wow: number
  "demos_wow_%": number
  demos_vs_4w: number
  "demos_vs_4w_%": number
  demos_vs_12w: number
  "demos_vs_12w_%": number
  signups_total: number
  signups_wow: number
  "signups_wow_%": number
  signups_vs_4w: number
  "signups_vs_4w_%": number
  signups_vs_12w: number
  "signups_vs_12w_%": number
}

// Custom hook for fetching REAL data - NO MOCK DATA
const useWeeklyKpiData = () => {
  return useQuery({
    queryKey: ["weekly-kpi-data"],
    queryFn: async () => {
      // ONLY REAL DATA - NO MOCK DATA
      try {
        const { data, error } = await supabase.from("wk_totals").select(`
          week_start,
          sessions,
          sessions_vs_prev,
          sessions_vs_prev_pct,
          sessions_vs_4w_avg,
          sessions_vs_4w_avg_pct,
          sessions_vs_12w_avg,
          sessions_vs_12w_avg_pct,
          demo_submit,
          demo_submit_vs_prev,
          demo_submit_vs_prev_pct,
          demo_submit_vs_4w_avg,
          demo_submit_vs_4w_avg_pct,
          demo_submit_vs_12w_avg,
          demo_submit_vs_12w_avg_pct,
          vf_signup,
          vf_signup_vs_prev,
          vf_signup_vs_prev_pct,
          vf_signup_vs_4w_avg,
          vf_signup_vs_4w_avg_pct,
          vf_signup_vs_12w_avg,
          vf_signup_vs_12w_avg_pct
        `)
        .order("week_start", { ascending: false })
        // Removed .limit(26) - fetching ALL available weeks now!

        if (error) {
          console.error("Failed to fetch data:", error)
          throw error // Throw error - no fallback to mock data
        }
        
        // Transform the data to match our interface
        const transformedData = data?.map(item => ({
          week: new Date(item.week_start).toISOString().slice(0, 10).replace(/-/g, '/'),
          sessions_total: item.sessions,
          sessions_wow: item.sessions_vs_prev,
          "sessions_wow_%": item.sessions_vs_prev_pct,
          sessions_vs_4w: item.sessions_vs_4w_avg,
          "sessions_vs_4w_%": item.sessions_vs_4w_avg_pct,
          sessions_vs_12w: item.sessions_vs_12w_avg,
          "sessions_vs_12w_%": item.sessions_vs_12w_avg_pct,
          demos_total: item.demo_submit,
          demos_wow: item.demo_submit_vs_prev,
          "demos_wow_%": item.demo_submit_vs_prev_pct,
          demos_vs_4w: item.demo_submit_vs_4w_avg,
          "demos_vs_4w_%": item.demo_submit_vs_4w_avg_pct,
          demos_vs_12w: item.demo_submit_vs_12w_avg,
          "demos_vs_12w_%": item.demo_submit_vs_12w_avg_pct,
          signups_total: item.vf_signup,
          signups_wow: item.vf_signup_vs_prev,
          "signups_wow_%": item.vf_signup_vs_prev_pct,
          signups_vs_4w: item.vf_signup_vs_4w_avg,
          "signups_vs_4w_%": item.vf_signup_vs_4w_avg_pct,
          signups_vs_12w: item.vf_signup_vs_12w_avg,
          "signups_vs_12w_%": item.vf_signup_vs_12w_avg_pct,
        })) || []
        
        return transformedData as WeeklyKpiData[]
      } catch (err) {
        console.error("Error fetching data:", err)
        throw err // No fallback to mock data
      }
    },
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000,
  })
}

// Heat map color function
const getHeatMapColor = (value: number, isDark: boolean) => {
  if (value === 0) return isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
  
  const absValue = Math.abs(value)
  const intensity = Math.min(absValue / 20, 1) // Cap at 20% for max intensity
  
  if (value > 0) {
    // Lime green for positive (using the primary color)
    return isDark 
      ? `rgba(132, 204, 22, ${0.2 + intensity * 0.6})` // lime-500 with opacity
      : `rgba(101, 163, 13, ${0.1 + intensity * 0.5})` // lime-600 with opacity
  } else {
    // Red for negative
    return isDark
      ? `rgba(239, 68, 68, ${0.2 + intensity * 0.6})` // red-500 with opacity
      : `rgba(220, 38, 38, ${0.1 + intensity * 0.5})` // red-600 with opacity
  }
}

// Format percentage
const formatPercentage = (value: number) => {
  if (value === null || value === undefined) return "—"
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

// Format number with commas
const formatNumber = (value: number) => {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("en-US").format(value)
}

// Custom cell renderer for heat map cells
const HeatMapCell: React.FC<{ value: number; isDark: boolean }> = ({ value, isDark }) => {
  const color = getHeatMapColor(value, isDark)
  const textColor = "white" // Always use white text for heat maps

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative px-3 py-2 rounded-md font-medium text-sm"
      style={{
        backgroundColor: color,
        color: textColor,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex items-center gap-1">
        {value !== 0 && (
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
                <h3 className="text-3xl font-bold tracking-tight">{formatNumber(value)}</h3>
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
                    className: "w-6 h-6",
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

export function GA4WeeklyKPIDashboard() {
  // ONLY REAL DATA - NO DEMO MODE
  const { data, isLoading, error, refetch } = useWeeklyKpiData()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [selectedMetric, setSelectedMetric] = useState<"sessions" | "demos" | "signups">("sessions")

  // Check if dark mode
  const isDark = useMemo(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
    }
    return false
  }, [])

  // Define columns
  const columns = useMemo<ColumnDef<WeeklyKpiData>[]>(
    () => [
      {
        accessorKey: "week",
        header: "Week",
        cell: ({ row }) => (
          <div className="font-medium text-sm">
            {row.getValue("week")}
          </div>
        ),
        filterFn: "includesString",
      },
      // Sessions columns
      {
        accessorKey: "sessions_total",
        header: "Sessions",
        cell: ({ row }) => (
          <div className="font-semibold text-right">
            {formatNumber(row.getValue("sessions_total"))}
          </div>
        ),
      },
      {
        accessorKey: "sessions_wow_%",
        header: "WoW %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("sessions_wow_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "sessions_vs_4w_%",
        header: "vs 4W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("sessions_vs_4w_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "sessions_vs_12w_%",
        header: "vs 12W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("sessions_vs_12w_%")} isDark={isDark} />
        ),
      },
      // Demos columns
      {
        accessorKey: "demos_total",
        header: "Demos",
        cell: ({ row }) => (
          <div className="font-semibold text-right">
            {formatNumber(row.getValue("demos_total"))}
          </div>
        ),
      },
      {
        accessorKey: "demos_wow_%",
        header: "WoW %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("demos_wow_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "demos_vs_4w_%",
        header: "vs 4W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("demos_vs_4w_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "demos_vs_12w_%",
        header: "vs 12W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("demos_vs_12w_%")} isDark={isDark} />
        ),
      },
      // Signups columns
      {
        accessorKey: "signups_total",
        header: "Sign-ups",
        cell: ({ row }) => (
          <div className="font-semibold text-right">
            {formatNumber(row.getValue("signups_total"))}
          </div>
        ),
      },
      {
        accessorKey: "signups_wow_%",
        header: "WoW %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("signups_wow_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "signups_vs_4w_%",
        header: "vs 4W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("signups_vs_4w_%")} isDark={isDark} />
        ),
      },
      {
        accessorKey: "signups_vs_12w_%",
        header: "vs 12W %",
        cell: ({ row }) => (
          <HeatMapCell value={row.getValue("signups_vs_12w_%")} isDark={isDark} />
        ),
      },
    ],
    [isDark]
  )

  const table = useReactTable({
    data: data || [],
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

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data) return []
    return [...data].reverse().map((item) => ({
      week: item.week,
      sessions: item.sessions_total,
      demos: item.demos_total,
      signups: item.signups_total,
      "sessions_%": item["sessions_wow_%"],
      "demos_%": item["demos_wow_%"],
      "signups_%": item["signups_wow_%"],
    }))
  }, [data])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!data || data.length === 0) return null
    const latest = data[0]
    return {
      sessions: {
        total: latest.sessions_total,
        change: latest["sessions_wow_%"],
      },
      demos: {
        total: latest.demos_total,
        change: latest["demos_wow_%"],
      },
      signups: {
        total: latest.signups_total,
        change: latest["signups_wow_%"],
      },
    }
  }, [data])

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
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
              Weekly KPI Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Site-wide performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          summaryStats && (
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
          )
        )}

        {/* Charts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Trend Analysis</CardTitle>
              <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as "sessions" | "signups" | "demos")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="demos">Demo Submissions</SelectItem>
                  <SelectItem value="signups">Sign-ups</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="trend" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="trend">Trend</TabsTrigger>
                <TabsTrigger value="comparison">Week-over-Week</TabsTrigger>
              </TabsList>
              <TabsContent value="trend" className="mt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(132, 204, 22)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="rgb(132, 204, 22)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "rgb(30, 30, 30)" : "white",
                        border: "1px solid rgba(132, 204, 22, 0.2)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: isDark ? "white" : "black" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="rgb(132, 204, 22)"
                      strokeWidth={2}
                      fill="url(#colorPrimary)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="comparison" className="mt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "rgb(30, 30, 30)" : "white",
                        border: "1px solid rgba(132, 204, 22, 0.2)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: isDark ? "white" : "black" }}
                    />
                    <Bar dataKey={`${selectedMetric}_%`}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry[`${selectedMetric}_%`] > 0
                              ? "rgb(132, 204, 22)"
                              : "rgb(239, 68, 68)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Detailed Metrics</CardTitle>
                <CardDescription>Week-by-week performance breakdown</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search weeks..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="max-w-sm"
                />
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
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted/70 transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-2">
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
                              <td key={cell.id} className="px-3 py-3 text-sm">
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
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}