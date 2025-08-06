"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

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

const getPercentageColor = (value: number | null) => {
  if (value === null) return "text-muted-foreground"
  if (value > 0) return "text-green-600 dark:text-green-400"
  if (value < 0) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}

const getTrendIcon = (value: number | null) => {
  if (value === null) return null
  if (value > 0) return <ArrowUp className="h-4 w-4" />
  if (value < 0) return <ArrowDown className="h-4 w-4" />
  return <Minus className="h-4 w-4" />
}

interface StyledMetricCardProps {
  title: string
  value: number
  previousValue?: number | null
  change?: number | null
  icon: React.ElementType
  color?: "primary" | "blue" | "purple"
  subtitle?: string
  showProgress?: boolean
  progressValue?: number
  isCurrentWeek?: boolean
}

export function StyledMetricCard({
  title,
  value,
  previousValue,
  change,
  icon: Icon,
  color = "primary",
  subtitle,
  showProgress = false,
  progressValue = 0,
  isCurrentWeek = false
}: StyledMetricCardProps) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
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
              {subtitle && (
                <div className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                </div>
              )}
            </div>
            
            {showProgress && progressValue > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Week progress</span>
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
            
            {change !== null && change !== undefined && (
              <div className="flex items-center gap-2 pt-1">
                <div className={cn("flex items-center gap-1", getPercentageColor(change))}>
                  {getTrendIcon(change)}
                  <span className="font-semibold">
                    {formatPercentage(change)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  vs last week
                </span>
              </div>
            )}
            
            {previousValue !== null && previousValue !== undefined && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>Last week: {formatNumber(previousValue)}</span>
                  {isCurrentWeek && value !== previousValue && (
                    <Badge 
                      variant={value > previousValue ? "default" : "secondary"} 
                      className="text-[10px] px-1.5 py-0"
                    >
                      {value > previousValue ? "Up" : "Down"}
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