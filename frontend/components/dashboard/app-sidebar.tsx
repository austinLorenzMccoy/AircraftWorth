"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Store,
  PenSquare,
  CheckCircle,
  TrendingUp,
  Settings,
  Home,
  Brain,
} from "lucide-react"

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
import { Logo, LogoIcon } from "@/components/brand/logo"

const navigationItems = [
  {
    title: "Marketplace",
    url: "/dashboard/marketplace",
    icon: Store,
  },
  {
    title: "Publish Insight",
    url: "/dashboard/publish",
    icon: PenSquare,
  },
  {
    title: "Verifications",
    url: "/dashboard/verifications",
    icon: CheckCircle,
  },
  {
    title: "Reputation",
    url: "/dashboard/reputation",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="shrink-0 transition-transform group-hover:scale-105 group-data-[collapsible=icon]:block hidden">
            <LogoIcon size={32} />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <Logo size="sm" showText={true} />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== "/dashboard" && pathname.startsWith(item.url))
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Home">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
