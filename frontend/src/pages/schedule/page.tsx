import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Clock,
  Users,
  Fish,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  MapPin,
  Building2,
  Trash,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useWebSocket } from "@/hooks/use-websocket";

const apiUrl = (path: string) => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + path : path);

interface Branch {
  id: string
  name: string
  location: string
  employeeCount: number
}

interface Shift {
  id: string
  employeeId: string
  employeeName: string
  role: string
  startTime: string
  endTime: string
  date: string
  status: "scheduled" | "confirmed" | "completed"
  branchId: string
  branchName: string
  branchLocation: string
  avatar: string
  color: string
}

export default function SchedulePage() {
  const [searchParams] = useSearchParams()
  const branchParam = searchParams.get("branch")
  const employeeParam = searchParams.get("employee")

  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [viewMode, setViewMode] = useState<"all" | "branch">("all")
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(employeeParam)
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState<{ startTime: string; endTime: string; role: string; branchId: string }>({ startTime: '', endTime: '', role: '', branchId: '' });

  // Fetch branches from backend
  const [branches, setBranches] = useState<Branch[]>([])
  useEffect(() => {
    fetch(apiUrl("/api/branches"))
      .then(res => res.json())
      .then(data => setBranches(data.map((b: any) => ({ ...b, id: String(b.id ?? b._id) }))))
      .catch(() => setBranches([]))
  }, [])

  const [shifts, setShifts] = useState<Shift[]>([])
  useEffect(() => {
    fetch(apiUrl('/api/shifts'))
      .then(res => res.json())
      .then(data => setShifts(data))
      .catch(() => setShifts([]))
  }, [])

  // Set initial branch selection from URL parameter
  useEffect(() => {
    if (branchParam && branches.find((b) => b.id === branchParam)) {
      setSelectedBranch(branchParam)
    }
  }, [branchParam, branches])

  // Set default selected branch to the first branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(String(branches[0].id));
    }
  }, [branches, selectedBranch]);

  // Set initial employee selection from URL parameter
  useEffect(() => {
    if (employeeParam) {
      setSelectedEmployee(employeeParam)
      // Find the employee's branch and set it as selected
      const employeeShift = shifts.find(shift => shift.employeeId === employeeParam)
      if (employeeShift) {
        setSelectedBranch(employeeShift.branchId)
      }
    }
  }, [employeeParam, shifts])

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeek)
    date.setDate(date.getDate() - date.getDay() + i)
    return date
  })

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  // Filter shifts
  const filteredShifts = shifts.filter((shift) => {
    const matchesSearch =
      shift.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.branchLocation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || shift.status === filterStatus
    const matchesBranch = selectedBranch === "all" || shift.branchId === selectedBranch
    const matchesEmployee = !selectedEmployee || shift.employeeId === selectedEmployee

    // Filter by current week
    const shiftDate = new Date(shift.date)
    const weekStart = new Date(currentWeek)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const inCurrentWeek = shiftDate >= weekStart && shiftDate <= weekEnd

    return matchesSearch && matchesStatus && matchesBranch && matchesEmployee && inCurrentWeek
  })

  // Group shifts by date or by branch
  const groupedShifts =
    viewMode === "branch"
      ? filteredShifts.reduce(
          (acc, shift) => {
            const key = `${shift.branchId}-${shift.date}`
            if (!acc[key]) {
              acc[key] = []
            }
            acc[key].push(shift)
            return acc
          },
          {} as Record<string, Shift[]>,
        )
      : filteredShifts.reduce(
          (acc, shift) => {
            if (!acc[shift.date]) {
              acc[shift.date] = []
            }
            acc[shift.date].push(shift)
            return acc
          },
          {} as Record<string, Shift[]>,
        )

  // Calculate stats
  const totalShifts = filteredShifts.length
  const totalHours = filteredShifts.reduce((total, shift) => {
    const start = Number.parseInt(shift.startTime.split(":")[0])
    const end = Number.parseInt(shift.endTime.split(":")[0])
    return total + (end - start)
  }, 0)
  const uniqueEmployees = new Set(filteredShifts.map((s) => s.employeeId)).size
  const activeBranches = new Set(filteredShifts.map((s) => s.branchId)).size

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getBranchColor = (branchId: string) => {
    const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    return colors[Number.parseInt(branchId) - 1] || "bg-gray-500"
  }

  // Get the selected branch name for display
  const selectedBranchObj = branches.find((b) => b.id === selectedBranch)
  const selectedBranchName =
    selectedBranch === "all"
      ? "All Branches"
      : selectedBranchObj
        ? `${selectedBranchObj.name}${selectedBranchObj.location ? ' - ' + selectedBranchObj.location : ''}`
        : "Unknown Branch"

  // Helper to format time in 12-hour format
  function format12HourTime(hhmm: string) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  // Handler for saving edited shift
  const handleEditSave = async () => {
    if (!editShift) return;
    try {
      const res = await fetch(apiUrl(`/api/shifts/${editShift.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        alert('Failed to update shift on server.');
        return;
      }
      const data = await res.json();
      setShifts(prev => prev.map(s => s.id === editShift.id ? { ...s, ...data.shift } : s));
      setEditShift(null);
    } catch (err) {
      alert('Error updating shift.');
    }
  };

  // Handler for deleting shift
  const handleDelete = async () => {
    if (!deleteShift) return;
    try {
      console.log('DEBUG: handleDelete called for shift', deleteShift);
      const res = await fetch(apiUrl(`/api/shifts/${deleteShift.id}`), { method: 'DELETE' });
      if (!res.ok) {
        alert('Failed to delete shift from server.');
        return;
      }
      setShifts(prev => prev.filter(s => s.id !== deleteShift.id));
      // Auto-unfinalize: if employee is finalized, unfinalize immediately
      // weekStart is always calculated as Sunday (to match DB and all frontend logic)
      const shiftDate = new Date(deleteShift.date);
      shiftDate.setDate(shiftDate.getDate() - shiftDate.getDay()); // Always Sunday
      const weekStartStr = shiftDate.toISOString().split('T')[0];
      console.log('DEBUG: Deleting finalized with', {
        employeeId: deleteShift.employeeId,
        weekStartStr
      });
      // Fetch finalized for this week
      fetch(apiUrl(`/api/finalized?weekStart=${weekStartStr}`))
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const finalizedIds = data.map((f: any) => String(f.employeeId));
          console.log('DEBUG: finalizedIds for week', weekStartStr, finalizedIds);
          if (finalizedIds.includes(deleteShift.employeeId)) {
            console.log('DEBUG: overview auto-unfinalize (any shift)', { employeeId: deleteShift.employeeId, weekStart: weekStartStr });
            fetch(apiUrl(`/api/finalized?employeeId=${deleteShift.employeeId}&weekStart=${weekStartStr}`), {
              method: 'DELETE',
            })
              .then(async (delRes) => {
                const delText = await delRes.text();
                console.log('DEBUG: overview finalized DELETE response', delText);
                // Optionally, refetch or update UI here
                fetch(apiUrl(`/api/finalized?weekStart=${weekStartStr}`))
                  .then(res2 => res2.ok ? res2.json() : [])
                  .then(data2 => {
                    console.log('DEBUG: overview finalized state after delete', data2);
                  });
              });
          }
        });
      setDeleteShift(null);
    } catch (err) {
      alert('Error deleting shift.');
    }
  };

  const { sendMessage } = useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule Overview</h1>
            <p className="text-gray-600 mt-1">
              {selectedBranch === "all"
                ? "View and manage schedules across all branches"
                : `Managing schedules for ${selectedBranchName}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={String(selectedBranch)} onValueChange={(val: string) => setSelectedBranch(String(val))}>
              <SelectTrigger className="w-48">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b: Branch) => (
                  <SelectItem key={String(b.id)} value={String(b.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-xs text-gray-500">{b.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link to={selectedBranch === "all" ? "/branch/1/schedule" : `/branch/${selectedBranch}/schedule`}>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                {selectedBranch === "all" ? "Create Schedule" : `Create Schedule - ${selectedBranchName}`}
              </Button>
            </Link>
          </div>
        </div>

        {/* Branch Context Indicator */}
        {selectedBranch !== "all" && (
          <Card className="mb-6 border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${getBranchColor(selectedBranch)} text-white rounded-lg flex items-center justify-center font-semibold`}
                >
                  {selectedBranchName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Currently viewing: <span className="font-bold">{selectedBranchObj?.name}</span>
                    {selectedBranchObj?.location && (
                      <span className="text-xs text-gray-500 ml-1">{selectedBranchObj.location}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Showing schedules and data for this branch only.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1 text-teal-600"
                      onClick={() => setSelectedBranch("all")}
                    >
                      View all branches
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Context Indicator */}
        {selectedEmployee && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center font-semibold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Currently viewing: {shifts.find(s => s.employeeId === selectedEmployee)?.employeeName || "Employee"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Showing schedules for this employee only.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1 text-blue-600"
                      onClick={() => setSelectedEmployee(null)}
                    >
                      View all employees
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalShifts}</p>
                  <p className="text-sm text-gray-600">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalHours}</p>
                  <p className="text-sm text-gray-600">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{uniqueEmployees}</p>
                  <p className="text-sm text-gray-600">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activeBranches}</p>
                  <p className="text-sm text-gray-600">Active Branches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search employees, roles, or branches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                  className={viewMode === "all" ? "bg-white shadow-sm" : ""}
                >
                  By Date
                </Button>
                <Button
                  variant={viewMode === "branch" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("branch")}
                  className={viewMode === "branch" ? "bg-white shadow-sm" : ""}
                >
                  By Branch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Week
          </Button>
          <h2 className="text-xl font-semibold">
            {weekDates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })} -{" "}
            {weekDates[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <Button variant="outline" onClick={() => navigateWeek("next")}>
            Next Week
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Schedule Display */}
        <div className="space-y-6">
          {viewMode === "all"
            ? // By Date View
              weekDates.map((date) => {
                const dateStr = date.toISOString().split("T")[0]
                const dayShifts = groupedShifts[dateStr] || []

                return (
                  <Card key={dateStr}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-600 text-white rounded-lg flex items-center justify-center font-semibold">
                            {date.getDate()}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">
                              {date.toLocaleDateString("en-US", { weekday: "long" })}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{dayShifts.length} shifts</Badge>
                          <Badge variant="outline">{new Set(dayShifts.map((s) => s.branchId)).size} branches</Badge>
                          {/* Removed Edit [BRANCH NAME] button as requested */}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dayShifts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">No shifts scheduled</p>
                          <p className="text-sm">Add shifts for this day</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {dayShifts
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map((shift) => (
                              <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow relative">
                                <div className="absolute top-2 right-2 flex gap-2 z-10">
                                  <button
                                    className="p-1 rounded hover:bg-gray-100"
                                    title="Edit shift"
                                    onClick={() => {
                                      setEditShift(shift);
                                      setEditForm({ startTime: shift.startTime, endTime: shift.endTime, role: shift.role, branchId: shift.branchId });
                                    }}
                                  >
                                    <Edit className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button
                                    className="p-1 rounded hover:bg-gray-100"
                                    title="Delete shift"
                                    onClick={() => setDeleteShift(shift)}
                                  >
                                    <Trash className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                  <div
                                    className={`w-10 h-10 ${shift.color} rounded-full flex items-center justify-center text-white font-medium`}
                                  >
                                    {shift.avatar}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold">{shift.employeeName}</h4>
                                    <p className="text-sm text-gray-600">{shift.role}</p>
                                  </div>
                                  <Badge className={getStatusColor(shift.status)}>{shift.status}</Badge>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>
                                      {format12HourTime(shift.startTime)} - {format12HourTime(shift.endTime)}
                                    </span>
                                    <span className="text-gray-500">
                                      (
                                      {Number.parseInt(shift.endTime.split(":")[0]) -
                                        Number.parseInt(shift.startTime.split(":")[0])}
                                      h)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      {shift.branchName}
                                      {shift.branchLocation && shift.branchLocation !== shift.branchName ? ` • ${shift.branchLocation}` : ''}
                                    </span>
                                    <div className={`w-2 h-2 ${getBranchColor(shift.branchId)} rounded-full`}></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            : // By Branch View
              branches
                .filter((branch) => selectedBranch === "all" || branch.id === selectedBranch)
                .map((branch) => {
                  const branchShifts = filteredShifts.filter((shift) => shift.branchId === branch.id)

                  return (
                    <Card key={branch.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 ${getBranchColor(branch.id)} text-white rounded-lg flex items-center justify-center font-semibold`}
                            >
                              {branch.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold">{branch.name} - {branch.location}</h3>
                              <p className="text-sm text-gray-600">{branch.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{branchShifts.length} shifts</Badge>
                            <Link to={`/branch/${branch.id}/schedule`}>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-1" />
                                Manage
                              </Button>
                            </Link>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {branchShifts.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium">No shifts scheduled</p>
                            <p className="text-sm">Add shifts for this branch</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {branchShifts
                              .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                              .map((shift) => (
                                <div key={shift.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div
                                      className={`w-10 h-10 ${shift.color} rounded-full flex items-center justify-center text-white font-medium`}
                                    >
                                      {shift.avatar}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold">{shift.employeeName}</h4>
                                      <p className="text-sm text-gray-600">{shift.role}</p>
                                    </div>
                                    <Badge className={getStatusColor(shift.status)}>{shift.status}</Badge>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span>
                                        {new Date(shift.date).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span>
                                        {format12HourTime(shift.startTime)} - {format12HourTime(shift.endTime)}
                                      </span>
                                      <span className="text-gray-500">
                                        (
                                        {Number.parseInt(shift.endTime.split(":")[0]) -
                                          Number.parseInt(shift.startTime.split(":")[0])}
                                        h)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
        </div>

        {/* Empty State */}
        {filteredShifts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No schedules found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterStatus !== "all" || selectedBranch !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Get started by creating schedules for your branches"}
              </p>
              <Link to={selectedBranch === "all" ? "/branch/1/schedule" : `/branch/${selectedBranch}/schedule`}>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule {selectedBranch !== "all" ? `- ${selectedBranchName}` : ""}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Shift Modal */}
      {editShift && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Edit Shift</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Branch</label>
              <div className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-700 cursor-not-allowed">
                {(() => {
                  const branch = branches.find(b => b.id === (editShift.branchId));
                  return branch ? `${branch.name} - ${branch.location}` : editShift.branchName;
                })()}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                className="border rounded px-2 py-1 w-full"
                value={editForm.startTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                className="border rounded px-2 py-1 w-full"
                value={editForm.endTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Role</label>
              <input
                type="text"
                className="border rounded px-2 py-1 w-full"
                value={editForm.role}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, role: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setEditShift(null)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shift Confirmation */}
      {deleteShift && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Delete Shift</h3>
            <p className="mb-4">Are you sure you want to delete this shift for <b>{deleteShift.employeeName}</b>?</p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setDeleteShift(null)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
