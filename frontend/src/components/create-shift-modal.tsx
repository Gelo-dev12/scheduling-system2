"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import toast from 'react-hot-toast';

interface Employee {
  id: string
  name: string
  role: string
  hoursScheduled: number
  maxHours: number
  avatar: string
  color: string
  hoursPerWeek?: number
  daysPerWeek?: number
  employmentType?: "regular" | "part-time"
  scheduledShifts?: any[] // Added for weekly hours calculation
}

interface CreateShiftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedSlot: { date: string; time: string } | null
  employees: Employee[]
  onCreateShift: (shiftData: {
    employeeId: string
    employeeName: string
    role: string
    startTime: string
    endTime: string
    date: string
    breakMinutes: number
  }) => void
  maxHoursPerDay: number // NEW PROP
}

export function CreateShiftModal({
  open,
  onOpenChange,
  selectedSlot,
  employees,
  onCreateShift,
  maxHoursPerDay, // NEW PROP
}: CreateShiftModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [error, setError] = useState("")

  // Compute hours left this week for selected employee
  const employee = employees.find((emp) => emp.id === selectedEmployee)
  const weekStart = selectedSlot ? new Date(selectedSlot.date) : null
  if (weekStart) weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = weekStart ? new Date(weekStart) : null
  if (weekEnd) weekEnd.setDate(weekEnd.getDate() + 6)
  const scheduledShifts = employee?.scheduledShifts || []
  const weekShifts = weekStart && weekEnd ? scheduledShifts.filter((shift: any) => {
    const shiftDate = new Date(shift.date)
    return shiftDate >= weekStart && shiftDate <= weekEnd
  }) : []
  const totalScheduledHours = weekShifts.reduce((total: number, shift: any) => {
    const s = parseInt(shift.startTime.split(":")[0])
    const e = parseInt(shift.endTime.split(":")[0])
    let h = e - s
    if (e <= s) h += 24
    return total + h
  }, 0)
  const maxHours = employee?.employmentType === "regular" ? (employee?.hoursPerWeek || 40) : (employee?.hoursPerWeek || 40)
  const hoursLeftThisWeek = Math.max(0, maxHours - totalScheduledHours)

  // Compute shift duration
  let shiftDuration = 0
  if (startTime && endTime) {
    const s = parseInt(startTime.split(":")[0])
    const e = parseInt(endTime.split(":")[0])
    shiftDuration = e - s
    if (e <= s) shiftDuration += 24
  }

  // Real-time error and disable logic
  let disableCreate = false
  let errorMsg = ""
  if (shiftDuration > 0 && shiftDuration > hoursLeftThisWeek) {
    errorMsg = `Only ${hoursLeftThisWeek}h left this week. Cannot assign a ${shiftDuration}h shift.`
    disableCreate = true
  }
  if (shiftDuration > maxHoursPerDay) {
    errorMsg = `Shift exceeds max hours per day (${maxHoursPerDay}h)!`
    disableCreate = true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!selectedEmployee || !startTime || !endTime || !selectedSlot) return
    if (disableCreate) {
      setError(errorMsg)
      return
    }

    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return

    // Compute shift duration in hours
    const startHour = parseInt(startTime.split(":")[0])
    const endHour = parseInt(endTime.split(":")[0])
    let h = endHour - startHour
    if (endHour <= startHour) h += 24
    if (h > maxHoursPerDay) {
      toast.error(`Shift exceeds max hours per day (${maxHoursPerDay}h)!`)
      return
    }

    // Compute total scheduled hours for the week
    const weekStart = new Date(selectedSlot.date)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const scheduledShifts = employee.scheduledShifts || [];
    const weekShifts = scheduledShifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date)
      return shiftDate >= weekStart && shiftDate <= weekEnd
    })
    const totalScheduledHours = weekShifts.reduce((total: number, shift: any) => {
      const s = parseInt(shift.startTime.split(":")[0])
      const e = parseInt(shift.endTime.split(":")[0])
      let h = e - s
      if (e <= s) h += 24
      return total + h
    }, 0)
    const maxHours = employee.employmentType === "regular" ? (employee.hoursPerWeek || 40) : (employee.hoursPerWeek || 40)
    if (totalScheduledHours + h > maxHours) {
      toast.error(`Shift would exceed max hours per week (${maxHours}h)!`)
      return
    }

    const isRegular = employee.employmentType === "regular"

    // If regular, force 4-hour shift and 1 hour break
    if (isRegular) {
      if (parseInt(startTime.split(":")[0]) + 4 > 24) {
        setEndTime(((parseInt(startTime.split(":")[0]) + 4) % 24).toString().padStart(2, "0") + ":00")
      } else {
        setEndTime(((parseInt(startTime.split(":")[0]) + 4) % 24).toString().padStart(2, "0") + ":00")
      }
    }

    onCreateShift({
      employeeId: employee.id,
      employeeName: employee.name,
      role: employee.role,
      startTime,
      endTime,
      date: selectedSlot.date,
      breakMinutes,
    })

    // Reset form
    setSelectedEmployee("")
    setStartTime("")
    setEndTime("")
    setBreakMinutes(60)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={(id) => {
              setSelectedEmployee(id)
              const emp = employees.find(e => e.id === id)
              if (emp?.employmentType === "regular") {
                setBreakMinutes(60)
                // Auto-set start/end time to 4-hour block if not already
                if (startTime && endTime) {
                  const start = parseInt(startTime.split(":")[0])
                  setEndTime(((start + 4) % 24).toString().padStart(2, "0") + ":00")
                }
              } else {
                setBreakMinutes(60)
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} - {employee.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={(val) => {
                setStartTime(val)
                if (employees.find(e => e.id === val)?.employmentType === "regular") {
                  // Auto-set end time to 4 hours after start
                  const start = parseInt(val.split(":")[0])
                  setEndTime(((start + 4) % 24).toString().padStart(2, "0") + ":00")
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, "0")
                    return (
                      <SelectItem key={hour} value={`${hour}:00`}>
                        {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime} disabled={employees.find(e => e.id === selectedEmployee)?.employmentType === "regular"}>
                <SelectTrigger>
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, "0")
                    return (
                      <SelectItem key={hour} value={`${hour}:00`}>
                        {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Break Time (minutes)</Label>
            <input
              type="number"
              min={0}
              max={120}
              value={breakMinutes}
              onChange={e => setBreakMinutes(Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
              disabled={employees.find(e => e.id === selectedEmployee)?.employmentType === "regular"}
            />
            {employees.find(e => e.id === selectedEmployee)?.employmentType === "regular" && <span className="text-xs text-gray-500">Regular employees always have a 1 hour break</span>}
          </div>

          {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
          {employee && <div className={`text-xs mb-2 ${hoursLeftThisWeek === 0 ? 'text-gray-500' : 'text-blue-700'}`}>{hoursLeftThisWeek}h left this week</div>}
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={disableCreate}>
            Create Shift
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
