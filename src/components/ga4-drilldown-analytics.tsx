"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  MousePointer,
  Search,
  Filter as FilterIcon,
  Download
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

// Types for each drill-down view
interface DrillDownData {
  week_start: string
  total_sessions: number
  engaged_sessions: number
  new_users: number
  avg_session_duration: number
  active_users: number
  demo_submits: number
  signups: number
  page_views: number
  demo_conversion_rate: number
  signup_conversion_rate: number
}

interface CampaignData extends DrillDownData {
  campaign: string
}

interface MediumData extends DrillDownData {
  medium: string
}

interface ChannelData extends DrillDownData {
  channel: string
}

interface FirstSourceData extends DrillDownData {
  first_source: string
}

// Custom hooks for fetching data
const useDrillDownData = <T extends DrillDownData>(viewName: string) => {
  return useQuery({
    queryKey: [viewName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .order('week_start', { ascending: false })
      
      if (error) throw error
      
      // Log data retrieval info
      if (data && data.length > 0) {
        console.log(`[Drill-Down: ${viewName}] Fetched ${data.length} records`)
        const weeks = new Set(data.map((d: DrillDownData) => d.week_start)).size
        console.log(`[Drill-Down: ${viewName}] Covering ${weeks} unique weeks`)
      }
      
      return data as T[]
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

// Metric card component
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon,
  color = "default"
}: {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  color?: "default" | "success" | "warning" | "danger"
}) => {
  const colorClasses = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {change >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    change >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className={cn("p-2 rounded-lg bg-muted/50", colorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Generic drill-down table component
const DrillDownTable = <T extends DrillDownData & Record<string, unknown>>({
  data,
  dimensionKey,
  dimensionLabel,
  isLoading
}: {
  data: T[]
  dimensionKey: string
  dimensionLabel: string
  isLoading: boolean
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'week_start', desc: true }
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  // Format numbers
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0'
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0.0%'
    return `${num.toFixed(1)}%`
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Define columns
  const columns: ColumnDef<T>[] = [
    {
      accessorKey: 'week_start',
      header: () => <div className="font-semibold">Week</div>,
      size: 180,
      cell: ({ row }) => {
        const date = new Date(row.getValue('week_start'))
        const endDate = new Date(date)
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
        const weekNumber = getISOWeek(date)
        
        return (
          <div className="whitespace-nowrap">
            <div className="space-y-0.5">
              <div className="text-base font-semibold tabular-nums text-primary/80">
                W{weekNumber.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <div>{format(date, "MMM dd")} - {format(endDate, "MMM dd")}</div>
                <div className="text-[10px] opacity-70">{format(date, "yyyy")}</div>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: dimensionKey,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {dimensionLabel}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue(dimensionKey) as string
        return (
          <div className="font-medium">
            {value || '(not set)'}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'total_sessions',
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="-mr-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Sessions
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const value = row.getValue('total_sessions') as number
        return <div className="text-right font-medium tabular-nums">{formatNumber(value || 0)}</div>
      },
    },
    {
      accessorKey: 'engaged_sessions',
      header: () => <div className="text-right">Engaged</div>,
      cell: ({ row }) => {
        const value = row.getValue('engaged_sessions') as number
        const total = row.getValue('total_sessions') as number
        const rate = total > 0 ? ((value || 0) / total) * 100 : 0
        return (
          <div className="text-right space-y-1">
            <div className="tabular-nums">{formatNumber(value || 0)}</div>
            <div className="text-xs text-muted-foreground">{formatPercentage(rate)}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'new_users',
      header: () => <div className="text-right">New Users</div>,
      cell: ({ row }) => {
        const value = row.getValue('new_users') as number
        return <div className="text-right tabular-nums">{formatNumber(value || 0)}</div>
      },
    },
    {
      accessorKey: 'avg_session_duration',
      header: () => <div className="text-right">Avg Duration</div>,
      cell: ({ row }) => {
        const value = row.getValue('avg_session_duration') as number
        return <div className="text-right tabular-nums">{formatDuration(value || 0)}</div>
      },
    },
    {
      accessorKey: 'demo_submits',
      header: () => <div className="text-right">Demos</div>,
      cell: ({ row }) => {
        const value = row.getValue('demo_submits') as number
        const rate = row.original.demo_conversion_rate as number
        return (
          <div className="text-right space-y-1">
            <div className="tabular-nums font-medium">{formatNumber(value || 0)}</div>
            <Badge variant={rate > 2 ? "default" : "secondary"} className="text-xs">
              {formatPercentage(rate)}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'signups',
      header: () => <div className="text-right">Signups</div>,
      cell: ({ row }) => {
        const value = row.getValue('signups') as number
        const rate = row.original.signup_conversion_rate as number
        return (
          <div className="text-right space-y-1">
            <div className="tabular-nums font-medium">{formatNumber(value || 0)}</div>
            <Badge variant={rate > 1 ? "default" : "secondary"} className="text-xs">
              {formatPercentage(rate)}
            </Badge>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
  })

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const latestWeek = data[0]?.week_start
    const latestData = data.filter(d => d.week_start === latestWeek)
    
    return {
      totalSessions: latestData.reduce((sum, d) => sum + (d.total_sessions || 0), 0),
      totalDemos: latestData.reduce((sum, d) => sum + (d.demo_submits || 0), 0),
      totalSignups: latestData.reduce((sum, d) => sum + (d.signups || 0), 0),
      avgConversionRate: latestData.length > 0 
        ? latestData.reduce((sum, d) => sum + (d.demo_conversion_rate || 0), 0) / latestData.length
        : 0
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Sessions"
            value={formatNumber(summaryMetrics.totalSessions)}
            icon={Users}
            color="default"
          />
          <MetricCard
            title="Demo Submits"
            value={formatNumber(summaryMetrics.totalDemos)}
            icon={Target}
            color="success"
          />
          <MetricCard
            title="Signups"
            value={formatNumber(summaryMetrics.totalSignups)}
            icon={MousePointer}
            color="success"
          />
          <MetricCard
            title="Avg Conversion"
            value={formatPercentage(summaryMetrics.avgConversionRate)}
            icon={TrendingUp}
            color={summaryMetrics.avgConversionRate > 2 ? "success" : "warning"}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search all fields...`}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Dimension Filter Dropdown */}
        <Select
          value={(table.getColumn(dimensionKey)?.getFilterValue() as string[])?.join(',') || 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              table.getColumn(dimensionKey)?.setFilterValue(undefined)
            } else {
              table.getColumn(dimensionKey)?.setFilterValue([value])
            }
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={`Filter ${dimensionLabel}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {dimensionLabel}s</SelectItem>
            {Array.from(new Set(data?.map(d => d[dimensionKey] as string) || []))
              .filter(Boolean)
              .sort()
              .map((value) => (
                <SelectItem key={value} value={value}>
                  {value || '(not set)'}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b transition-colors",
                        "hover:bg-muted/50"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main component
export function GA4DrillDownAnalytics() {
  const [activeTab, setActiveTab] = useState("campaign")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch data for each view
  const campaignQuery = useDrillDownData<CampaignData>('ga4_by_campaign')
  const mediumQuery = useDrillDownData<MediumData>('ga4_by_medium')
  const channelQuery = useDrillDownData<ChannelData>('ga4_by_channel')
  const firstSourceQuery = useDrillDownData<FirstSourceData>('ga4_by_first_source')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      campaignQuery.refetch(),
      mediumQuery.refetch(),
      channelQuery.refetch(),
      firstSourceQuery.refetch()
    ])
    setIsRefreshing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Drill-Down</h1>
          <p className="text-muted-foreground text-sm">
            Deep dive into your GA4 data by campaign, medium, channel, and source
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="campaign">Campaign</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="channel">Channel</TabsTrigger>
          <TabsTrigger value="source">First Source</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="space-y-6">
          <DrillDownTable
            data={campaignQuery.data || []}
            dimensionKey="campaign"
            dimensionLabel="Campaign"
            isLoading={campaignQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="medium" className="space-y-6">
          <DrillDownTable
            data={mediumQuery.data || []}
            dimensionKey="medium"
            dimensionLabel="Medium"
            isLoading={mediumQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="channel" className="space-y-6">
          <DrillDownTable
            data={channelQuery.data || []}
            dimensionKey="channel"
            dimensionLabel="Channel"
            isLoading={channelQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="source" className="space-y-6">
          <DrillDownTable
            data={firstSourceQuery.data || []}
            dimensionKey="first_source"
            dimensionLabel="First User Source"
            isLoading={firstSourceQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}