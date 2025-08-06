import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { EnhancedSidebar } from "@/components/enhanced-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Analytics Hub - GA4 & KPI Dashboard",
      description: "A comprehensive analytics dashboard with GA4 integration, KPI tracking, and drill-down capabilities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider defaultOpen={true}>
            <EnhancedSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs text-muted-foreground">
                    Real-time Analytics Dashboard
                  </span>
                </div>
              </header>
              <main className="flex-1">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
