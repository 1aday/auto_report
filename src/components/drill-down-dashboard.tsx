"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, Filter, Users, Target } from "lucide-react"
import { StyledMetricCard } from "@/components/ui/metric-card"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Types for drill-down data
interface DrillDownData {
  week_start: string
  dimension_value: string
  sessions: number
  demo_submit: number
  vf_signup: number
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
  signup_conversion_rate: number
  demo_conversion_rate: number
}

// Dimension configurations
const DIMENSIONS = {
  campaign: {
    label: "Campaign",
    column: "session_campaign_name",
    table: "weekly_breakdown"
  },
  source: {
    label: "Source",
    column: "session_source",
    table: "weekly_breakdown"
  },
  channel: {
    label: "Channel Grouping",
    column: "session_default_channel_grouping",
    table: "weekly_breakdown"
  },
  first_user_source: {
    label: "First User Source",
    column: "first_user_source",
    table: "weekly_breakdown"
  }
}

// Fetch data for a specific dimension
const useDrillDownData = (dimension: string, filter?: string) => {
  return useQuery({
    queryKey: ["drill-down", dimension, filter],
    queryFn: async () => {
      const dimConfig = DIMENSIONS[dimension as keyof typeof DIMENSIONS]
      if (!dimConfig) throw new Error("Invalid dimension")

      // When filtering by a specific value, we need to aggregate the data
      // because weekly_breakdown has multiple rows per week with different values in other dimensions
      if (filter && filter !== "all") {
        // Use RPC to aggregate data properly
        const { data, error } = await supabase.rpc('aggregate_weekly_by_dimension', {
          dimension_column: dimConfig.column,
          dimension_value: filter
        })
        
        if (error) {
          // RPC function not found or error - fallback to client-side aggregation
          // This is expected if the RPC hasn't been created yet
          type FallbackRow = { 
            week_start: string; 
            sessions?: number; 
            demo_submit?: number; 
            vf_signup?: number; 
            [key: string]: unknown 
          }
          
          const { data: rawData, error: fallbackError } = await supabase
            .from("weekly_breakdown")
            .select("week_start, " + dimConfig.column + ", sessions, demo_submit, vf_signup")
            .eq(dimConfig.column, filter)
            .order("week_start", { ascending: false })
          
          if (fallbackError) throw fallbackError
          
          // Aggregate by week_start
          const aggregated: Record<string, RawData> = {}
          const typedRawData = rawData as unknown as FallbackRow[] | null
          typedRawData?.forEach((row) => {
            const key = row.week_start
            if (!aggregated[key]) {
              aggregated[key] = {
                week_start: row.week_start,
                [dimConfig.column]: filter,
                sessions: 0,
                demo_submit: 0,
                vf_signup: 0
              }
            }
            aggregated[key].sessions += row.sessions || 0
            aggregated[key].demo_submit += row.demo_submit || 0
            aggregated[key].vf_signup += row.vf_signup || 0
          })
          
          const processedData = processDataWithComparisons(Object.values(aggregated), dimConfig.column)
          console.log(`[Drill-Down] Aggregated ${rawData?.length} rows into ${processedData.length} weekly records for ${dimension}="${filter}"`)
          return processedData
        }
        
        // RPC succeeded - use server-aggregated data
        const processedData = processDataWithComparisons(data || [], dimConfig.column)
        console.log(`[Drill-Down] Server-aggregated ${processedData.length} weekly records for ${dimension}="${filter}"`)
        return processedData
      } else {
        // For "all", first get top 20 dimension values by total sessions
        const { data: topDimensions, error: topError } = await supabase
          .from("weekly_breakdown")
          .select(dimConfig.column + ", sessions")
        
        if (topError) throw topError
        
        // Aggregate sessions by dimension value
        const sessionsByDim: Record<string, number> = {}
        const typedTopDimensions = topDimensions as unknown as Record<string, unknown>[] | null
        typedTopDimensions?.forEach((row) => {
          const dimValue = row[dimConfig.column] as string || '(not set)'
          sessionsByDim[dimValue] = (sessionsByDim[dimValue] || 0) + (row.sessions as number || 0)
        })
        
        // Get top 20 dimension values by total sessions
        const top20 = Object.entries(sessionsByDim)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([value]) => value)
        
        console.log(`[Drill-Down] Top 20 ${dimension} values by sessions:`, top20.slice(0, 5), '...')
        
        // Now fetch data only for top 20 dimension values
        const { data, error } = await supabase
          .from("weekly_breakdown")
          .select("week_start, " + dimConfig.column + ", sessions, demo_submit, vf_signup")
          .in(dimConfig.column, top20)
          .order("week_start", { ascending: false })

        if (error) throw error

        // Process data to calculate week-over-week changes
        const typedData = data as unknown as RawData[] | null
        const processedData = processDataWithComparisons(typedData || [], dimConfig.column)
        
        console.log(`[Drill-Down] Fetched ${processedData.length} records for top 20 ${dimension} values`)
        return processedData
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

interface RawData {
  week_start: string
  sessions: number
  demo_submit: number
  vf_signup: number
  [key: string]: string | number
}

// Process data to add comparison metrics
function processDataWithComparisons(data: RawData[], dimensionColumn: string): DrillDownData[] {
  // First, aggregate data by week_start and dimension value to handle duplicates
  const aggregated: Record<string, RawData> = {}
  
  data.forEach(item => {
    const key = `${item.week_start}|${item[dimensionColumn] || '(not set)'}`
    if (!aggregated[key]) {
      aggregated[key] = { ...item }
    } else {
      // Sum up the metrics if there are duplicates
      aggregated[key].sessions = (aggregated[key].sessions || 0) + (item.sessions || 0)
      aggregated[key].demo_submit = (aggregated[key].demo_submit || 0) + (item.demo_submit || 0)
      aggregated[key].vf_signup = (aggregated[key].vf_signup || 0) + (item.vf_signup || 0)
    }
  })
  
  // Convert back to array
  const uniqueData = Object.values(aggregated)
  
  // Group by dimension value for comparison calculations
  const byDimension: Record<string, RawData[]> = {}
  
  uniqueData.forEach(item => {
    const key = item[dimensionColumn] || '(not set)'
    if (!byDimension[key]) byDimension[key] = []
    byDimension[key].push(item)
  })

  const result: DrillDownData[] = []

  // Process each dimension value separately
  Object.keys(byDimension).forEach(dimValue => {
    const dimData = byDimension[dimValue]
      .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())

    dimData.forEach((item, index) => {
      const prev = index > 0 ? dimData[index - 1] : null
      const prev4w = dimData.slice(Math.max(0, index - 4), index)
      const prev12w = dimData.slice(Math.max(0, index - 12), index)

      // Calculate averages
      const avg4w_sessions = prev4w.length > 0 ? prev4w.reduce((sum, d) => sum + d.sessions, 0) / prev4w.length : null
      const avg12w_sessions = prev12w.length > 0 ? prev12w.reduce((sum, d) => sum + d.sessions, 0) / prev12w.length : null
      const avg4w_demos = prev4w.length > 0 ? prev4w.reduce((sum, d) => sum + d.demo_submit, 0) / prev4w.length : null
      const avg12w_demos = prev12w.length > 0 ? prev12w.reduce((sum, d) => sum + d.demo_submit, 0) / prev12w.length : null
      const avg4w_signups = prev4w.length > 0 ? prev4w.reduce((sum, d) => sum + d.vf_signup, 0) / prev4w.length : null
      const avg12w_signups = prev12w.length > 0 ? prev12w.reduce((sum, d) => sum + d.vf_signup, 0) / prev12w.length : null

      result.push({
        week_start: item.week_start,
        dimension_value: dimValue,
        sessions: item.sessions || 0,
        demo_submit: item.demo_submit || 0,
        vf_signup: item.vf_signup || 0,
        sessions_vs_prev: prev ? item.sessions - prev.sessions : null,
        sessions_vs_prev_pct: prev && prev.sessions ? ((item.sessions - prev.sessions) / prev.sessions) * 100 : null,
        sessions_vs_4w_pct: avg4w_sessions ? ((item.sessions - avg4w_sessions) / avg4w_sessions) * 100 : null,
        sessions_vs_12w_pct: avg12w_sessions ? ((item.sessions - avg12w_sessions) / avg12w_sessions) * 100 : null,
        demo_submit_vs_prev: prev ? item.demo_submit - prev.demo_submit : null,
        demo_submit_vs_prev_pct: prev && prev.demo_submit ? ((item.demo_submit - prev.demo_submit) / prev.demo_submit) * 100 : null,
        demo_submit_vs_4w_pct: avg4w_demos ? ((item.demo_submit - avg4w_demos) / avg4w_demos) * 100 : null,
        demo_submit_vs_12w_pct: avg12w_demos ? ((item.demo_submit - avg12w_demos) / avg12w_demos) * 100 : null,
        vf_signup_vs_prev: prev ? item.vf_signup - prev.vf_signup : null,
        vf_signup_vs_prev_pct: prev && prev.vf_signup ? ((item.vf_signup - prev.vf_signup) / prev.vf_signup) * 100 : null,
        vf_signup_vs_4w_pct: avg4w_signups ? ((item.vf_signup - avg4w_signups) / avg4w_signups) * 100 : null,
        vf_signup_vs_12w_pct: avg12w_signups ? ((item.vf_signup - avg12w_signups) / avg12w_signups) * 100 : null,
        signup_conversion_rate: item.sessions > 0 ? (item.vf_signup / item.sessions) * 100 : 0,
        demo_conversion_rate: item.sessions > 0 ? (item.demo_submit / item.sessions) * 100 : 0,
      })
    })
  })

  return result.sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime())
}

// Get unique dimension values sorted by total sessions
interface DimensionValueWithSessions {
  value: string
  sessions: number
}

const useDimensionValues = (dimension: string) => {
  return useQuery({
    queryKey: ["dimension-values", dimension],
    queryFn: async () => {
      const dimConfig = DIMENSIONS[dimension as keyof typeof DIMENSIONS]
      if (!dimConfig) throw new Error("Invalid dimension")

      const { data, error } = await supabase
        .from("weekly_breakdown")
        .select(dimConfig.column + ", sessions")

      if (error) throw error
      
      // Group by dimension value and sum sessions
      const sessionsByDimension: Record<string, number> = {}
      const typedData = data as unknown as Record<string, unknown>[] | null
      typedData?.forEach(row => {
        const dimValue = row[dimConfig.column] as string || '(not set)'
        sessionsByDimension[dimValue] = (sessionsByDimension[dimValue] || 0) + (row.sessions as number || 0)
      })
      
      // Sort by total sessions descending and return with session counts
      const sortedValues = Object.entries(sessionsByDimension)
        .sort((a, b) => b[1] - a[1]) // Sort by sessions count (descending)
        .map(([value, sessions]): DimensionValueWithSessions => ({
          value,
          sessions
        }))
      
      return sortedValues
    },
    staleTime: 300000, // Cache for 5 minutes
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

// Main component
export function DrillDownDashboard() {
  const [selectedDimension, setSelectedDimension] = useState<string>("campaign")
  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  
  const { data: dimensionValues } = useDimensionValues(selectedDimension)
  const { data, isLoading, error, refetch } = useDrillDownData(selectedDimension, selectedFilter)

  // Reset filter when dimension changes
  useEffect(() => {
    setSelectedFilter("all")
  }, [selectedDimension])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load data</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
              <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter data based on selection
  const filteredData = selectedFilter === "all" 
    ? data 
    : data?.filter(d => d.dimension_value === selectedFilter)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedDimension} onValueChange={setSelectedDimension}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select dimension" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIMENSIONS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All values" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {DIMENSIONS[selectedDimension as keyof typeof DIMENSIONS].label}s</SelectItem>
              {dimensionValues?.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  <div className="flex items-center justify-between w-full">
                    <span>{item.value}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatNumber(item.sessions)} sessions
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />
        
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary cards - always visible */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          // Use filtered data if a filter is applied, otherwise use all data
          const displayData = selectedFilter !== "all" ? filteredData : data
          
          if (!displayData || displayData.length === 0) {
            // Show skeleton cards while loading
            return (
              <>
                <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
                <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-background">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
                <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              </>
            )
          }
          
          // Calculate totals for the latest week
          const latestWeek = displayData[0]
          const previousWeek = displayData[1]
          
          // For "all" filter, sum up all dimension values for the latest week
          let latestWeekTotals = { sessions: 0, vf_signup: 0, demo_submit: 0 }
          let previousWeekTotals = { sessions: 0, vf_signup: 0, demo_submit: 0 }
          
          if (selectedFilter === "all" && data) {
            // Get the latest week date
            const latestWeekDate = data[0]?.week_start
            const previousWeekDate = data.find(d => d.week_start < latestWeekDate)?.week_start
            
            // Sum up all values for the latest week
            data.forEach(item => {
              if (item.week_start === latestWeekDate) {
                latestWeekTotals.sessions += item.sessions || 0
                latestWeekTotals.vf_signup += item.vf_signup || 0
                latestWeekTotals.demo_submit += item.demo_submit || 0
              }
              if (item.week_start === previousWeekDate) {
                previousWeekTotals.sessions += item.sessions || 0
                previousWeekTotals.vf_signup += item.vf_signup || 0
                previousWeekTotals.demo_submit += item.demo_submit || 0
              }
            })
          } else {
            // Use filtered data directly
            latestWeekTotals = {
              sessions: latestWeek?.sessions || 0,
              vf_signup: latestWeek?.vf_signup || 0,
              demo_submit: latestWeek?.demo_submit || 0
            }
            previousWeekTotals = {
              sessions: previousWeek?.sessions || 0,
              vf_signup: previousWeek?.vf_signup || 0,
              demo_submit: previousWeek?.demo_submit || 0
            }
          }
          
          // Calculate percentage changes
          const sessionsChange = previousWeekTotals.sessions 
            ? ((latestWeekTotals.sessions - previousWeekTotals.sessions) / previousWeekTotals.sessions) * 100 
            : null
          const signupsChange = previousWeekTotals.vf_signup 
            ? ((latestWeekTotals.vf_signup - previousWeekTotals.vf_signup) / previousWeekTotals.vf_signup) * 100 
            : null
          const demosChange = previousWeekTotals.demo_submit 
            ? ((latestWeekTotals.demo_submit - previousWeekTotals.demo_submit) / previousWeekTotals.demo_submit) * 100 
            : null
          
          const filterLabel = selectedFilter === "all" 
            ? `All ${DIMENSIONS[selectedDimension as keyof typeof DIMENSIONS].label}s`
            : selectedFilter
          
          // Calculate historical data for selected filter
          const historicalSessions = selectedFilter === "all" 
            ? (data || []).map(week => week.sessions)
            : displayData.map(week => week.sessions)
          const historicalSignups = selectedFilter === "all"
            ? (data || []).map(week => week.vf_signup)
            : displayData.map(week => week.vf_signup)
          const historicalDemos = selectedFilter === "all"
            ? (data || []).map(week => week.demo_submit)
            : displayData.map(week => week.demo_submit)
            
          // Calculate 4-week and 12-week averages for comparisons
          const calc4WeekAvg = (data: number[]) => {
            if (data.length < 5) return null // Need at least 5 weeks (current + 4 previous)
            const last4 = data.slice(1, 5) // Skip current week, take next 4
            return last4.reduce((sum, val) => sum + val, 0) / 4
          }
          
          const calc12WeekAvg = (data: number[]) => {
            if (data.length < 13) return null // Need at least 13 weeks
            const last12 = data.slice(1, 13) // Skip current week, take next 12
            return last12.reduce((sum, val) => sum + val, 0) / 12
          }
          
          const sessions4wAvg = calc4WeekAvg(historicalSessions)
          const sessions12wAvg = calc12WeekAvg(historicalSessions)
          const signups4wAvg = calc4WeekAvg(historicalSignups)
          const signups12wAvg = calc12WeekAvg(historicalSignups)
          const demos4wAvg = calc4WeekAvg(historicalDemos)
          const demos12wAvg = calc12WeekAvg(historicalDemos)
          
          const sessionsVs4w = sessions4wAvg ? ((latestWeekTotals.sessions - sessions4wAvg) / sessions4wAvg) * 100 : null
          const sessionsVs12w = sessions12wAvg ? ((latestWeekTotals.sessions - sessions12wAvg) / sessions12wAvg) * 100 : null
          const signupsVs4w = signups4wAvg ? ((latestWeekTotals.vf_signup - signups4wAvg) / signups4wAvg) * 100 : null
          const signupsVs12w = signups12wAvg ? ((latestWeekTotals.vf_signup - signups12wAvg) / signups12wAvg) * 100 : null
          const demosVs4w = demos4wAvg ? ((latestWeekTotals.demo_submit - demos4wAvg) / demos4wAvg) * 100 : null
          const demosVs12w = demos12wAvg ? ((latestWeekTotals.demo_submit - demos12wAvg) / demos12wAvg) * 100 : null
          
          // Check if latest week is current week
          const now = new Date()
          const latestWeekStart = new Date(latestWeek?.week_start || new Date())
          const latestWeekEnd = new Date(latestWeekStart)
          latestWeekEnd.setDate(latestWeekEnd.getDate() + 6)
          const isCurrentWeek = now >= latestWeekStart && now <= latestWeekEnd
          const daysElapsed = isCurrentWeek ? Math.max(1, Math.ceil((now.getTime() - latestWeekStart.getTime()) / (24 * 60 * 60 * 1000))) : 7
          const weekProgress = isCurrentWeek ? (daysElapsed / 7) * 100 : 0
          
          return (
            <>
              <StyledMetricCard
                title="Sessions"
                value={latestWeekTotals.sessions}
                previousValue={previousWeekTotals.sessions || undefined}
                change={sessionsChange}
                vs4WeekPct={sessionsVs4w}
                vs12WeekPct={sessionsVs12w}
                historicalData={historicalSessions}
                icon={Activity}
                color="primary"
                subtitle={`${filterLabel} - Latest week`}
                showProgress={weekProgress > 0}
                progressValue={weekProgress}
                isCurrentWeek={isCurrentWeek}
                weekStart={latestWeek?.week_start}
              />
              <StyledMetricCard
                title="VF Signups"
                value={latestWeekTotals.vf_signup}
                previousValue={previousWeekTotals.vf_signup || undefined}
                change={signupsChange}
                vs4WeekPct={signupsVs4w}
                vs12WeekPct={signupsVs12w}
                historicalData={historicalSignups}
                icon={Users}
                color="purple"
                subtitle={`${filterLabel} - Latest week`}
                showProgress={weekProgress > 0}
                progressValue={weekProgress}
                isCurrentWeek={isCurrentWeek}
                weekStart={latestWeek?.week_start}
              />
              <StyledMetricCard
                title="Demo Submissions"
                value={latestWeekTotals.demo_submit}
                previousValue={previousWeekTotals.demo_submit || undefined}
                change={demosChange}
                vs4WeekPct={demosVs4w}
                vs12WeekPct={demosVs12w}
                historicalData={historicalDemos}
                icon={Target}
                color="blue"
                subtitle={`${filterLabel} - Latest week`}
                showProgress={weekProgress > 0}
                progressValue={weekProgress}
                isCurrentWeek={isCurrentWeek}
                weekStart={latestWeek?.week_start}
              />
            </>
          )
        })()}
      </div>

      {/* Main table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Weekly Performance by {DIMENSIONS[selectedDimension as keyof typeof DIMENSIONS].label}
          </CardTitle>
          <CardDescription className="text-xs">
            {selectedFilter !== "all" 
              ? `Showing data for: ${selectedFilter}`
              : `Comprehensive breakdown with week-over-week and moving average comparisons`}
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
                    {selectedFilter === "all" && <th className="px-3 py-1.5"></th>}
                    <th colSpan={4} className="px-2 py-1.5 text-center bg-primary/5 border-x border-border/30">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Sessions</span>
                    </th>
                    <th colSpan={4} className="px-2 py-1.5 text-center bg-purple-500/5 border-x border-border/30">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-500/80">Signups</span>
                    </th>
                    <th colSpan={4} className="px-2 py-1.5 text-center bg-blue-500/5 border-x border-border/30">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-500/80">Demos</span>
                    </th>
                    <th colSpan={2} className="px-2 py-1.5 text-center border-r border-border/30">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversions</span>
                    </th>
                  </tr>
                  {/* Individual column headers */}
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-xs">Week</th>
                    {selectedFilter === "all" && (
                      <th className="text-left px-3 py-2 font-medium text-xs">
                        {DIMENSIONS[selectedDimension as keyof typeof DIMENSIONS].label}
                      </th>
                    )}
                    {/* Sessions columns */}
                    <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">Total</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">WoW</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">4W</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-primary/5">12W</th>
                    {/* Signups columns */}
                    <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">Total</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">WoW</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">4W</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-purple-500/5">12W</th>
                    {/* Demos columns */}
                    <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">Total</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">WoW</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">4W</th>
                    <th className="text-right px-2 py-2 font-medium text-xs bg-blue-500/5">12W</th>
                    {/* Conversion columns */}
                    <th className="text-right px-2 py-2 font-medium text-xs">Signup %</th>
                    <th className="text-right px-2 py-2 font-medium text-xs">Demo %</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={selectedFilter === "all" ? 16 : 15} className="p-8 text-center">
                        <Skeleton className="h-[300px] w-full" />
                      </td>
                    </tr>
                  ) : (
                    filteredData?.map((week, index) => {
                      const weekDate = new Date(week.week_start)
                      const endDate = new Date(weekDate)
                      endDate.setDate(endDate.getDate() + 6)
                      
                      // Calculate ISO week number
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
                          key={`${week.week_start}-${week.dimension_value}-${index}`}
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
                          {selectedFilter === "all" && (
                            <td className="px-3 py-1.5">
                              <Badge variant="outline" className="text-xs">
                                {week.dimension_value}
                              </Badge>
                            </td>
                          )}
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
                          {/* Conversion rates */}
                          <td className="px-1 py-1.5">
                            <div 
                              className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[50px]"
                              style={{
                                backgroundColor: '#6b7280'
                              }}
                            >
                              {week.signup_conversion_rate.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-1 py-1.5">
                            <div 
                              className="text-right font-semibold tabular-nums text-white px-2 py-0.5 rounded text-xs inline-block min-w-[50px]"
                              style={{
                                backgroundColor: '#6b7280'
                              }}
                            >
                              {week.demo_conversion_rate.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}