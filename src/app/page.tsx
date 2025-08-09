import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/kpi" className="group">
          <div className="rounded-xl border p-6 bg-card hover:bg-accent/5 transition-colors">
            <div className="text-2xl font-semibold">Weekly KPI</div>
            <div className="text-muted-foreground">View weekly KPIs</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
