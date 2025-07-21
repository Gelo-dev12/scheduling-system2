import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Save, ArrowLeft, Users } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import toast from 'react-hot-toast';

interface RoleConfig {
  name: string
  count: number
  hourlyRate: number
  color: string
}

const defaultRoles: RoleConfig[] = [
  { name: "Chef", count: 0, hourlyRate: 18, color: "bg-red-500" },
  { name: "Cashier", count: 0, hourlyRate: 15, color: "bg-blue-500" },
  { name: "Server", count: 0, hourlyRate: 12, color: "bg-green-500" },
  { name: "Kitchen Assistant", count: 0, hourlyRate: 11, color: "bg-yellow-500" },
  { name: "Manager", count: 0, hourlyRate: 25, color: "bg-purple-500" },
  { name: "Host/Hostess", count: 0, hourlyRate: 13, color: "bg-pink-500" },
  { name: "Bartender", count: 0, hourlyRate: 16, color: "bg-indigo-500" },
  { name: "Cleaner", count: 0, hourlyRate: 10, color: "bg-gray-500" },
]

interface RoleManagementProps {
  branchId: string
  branchName?: string
}

export function RoleManagement({ branchId, branchName = "Branch" }: RoleManagementProps) {
  const [roles, setRoles] = useState<RoleConfig[]>(defaultRoles)
  const [customRoleName, setCustomRoleName] = useState("")
  const [customRoleRate, setCustomRoleRate] = useState("")
  const navigate = useNavigate();

  // Fetch roles from backend on mount
  useEffect(() => {
    fetch(`/api/branches/${branchId}`)
      .then(res => res.json())
      .then(branch => {
        if (Array.isArray(branch.roles) && branch.roles.length > 0) {
          setRoles(branch.roles)
        } else {
          setRoles(defaultRoles)
        }
      })
      .catch(() => setRoles(defaultRoles))
  }, [branchId])

  const updateRoleCount = (index: number, change: number) => {
    setRoles((prev) =>
      prev.map((role, i) => (i === index ? { ...role, count: Math.max(0, role.count + change) } : role)),
    )
  }

  const updateRoleRate = (index: number, rate: number) => {
    setRoles((prev) => prev.map((role, i) => (i === index ? { ...role, hourlyRate: rate } : role)))
  }

  const addCustomRole = () => {
    if (customRoleName && customRoleRate) {
      const colors = ["bg-orange-500", "bg-teal-500", "bg-cyan-500", "bg-lime-500", "bg-amber-500"]
      const newRole: RoleConfig = {
        name: customRoleName,
        count: 1,
        hourlyRate: Number.parseFloat(customRoleRate),
        color: colors[Math.floor(Math.random() * colors.length)],
      }
      setRoles((prev) => [...prev, newRole])
      setCustomRoleName("")
      setCustomRoleRate("")
    }
  }

  const removeRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index))
  }

  const saveConfiguration = async () => {
    console.log("saveConfiguration called!")
    const activeRoles = roles.filter((role) => role.count > 0)
    try {
      const res = await fetch(`/api/branches/${branchId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: activeRoles }),
      });
      if (res.ok) {
        const updatedBranch = await res.json();
        setRoles(updatedBranch.roles); // update UI with saved roles
        toast.success("Saved successfully! Your role configuration has been saved.");
        // Optionally: trigger a refresh of branch data here
      } else {
        toast.error("Failed to save roles.");
      }
    } catch (err) {
      toast.error("Error saving roles.");
    }
  }

  const totalPositions = roles.reduce((sum, role) => sum + role.count, 0)
  const totalCost = roles.reduce((sum, role) => sum + role.count * role.hourlyRate, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white w-full px-0">
      {/* Header */}
      <header className="bg-white px-0 py-4 shadow-sm w-full">
        <div className="flex items-center gap-4 w-full">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-sm text-gray-600">{branchName} - Set up your team structure</p>
          </div>
        </div>
      </header>

      <div className="w-full max-w-full mx-auto px-2 sm:px-4 md:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10 w-full">
          <Card className="bg-white rounded-xl shadow hover:shadow-md transition-all duration-200 border-0">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{totalPositions}</p>
                <p className="text-sm text-gray-500">Total Positions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl shadow hover:shadow-md transition-all duration-200 border-0">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">₱</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">₱{totalCost.toFixed(0)}</p>
                <p className="text-sm text-gray-500">Hourly Cost</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white rounded-xl shadow hover:shadow-md transition-all duration-200 border-0">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xl">#</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{roles.filter((r) => r.count > 0).length}</p>
                <p className="text-sm text-gray-500">Active Roles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Configuration */}
        <Card className="mb-8 bg-white rounded-2xl shadow-md border-0 w-full">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Configure Roles & Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {roles.map((role, index) => (
                <div key={role.name} className="bg-gray-50 rounded-xl shadow-sm p-6 flex flex-col gap-4 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${role.color}`} />
                      <h3 className="font-semibold text-lg">{role.name}</h3>
                      {role.count > 0 && <Badge variant="secondary">{role.count} positions</Badge>}
                    </div>
                    {index >= defaultRoles.length && (
                      <Button variant="ghost" size="sm" onClick={() => removeRole(index)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Position Count */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium w-20">Count:</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRoleCount(index, -1)}
                          disabled={role.count === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{role.count}</span>
                        <Button variant="outline" size="sm" onClick={() => updateRoleCount(index, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Hourly Rate */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium w-20">Rate:</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">₱</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={role.hourlyRate}
                          onChange={(e) => updateRoleRate(index, Number.parseFloat(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                        <span className="text-sm text-gray-500">/hr</span>
                      </div>
                    </div>

                    {/* Cost Calculation */}
                    {role.count > 0 && (
                      <div className="text-sm text-gray-600 bg-white p-2 rounded shadow-sm">
                        Total: {role.count} × ₱{role.hourlyRate}/hr = ₱{(role.count * role.hourlyRate).toFixed(2)}/hr
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Custom Role */}
        <Card className="mb-8 bg-white rounded-2xl shadow-md border-0 w-full">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Add Custom Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Input
                placeholder="Role name (e.g., Delivery Driver)"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm">₱</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  value={customRoleRate}
                  onChange={(e) => setCustomRoleRate(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm">/hr</span>
              </div>
              <Button onClick={addCustomRole} disabled={!customRoleName || !customRoleRate} className="rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Button type="button" onClick={saveConfiguration} className="bg-teal-600 hover:bg-teal-700 flex-1 sm:flex-none rounded-full shadow-md text-base font-semibold transition-all duration-200" disabled={false}>
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
          <Link to={`/branch/${branchId}/employees`} className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full rounded-full">
              Next: Add Employees
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
