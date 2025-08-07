import { SimplifiedGA4Dashboard } from "@/components/simplified-ga4-dashboard";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      <h1 className="text-3xl font-bold mb-2">GA4 Analytics</h1>
      <p className="text-muted-foreground mb-6">Comprehensive weekly breakdown with correct data</p>
      <SimplifiedGA4Dashboard />
    </div>
  );
}
