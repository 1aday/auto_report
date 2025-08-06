import { DrillDownDashboard } from "@/components/drill-down-dashboard"

export default function DrillDownPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-2">Drill-Down</h1>
        <p className="text-muted-foreground mb-6">Filter by campaign, source, channel grouping, or first user source</p>
        <DrillDownDashboard />
      </div>
    </div>
  )
}