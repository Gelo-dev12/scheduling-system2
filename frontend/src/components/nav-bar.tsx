import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Home, Users, Calendar, Clock, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"

export function NavBar() {
  const location = useLocation()
  const pathname = location.pathname

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/employees",
      label: "Employee",
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

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 fixed top-0 left-0 w-full z-50 shadow">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn("flex items-center gap-2", isActive && "bg-teal-600 hover:bg-teal-700")}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
