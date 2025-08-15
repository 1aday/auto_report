"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, TrendingUp, User, RefreshCw, LineChart, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

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
  const [secretUnlocked, setSecretUnlocked] = useState(false)

  React.useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' && window.localStorage.getItem('vf_unlocked') === '1'
      if (stored) setSecretUnlocked(true)
    } catch {}
    let buffer = ""
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { buffer = ""; return }
      if (e.key.length === 1) {
        buffer = (buffer + e.key).slice(-20)
        if (buffer.toLowerCase().includes('voiceflow')) {
          setSecretUnlocked(true)
          try { window.localStorage.setItem('vf_unlocked', '1') } catch {}
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
              {/* Always show KPI */}
              {(() => {
                const kpi = menuItems.find(m => m.url === '/kpi') || menuItems[0]
                return (
                  <SidebarMenuItem key={kpi.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === kpi.url}
                      tooltip={kpi.title}
                    >
                      <Link href={kpi.url}>
                        <kpi.icon className="text-sidebar-foreground" />
                        <span className="group-data-[collapsible=icon]:hidden text-sidebar-foreground">{kpi.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })()}

              {/* Hidden items appear when unlocked with animation */}
              <AnimatePresence>
                {secretUnlocked && (
                  <motion.div
                    key="unlocked-links"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                  >
                    {menuItems.filter(m => m.url !== '/kpi').map((item) => (
                      <motion.div
                        key={item.title}
                        variants={{ 
                          hidden: { opacity: 0, y: 8, scale: 0.97 }, 
                          visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: 'easeOut' } } 
                        }}
                      >
                        <SidebarMenuItem>
                          <div className="relative">
                            {/* subtle sparkle pop-on animation */}
                            <motion.span
                              className="pointer-events-none absolute -left-1.5 -top-1 text-amber-400/80 group-data-[collapsible=icon]:hidden"
                              initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
                              animate={{ scale: [0.6, 1.15, 1], opacity: [0, 1, 0.0], rotate: 0 }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            >
                              <Sparkles className="h-3 w-3" />
                            </motion.span>

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
                          </div>
                        </SidebarMenuItem>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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