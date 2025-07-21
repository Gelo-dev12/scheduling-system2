import type React from "react"
import { Outlet, useLocation } from "react-router-dom"
import { GlobalNotifications } from "@/components/global-notifications"
import { Toaster } from 'react-hot-toast';
import { Home, Users, Calendar, Clock, Settings, Menu } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { SidebarProvider, useSidebar, Sidebar, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: Calendar,
  },
  {
    href: "/timeoff",
    label: "Time Off Req",
    icon: Clock,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

function SidebarContent() {
  const location = useLocation()
  const pathname = location.pathname
  const { state } = useSidebar()

  if (state === "collapsed") {
    // Only show the SidebarTrigger button at the top, no border, no rounded corners
    return (
      <aside className={cn(
        "h-full flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 w-14"
      )} style={{ borderRadius: 0 }}>
        <div className="p-3">
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SidebarTrigger>
        </div>
      </aside>
    )
  }

  return (
    <aside className={cn(
      "h-full flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 w-64"
    )}>
      {/* Sidebar Header (only when expanded) */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <span className="font-semibold text-lg tracking-tight text-muted-foreground transition-all">
          ShiftSync
        </span>
        <SidebarTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </SidebarTrigger>
      </div>
      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 mt-2">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link key={item.href} to={item.href} className="w-full">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full flex items-center gap-3 justify-start px-4 py-2 rounded-md transition-all",
                    isActive && "bg-teal-600 hover:bg-teal-700 text-white dark:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="transition-all">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </TooltipProvider>
      </nav>
      {/* Sidebar Footer */}
      <div className="flex flex-col items-center gap-2 p-4 border-t border-border">
        <ModeToggle />
      </div>
    </aside>
  )
}

export function Layout() {
  function MainContent() {
    return (
      <main className="min-h-screen bg-background text-foreground dark:bg-background dark:text-foreground w-full max-w-screen-2xl mx-auto px-4 md:px-8">
        <Outlet />
      </main>
    );
  }
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "3.5rem",
      } as any}
      defaultOpen={true}
    >
      {/* Sidebar is now fixed and overlays content, not part of flex row */}
      <Sidebar collapsible="icon" className="fixed left-0 top-0 h-full z-40" style={{height: '100vh'}}>
        <SidebarContent />
      </Sidebar>
      {/* Main content always centered, not pushed by sidebar */}
      <div className="min-h-screen w-full">
        <MainContent />
        <GlobalNotifications />
        <Toaster position="top-center" reverseOrder={false} />
      </div>
    </SidebarProvider>
  );
}
