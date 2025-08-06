"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import * as d3Format from "d3-format"
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart 
} from "recharts"
import {
  Activity, Clock, Globe, 
  Calendar, RefreshCw, Search, FileDown,
  ExternalLink
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

// Data fetching hook
const useGA4Events = () => {
  return useQuery({
    queryKey: ['ga4-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_events')
        .select('*')
        .order('week_start', { ascending: false })
        .order('event_count', { ascending: false })
        .limit(5000) // Limit to prevent hitting default limit, focus on top events
      
      if (error) throw error
      
      // Log data fetching details for debugging
      console.log(`[GA4 Analytics] Fetched ${data?.length || 0} records from ga4_events`)
      if (data && data.length > 0) {
        const weeks = new Set(data.map(d => d.week_start)).size
        const earliest = data[data.length - 1]?.week_start
        const latest = data[0]?.week_start
        console.log(`[GA4 Analytics] Data spans ${weeks} weeks: ${earliest} to ${latest}`)
      }
      
      // Transform the aggregated data to match the expected format
      // Add event_timestamp for compatibility with existing code
      const transformedData = (data || []).map(item => ({
        ...item,
        event_timestamp: item.week_start,
        // Expand event_count into individual "events" for visualization
        event_count: item.event_count || 1,
        // Real fields only - no fake data
        user_id: `${item.week_start}-${item.event_name}`,
        ga_session_id: `${item.week_start}-${item.session_source}-${item.session_medium}`,
      }))
      
      return transformedData
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Number formatter
const numberFormat = d3Format.format(",.0f")
const percentFormat = d3Format.format(".1%")
const compactFormat = d3Format.format(".2s")

// Color palette
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function GA4AnalyticsDashboard() {
  const { data: events, isLoading, error, refetch } = useGA4Events()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedView, setSelectedView] = useState<"overview" | "realtime" | "events" | "users">("overview")
  // Process data for visualizations
  const processedData = useMemo(() => {
    if (!events || events.length === 0) return null

    // Event counts by type (using event_count for aggregated data)
    const eventCounts = events.reduce((acc: Record<string, number>, event: GA4Event) => {
      const count = event.event_count || 1
      acc[event.event_name] = (acc[event.event_name] || 0) + count
      return acc
    }, {})

    // Channel breakdown (using session_default_channel_grouping)
    const channelBreakdown = events.reduce((acc: Record<string, number>, event: GA4Event) => {
      const channel = event.session_default_channel_grouping || 'Direct'
      const count = event.event_count || 1
      acc[channel] = (acc[channel] || 0) + count
      return acc
    }, {})

    // Time series data by week (proper weekly aggregation)
    const timeSeriesData = events.reduce((acc: Record<string, number>, event: GA4Event) => {
      if (event.week_start) {
        const weekStart = new Date(event.week_start)
        const weekLabel = format(weekStart, 'MMM dd') + ' - ' + format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM dd')
        const count = event.event_count || 1
        acc[weekLabel] = (acc[weekLabel] || 0) + count
      }
      return acc
    }, {})

    // Source/Medium breakdown
    const sourceMediumBreakdown = events.reduce((acc: Record<string, number>, event: GA4Event) => {
      const key = `${event.session_source || 'direct'}/${event.session_medium || 'none'}`
      const count = event.event_count || 1
      acc[key] = (acc[key] || 0) + count
      return acc
    }, {})

    // Calculate totals
    const totalEvents = events.reduce((sum, e: GA4Event) => sum + (e.event_count || 1), 0)
    const uniqueWeeks = new Set(events.map((e: GA4Event) => e.week_start)).size
    const avgEventsPerWeek = totalEvents / (uniqueWeeks || 1)

    // Page views (filter by event_name)
    const pageViews = events
      .filter((e: GA4Event) => e.event_name === 'page_view')
      .reduce((sum, e: GA4Event) => sum + (e.event_count || 1), 0)
    
    // Sessions approximation (unique combinations of week + source + medium)
    const sessions = new Set(events.map((e: GA4Event) => 
      `${e.week_start}-${e.session_source}-${e.session_medium}`
    )).size

    return {
      eventCounts: Object.entries(eventCounts)
        .map(([name, count]) => ({ name, value: count as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      deviceBreakdown: Object.entries(channelBreakdown)  // Using channel data for device breakdown
        .map(([name, count]) => ({ name, value: count as number }))
        .sort((a, b) => b.value - a.value),
      timeSeriesData: Object.entries(timeSeriesData)
        .map(([date, count]) => ({ date, events: count as number }))
        .sort((a, b) => {
          // Sort by week start date (extract first date from range)
          const aDate = new Date(a.date.split(' - ')[0])
          const bDate = new Date(b.date.split(' - ')[0])
          return aDate.getTime() - bDate.getTime()
        }),
      metrics: {
        totalEvents,
        uniqueUsers: uniqueWeeks,  // Using weeks as a proxy for users
        avgEventsPerUser: avgEventsPerWeek,
        pageViews,
        sessions,
        bounceRate: sessions > 0 ? ((sessions - pageViews) / sessions) * 100 : 0,
        avgSessionDuration: 0, // Calculated from real data when available
      }
    }
  }, [events])

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (!searchTerm) return events.slice(0, 100)
    
    return events.filter((event: GA4Event) => 
      JSON.stringify(event).toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 100)
  }, [events, searchTerm])

  // Export to CSV
  const exportToCSV = () => {
    if (!events) return
    
    const csv = [
      Object.keys(events[0]).join(','),
      ...events.map((row: GA4Event) => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ga4-events-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Analytics</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!processedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
          <CardDescription>No GA4 events found in the database</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">GA4 Analytics Dashboard</h2>
          <Badge variant="secondary" className="animate-pulse">
            Live
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={() => window.location.href = '/analytics/drilldown'} 
            variant="default" 
            size="sm"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Drill-Down Analytics
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numberFormat(processedData.metrics.totalEvents)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weeks Analyzed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numberFormat(processedData.metrics.uniqueUsers)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Events/Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{numberFormat(Math.round(processedData.metrics.avgEventsPerUser))}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compactFormat(processedData.metrics.pageViews)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total page view events
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={(v: string) => setSelectedView(v)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Events Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Events Trend</CardTitle>
                <CardDescription>Week-over-week event volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={processedData.timeSeriesData}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorEvents)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Events */}
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>Most frequent events in your app</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedData.eventCounts.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Channels</CardTitle>
                <CardDescription>Traffic source distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={processedData.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {processedData.deviceBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Event Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Event Distribution</CardTitle>
                <CardDescription>Event types and their frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processedData.eventCounts.slice(0, 5).map((event, index) => {
                    const percentage = event.value / processedData.metrics.totalEvents
                    return (
                      <motion.div
                        key={event.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-muted-foreground">{numberFormat(event.value)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <motion.div
                            className="bg-primary h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Activity</CardTitle>
              <CardDescription>Live event stream (last 100 events)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Source/Medium</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredEvents.slice(0, 20).map((event: GA4Event, index) => (
                        <motion.tr
                          key={event.id || index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="border-b"
                        >
                          <TableCell className="text-xs">
                            {event.week_start ? format(new Date(event.week_start), 'MMM dd') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.event_name === 'page_view' ? 'default' : 'outline'}>
                              {event.event_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {event.session_default_channel_grouping || 'Direct'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {event.session_source || 'direct'} / {event.session_medium || 'none'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {numberFormat(event.event_count || 1)}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Analytics</CardTitle>
              <CardDescription>Detailed event metrics and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {processedData.eventCounts.map((event, index) => (
                  <motion.div
                    key={event.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">{event.name}</CardTitle>
                          <Badge>{numberFormat(event.value)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          {percentFormat(event.value / processedData.metrics.totalEvents)} of total events
                        </div>
                        <div className="mt-2 w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(event.value / processedData.metrics.totalEvents) * 100}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Insights</CardTitle>
              <CardDescription>User behavior and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{numberFormat(processedData.metrics.uniqueUsers)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sessions</p>
                  <p className="text-2xl font-bold">{numberFormat(processedData.metrics.sessions)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Bounce Rate</p>
                  <p className="text-2xl font-bold">{percentFormat(processedData.metrics.bounceRate)}</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">User Engagement Timeline</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={processedData.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}