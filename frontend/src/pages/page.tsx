import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, Users, Calendar, Menu, Settings } from "lucide-react"
import { AddBranchModal } from "@/components/add-branch-modal"
import { useWebSocket } from "@/hooks/use-websocket"
import { MobileNav } from "@/components/mobile-nav"
import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"

interface Branch {
  _id: string
  name: string
  location: string
  createdAt?: string
  updatedAt?: string
  employeeCount?: number
  roles?: { name: string; count: number }[]
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const { isConnected } = useWebSocket()
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme();

  const apiUrl = (path: string) => (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + path : path);

  // Fetch dashboard summary
  useEffect(() => {
    setLoading(true)
    fetch(apiUrl("/api/dashboard/summary"))
      .then(res => res.json())
      .then(data => {
        setDashboard(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fetch branches
  const fetchBranches = () => {
    setBranchesLoading(true)
    fetch(apiUrl("/api/branches"))
      .then(res => res.json())
      .then(data => {
        console.log('Fetched branches:', data)
        setBranches(data)
        setBranchesLoading(false)
        console.log('Branches state after set:', data)
      })
      .catch(() => setBranchesLoading(false))
  }
  useEffect(() => {
    fetchBranches()
    // Debug: log branches after fetch
    // setTimeout(() => console.log('Branches state:', branches), 1000)
  }, [])

  // Fetch employee counts for each branch
  useEffect(() => {
    if (branches.length === 0) return;
    const fetchCounts = async () => {
      const updatedBranches = await Promise.all(
        branches.map(async (branch) => {
          const res = await fetch(apiUrl(`/api/branches/${branch._id}/employees`));
          const employees = await res.json();
          return { ...branch, employeeCount: employees.length };
        })
      );
      setBranches(updatedBranches);
    };
    fetchCounts();
  }, [branches.length]);

  // Handle branch creation
  const handleAddBranch = (branchData: { name: string; location: string }) => {
    fetch(apiUrl("/api/branches"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branchData)
    })
      .then(res => res.json())
      .then((newBranch) => {
        setShowAddBranch(false)
        fetchBranches()
      })
  }

  // Reference-matching premium light mode
  const cardClass = resolvedTheme === 'dark'
    ? 'bg-[#232329] text-gray-100 border-[#23232a]'
    : 'bg-white text-gray-900 border border-gray-200 shadow-lg rounded-2xl';
  // Branch card for light mode (screenshot match)
  const branchCardClass = resolvedTheme === 'dark'
    ? 'bg-[#23232a] text-gray-100 border-[#23232a]'
    : 'bg-white text-gray-900 border border-gray-200 shadow-lg rounded-2xl';
  const cardHeaderClass = resolvedTheme === 'dark'
    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-t-2xl'
    : 'bg-gradient-to-r from-teal-500 to-teal-400 text-white rounded-t-2xl';
  const cardContentClass = resolvedTheme === 'dark'
    ? 'bg-[#23232a] text-gray-100 rounded-b-2xl'
    : 'text-gray-900 pt-6 pb-6 px-6';
  const badgeClass = resolvedTheme === 'dark'
    ? 'bg-[#18181c] border border-[#232329] text-gray-100 rounded-full font-semibold px-3 py-1 text-xs shadow-sm'
    : 'bg-gray-100 border border-gray-200 text-gray-900 rounded-full font-semibold px-3 py-1 text-xs shadow-sm';
  const mainBgClass = resolvedTheme === 'dark' ? 'bg-[#18181b]' : 'bg-gray-50';
  const headerCardClass = resolvedTheme === 'dark'
    ? 'bg-[#232329] border border-[#23232a] text-white rounded-2xl shadow-lg px-8 py-4 mt-8 mb-8 max-w-7xl mx-auto'
    : 'bg-white border border-gray-200 text-gray-900 rounded-2xl shadow-lg px-8 py-4 mt-8 mb-8 max-w-7xl mx-auto';

  // Header classes for light/dark
  const headerClass = resolvedTheme === 'dark'
    ? 'bg-[#232329] border-b border-[#23232a] text-white'
    : 'bg-white border-b border-gray-200 text-gray-900';

  return (
    <div className={`min-h-screen w-full ${mainBgClass}`}>
      {/* Floating Header Card */}
      <div className={headerCardClass}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className={resolvedTheme === 'dark' ? 'lg:hidden text-gray-300' : 'lg:hidden text-gray-900'} onClick={() => setShowMobileNav(true)}>
              <Menu className={`w-5 h-5 ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`} />
            </Button>
            <div className={`w-10 h-10 bg-gradient-to-tr from-teal-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-md`}>
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className={`text-2xl font-bold tracking-tight ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>ShiftSync</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className={`text-xs lg:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-green-600 to-green-400 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-base font-semibold">KJ</span>
            </div>
          </div>
        </div>
      </div>
      <MobileNav isOpen={showMobileNav} onClose={() => setShowMobileNav(false)} />
      {/* Main Content */}
      <main className="w-full px-2 sm:px-4 md:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
            <div>
              <h1 className={`text-3xl font-bold mb-1 tracking-tight ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Dashboard</h1>
              <div className="h-1 w-12 bg-gradient-to-r from-teal-500 to-teal-400 rounded mb-4" />
              <p className={`text-base ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>My Scheduling Group</p>
            </div>
            <Button
              onClick={() => setShowAddBranch(true)}
              className="bg-gradient-to-tr from-teal-600 to-teal-400 hover:from-teal-700 hover:to-teal-500 rounded-full shadow-lg px-6 py-3 text-base font-semibold transition-all duration-200 text-white"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Branch
            </Button>
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 w-full">
            <Card className={cardClass}>
              <div className="flex flex-col items-center gap-4 py-7">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${resolvedTheme === 'dark' ? 'bg-gradient-to-tr from-blue-700 to-blue-500' : 'bg-blue-100'}`}>
                  <Building2 className={resolvedTheme === 'dark' ? 'w-7 h-7 text-blue-200' : 'w-7 h-7 text-blue-600'} />
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${resolvedTheme === 'dark' ? 'text-white drop-shadow' : 'text-gray-900'}`}>{loading ? "-" : dashboard?.branches?.total ?? 0}</p>
                  <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Branches</p>
                </div>
              </div>
            </Card>
            <Card className={cardClass}>
              <div className="flex flex-col items-center gap-4 py-7">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${resolvedTheme === 'dark' ? 'bg-gradient-to-tr from-green-700 to-green-500' : 'bg-green-100'}`}>
                  <Users className={resolvedTheme === 'dark' ? 'w-7 h-7 text-green-200' : 'w-7 h-7 text-green-600'} />
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${resolvedTheme === 'dark' ? 'text-white drop-shadow' : 'text-gray-900'}`}>{loading ? "-" : dashboard?.users?.employees ?? 0}</p>
                  <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Employees</p>
                </div>
              </div>
            </Card>
            <Card className={cardClass}>
              <div className="flex flex-col items-center gap-4 py-7">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${resolvedTheme === 'dark' ? 'bg-gradient-to-tr from-purple-700 to-purple-500' : 'bg-purple-100'}`}>
                  <Calendar className={resolvedTheme === 'dark' ? 'w-7 h-7 text-purple-200' : 'w-7 h-7 text-purple-600'} />
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${resolvedTheme === 'dark' ? 'text-white drop-shadow' : 'text-gray-900'}`}>{loading ? "-" : dashboard?.schedules?.total ?? 0}</p>
                  <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Active Shifts</p>
                </div>
              </div>
            </Card>
            <Card className={cardClass}>
              <div className="flex flex-col items-center gap-4 py-7">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${resolvedTheme === 'dark' ? 'bg-gradient-to-tr from-orange-700 to-orange-500' : 'bg-orange-100'}`}>
                  <Calendar className={resolvedTheme === 'dark' ? 'w-7 h-7 text-orange-200' : 'w-7 h-7 text-orange-600'} />
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${resolvedTheme === 'dark' ? 'text-white drop-shadow' : 'text-gray-900'}`}>{loading ? "-" : dashboard?.timeOffRequests?.pending ?? 0}</p>
                  <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pending Time Off</p>
                </div>
              </div>
            </Card>
          </div>
          {/* Branch Cards */}
          {branchesLoading ? (
            <div className="text-center text-gray-500 my-16 text-lg font-medium animate-pulse">Loading branches...</div>
          ) : branches.length === 0 ? (
            <div className="text-center text-gray-500 my-16 text-lg font-medium">No branches found. Click "Create Branch" to add one.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 w-full items-stretch">
              {branches.map((branch) => (
                <div
                  key={branch._id}
                  onClick={() => navigate(`/branch/${branch._id}/employees`)}
                  className="transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
                >
                  <Card className={branchCardClass + ' h-full flex flex-col'}>
                    <div className={cardHeaderClass + ' p-6 flex flex-col rounded-t-2xl'}>
                      <div className="flex items-center justify-between w-full mb-2">
                        <CardTitle className="text-lg font-bold uppercase tracking-wide text-white">{branch.name}</CardTitle>
                        <div className="flex gap-2">
                          <Link to={`/branch/${branch._id}/roles`} onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="text-white hover:bg-teal-700">
                              <Settings className="w-5 h-5" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-white hover:bg-teal-700 p-1" onClick={e => e.stopPropagation()}>
                            <span className="text-lg">⋮</span>
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs text-white opacity-80 font-normal mt-1">{branch.location}</CardDescription>
                    </div>
                    <CardContent className={cardContentClass + ' pb-6 flex flex-col justify-between h-full'}>
                      <div className="space-y-5">
                        <div className="flex flex-row items-center justify-between gap-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{branch.employeeCount ?? 0} employees</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Active</span>
                          </div>
                        </div>
                        {/* Display role distribution */}
                        {Array.isArray(branch.roles) && branch.roles.filter(r => r.count > 0).length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-2 font-medium">Role Distribution:</div>
                            <div className="flex flex-wrap gap-2 gap-y-2 justify-start items-start">
                              {branch.roles.filter(r => r.count > 0).map((r) => (
                                <span
                                  key={r.name}
                                  className={badgeClass}
                                >
                                  <span className="font-bold">{r.name}</span>: <span className="font-normal">{r.count}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
          <AddBranchModal open={showAddBranch} onOpenChange={setShowAddBranch} onSubmit={handleAddBranch} />
        </div>
      </main>
    </div>
  )
}
