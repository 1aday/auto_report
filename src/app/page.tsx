import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type Report = {
  title: string
  href: string
  description: string
  emoji: string
  gradient: string
}

const reports: Report[] = [
  {
    title: "Weekly KPI",
    href: "/kpi",
    description: "Key weekly metrics and projections",
    emoji: "📈",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
]

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1400px]">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.href} href={r.href} className="group">
            <Card className={`h-48 bg-gradient-to-br ${r.gradient} hover:shadow-lg transition-all duration-200 border-emerald-500/20` }>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{r.emoji}</div>
                  <CardTitle className="text-xl font-semibold">{r.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">{r.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-muted-foreground text-sm">
                  Open report →
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
