"use client"

import {
  BarChart3,
  TrendingUp,
  Layers,
  Target,
  Activity,
  ChartBar,
  Home,
  Settings,
  HelpCircle,
  BookOpen,
  Database,
  Palette,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

// Menu items with icons and badges
const menuItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Home",
        url: "/",
        icon: Home,
        description: "Dashboard overview",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "KPI Dashboard",
        url: "/kpi",
        icon: TrendingUp,
        description: "Key performance indicators",
        badge: "Live",
        badgeVariant: "default" as const,
      },
      {
        title: "GA4 Analytics",
        url: "/dashboard",
        icon: BarChart3,
        description: "Google Analytics 4 data",
      },
      {
        title: "Drill-Down Analysis",
        url: "/analytics/drilldown",
        icon: Layers,
        description: "Deep dive by campaign & source",
        badge: "New",
        badgeVariant: "secondary" as const,
      },
      {
        title: "Weekly Reports",
        url: "/dashboard/drilldown",
        icon: Activity,
        description: "Weekly breakdown analysis",
      },
    ],
  },
  {
    title: "Data Management",
    items: [
      {
        title: "Database",
        url: "#",
        icon: Database,
        description: "Supabase data management",
        disabled: true,
      },
      {
        title: "SQL Queries",
        url: "#",
        icon: Target,
        description: "Custom SQL queries",
        disabled: true,
      },
    ],
  },
  {
    title: "Resources",
    items: [
      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        description: "API documentation",
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings,
        description: "App configuration",
      },
      {
        title: "Help & Support",
        url: "#",
        icon: HelpCircle,
        description: "Get help",
      },
    ],
  },
  {
    title: "Development",
    items: [
      {
        title: "Color Test",
        url: "/color-test",
        icon: Palette,
        description: "Theme color testing",
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-sidebar-primary-foreground">
                  <ChartBar className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Analytics Hub</span>
                  <span className="text-xs text-muted-foreground">
                    GA4 & KPI Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        {menuItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.url
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        disabled={item.disabled}
                        tooltip={item.description}
                        className={cn(
                          "relative transition-colors",
                          isActive && "bg-sidebar-accent font-medium"
                        )}
                      >
                        <Link href={item.disabled ? "#" : item.url}>
                          <Icon
                            className={cn(
                              "size-4 transition-colors",
                              isActive && "text-primary"
                            )}
                          />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant={item.badgeVariant || "outline"}
                              className="ml-auto h-5 px-1.5 text-[10px] font-medium"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarSeparator className="my-4" />

        {/* Quick Stats Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70">
            Quick Stats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sessions Today</span>
                <span className="text-sm font-semibold">2,847</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Conversion Rate</span>
                <span className="text-sm font-semibold text-green-600">3.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active Users</span>
                <span className="text-sm font-semibold">1,234</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xs font-semibold">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Admin User</span>
                  <span className="text-xs text-muted-foreground">
                    admin@analytics.com
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}