"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Users, Clock, Menu, Mail, DollarSign, BadgeCheck, Building2 } from "lucide-react"
import { AddEmployeeModal } from "@/components/add-employee-modal"
import { EditEmployeeModal } from "@/components/edit-employee-modal"
import { MobileNav } from "@/components/mobile-nav"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"

interface Branch {
  id: string
  name: string
  location: string
  maxHoursPerDay?: number
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  role: string
  email: string
  hourlyRate: number
  hoursPerWeek: number
  daysPerWeek: number
  status: "active" | "inactive"
  tempPassword?: string
  branchId: string
  branchName: string
  employmentType: "regular" | "part-time"
  rate?: number
}

const CrabIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="15" r="5" />
    <path d="M12 10v2m0 0c-2.5 0-4.5-2-4.5-4.5S9.5 3 12 3s4.5 2 4.5 4.5S14.5 12 12 12z" />
    <path d="M7 15c-2 0-3.5 1.5-3.5 3.5S5 22 7 22s3.5-1.5 3.5-3.5S9 15 7 15zM17 15c2 0 3.5 1.5 3.5 3.5S19 22 17 22s-3.5-1.5-3.5-3.5S15 15 17 15z" />
  </svg>
)

export function EmployeeManagement({ branchId }: { branchId: string }) {
  console.log("EmployeeManagement branchId:", branchId);
  if (!branchId) {
    return <div>No branch selected.</div>;
  }
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branchName, setBranchName] = useState<string>("")
  const [branchLocation, setBranchLocation] = useState<string>("")
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"branch" | "all">("branch") // "branch" = current branch only, "all" = all branches
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkEditData, setBulkEditData] = useState<Employee[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()
  const [branchMaxHoursPerDay, setBranchMaxHoursPerDay] = useState<number>(8)
  const [regularMaxHoursPerWeek, setRegularMaxHoursPerWeek] = useState<number>(40)
  const [branchRoles, setBranchRoles] = useState([])
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { lastMessage, sendMessage } = useWebSocket();

  const apiUrl = (path: string) => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + path : path);

  // Helper to compute days per week using latest state
  const computeDaysPerWeek = (hoursPerWeek: number, maxHoursPerDay: number) => {
    const safeMaxHoursPerDay = Number(maxHoursPerDay) > 0 ? Number(maxHoursPerDay) : 1;
    return Math.ceil(Number(hoursPerWeek) / safeMaxHoursPerDay);
  };

  // Fetch branch info and employees for the branch
  const fetchBranchAndEmployees = () => {
    if (!branchId) return;
    fetch(apiUrl(`/api/branches/${branchId}`))
      .then(res => res.json())
      .then(branch => {
        setBranchName(branch.name || branchId)
        setBranchLocation(branch.location || "")
        setBranchMaxHoursPerDay(branch.maxHoursPerDay ?? 8)
        setRegularMaxHoursPerWeek(branch.regularEmployeesMaxHoursPerWeek ?? 40)
        setBranchRoles(Array.isArray(branch.roles) ? branch.roles : [])
      })
      .catch(() => {
        setBranchName(branchId)
        setBranchLocation("")
        setBranchMaxHoursPerDay(8)
        setRegularMaxHoursPerWeek(40)
        setBranchRoles([])
      })
    fetch(apiUrl(`/api/branches/${branchId}/employees`))
      .then(res => res.json())
      .then(data => {
        // Patch employees to include branchId and branchName for frontend filtering
        setEmployees(data.map((emp: Employee) => {
          return {
            ...emp,
            branchId: emp.branchId,
            branchName: emp.branchName,
          };
        }))
      })
      .catch(() => setEmployees([]))
  }

  useEffect(() => {
    fetchBranchAndEmployees();
  }, [branchId, branchName])

  useEffect(() => {
    if (
      (lastMessage?.type === "employee_added" && lastMessage.data.branchId === branchId) ||
      lastMessage?.type === "role_updated"
    ) {
      fetchBranchAndEmployees();
    }
  }, [lastMessage, branchId]);

  useEffect(() => {
    if (lastMessage?.type === 'BRANCH_SETTINGS_UPDATED' && lastMessage.data?.branchId === branchId) {
      fetchBranchAndEmployees();
    }
  }, [lastMessage, branchId]);

  const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  // Add employee via backend
  const handleAddEmployee = (employeeData: any) => {
    // Only send required fields to the backend
    const payload = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      phone: employeeData.phoneNumber || employeeData.phone || "",
      role: employeeData.role,
      employmentType: employeeData.employmentType,
      hoursPerWeek: employeeData.hoursPerWeek ?? 40, // Ensure this is sent
      branchId: branchId // Ensure this is sent
    };
    console.log("AddEmployee payload:", payload);
    fetch(apiUrl(`/api/branches/${branchId}/employees`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const error = await res.json();
          toast({ title: "Error", description: error.error || "Failed to add employee" });
          return;
        }
        return res.json();
      })
      .then(response => {
        if (response) {
          // Check if there was an email error
          if (response.emailError) {
            toast({
              title: "Employee Added",
              description: `Employee created successfully but failed to send email: ${response.emailError}`,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Success",
              description: "Employee added successfully! Temporary password sent to email."
            });
          }

          // Patch the new employee to include branchId and branchName for frontend filtering
          setEmployees(prev => [
            ...prev,
            {
              ...response.employee,
              branchId: branchId,
              branchName: branchName || "",
            }
          ]);
          setShowAddEmployee(false);
        }
      })
  }

  const handleEditEmployee = (updatedEmployee: Omit<Employee, "id" | "branchName"> & { id: string }) => {
    const branchName = employees.find(b => b.id === updatedEmployee.branchId)?.branchName || "Unknown Branch"
    const employeeWithBranchName: Employee = {
      ...updatedEmployee,
      branchName: `CRAB N BITES - ${branchName}`,
    }

    setEmployees(employees.map((employee) =>
      (employee.id === updatedEmployee.id || employee.id === updatedEmployee.id) ? employeeWithBranchName : employee
    ))
    setEditingEmployee(null)

    // Fetch fresh employees list from backend after edit
    fetch(apiUrl(`/api/branches/${branchId}/employees`))
      .then(res => res.json())
      .then(data => {
        setEmployees(data.map((emp: Employee) => {
          return {
            ...emp,
            branchId: emp.branchId,
            branchName: emp.branchName,
          };
        }))
      })
      .catch(() => setEmployees([]))
  }

  // Filter employees based on search and view mode
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.branchName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesBranch = viewMode === "all" || employee.branchId === branchId

    return matchesSearch && matchesBranch
  })

  // Get employee counts
  const currentBranchEmployees = employees.filter((emp) => emp.branchId === branchId)
  const allEmployeesCount = employees.length

  // Get branch stats for current view
  const getStatsForCurrentView = () => {
    if (viewMode === "branch") {
      return {
        total: currentBranchEmployees.length,
        active: currentBranchEmployees.filter((emp) => emp.status === "active").length,
        roles: currentBranchEmployees.reduce(
          (acc, emp) => {
            acc[emp.role] = (acc[emp.role] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
      }
    } else {
      return {
        total: allEmployeesCount,
        active: employees.filter((emp) => emp.status === "active").length,
        roles: employees.reduce(
          (acc, emp) => {
            acc[emp.role] = (acc[emp.role] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
      }
    }
  }

  const stats = getStatsForCurrentView()
  const topRoles = Object.entries(stats.roles)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  // Bulk Edit Handlers
  const openBulkEdit = () => {
    setBulkEditData(employees.map(e => ({ ...e })))
    setShowBulkEdit(true)
  }
  const handleBulkEditChange = (id: string, value: number) => {
    setBulkEditData(prev => prev.map(e => e.id === id ? { ...e, hoursPerWeek: value } : e))
  }
  const saveBulkEdit = async () => {
    // Prepare updates for backend
    const updates = bulkEditData.map(emp => ({
      employeeId: emp.id, // Prefer _id if available
      hoursPerWeek: emp.employmentType === "regular" ? regularMaxHoursPerWeek : emp.hoursPerWeek
    }));

    // Save to backend
    const res = await fetch(apiUrl('/api/employees/bulk-update-hours'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });

    // Save branch settings
    const branchRes = await fetch(apiUrl(`/api/branches/${branchId}/settings`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxHoursPerDay: branchMaxHoursPerDay,
        regularEmployeesMaxHoursPerWeek: regularMaxHoursPerWeek
      })
    });

    if (res.ok && branchRes.ok) {
      // Fetch updated employees from backend
      fetch(apiUrl(`/api/branches/${branchId}/employees`))
        .then(res => res.json())
        .then(data => {
          setEmployees(data.map((emp: Employee) => {
            return {
              ...emp,
              branchId: emp.branchId,
              branchName: emp.branchName,
            };
          }))
        })
        .catch(() => setEmployees([]));
      // Immediately set the state to the just-saved values to prevent UI reset
      setBranchMaxHoursPerDay(branchMaxHoursPerDay);
      setRegularMaxHoursPerWeek(regularMaxHoursPerWeek);
      // Optionally update from backend if backend returns a different value
      try {
        const branchData = await branchRes.json();
        if (branchData.maxHoursPerDay && branchData.maxHoursPerDay !== branchMaxHoursPerDay) setBranchMaxHoursPerDay(branchData.maxHoursPerDay);
        if (branchData.regularEmployeesMaxHoursPerWeek && branchData.regularEmployeesMaxHoursPerWeek !== regularMaxHoursPerWeek) setRegularMaxHoursPerWeek(branchData.regularEmployeesMaxHoursPerWeek);
      } catch {}
      setShowBulkEdit(false);
    } else {
      // Optionally show error toast
    }
  };

  const handleDeleteBranch = async () => {
    setDeleting(true)
    try {
      const res = await fetch(apiUrl(`/api/branches/${branchId}`), { method: 'DELETE' })
      if (res.ok) {
        navigate('/')
      } else {
        toast({ title: "Error", description: "Failed to delete branch" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Error deleting branch" })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Use bulkEditData for cards when showBulkEdit is true, otherwise use filteredEmployees
  const employeesToShow = showBulkEdit ? bulkEditData : filteredEmployees;

  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 md:px-8">

      {/* Header with branch name only */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowMobileNav(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Employees</h1>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <CrabIcon className="w-3 h-3" />
                <span>{branchName}{branchLocation ? ` - ${branchLocation}` : ""}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddEmployee(true)} size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4" />
              <span className="ml-2">Add Employee to {branchName}{branchLocation ? ` - ${branchLocation}` : ""}</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete Branch
            </Button>
          </div>
        </div>
      </header>
      <MobileNav isOpen={showMobileNav} onClose={() => setShowMobileNav(false)} />
      <div className="p-4 lg:p-6">
        {/* Desktop Header with branch name only */}
        <div className="hidden lg:block mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                <p className="text-gray-600 mt-1">Branch: <span className="font-semibold">{branchName}{branchLocation ? ` - ${branchLocation}` : ""}</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddEmployee(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete Branch
              </Button>
            </div>
          </div>
        </div>

        {/* Current View Context */}
        <Card className="mb-6 border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 text-white rounded-lg flex items-center justify-center">
                  <CrabIcon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {viewMode === "branch" ? branchName : "All Branches"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {viewMode === "branch"
                      ? `Managing employees for this specific branch`
                      : `Viewing employees across all ${employees.length} branches`}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "branch" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("branch")}
                  className={viewMode === "branch" ? "bg-white shadow-sm" : ""}
                >
                  Current Branch
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                  className={viewMode === "all" ? "bg-white shadow-sm" : ""}
                >
                  All Branches
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600">
                    {viewMode === "branch" ? "Branch Employees" : "Total Employees"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-sm text-gray-600">Active Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.roles).length}</p>
                  <p className="text-sm text-gray-600">Different Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Roles for Current View */}
        {topRoles.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Top Roles {viewMode === "branch" ? `in ${branchName}` : "Across All Branches"}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {topRoles.map(([role, count]) => (
                  <Badge key={role} variant="secondary" className="text-sm">
                    {role}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={`Search employees${viewMode === "branch" ? ` in ${branchName}` : " across all branches"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Bulk Edit Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={openBulkEdit} className="text-xs">
            Bulk Edit Max Hours
          </Button>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {employeesToShow.map((employee, index) => {
            const isCurrentBranch = employee.branchId === branchId;
            const isRegular = employee.employmentType === "regular";
            let hoursPerWeek;
            if (showBulkEdit) {
              if (isRegular) {
                hoursPerWeek = regularMaxHoursPerWeek;
              } else {
                // Find the current value from bulkEditData for this employee
                const bulkEditEmp = bulkEditData.find(e => (e.id || e.id) === (employee.id || employee.id));
                hoursPerWeek = bulkEditEmp ? bulkEditEmp.hoursPerWeek : employee.hoursPerWeek;
              }
            } else {
              hoursPerWeek = employee.hoursPerWeek;
            }
            const pay = Number(((employee.rate ?? employee.hourlyRate ?? 0) * hoursPerWeek).toFixed(2));
            const payDisplay = isNaN(pay) ? 0 : pay;
            const days = computeDaysPerWeek(hoursPerWeek, branchMaxHoursPerDay);
            const daysDisplay = isNaN(days) ? '-' : days;

            return (
              <Card key={employee.id || employee.id || `${employee.firstName}-${employee.lastName}-${index}`} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base lg:text-lg leading-tight">
                        {employee.firstName} {employee.lastName}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{employee.role}</p>
                      {/* Employment Type Badge */}
                      <Badge variant="secondary" className="text-xs mt-1">
                        {employee.employmentType === "regular" ? "Regular" : "Part-Time"}
                      </Badge>
                      {/* Branch Information - Only show if viewing all branches */}
                      {viewMode === "all" && (
                        <div className="flex items-center gap-1 mt-2">
                          <CrabIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{employee.branchName}</span>
                          {isCurrentBranch && (
                            <Badge variant="secondary" className="text-xs ml-1">
                              Current
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge variant={employee.status === "active" ? "default" : "secondary"} className="ml-2 text-xs">
                      {employee.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-right truncate ml-2 max-w-[60%]">{employee.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-semibold text-blue-900">₱{employee.rate ?? employee.hourlyRate ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Weekly Pay:</span>
                      <span className="font-bold text-blue-900 text-lg">₱{((employee.rate ?? employee.hourlyRate ?? 0) * (employee.hoursPerWeek ?? 40)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">{hoursPerWeek}h/week</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">{daysDisplay} days/week</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setEditingEmployee(employee)
                        setShowEditEmployee(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setViewingEmployee(employee)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDeletingEmployee(employee)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {employeesToShow.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : viewMode === "branch"
                  ? `No employees found in ${branchName}`
                  : "No employees found across all branches"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowAddEmployee(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
                {viewMode === "branch" ? ` to ${branchName}` : ""}
              </Button>
            )}
          </div>
        )}
      </div>

      <AddEmployeeModal
        open={showAddEmployee}
        onOpenChange={setShowAddEmployee}
        currentBranch={branchId && branchName && branchLocation ? { id: branchId, name: branchName, location: branchLocation } : undefined}
        onSubmit={handleAddEmployee}
        currentRoles={branchRoles}
        currentEmployees={employees}
      />

      <EditEmployeeModal
        open={showEditEmployee}
        onOpenChange={setShowEditEmployee}
        employee={editingEmployee}
        availableBranches={[]}
        onSubmit={(updatedEmployee) => handleEditEmployee({ ...updatedEmployee, id: editingEmployee?.id || '' })}
        branchRoles={branchRoles}
      />

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <h2 className="text-lg font-bold mb-4">Bulk Edit Max Hours</h2>
            {/* Max Hours Per Day input inside modal */}
            <div className="mb-4 flex items-center gap-3">
              <label className="font-medium text-sm">Max Hours Per Day:</label>
              <input
                type="number"
                min={1}
                max={24}
                value={branchMaxHoursPerDay}
                onChange={e => {
                  let value = Number(e.target.value);
                  if (!value || value < 1) value = 1;
                  setBranchMaxHoursPerDay(value);
                }}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
            {/* Regular Employees Max Hours/Week input */}
            <div className="mb-4 flex items-center gap-3">
              <label className="font-medium text-sm">Regular Employees Max Hours/Week:</label>
              <input
                type="number"
                min={1}
                max={80}
                value={regularMaxHoursPerWeek}
                onChange={e => {
                  let value = Number(e.target.value);
                  if (!value || value < 1) value = 1;
                  setRegularMaxHoursPerWeek(value);
                }}
                className="border rounded px-2 py-1 w-24"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Name</th>
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Max Hours/Week</th>
                    <th className="py-2 text-left">Computed Days/Week</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkEditData.map(emp => {
                    const isRegular = emp.employmentType === "regular";
                    const maxHoursWeek = isRegular ? regularMaxHoursPerWeek : emp.hoursPerWeek;
                    const computedDaysWeek = computeDaysPerWeek(maxHoursWeek ?? 40, branchMaxHoursPerDay);
                    return (
                      <tr key={emp.id || emp.id} className="border-b">
                        <td className="py-2">{emp.firstName} {emp.lastName}</td>
                        <td className="py-2 capitalize">{emp.employmentType}</td>
                        <td className="py-2">
                          {emp.employmentType === "part-time" ? (
                            <input
                              type="number"
                              min={0.5}
                              max={80}
                              step="0.5"
                              value={emp.hoursPerWeek}
                              onChange={e => {
                                let value = parseFloat(e.target.value);
                                if (!value || value < 0.5) value = 0.5;
                                handleBulkEditChange(emp.id, value);
                              }}
                              className="border rounded px-2 py-1 w-24"
                            />
                          ) : (
                            <span className="text-gray-500">{maxHoursWeek}</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-500">{computedDaysWeek}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowBulkEdit(false)} size="sm">Cancel</Button>
              <Button onClick={saveBulkEdit} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">Save All</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md mx-4 w-[calc(100vw-2rem)] sm:w-full rounded-lg">
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg lg:text-xl font-semibold">Delete Branch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this branch? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBranch} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewingEmployee && (
        <Dialog open={!!viewingEmployee} onOpenChange={() => setViewingEmployee(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                {viewingEmployee.firstName} {viewingEmployee.lastName}
                <BadgeCheck className="w-5 h-5 text-green-500 ml-2" />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex flex-col gap-2">
                <span className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {viewingEmployee.branchName}
                </span>
                <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <Badge variant={viewingEmployee.status === "active" ? "default" : "secondary"}>{viewingEmployee.status}</Badge>
                  <Badge variant="secondary">{viewingEmployee.employmentType === "regular" ? "Regular" : "Part-Time"}</Badge>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span>{viewingEmployee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span>Hourly Rate:</span>
                  <span className="font-semibold text-blue-900">₱{viewingEmployee.rate ?? viewingEmployee.hourlyRate ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span>Hours/Week:</span>
                  <span className="font-semibold">{viewingEmployee.hoursPerWeek ?? 0}h</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span>Days/Week:</span>
                  <span className="font-semibold">{computeDaysPerWeek(viewingEmployee.hoursPerWeek ?? 40, branchMaxHoursPerDay)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-700 mt-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-lg">Weekly Pay:</span>
                <span className="font-bold text-blue-900 text-lg">₱{((viewingEmployee.rate ?? viewingEmployee.hourlyRate ?? 0) * (viewingEmployee.hoursPerWeek ?? 40)).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setViewingEmployee(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {deletingEmployee && (
        <Dialog open={!!deletingEmployee} onOpenChange={() => setDeletingEmployee(null)}>
          <DialogContent className="max-w-md mx-4 w-[calc(100vw-2rem)] sm:w-full rounded-lg">
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg lg:text-xl font-semibold">Delete Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Are you sure you want to delete <span className="font-bold">{deletingEmployee.firstName} {deletingEmployee.lastName}</span>? This action cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeletingEmployee(null)} disabled={isDeleting}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  setIsDeleting(true);
                  const res = await fetch(apiUrl(`/api/employees/${deletingEmployee.id || deletingEmployee.id}`
