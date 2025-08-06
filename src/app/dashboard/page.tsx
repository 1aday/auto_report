import { SimplifiedGA4Dashboard } from "@/components/simplified-ga4-dashboard"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <SimplifiedGA4Dashboard />
      </div>
    </div>
  )
}