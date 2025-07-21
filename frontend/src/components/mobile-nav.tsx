import { Button } from "@/components/ui/button"
import { X, Home, Users, Calendar, Settings, Building2 } from "lucide-react"
import { Link } from "react-router-dom"

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  if (!isOpen) return null

  const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Building2, label: "Branches", href: "/" },
    { icon: Users, label: "Employees", href: "/employees" },
    { icon: Calendar, label: "Schedule", href: "/schedule" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />

      {/* Navigation Panel */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 lg:hidden transform transition-transform">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">ShiftSync</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link to={item.href} onClick={onClose}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
