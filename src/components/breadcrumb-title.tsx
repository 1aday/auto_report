"use client"

import { usePathname } from "next/navigation"

const routeTitles: Record<string, string> = {
  "/": "Analytics Overview",
  "/dashboard": "GA4 Analytics Overview",
  "/dashboard/drilldown": "Weekly Drilldown",
  "/kpi": "Weekly KPI Dashboard",
  "/analytics/drilldown": "Drill-Down Analytics",
}

export function BreadcrumbTitle() {
  const pathname = usePathname()

  // Find best match (exact or parent path)
  let title = routeTitles[pathname]
  if (!title) {
    // Try to progressively strip segments
    const segments = pathname.split("/").filter(Boolean)
    while (segments.length > 0 && !title) {
      const key = "/" + segments.join("/")
      title = routeTitles[key]
      segments.pop()
    }
  }

  return (
    <span className="font-medium">{title || "Analytics Dashboard"}</span>
  )
}

