"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin } from "lucide-react"

interface Branch {
  id: string
  name: string
  location: string
}

interface AddEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBranch?: Branch
  currentRoles: { name: string; count: number }[]
  currentEmployees: { role: string }[]
  onSubmit: (data: {
    firstName: string
    lastName: string
    role: string
    email: string
    hourlyRate: number
    hoursPerWeek: number
    daysPerWeek: number
    branchId: string
    branchName: string
    employmentType: string
    phoneNumber: string
  }) => void
}

const roles = ["Chef", "Cashier", "Server", "Kitchen Assistant", "Manager", "Host/Hostess", "Bartender", "Cleaner"]

export function AddEmployeeModal({
  open,
  onOpenChange,
  currentBranch,
  currentRoles = [],
  currentEmployees = [],
  onSubmit,
}: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    hourlyRate: "",
    hoursPerWeek: "16",
    daysPerWeek: "",
    employmentType: "regular",
    phoneNumber: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.firstName && formData.lastName && formData.role && formData.email && currentBranch?.id) {
      onSubmit({
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        email: formData.email,
        hourlyRate: Number.parseFloat(formData.hourlyRate) || 15,
        hoursPerWeek: formData.employmentType === "regular" ? 16 : Number.parseInt(formData.hoursPerWeek) || 24,
        daysPerWeek: Number.parseInt(formData.daysPerWeek) || 5,
        branchId: currentBranch.id,
        branchName: `${currentBranch.name} - ${currentBranch.location}`,
        employmentType: formData.employmentType,
        phoneNumber: formData.phoneNumber,
      })
      setFormData({
        firstName: "",
        lastName: "",
        role: "",
        email: "",
        hourlyRate: "",
        hoursPerWeek: "16",
        daysPerWeek: "",
        employmentType: "regular",
        phoneNumber: "",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-lg lg:text-xl font-semibold">Add New Employee</DialogTitle>
          {/* Branch Context Display */}
          <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">Adding employee to:</span>
            </div>
            {currentBranch ? (
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-teal-600 hover:bg-teal-700">{currentBranch.name}</Badge>
                <div className="flex items-center gap-1 text-sm text-teal-600">
                  <MapPin className="w-3 h-3" />
                  <span>{currentBranch.location}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                Loading branch info...
              </div>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Remove branch selection dropdown */}
          <fieldset disabled={!currentBranch} className={!currentBranch ? "opacity-50 pointer-events-none" : ""}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-medium">
                  First Name
                </Label>
                <Input
                  id="first-name"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="last-name"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => {
                    const roleConfig = currentRoles.find(r => r.name.toLowerCase() === role.toLowerCase());
                    const maxCount = roleConfig?.count ?? Infinity;
                    const currentCount = currentEmployees.filter(e => e.role.toLowerCase() === role.toLowerCase()).length;
                    const disabled = typeof maxCount === 'number' && currentCount >= maxCount;
                    return (
                      <SelectItem key={role} value={role} className="text-base py-3" disabled={disabled}>
                        {role} {disabled && <span className="text-xs text-red-500 ml-2">(Max reached)</span>}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly-rate" className="text-sm font-medium">
                Hourly Rate (₱)
              </Label>
              <Input
                id="hourly-rate"
                type="number"
                step="0.01"
                placeholder="15.00"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="h-12 text-base"
              />
            </div>
            {/* Employment Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="employment-type" className="text-sm font-medium">
                Employment Type
              </Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    employmentType: value,
                    hoursPerWeek: value === "regular" ? "16" : "24",
                  }))
                }}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular (Fixed 16h/week)</SelectItem>
                  <SelectItem value="part-time">Part-Time (Custom hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-sm font-medium">
                  Hours per Week
                </Label>
                <Input
                  id="hours"
                  type="number"
                  placeholder={formData.employmentType === "regular" ? "16" : "24"}
                  value={formData.hoursPerWeek}
                  onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
                  className="h-12 text-base"
                  disabled={formData.employmentType === "regular"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="days" className="text-sm font-medium">
                  Days per Week
                </Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="7"
                  placeholder="5"
                  value={formData.daysPerWeek}
                  onChange={(e) => setFormData({ ...formData, daysPerWeek: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-number" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="09XXXXXXXXX"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="h-12 text-base"
              />
            </div>
            {/* Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Employee Summary:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Name:</strong> {formData.firstName} {formData.lastName || "[Last Name]"}
                </p>
                <p>
                  <strong>Role:</strong> {formData.role || "[Select Role]"}
                </p>
                <p>
                  <strong>Branch:</strong>{" "}
                  {currentBranch ? `${currentBranch.name} - ${currentBranch.location}` : "[Select Branch]"}
                </p>
                <p>
                  <strong>Rate:</strong> ₱{formData.hourlyRate || "15.00"}/hour
                </p>
                <p>
                  <strong>Type:</strong> {formData.employmentType === "regular" ? "Regular (16h/week)" : "Part-Time"}
                </p>
                <p>
                  <strong>Max Hours/Week:</strong> {formData.employmentType === "regular" ? 16 : formData.hoursPerWeek || "[Set Hours]"}
                </p>
              </div>
            </div>
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-base mt-6">
              Add Employee to {currentBranch?.location || "Selected Branch"}
            </Button>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}
