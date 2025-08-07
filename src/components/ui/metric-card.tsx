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
  
  // Calculate projection if current week
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const projectedTotal = isCurrentWeek && weekStart
    ? predictWeeklyTotal(value, todayName)
    : value
  
  // Calculate projected comparisons
  const projectedVsPrev = isCurrentWeek && previousValue
    ? ((projectedTotal - previousValue) / previousValue) * 100
    : change
    
  const projectedVs4Week = isCurrentWeek && historicalData.length >= 4
    ? (() => {
        const last4Weeks = historicalData.slice(0, 4)
        const avg4Week = last4Weeks.reduce((sum, val) => sum + val, 0) / last4Weeks.length
        return avg4Week > 0 ? ((projectedTotal - avg4Week) / avg4Week) * 100 : null
      })()
    : vs4WeekPct
    
  const projectedVs12WeekForDisplay = isCurrentWeek && historicalData.length >= 12
    ? (() => {
        const last12Weeks = historicalData.slice(0, 12)
        const avg12Week = last12Weeks.reduce((sum, val) => sum + val, 0) / last12Weeks.length
        return avg12Week > 0 ? ((projectedTotal - avg12Week) / avg12Week) * 100 : null
      })()
    : vs12WeekPct

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
              {(subtitle || (isCurrentWeek && projectedTotal !== value)) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                  {isCurrentWeek && projectedTotal !== value && (
                    <span className="ml-2">
                      Projected: <span className="font-medium text-foreground">{formatNumber(projectedTotal)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {showProgress && progressValue > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Week progress • {getWeekProgressLabel(progressValue)}
                  </span>
                  <span className="font-medium">{Math.round(progressValue)}%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressValue}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
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
                
                <div className="flex items-center gap-1">
                  <div className={cn("flex items-center", getPercentageColor(change))}>
                    {getTrendIcon(change, "sm")}
                    <span className="text-xs font-medium">
                      {formatPercentage(change)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">vs last wk</span>
                </div>
                
                {vs4WeekPct !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(vs4WeekPct))}>
                      {getTrendIcon(vs4WeekPct, "sm")}
                      <span className="text-xs font-medium">
                        {formatPercentage(vs4WeekPct)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs 4wk avg</span>
                  </div>
                )}
                
                {vs12WeekPct !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(vs12WeekPct))}>
                      {getTrendIcon(vs12WeekPct, "sm")}
                      <span className="text-xs font-medium">
                        {formatPercentage(vs12WeekPct)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs 12wk avg</span>
                  </div>
                )}
              </div>
              
              {/* Projected comparisons (only for current week) */}
              {isCurrentWeek && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Projected
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className={cn("flex items-center", getPercentageColor(projectedVsPrev))}>
                      {getTrendIcon(projectedVsPrev, "sm")}
                      <span className="text-xs font-medium">
                        {formatPercentage(projectedVsPrev)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">vs last wk</span>
                  </div>
                  
                  {projectedVs4Week !== undefined && (
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(projectedVs4Week))}>
                        {getTrendIcon(projectedVs4Week, "sm")}
                        <span className="text-xs font-medium">
                          {formatPercentage(projectedVs4Week)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs 4wk avg</span>
                    </div>
                  )}
                  
                  {projectedVs12WeekForDisplay !== undefined && (
                    <div className="flex items-center gap-1">
                      <div className={cn("flex items-center", getPercentageColor(projectedVs12WeekForDisplay))}>
                        {getTrendIcon(projectedVs12WeekForDisplay, "sm")}
                        <span className="text-xs font-medium">
                          {formatPercentage(projectedVs12WeekForDisplay)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">vs 12wk avg</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {previousValue !== null && previousValue !== undefined && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>Last week: {formatNumber(previousValue)}</span>
                  {isCurrentWeek && projectedTotal !== value && (
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