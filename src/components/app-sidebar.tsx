"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, TrendingUp, User, RefreshCw, LineChart } from "lucide-react"

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
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Menu items
const menuItems = [
  {
    title: "KPI Dashboard",
    url: "/kpi",
    icon: TrendingUp,
  },
  {
    title: "Sources Report",
    url: "/sources",
    icon: LineChart,
  },
  {
    title: "Campaigns Report",
    url: "/campaigns",
    icon: BarChart3,
  },
  {
    title: "Analysis",
    url: "/analysis",
    icon: BarChart3,
  },
  {
    title: "Sources Monthly",
    url: "/sources-monthly",
    icon: BarChart3,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshMaterializedViews = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/refresh-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ All materialized views refreshed successfully')
        // Wait a moment for the refresh to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Force reload the page to get fresh data
        window.location.reload()
      } else {
        console.error('Error refreshing views:', data.error)
      }
    } catch (error) {
      console.error('Error refreshing views:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="group-data-[collapsible=icon]:p-1">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-950 to-slate-800 text-white ring-1 ring-white/10 overflow-hidden">
                  <span className="text-lg">🚀</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                   <span className="truncate font-semibold text-white">Analytics Hub</span>
                   <span className="truncate text-xs text-white/70">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:sr-only">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                  <Link href={item.url}>
                      <item.icon className="text-sidebar-foreground" />
                      <span className="group-data-[collapsible=icon]:hidden text-sidebar-foreground">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>

      <SidebarFooter>
        {/* Refresh Materialized Views Button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={refreshMaterializedViews}
              disabled={isRefreshing}
              tooltip={isRefreshing ? 'Refreshing...' : 'Refresh all materialized views'}
              className="hover:bg-sidebar-accent"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="group-data-[collapsible=icon]:hidden">{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="/avatars/admin.jpg" alt="Admin" />
                    <AvatarFallback className="rounded-lg">AU</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">Admin User</span>
                    <span className="truncate text-xs">admin@analytics.com</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px] rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src="/avatars/admin.jpg" alt="Admin" />
                      <AvatarFallback className="rounded-lg">AU</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Admin User</span>
                      <span className="truncate text-xs">admin@analytics.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Sign out
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