"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, Clock, Users, DollarSign } from "lucide-react"

interface Branch {
  id: string
  name: string
  location: string
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
  branchId: string
  branchName: string
  employmentType: "regular" | "part-time"
}

interface EditEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  availableBranches: Branch[]
  onSubmit: (employeeData: Omit<Employee, "id" | "branchName">) => void
  branchRoles: { name: string; hourlyRate: number }[]
}

export function EditEmployeeModal({
  open,
  onOpenChange,
  employee,
  availableBranches,
  onSubmit,
  branchRoles = [],
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    hourlyRate: 0,
    hoursPerWeek: 0,
    daysPerWeek: 0,
    status: "active" as "active" | "inactive",
    branchId: "",
    employmentType: "regular" as "regular" | "part-time",
  })

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      // Find the correct rate from branchRoles
      let rate = employee.hourlyRate;
      const found = branchRoles.find(r => r.name === employee.role);
      if (found) rate = found.hourlyRate;
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        email: employee.email,
        hourlyRate: rate,
        hoursPerWeek: employee.hoursPerWeek,
        daysPerWeek: employee.daysPerWeek,
        status: employee.status,
        branchId: employee.branchId,
        employmentType: employee.employmentType || "regular",
      })
    }
  }, [employee, branchRoles])

  // Auto-update hourlyRate when role changes
  useEffect(() => {
    if (!formData.role || !branchRoles.length) return;
    const found = branchRoles.find(r => r.name === formData.role);
    if (found && found.hourlyRate !== formData.hourlyRate) {
      setFormData(prev => ({ ...prev, hourlyRate: found.hourlyRate }));
    }
  }, [formData.role, branchRoles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (employee) {
      onSubmit({
        ...formData,
        employmentType: formData.employmentType,
      })
      onOpenChange(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Employee Info */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Current Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{employee.firstName} {employee.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Branch:</span>
                  <span className="font-medium">{employee.branchName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {branchRoles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (₱)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRate ?? 0}
                onChange={(e) => handleInputChange("hourlyRate", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
                readOnly
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursPerWeek">Hours per Week</Label>
              <Input
                id="hoursPerWeek"
                type="number"
                min="0"
                max="168"
                value={formData.hoursPerWeek ?? 0}
                onChange={(e) => handleInputChange("hoursPerWeek", parseInt(e.target.value) || 0)}
                placeholder="40"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysPerWeek">Days per Week</Label>
              <Input
                id="daysPerWeek"
                type="number"
                min="0"
                max="7"
                value={formData.daysPerWeek ?? 0}
                onChange={(e) => handleInputChange("daysPerWeek", parseInt(e.target.value) || 0)}
                placeholder="5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: "active" | "inactive") => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <Select value={formData.branchId} onValueChange={(value) => handleInputChange("branchId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select value={formData.employmentType} onValueChange={(value) => handleInputChange("employmentType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="part-time">Part-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-900 mb-3">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">Weekly Pay:</span>
                  <span className="font-medium text-blue-900">
                    ₱{isNaN(formData.hourlyRate * formData.hoursPerWeek) ? '0.00' : (formData.hourlyRate * formData.hoursPerWeek).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">Hours/Week:</span>
                  <span className="font-medium text-blue-900">{formData.hoursPerWeek}h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">Days/Week:</span>
                  <span className="font-medium text-blue-900">{formData.daysPerWeek ? `${formData.daysPerWeek} days` : '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{formData.employmentType === "regular" ? "Regular" : "Part-Time"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
