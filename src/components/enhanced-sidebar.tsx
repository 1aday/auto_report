"use client"

import * as React from "react"
import {
  ChevronRight,
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
  Bell,
  Search,
  User,
  LogOut,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NavItem {
  title: string
  url?: string
  icon?: React.ElementType
  description?: string
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  disabled?: boolean
  items?: NavItem[]
}

const navItems: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        icon: Home,
        url: "/",
        description: "Overview and summary",
      },
      {
        title: "Analytics",
        icon: BarChart3,
        badge: "3",
        items: [
          {
            title: "KPI Dashboard",
            url: "/kpi",
            icon: TrendingUp,
            description: "Key performance indicators",
            badge: "Live",
            badgeVariant: "default",
          },
          {
            title: "GA4 Analytics",
            url: "/dashboard",
            icon: ChartBar,
            description: "Google Analytics 4 data",
          },
          {
            title: "Drill-Down",
            url: "/analytics/drilldown",
            icon: Layers,
            description: "Deep dive analytics",
            badge: "New",
            badgeVariant: "secondary",
          },
          {
            title: "Weekly Reports",
            url: "/dashboard/drilldown",
            icon: Activity,
            description: "Weekly breakdown",
          },
        ],
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        title: "Database",
        icon: Database,
        items: [
          {
            title: "Tables",
            url: "#",
            description: "View all tables",
            disabled: true,
          },
          {
            title: "SQL Editor",
            url: "#",
            icon: Target,
            description: "Execute queries",
            disabled: true,
          },
        ],
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Preferences",
        url: "#",
        icon: Settings,
        description: "App settings",
      },
      {
        title: "Color Theme",
        url: "/color-test",
        icon: Palette,
        description: "Theme testing",
      },
      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        description: "Help docs",
      },
    ],
  },
]

export function EnhancedSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [searchQuery, setSearchQuery] = React.useState("")
  const [openSections, setOpenSections] = React.useState<string[]>(["Analytics"])

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    )
  }

  const isItemActive = (url?: string) => {
    if (!url) return false
    return pathname === url
  }

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.items && item.items.length > 0
    const isActive = isItemActive(item.url)
    const isOpen = openSections.includes(item.title)

    if (hasChildren) {
      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleSection(item.title)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={item.description}
                className={cn(
                  "group transition-all duration-200",
                  isOpen && "bg-sidebar-accent"
                )}
              >
                {item.icon && <item.icon className="size-4" />}
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant={item.badgeVariant || "outline"}
                    className="ml-auto mr-2 h-5 px-1.5 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
              <SidebarMenuSub className="ml-3 border-l border-sidebar-border/50 pl-2">
                {item.items.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isItemActive(subItem.url)}
                      disabled={subItem.disabled}
                      className={cn(
                        "transition-all duration-200",
                        isItemActive(subItem.url) &&
                          "bg-primary/10 font-medium text-primary"
                      )}
                    >
                      <Link href={subItem.disabled ? "#" : subItem.url || "#"}>
                        {subItem.icon && (
                          <subItem.icon className="size-3.5 mr-2" />
                        )}
                        <span className="flex-1">{subItem.title}</span>
                        {subItem.badge && (
                          <Badge
                            variant={subItem.badgeVariant || "outline"}
                            className="ml-auto h-4 px-1 text-[10px]"
                          >
                            {subItem.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          disabled={item.disabled}
          tooltip={item.description}
          className={cn(
            "transition-all duration-200",
            isActive && "bg-primary/10 font-medium text-primary"
          )}
        >
          <Link href={item.disabled ? "#" : item.url || "#"}>
            {item.icon && (
              <item.icon
                className={cn(
                  "size-4 transition-colors",
                  isActive && "text-primary"
                )}
              />
            )}
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <Badge
                variant={item.badgeVariant || "outline"}
                className="ml-auto h-5 px-1.5 text-[10px]"
              >
                {item.badge}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/40 bg-gradient-to-b from-sidebar to-sidebar/95">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-sidebar-primary-foreground shadow-sm">
                  <ChartBar className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold tracking-tight">Analytics Hub</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    Real-time Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search Bar */}
        <div className="px-3 py-2">
          {isCollapsed ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-full hover:bg-sidebar-accent/50"
            >
              <Search className="size-3.5 text-muted-foreground" />
            </Button>
          ) : (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-sidebar-accent/50 border-sidebar-border/50 focus:bg-background transition-colors"
              />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        {navItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => renderNavItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarSeparator className="my-4" />

        {/* Live Stats Widget */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 flex items-center justify-between">
              <span>Live Metrics</span>
              <Bell className="size-3 text-muted-foreground" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg bg-gradient-to-br from-sidebar-accent/50 to-sidebar-accent/30 p-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Active Users</span>
                    <span className="text-xs font-bold text-primary">1,234</span>
                  </div>
                  <div className="h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 w-3/4 animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Conversion</span>
                    <span className="text-xs font-bold text-green-600">3.2%</span>
                  </div>
                  <div className="h-1.5 bg-sidebar-accent rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 w-1/3" />
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-7 text-[10px] bg-sidebar-accent/50 hover:bg-sidebar-accent"
                  asChild
                >
                  <Link href="/kpi">View Details →</Link>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Compact stats for collapsed state */}
        {isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Live Metrics - Active: 1,234 | Conv: 3.2%"
                    asChild
                  >
                    <Link href="/kpi">
                      <Activity className="size-4 text-primary animate-pulse" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 bg-gradient-to-b from-sidebar/95 to-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="w-full justify-start hover:bg-sidebar-accent transition-colors"
                  tooltip={isCollapsed ? "Admin User - admin@analytics.com" : undefined}
                >
                  <Avatar className="size-7">
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="flex flex-col flex-1 text-left">
                        <span className="text-xs font-medium">Admin User</span>
                        <span className="text-[10px] text-muted-foreground">
                          admin@analytics.com
                        </span>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs">
                  <User className="mr-2 size-3.5" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs">
                  <Settings className="mr-2 size-3.5" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs">
                  <HelpCircle className="mr-2 size-3.5" />
                  Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs text-destructive">
                  <LogOut className="mr-2 size-3.5" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}