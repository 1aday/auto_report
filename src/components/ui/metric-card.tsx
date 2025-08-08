"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react"

import { predictWeeklyTotal } from "@/lib/projection"
import { getWeekProgressLabel } from "@/lib/week-progress"

// Format helpers
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toLocaleString()
}

const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  const formatted = value > 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`
  return formatted
}

const getPercentageColor = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "text-muted-foreground"
  if (value > 0) return "text-green-600 dark:text-green-400"
  if (value < 0) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}

const getTrendIcon = (value: number | null | undefined, size: "sm" | "md" = "md") => {
  const iconClass = size === "sm" ? "h-2.5 w-2.5" : "h-4 w-4"
  if (value === null || value === undefined) return null
  if (value > 0) return <ArrowUp className={iconClass} />
  if (value < 0) return <ArrowDown className={iconClass} />
  return <Minus className={iconClass} />
}

interface StyledMetricCardProps {
  title: string
  value: number
  previousValue?: number | null
  change?: number | null
  vs4WeekPct?: number | null
  vs12WeekPct?: number | null
  historicalData?: number[]
  icon: React.ElementType
  color?: "primary" | "blue" | "purple"
  subtitle?: string
  showProgress?: boolean
  progressValue?: number
  isCurrentWeek?: boolean
  weekStart?: string
}

export function StyledMetricCard({
  title,
  value,
  previousValue,
  change,
  vs4WeekPct,
  vs12WeekPct,
  historicalData = [],
  icon: Icon,
  color = "primary",
  subtitle,
  showProgress = false,
  progressValue = 0,
  isCurrentWeek = false,
  weekStart
}: StyledMetricCardProps) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
  }
  
  // For projected comparison, we'll use the same 12-week average
  // (There's no separate calculation needed)
  
  // Calculate projection if current week OR if this is the latest week with data
  // (data might be slightly behind real-time)
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const shouldProject = isCurrentWeek || (weekStart && new Date(weekStart) > twoWeeksAgo)
  const projectedTotal = shouldProject && weekStart
    ? predictWeeklyTotal(value, todayName)
    : value
  
  // Calculate projected comparisons
  const projectedVsPrev = shouldProject && previousValue
    ? ((projectedTotal - previousValue) / previousValue) * 100
    : change
    
  const projectedVs4Week = shouldProject && historicalData.length >= 4
    ? (() => {
        const last4Weeks = historicalData.slice(0, 4)
        const avg4Week = last4Weeks.reduce((sum, val) => sum + val, 0) / last4Weeks.length
        return avg4Week > 0 ? ((projectedTotal - avg4Week) / avg4Week) * 100 : null
      })()
    : vs4WeekPct
    
  const projectedVs12WeekForDisplay = shouldProject && historicalData.length >= 12
    ? (() => {
        const last12Weeks = historicalData.slice(0, 12)
        const avg12Week = last12Weeks.reduce((sum, val) => sum + val, 0) / last12Weeks.length
        return avg12Week > 0 ? ((projectedTotal - avg12Week) / avg12Week) * 100 : null
      })()
    : vs12WeekPct
  
  // Calculate absolute differences for actual comparisons
  const actualDiffPrev = previousValue !== null && previousValue !== undefined ? value - previousValue : null
  const actualDiff4Week = historicalData.length >= 4 
    ? value - (historicalData.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4)
    : null
  const actualDiff12Week = historicalData.length >= 12
    ? value - (historicalData.slice(0, 12).reduce((sum, val) => sum + val, 0) / 12)
    : null
  
  // Calculate absolute differences for projected comparisons
  const projectedDiffPrev = shouldProject && previousValue !== null && previousValue !== undefined
    ? projectedTotal - previousValue 
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
      <Card className={cn("relative overflow-hidden", `bg-gradient-to-br ${colorClasses[color]}`)}>
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
                {formatNumber(value)}
              </div>
              {(subtitle || (shouldProject && projectedTotal !== value)) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                  {shouldProject && projectedTotal !== value && (
                    <span className="ml-2">
                      Projected: <span className="font-medium text-foreground">{formatNumber(projectedTotal)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {(showProgress || shouldProject) && (
              <div className="mt-3 space-y-3">
                {/* Progress header with key metrics */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      {getWeekProgressLabel(progressValue > 0 ? progressValue : 50)}
                    </span>
                    <span className="font-medium text-foreground">
                      Week {Math.round(progressValue)}% complete
                    </span>
                  </div>
                  
                  {/* Key comparison metrics */}
                  {previousValue && (
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        At this point last week: {formatNumber(previousValue * (progressValue / 100))}
                      </span>
                      <span className={cn(
                        "font-medium",
                        value > previousValue * (progressValue / 100) ? "text-primary" : "text-destructive"
                      )}>
                        {value > previousValue * (progressValue / 100) ? "↑" : "↓"} 
                        {Math.abs(Math.round(((value - (previousValue * (progressValue / 100))) / (previousValue * (progressValue / 100))) * 100))}% vs pace
                      </span>
                    </div>
                  )}
                </div>
                
                {/* The Perfect Progress Bar - Jony Ive Style */}
                <div className="space-y-2">
                  <div className="relative h-12 bg-gradient-to-b from-muted/5 to-muted/10 rounded-lg overflow-hidden">
                    {/* Week grid structure */}
                    <div className="absolute inset-0 flex">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-border/10 last:border-r-0" />
                      ))}
                    </div>
                    
                    {/* Time progress indicator - subtle gradient */}
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-muted/20 via-muted/15 to-transparent"
                      style={{ width: `${progressValue}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-foreground/20" />
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-background border border-foreground/20" />
                    </div>
                    
                    {/* Last week's value at this time - ghost bar */}
                    {previousValue && progressValue > 0 && (
                      <div 
                        className="absolute bottom-0 left-0 h-4 bg-muted/20 rounded-r-sm"
                        style={{ width: `${Math.min(100, ((previousValue * (progressValue / 100)) / (projectedTotal || previousValue)) * 100)}%` }}
                      >
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-muted-foreground">
                          Last week pace
                        </div>
                      </div>
                    )}
                    
                    {/* Current actual value - main bar */}
                    <motion.div 
                      className={cn(
                        "absolute bottom-0 left-0 h-6 rounded-r-sm",
                        previousValue && value > (previousValue * (progressValue / 100)) 
                          ? "bg-gradient-to-t from-primary to-primary/80" 
                          : "bg-gradient-to-t from-destructive/80 to-destructive/60"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (value / (projectedTotal || value)) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-primary-foreground">
                        {formatNumber(value)}
                      </div>
                    </motion.div>
                    
                    {/* Projection extension - dashed */}
                    {shouldProject && projectedTotal > value && (
                      <div 
                        className="absolute bottom-0 h-6 border-2 border-dashed border-primary/30 border-l-0 rounded-r-sm"
                        style={{ 
                          left: `${Math.min(100, (value / projectedTotal) * 100)}%`,
                          width: `${Math.min(100 - (value / projectedTotal) * 100, 100)}%`
                        }}
                      />
                    )}
                    
                    {/* Last week final total marker */}
                    {previousValue && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40"
                        style={{ left: `${Math.min(99, (previousValue / (projectedTotal || previousValue)) * 100)}%` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground whitespace-nowrap">
                          Last: {formatNumber(previousValue)}
                        </div>
                      </div>
                    )}
                    
                    {/* Projected total marker */}
                    {shouldProject && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-primary/60"
                        style={{ left: `${Math.min(99, 100)}%` }}
                      >
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-primary whitespace-nowrap font-medium">
                          Proj: {formatNumber(projectedTotal)}
                        </div>
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
                          i < Math.floor(progressValue / 14.3) ? "text-muted-foreground" :
                          i === Math.floor(progressValue / 14.3) ? "text-foreground font-medium" :
                          "text-muted-foreground/50"
                        )}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Status message */}
                <div className="text-[10px] text-center">
                  {(() => {
                    const paceComparison = previousValue ? 
                      ((value - (previousValue * (progressValue / 100))) / (previousValue * (progressValue / 100))) * 100 : 0
                    const projComparison = previousValue ? 
                      ((projectedTotal - previousValue) / previousValue) * 100 : 0
                    
                    if (paceComparison > 10) {
                      return <span className="text-primary font-medium">
                        🚀 Significantly ahead of last week&apos;s pace • Projecting {formatNumber(projectedTotal)} ({projComparison > 0 ? '+' : ''}{Math.round(projComparison)}%)
                      </span>
                    } else if (paceComparison > 0) {
                      return <span className="text-primary">
                        ↑ Ahead of last week&apos;s pace • Projecting {formatNumber(projectedTotal)} ({projComparison > 0 ? '+' : ''}{Math.round(projComparison)}%)
                      </span>
                    } else if (paceComparison > -10) {
                      return <span className="text-muted-foreground">
                        ↓ Slightly behind pace • Projecting {formatNumber(projectedTotal)} ({Math.round(projComparison)}%)
                      </span>
                    } else {
                      return <span className="text-destructive">
                        ⚠ Behind last week&apos;s pace • Projecting {formatNumber(projectedTotal)} ({Math.round(projComparison)}%)
                      </span>
                    }
                  })()}
                </div>
              </div>
            )}
            
            {/* Comprehensive Comparisons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              {/* Actual vs comparisons */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Actual
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(change))}>
                      {getTrendIcon(change, "sm")}
                      <span className="text-xs font-medium">
                        {formatPercentage(change)}
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
                
                {vs4WeekPct !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(vs4WeekPct))}>
                        {getTrendIcon(vs4WeekPct, "sm")}
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
                )}
                
                {vs12WeekPct !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(vs12WeekPct))}>
                        {getTrendIcon(vs12WeekPct, "sm")}
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
                )}
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
                        {getTrendIcon(projectedVsPrev, "sm")}
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
                  
                  {projectedVs4Week !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className={cn("flex items-center", getPercentageColor(projectedVs4Week))}>
                          {getTrendIcon(projectedVs4Week, "sm")}
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
                  )}
                  
                  {projectedVs12WeekForDisplay !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className={cn("flex items-center", getPercentageColor(projectedVs12WeekForDisplay))}>
                          {getTrendIcon(projectedVs12WeekForDisplay, "sm")}
                          <span className="text-xs font-medium">
                            {formatPercentage(projectedVs12WeekForDisplay)}
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
                  )}
                </div>
              )}
            </div>
            
            {previousValue !== null && previousValue !== undefined && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>Last week: {formatNumber(previousValue)}</span>
                  {shouldProject && projectedTotal !== value && (
                    <Badge 
                      variant={projectedTotal > previousValue ? "default" : "secondary"} 
                      className="text-[10px] px-1.5 py-0"
                    >
                      <Sparkles className="h-2 w-2 mr-0.5" />
                      {projectedTotal > previousValue ? "Ahead" : "Behind"}
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