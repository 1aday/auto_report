import { DrillDownDashboard } from "@/components/drill-down-dashboard"

export default function DrillDownPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      <h1 className="text-3xl font-bold mb-2">Drill-Down</h1>
      <p className="text-muted-foreground mb-6">Filter by campaign, source, channel grouping, or first user source</p>
      <DrillDownDashboard />
    </div>
  )
}