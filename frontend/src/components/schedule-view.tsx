"use client"

import React, { useRef } from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import {
  Plus,
  Search,
  Menu,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Filter,
  Calendar,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Building2,
  Trash,
} from "lucide-react"
import { MobileNav } from "./mobile-nav"
import { CreateShiftModal } from "./create-shift-modal"
import { useWebSocket } from "../hooks/use-websocket"
import { CrossBranchRequestModal } from "./cross-branch-request-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import type { PendingRequest } from "./pending-requests-panel"
import toast from 'react-hot-toast';

interface Shift {
  id: string
  employeeId: string
  employeeName: string
  role: string
  startTime: string
  endTime: string
  date: string
  status: "scheduled" | "pending" | "confirmed"
  branchId: string
  branchName: string
  fromBranchId?: string
  fromBranchName?: string
}

interface Employee {
  id: string
  name: string
  role: string
  hoursScheduled: number
  maxHours: number
  avatar: string
  color: string
  branchId: string
  branchName: string
  isAvailable: boolean
  hoursPerWeek: number
  daysPerWeek: number
  employmentType: "regular" | "part-time"
}

interface Conflict {
  type: "role" | "hours" | "overlap" | "availability"
  message: string
  severity: "warning" | "error"
  employeeId?: string
  shiftId?: string
}

interface ScheduleViewProps {
  branchId: string;
}

// Helper to get start of week (Sunday)
function getStartOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

// Helper to get end of week (Saturday)
function getEndOfWeek(date: Date) {
  const d = getStartOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

// Helper to get PH-localized YYYY-MM-DD
function toPHYMD(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

// Helper for 12-hour time format
function format12HourTime(h: number, m: number = 0) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function computeDaysPerWeek(hoursPerWeek: number, maxHoursPerDay: number = 8) {
  if (!maxHoursPerDay || maxHoursPerDay < 1) maxHoursPerDay = 8;
  return Math.ceil((hoursPerWeek ?? 40) / maxHoursPerDay);
}

export function ScheduleView({ branchId }: ScheduleViewProps) {
  const [currentWeek, setCurrentWeek] = useState(getStartOfWeek(new Date()))
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showScheduleOverview, setShowScheduleOverview] = useState(true)
  const [showCreateShift, setShowCreateShift] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null)
  const [pendingShiftDetails, setPendingShiftDetails] = useState<{
    date: string
    startTime: string
    endTime: string
  } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("current")
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const { sendMessage, lastMessage } = useWebSocket()
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [branchInfo, setBranchInfo] = useState<{ name: string; location: string, maxHoursPerDay?: number } | null>(null)
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number>(8); // default 8
  const [showCrossBranchRequest, setShowCrossBranchRequest] = useState(false)
  const [pendingCrossBranchEmployee, setPendingCrossBranchEmployee] = useState<Employee | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<null | { dayIdx: number, startHour: number, endHour: number }>(null);
  const [draggingShift, setDraggingShift] = useState<null | { shiftId: string, offsetHour: number, dayIdx: number }>(null);
  const [resizingShift, setResizingShift] = useState<null | { shiftId: string, edge: 'start' | 'end', dayIdx: number }>(null);
  const [slotModal, setSlotModal] = useState<null | { dateStr: string, hour: number, shifts: Shift[] }>(null);
  const [regularMaxHoursPerWeek, setRegularMaxHoursPerWeek] = useState<number>(40);
  const [finalizedEmployees, setFinalizedEmployees] = useState<string[]>([]);
  const [finalizedLoaded, setFinalizedLoaded] = useState(false);
  const [pendingFinalize, setPendingFinalize] = useState<{ id: string, name: string } | null>(null);
  const didAutoFinalizeRun = useRef(false);
  const [ready, setReady] = useState(false);
  const prevWeekShifts = useRef<Shift[]>([]);

  // Move weekStart and weekEnd here so all useEffects below can use them safely
  const weekStart = useMemo(() => {
    const d = getStartOfWeek(currentWeek)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentWeek]);
  const weekEnd = useMemo(() => {
    const d = getEndOfWeek(currentWeek)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentWeek]);

  // weekShifts: all shifts for the current week
  const weekShifts = useMemo(() => {
    const startStr = toPHYMD(weekStart);
    const endStr = toPHYMD(weekEnd);
    return shifts.filter((shift) => {
      // Always compare PH-localized YYYY-MM-DD
      const shiftStr = toPHYMD(new Date(shift.date));
      return shiftStr >= startStr && shiftStr <= endStr;
    });
  }, [shifts, weekStart, weekEnd]);

  // Fetch finalized employees for the week on load or week change
  useEffect(() => {
    setFinalizedLoaded(false);
    const fetchFinalized = async () => {
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const res = await fetch(`/api/finalized?weekStart=${weekStartStr}`);
      if (res.ok) {
        const data = await res.json();
        setFinalizedEmployees(data.map((f: any) => String(f.employeeId)));
        console.log('DEBUG: /api/finalized response:', data);
      } else {
        setFinalizedEmployees([]);
      }
      setFinalizedLoaded(true);
    };
    fetchFinalized();
  }, [weekStart]);

  // Add a useEffect for logging finalizedEmployees and employee ids
  useEffect(() => {
    console.log('DEBUG: finalizedEmployees:', finalizedEmployees);
    currentEmployees.forEach(emp => {
      console.log('DEBUG: employee.id:', emp.id, typeof emp.id);
    });
  }, [finalizedEmployees, currentEmployees]);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/branches/${branchId}/employees`)
      .then((res) => res.json())
      .then((data) => {
        // Transform backend data to match frontend interface
        const transformedEmployees = data.map((employee: any) => {
          const branchObj = typeof employee.branch === "object" && employee.branch !== null
            ? employee.branch
            : { _id: employee.branch, name: "" };
          return {
            id: employee._id,
            name: `${employee.firstName} ${employee.lastName}`,
            role: employee.role,
            hoursScheduled: 0, // Will be calculated later
            maxHours: 40, // Default value
            avatar: `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`,
            color: "bg-blue-500", // Default color
            branchId: branchObj._id,
            branchName: branchObj.name || "",
            isAvailable: true,
            hoursPerWeek: employee.hoursPerWeek || 40,
            daysPerWeek: 5, // Default value
            employmentType: employee.employmentType || "regular",
          };
        });
        setCurrentEmployees(transformedEmployees);
      })
      .catch((err) => {
        console.error('Failed to fetch employees:', err);
        setCurrentEmployees([]);
      });
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    fetch(`/api/branches/${branchId}`)
      .then((res) => res.json())
      .then((data) => {
        setBranchInfo({ name: data.name, location: data.location, maxHoursPerDay: data.maxHoursPerDay });
        setMaxHoursPerDay(typeof data.maxHoursPerDay === 'number' ? data.maxHoursPerDay : 8);
        setRegularMaxHoursPerWeek(typeof data.regularEmployeesMaxHoursPerWeek === 'number' ? data.regularEmployeesMaxHoursPerWeek : 40);
      })
      .catch(() => setBranchInfo(null));
  }, [branchId]);

  useEffect(() => {
    if (lastMessage?.type === 'BRANCH_SETTINGS_UPDATED' && lastMessage.data?.branchId === branchId) {
      fetch(`/api/branches/${branchId}`)
        .then((res) => res.json())
        .then((data) => {
          setBranchInfo({ name: data.name, location: data.location, maxHoursPerDay: data.maxHoursPerDay });
          setMaxHoursPerDay(typeof data.maxHoursPerDay === 'number' ? data.maxHoursPerDay : 8);
          setRegularMaxHoursPerWeek(typeof data.regularEmployeesMaxHoursPerWeek === 'number' ? data.regularEmployeesMaxHoursPerWeek : 40);
        })
        .catch(() => setBranchInfo(null));
    }
  }, [lastMessage, branchId]);

  // WebSocket event listener for finalized_added and finalized_deleted
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'finalized_deleted' || lastMessage.type === 'finalized_added') {
      const weekStartStr = weekStart.toISOString().split('T')[0];
      fetch(`/api/finalized?weekStart=${weekStartStr}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setFinalizedEmployees(data.map((f: any) => String(f.employeeId))));
    }
  }, [lastMessage, weekStart]);

  // Dynamically generate time slots based on maxHoursPerDay
  const scheduleStartHour = 11; // 11:00 AM
  const slotSize = 1; // 1 hour per slot
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < maxHoursPerDay; i += slotSize) {
      const start = scheduleStartHour + i;
      const end = start + slotSize;
      const to12h = (h: number) => {
        const hour = ((h - 1) % 12) + 1;
        const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
        return `${hour}:00 ${ampm}`;
      };
      slots.push({
        time: `${start.toString().padStart(2, '0')}:00`,
        label: `${to12h(start)} - ${to12h(end)}`,
        end: `${end.toString().padStart(2, '0')}:00`,
      });
    }
    return slots;
  }, [maxHoursPerDay]);

  // Get employees based on selected view
  const getEmployeesToShow = () => {
    let employees =
      selectedBranch === "current"
        ? currentEmployees
        : selectedBranch === "available"
          ? []
          : [...currentEmployees]

    if (searchTerm) {
      employees = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.role.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return employees
  }

  // Conflict Detection System
  const detectConflicts = (newShift: Shift, existingShifts: Shift[]) => {
    const conflicts: Conflict[] = []
    const employee = currentEmployees.find((emp) => emp.id === newShift.employeeId)

    if (!employee) return conflicts

    // 1. Role Conflict Detection
    if (employee.role !== newShift.role) {
      conflicts.push({
        type: "role",
        message: `${employee.name} is a ${employee.role}, not a ${newShift.role}`,
        severity: "error",
        employeeId: employee.id,
        shiftId: newShift.id,
      })
    }

    // 2. Overlapping Shift Detection
    const employeeShifts = existingShifts.filter(
      (shift) => shift.employeeId === newShift.employeeId && shift.date === newShift.date,
    )

    for (const existingShift of employeeShifts) {
      const newStart = Number.parseInt(newShift.startTime.split(":")[0])
      const newEnd = Number.parseInt(newShift.endTime.split(":")[0])
      const existingStart = Number.parseInt(existingShift.startTime.split(":")[0])
      const existingEnd = Number.parseInt(existingShift.endTime.split(":")[0])

      if (newStart < existingEnd && newEnd > existingStart) {
        conflicts.push({
          type: "overlap",
          message: `${employee.name} already has a shift from ${existingShift.startTime} to ${existingShift.endTime}`,
          severity: "error",
          employeeId: employee.id,
          shiftId: newShift.id,
        })
      }
    }

    // 3. Hours Conflict Detection
    const weekShifts = existingShifts.filter((shift) => {
      const shiftDate = new Date(shift.date)
      const weekStart = getStartOfWeek(currentWeek)
      const weekEnd = getEndOfWeek(currentWeek)

      return shift.employeeId === newShift.employeeId && shiftDate >= weekStart && shiftDate <= weekEnd
    })

    const totalHours = weekShifts.reduce((total, shift) => {
      const start = Number.parseInt(shift.startTime.split(":")[0])
      const end = Number.parseInt(shift.endTime.split(":")[0])
      let hours = end - start;
      if (end <= start) {
        hours += 24;
      }
      return total + hours;
    }, 0)

    const newShiftHours =
      Number.parseInt(newShift.endTime.split(":")[0]) - Number.parseInt(newShift.startTime.split(":")[0])

    if (totalHours + newShiftHours > employee.maxHours) {
      conflicts.push({
        type: "hours",
        message: `${employee.name} would exceed max hours (${totalHours + newShiftHours}/${employee.maxHours})`,
        severity: "warning",
        employeeId: employee.id,
        shiftId: newShift.id,
      })
    }

    // 4. Days per week conflict for regular employees
    if (employee.employmentType === "regular") {
      // Count unique days with a shift for this employee in the week
      const daysWithShifts = new Set(weekShifts.map(shift => shift.date))
      // If the new shift is on a new day, add it
      daysWithShifts.add(newShift.date)
      if (daysWithShifts.size > 5) {
        conflicts.push({
          type: "availability",
          message: `${employee.name} already has 5 shifts this week (max for regular employees)`,
          severity: "error",
          employeeId: employee.id,
          shiftId: newShift.id,
        })
      }
    }

    return conflicts
  }

  // Generate weekDates immutably (Sunday to Saturday)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() + i)
    return d
  })

    const handleEmployeeDragStart = (e: React.DragEvent<HTMLDivElement>, employee: Employee) => {
    setDraggedEmployee(employee)
    e.dataTransfer.setData("text/plain", employee.id)
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleSlotDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleSlotDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    dateStr: string,
    timeSlot: { time: string; end: string }
  ) => {
    e.preventDefault();
    if (!draggedEmployee) return;

        // Check if employee has already reached their maximum hours for the week
    const currentEmployeeShifts = weekShifts.filter(shift => shift.employeeId === draggedEmployee.id);
    const currentTotalScheduledHours = currentEmployeeShifts.reduce((total, shift) => {
      const s = parseInt(shift.startTime.split(":")[0]);
      const e = parseInt(shift.endTime.split(":")[0]);
      let h = e - s;
      if (e <= s) h += 24;
      return total + h;
    }, 0);
    const maxHours = draggedEmployee.employmentType === "regular" ? (draggedEmployee.hoursPerWeek || 40) : (draggedEmployee.hoursPerWeek || 40);

    if (currentTotalScheduledHours >= maxHours) {
      toast.error(`${draggedEmployee.name} has already reached their maximum hours (${maxHours}h) for this week.`);
      setDraggedEmployee(null);
      return;
    }

    // Compute shift duration in hours (use unique variable names)
    let dragStartHour = parseInt(timeSlot.time.split(":")[0]);
    let dragEndHour = parseInt(timeSlot.end.split(":")[0]);
    let dragShiftDuration = dragEndHour - dragStartHour;
    if (dragEndHour <= dragStartHour) dragShiftDuration += 24;
    if (dragShiftDuration > maxHoursPerDay) {
      toast.error(`Shift exceeds max hours per day (${maxHoursPerDay}h)!`);
      setDraggedEmployee(null);
      return;
    }
    // Weekly hours validation
    const weekStart = new Date(dateStr);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const employeeShifts = weekShifts.filter(shift => shift.employeeId === draggedEmployee.id);
    const totalScheduledHours = employeeShifts.reduce((total, shift) => {
      const s = parseInt(shift.startTime.split(":")[0]);
      const e = parseInt(shift.endTime.split(":")[0]);
      let h = e - s;
      if (e <= s) h += 24;
      return total + h;
    }, 0);
    const weeklyMaxHours = draggedEmployee.employmentType === "regular" ? (draggedEmployee.hoursPerWeek || 40) : (draggedEmployee.hoursPerWeek || 40);
    if (totalScheduledHours + dragShiftDuration > weeklyMaxHours) {
      toast.error(`Only ${Math.max(0, weeklyMaxHours - totalScheduledHours)}h left this week. Cannot assign a ${dragShiftDuration}h shift.`);
      setDraggedEmployee(null);
      return;
    }
    // Max days/week validation for part-timers
    if (draggedEmployee.employmentType === "part-time") {
      const uniqueDaysWithShifts = new Set(employeeShifts.map(shift => shift.date));
      const computedMaxDays = Math.ceil((draggedEmployee.hoursPerWeek || 40) / maxHoursPerDay);
      // Only count as new day if this is a new date
      if (!uniqueDaysWithShifts.has(dateStr) && uniqueDaysWithShifts.size >= computedMaxDays) {
        toast(`Max days/week reached for this part-timer (${computedMaxDays} days/week).`, { icon: '⚠️' });
        // Soft warning only, allow scheduling to proceed
      }
    }
    const parsedDate = new Date(dateStr);
    parsedDate.setHours(0, 0, 0, 0);
    const normalizedDateStr = toPHYMD(parsedDate);
    const hoursPerDay = draggedEmployee.daysPerWeek > 0 ? Math.round(draggedEmployee.hoursPerWeek / draggedEmployee.daysPerWeek) : 8;
    const startHour = parseInt(timeSlot.time.split(":")[0]);
    const endHour = startHour + hoursPerDay;
    const endTime = (endHour % 24).toString().padStart(2, "0") + ":00";
    if (draggedEmployee.branchId !== branchId) {
      setPendingCrossBranchEmployee(draggedEmployee);
      setPendingShiftDetails({
        date: normalizedDateStr,
        startTime: timeSlot.time,
        endTime,
      });
      setShowCrossBranchRequest(true);
      setDraggedEmployee(null);
      return;
    }
    const newShift: Shift = {
      id: Date.now().toString(),
      employeeId: draggedEmployee.id,
      employeeName: draggedEmployee.name,
      role: draggedEmployee.role,
      startTime: timeSlot.time,
      endTime,
      date: normalizedDateStr,
      status: "scheduled",
      branchId: draggedEmployee.branchId,
      branchName: draggedEmployee.branchName,
    };
    const detectedConflicts = detectConflicts(newShift, shifts);
    if (detectedConflicts.some((c) => c.severity === "error")) {
      setConflicts(detectedConflicts);
      setDraggedEmployee(null);
      return;
    }
    setShifts((prev) => [...prev, newShift]);
    sendMessage({ type: "SHIFT_ADD", data: newShift });
    setConflicts(detectedConflicts);
    setDraggedEmployee(null);

    // Show Undo toast
    toast((t) => (
      <span>
        Shift added. <button
          style={{ color: '#0ea5e9', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => {
            setShifts((prev) => prev.filter((shift) => shift.id !== newShift.id));
            sendMessage({ type: "SHIFT_DELETE", data: { id: newShift.id } });
            toast.dismiss(t.id);
          }}
        >Undo</button>
      </span>
    ), { duration: 5000 });
  }

  const getEmployeePhone = (employeeId: string) => {
    const phones: Record<string, string> = {
      "4": "+63 917 111 2222", // Ana Garcia
      "5": "+63 917 333 4444", // Pedro Cruz
      "6": "+63 917 555 6666", // Lisa Wong
    }
    return phones[employeeId] || "+63 917 000 0000"
  }

  const handleCrossBranchRequestSent = (requestId: string) => {
    if (!pendingShiftDetails) return

    const newRequest: PendingRequest = {
      id: requestId,
      employeeId: draggedEmployee?.id || "",
      employeeName: draggedEmployee?.name || "",
      employeeAvatar: draggedEmployee?.avatar || "",
      employeeRole: draggedEmployee?.role || "",
      employeePhone: getEmployeePhone(draggedEmployee?.id || ""),
      fromBranch: draggedEmployee?.branchName || "",
      toBranch: "Kapitan Pepe 1",
      shiftDate: pendingShiftDetails.date,
      startTime: pendingShiftDetails.startTime,
      endTime: pendingShiftDetails.endTime,
      requestedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      status: "pending",
    }

    // Send WebSocket message
    sendMessage({
      type: "CROSS_BRANCH_REQUEST",
      data: newRequest,
    })

    // Clear pending data
    setPendingShiftDetails(null)
  }

  const getShiftsForDateAndTime = (date: Date, timeSlot: { time: string; end: string }) => {
    const dateStr = toPHYMD(date)
    return shifts.filter((shift) => shift.date === dateStr && shift.startTime === timeSlot.time)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(getStartOfWeek(newWeek))
  }

  // Auto-unfinalize if all shifts are deleted for an employee
  const removeShift = async (shiftId: string) => {
    setShifts((prev) => {
      const shiftToRemove = prev.find(s => s.id === shiftId);
      if (!shiftToRemove) return prev;
      const newShifts = prev.filter((shift) => shift.id !== shiftId);
      // Auto-unfinalize: if employee is finalized, unfinalize immediately
      const isFinal = finalizedEmployees.includes(shiftToRemove.employeeId);
      if (isFinal) {
        const weekStartStr = weekStart.toISOString().split('T')[0];
        console.log('DEBUG: removeShift auto-unfinalize (any shift)', { employeeId: shiftToRemove.employeeId, weekStart: weekStartStr });
        fetch(`/api/finalized?employeeId=${shiftToRemove.employeeId}&weekStart=${weekStartStr}`, {
          method: 'DELETE',
        }).then(() => {
          fetch(`/api/finalized?weekStart=${weekStartStr}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              setFinalizedEmployees(data.map((f: any) => String(f.employeeId)));
              console.log('DEBUG: finalizedEmployees after removeShift unfinalize (any shift)', data);
            });
        });
      }
      return newShifts;
    });
  };

  // Calculate schedule stats with useMemo
  const totalHours = useMemo(() => {
    return weekShifts.reduce((total, shift) => {
      const start = Number.parseInt(shift.startTime.split(":")[0])
      const end = Number.parseInt(shift.endTime.split(":")[0])
      let hours = end - start;
      if (end <= start) {
        hours += 24;
      }
      return total + hours;
    }, 0)
  }, [weekShifts])
  const crossBranchShifts = useMemo(() => {
    return weekShifts.filter((shift) => shift.fromBranchId && shift.fromBranchId !== "1")
  }, [weekShifts])

  console.log('All weekShifts:', weekShifts.map(s => ({ employee: s.employeeName, date: new Date(s.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', timeZoneName: 'long' }), start: s.startTime, end: s.endTime })))
  console.log('All shifts:', shifts.map(s => ({ employee: s.employeeName, date: new Date(s.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', timeZoneName: 'long' }), start: s.startTime, end: s.endTime })))

  // Calendar-style time intervals (1 hour, 11:00 AM to 11:00 PM)
  const calendarStartHour = 11;
  const calendarEndHour = 23;
  const calendarIntervals = useMemo(() => {
    const intervals = [];
    for (let h = calendarStartHour; h <= calendarEndHour; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      let displayH = h % 12;
      if (displayH === 0) displayH = 12;
      intervals.push({
        hour: h,
        label: `${displayH}:00 ${ampm}`
      });
    }
    return intervals;
  }, []);

  // Helper: get hour from mouse Y position in a day column
  const getHourFromY = (e: React.MouseEvent, colElem: HTMLDivElement | null) => {
    if (!colElem) return calendarStartHour;
    const rect = colElem.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / rect.height * (calendarEndHour - calendarStartHour + 1)) + calendarStartHour;
    return Math.max(calendarStartHour, Math.min(calendarEndHour, hour));
  };

  // Helper to check if employee is finalized
  const isFinalized = (id: string) => finalizedEmployees.includes(id);

  // Helper to determine if employee is fully scheduled
  const isFullyScheduled = (employee: Employee) => {
    // Compute total scheduled hours for this employee this week
    const empShifts = weekShifts.filter(s => s.employeeId === employee.id);
    const totalHours = empShifts.reduce((total, shift) => {
      const start = Number.parseInt(shift.startTime.split(":")[0]);
      const end = Number.parseInt(shift.endTime.split(":")[0]);
      let hours = end - start;
      if (end <= start) hours += 24;
      return total + hours;
    }, 0);
    // You can also check days/week if needed
    return totalHours >= (employee.hoursPerWeek || 40);
  };

  useEffect(() => {
    if (finalizedLoaded && currentEmployees.length > 0) {
      setReady(true);
    }
  }, [finalizedLoaded, currentEmployees]);

  useEffect(() => {
    if (!ready) return;
    // Only run if weekShifts actually changed (not on first load)
    if (prevWeekShifts.current.length === 0) {
      prevWeekShifts.current = weekShifts;
      return;
    }
    currentEmployees.forEach(employee => {
      const fullyScheduled = isFullyScheduled(employee);
      const isFinal = finalizedEmployees.includes(employee.id);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      console.log('DEBUG: auto-finalize check', { employeeId: employee.id, fullyScheduled, isFinal });
      if (fullyScheduled && !isFinal) {
        fetch('/api/finalized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: employee.id, weekStart: weekStartStr }),
        }).then(() => {
          fetch(`/api/finalized?weekStart=${weekStartStr}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              setFinalizedEmployees(data.map((f: any) => String(f.employeeId)));
              console.log('DEBUG: finalizedEmployees after finalize', data);
            });
        });
      } else if (!fullyScheduled && isFinal) {
        console.log('DEBUG: auto-unfinalize', { employeeId: employee.id, weekStart: weekStartStr });
        fetch(`/api/finalized?employeeId=${employee.id}&weekStart=${weekStartStr}`, {
          method: 'DELETE',
        }).then(() => {
          fetch(`/api/finalized?weekStart=${weekStartStr}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              setFinalizedEmployees(data.map((f: any) => String(f.employeeId)));
              console.log('DEBUG: finalizedEmployees after unfinalize', data);
            });
        });
      }
    });
    prevWeekShifts.current = weekShifts;
  }, [weekShifts, currentEmployees, weekStart, finalizedEmployees, ready]);

  // When finalizing, POST to backend and re-fetch finalized state on success
  const handleFinalize = async (employee: Employee) => {
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const res = await fetch('/api/finalized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: employee.id, weekStart: weekStartStr }),
    });
    if (res.ok) {
      // Re-fetch finalized state from backend to ensure UI is always in sync
      const getRes = await fetch(`/api/finalized?weekStart=${weekStartStr}`);
      if (getRes.ok) {
        const data = await getRes.json();
        setFinalizedEmployees(data.map((f: any) => String(f.employeeId)));
      }
    } else {
      alert('Failed to finalize schedule.');
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowMobileNav(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Schedule</h1>
              {branchInfo && (
                <>
                  <p className="text-xs text-gray-600 font-semibold">{branchInfo.name}</p>
                  <p className="text-xs text-gray-400">{branchInfo.location}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showScheduleOverview ? "default" : "outline"}
              size="sm"
              onClick={() => setShowScheduleOverview(!showScheduleOverview)}
              className={showScheduleOverview ? "bg-teal-600 hover:bg-teal-700" : ""}
            >
              {showScheduleOverview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline ml-1">Overview</span>
            </Button>
          </div>
        </div>
      </header>

      <MobileNav isOpen={showMobileNav} onClose={() => setShowMobileNav(false)} />

      <div className="p-4 space-y-4">
        {/* Schedule Overview */}
        {showScheduleOverview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{weekShifts.length}</p>
                    <p className="text-sm text-gray-600">Total Shifts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalHours}</p>
                    <p className="text-sm text-gray-600">Total Hours</p>
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
                    <p className="text-2xl font-bold text-gray-900">
                      {new Set(weekShifts.map((s) => s.employeeId)).size}
                    </p>
                    <p className="text-sm text-gray-600">Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{crossBranchShifts.length}</p>
                    <p className="text-sm text-gray-600">Cross-Branch</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conflict Alerts */}
        {conflicts.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-700">Scheduling Conflicts Detected</h3>
                <Button variant="ghost" size="sm" onClick={() => setConflicts([])}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-sm ${
                      conflict.severity === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={conflict.severity === "error" ? "destructive" : "secondary"} className="text-xs">
                        {conflict.type.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{conflict.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">
            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} -{" "}
            {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Employee Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search and Filter */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedBranch} onValueChange={(val: string) => setSelectedBranch(String(val))}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Branch</SelectItem>
                    <SelectItem value="available">Other Branches</SelectItem>
                    <SelectItem value="all">All Branches</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Employee List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              <div className="bg-white p-3 rounded-lg border sticky top-0">
                <h3 className="font-semibold text-sm text-gray-700">AVAILABLE STAFF</h3>
                <p className="text-xs text-gray-500">Drag to schedule</p>
              </div>

              {getEmployeesToShow()
                .map(employee => {
                  // Debug: log weekShifts and employee.id
                  console.log('DEBUG employee.id:', employee.id);
                  const employeeShifts = weekShifts.filter((shift) => shift.employeeId === employee.id);
                  console.log('DEBUG weekShifts for employee', employee.id, employeeShifts);
                  let currentHours = employeeShifts.reduce((total, shift) => {
                    const start = Number.parseInt(shift.startTime.split(":")[0]);
                    const end = Number.parseInt(shift.endTime.split(":")[0]);
                    let hours = end - start;
                    if (end <= start) {
                      hours += 24;
                    }
                    return total + hours;
                  }, 0);
                  const currentMaxHours = employee.employmentType === 'regular' ? regularMaxHoursPerWeek : employee.hoursPerWeek;
                  // Standard: fully scheduled only when max hours/week is reached
                  const fullyScheduled = currentHours >= currentMaxHours;
                  const isFinal = isFinalized(employee.id);
                  const isFull = currentHours >= currentMaxHours;
                  return { employee, currentHours, currentMaxHours, fullyScheduled, isFinal, isFull };
                })
                .sort((a, b) => {
                  // Sort: finalized at bottom, then fully scheduled, then others
                  if (a.isFinal !== b.isFinal) return a.isFinal ? 1 : -1;
                  if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
                  return 0;
                })
                .map(({ employee, currentHours, currentMaxHours, fullyScheduled, isFinal, isFull }) => {
                  // Use currentHours, currentMaxHours, fullyScheduled, isFinal directly
                  // Remove duplicate calculation of employeeShifts/currentHours/currentMaxHours
                  const percent = Math.round((currentHours / currentMaxHours) * 100);
                  let progressColor = "bg-green-500"
                  if (percent > 100) progressColor = "bg-red-600"
                  else if (percent >= 90) progressColor = "bg-red-500"
                  else if (percent >= 70) progressColor = "bg-yellow-400"
                  const isOverMax = currentHours > currentMaxHours;
                  const cardHighlight = isOverMax ? "border-red-500 bg-red-50" : "border-gray-200";
                  // Fade and disable if finalized OR fully scheduled
                  const fadeClass = (isFinal || isFull) ? "opacity-60" : "";
                  const draggable = !(isFinal || isFull);

                  const weekShiftsForEmployee = weekShifts.filter((shift) => shift.employeeId === employee.id);
                  const uniqueDaysWithShifts = new Set(weekShiftsForEmployee.map(shift => shift.date)).size;
                  const computedMaxDays = computeDaysPerWeek(employee.hoursPerWeek, maxHoursPerDay);
                  const hoursLeftThisWeek = Math.max(0, employee.hoursPerWeek - currentHours);

                  return (
                    <Card
                      key={employee.id}
                      className={`p-4 flex flex-col gap-2 shadow-sm hover:shadow-lg transition-all cursor-move ${cardHighlight} ${fadeClass}`}
                      draggable={draggable}
                      onDragStart={draggable ? (e) => handleEmployeeDragStart(e, employee) : undefined}
                      title={isFinal ? 'Finalized by manager' : isFull ? 'Fully scheduled' : ''}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${employee.color} rounded-full flex items-center justify-center text-white text-lg font-bold shadow`}
                        >
                          {employee.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base truncate">{employee.name}</span>
                            <Badge variant="secondary" className="text-xs ml-1">
                              {employee.employmentType === "regular" ? "Regular" : "Part-Time"}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{employee.role}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-blue-600 font-semibold">{employee.hoursPerWeek}h/week</span>
                            <span className="text-xs font-semibold text-green-700">{uniqueDaysWithShifts}/{computedMaxDays} days/week</span>
                            <span className={`text-xs font-semibold ${hoursLeftThisWeek === 0 ? 'text-gray-500' : 'text-blue-700'}`}>{hoursLeftThisWeek}h left this week</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">w/hour</span>
                          <span className="text-xs font-semibold text-gray-700">{currentHours} / {currentMaxHours}h</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                            style={{ width: `${Math.min(percent, 150)}%` }}
                          ></div>
                        </div>
                        {isOverMax && (
                          <div className="mt-1 text-xs text-red-600 font-bold text-center">Over max hours!</div>
                        )}
                      </div>
                      {(isFull && !isFinal) && (
                        <div className="mt-1 text-xs text-blue-700 font-bold text-center">Fully scheduled</div>
                      )}
                      {isFinal && (
                        <div className="mt-1 text-xs text-gray-700 font-bold text-center">Finalized</div>
                      )}
                    </Card>
                  )
                })}
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {/* Calendar-style weekly schedule */}
                <div className="overflow-x-auto">
                  <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                    {/* Header Row */}
                    <div></div>
                    {weekDates.map((date, idx) => (
                      <div key={idx} className="text-center font-semibold p-2 border-b bg-teal-600 text-white">
                        <div>{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        <div className="text-xs">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      </div>
                    ))}
                    {/* Time labels column */}
                    {calendarIntervals.map((interval, rowIdx) => (
                      <div
                        key={interval.hour}
                        className="text-xs text-gray-500 border-r border-b h-16 flex items-start justify-end pr-2 pt-1 bg-gray-50"
                        style={{ gridColumn: 1 }}
                      >
                        {interval.label}
                      </div>
                    ))}
                    {/* Day columns */}
                    {weekDates.map((date, colIdx) => {
                      const dateStr = toPHYMD(date);
                      // Find all shifts for this day
                      const dayShifts = shifts.filter(s => s.date === dateStr);
                      return (
                        <div key={colIdx} className="relative border-b border-r bg-white" style={{ gridColumn: colIdx + 2, gridRow: `2 / span ${calendarIntervals.length}` , height: `${(calendarEndHour - calendarStartHour + 1) * 4}rem` }}>
                          {/* Render hour grid lines as background */}
                          {calendarIntervals.map((interval, rowIdx) => (
                            <div
                              key={rowIdx}
                              className="absolute left-0 right-0 border-t border-gray-200"
                              style={{ top: `${rowIdx * 4}rem`, height: '0.1rem', zIndex: 0 }}
                            />
                          ))}
                          {/* Render all shift blocks for this day, absolutely positioned and offset if overlapping */}
                          {dayShifts.map((shift, i) => {
                            const employee = currentEmployees.find(e => e.id === shift.employeeId);
                            if (!employee) return null;
                            // Calculate if employee is fully scheduled for the week
                            const employeeShifts = weekShifts.filter(s => s.employeeId === employee.id);
                            let currentHours = employeeShifts.reduce((total, s) => {
                              const start = Number.parseInt(s.startTime.split(":")[0]);
                              const end = Number.parseInt(s.endTime.split(":")[0]);
                              let hours = end - start;
                              if (end <= start) hours += 24;
                              return total + hours;
                            }, 0);
                            const currentMaxHours = employee.employmentType === 'regular' ? regularMaxHoursPerWeek : employee.hoursPerWeek;
                            const isFull = currentHours >= currentMaxHours;
                            if (isFinalized(shift.employeeId) || isFull) return null;
                            // Restore time parsing logic before finalized check
                            const parseTime = (t: string) => {
                              const [h, m] = t.split(":").map(Number);
                              return h * 60 + m;
                            };
                            const startMins = parseTime(shift.startTime);
                            const endMins = parseTime(shift.endTime);
                            const calStartMins = calendarStartHour * 60;
                            const calEndMins = calendarEndHour * 60;
                            // Clamp to calendar range
                            const top = Math.max(0, ((startMins - calStartMins) / 60) * 4); // 4rem per hour
                            const height = Math.max(16, ((endMins - startMins) / 60) * 4); // min 1rem
                            // Only render if within calendar range
                            if (endMins <= calStartMins || startMins >= calEndMins) return null;
                            // --- Break calculation ---
                            let totalMins = endMins - startMins;
                            if (endMins <= startMins) totalMins += 24 * 60;
                            const breakDuration = 60; // 1 hour in minutes
                            const half = Math.floor((totalMins - breakDuration) / 2);
                            const breakStartMins = (startMins + half) % (24 * 60);
                            const breakEndMins = (breakStartMins + breakDuration) % (24 * 60);
                            // Format times
                            const [sh, sm] = [Math.floor(startMins / 60), startMins % 60];
                            const [eh, em] = [Math.floor(endMins / 60), endMins % 60];
                            const [bsh, bsm] = [Math.floor(breakStartMins / 60), breakStartMins % 60];
                            const [beh, bem] = [Math.floor(breakEndMins / 60), breakEndMins % 60];
                            // --- Overlap logic: find how many overlap with this shift ---
                            const overlapping = dayShifts.filter((other, j) => {
                              if (i === j) return false;
                              const oStart = parseTime(other.startTime);
                              const oEnd = parseTime(other.endTime);
                              return (startMins < oEnd && endMins > oStart);
                            });
                            const overlapIdx = overlapping.filter(other => parseTime(other.startTime) < startMins).length;
                            const overlapCount = overlapping.length + 1;
                            const maxOverlap = Math.max(1, overlapCount);
                            const width = 100 / maxOverlap;
                            const left = width * overlapIdx;
                            return (
                              <div
                                key={shift.id}
                                className={`absolute rounded shadow text-xs p-2 cursor-pointer ${employee?.color || 'bg-blue-500'} text-white flex flex-col gap-1`}
                                style={{ top: `${top}rem`, height: `${height}rem`, left: `${left}%`, width: `${width}%`, zIndex: 10 + i, opacity: 0.95 }}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <div className="font-bold truncate">{shift.employeeName}</div>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setShifts(prev => prev.filter(s => s.id !== shift.id));
                                      sendMessage({ type: "SHIFT_DELETE", data: { id: shift.id } });
                                    }}
                                    title="Delete shift"
                                    style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', color: 'white' }}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="text-xs">{shift.role}</div>
                                <div className="text-xs">
                                  {format12HourTime(sh, sm)} - {format12HourTime(eh, em)} ({(endMins - startMins + (endMins <= startMins ? 24 * 60 : 0)) / 60}h)
                                </div>
                                <div className="text-xs flex items-center gap-1">
                                  <span role="img" aria-label="location">📍</span>
                                  {shift.branchName || 'Unknown location'}
                                </div>
                                <div className="text-xs opacity-90">
                                  Break: {format12HourTime(bsh, bsm)} - {format12HourTime(beh, bem)}
                                </div>
                              </div>
                            );
                          })}
                          {/* Drop area for drag-and-drop (basic highlight) */}
                          {calendarIntervals.map((interval, rowIdx) => (
                            <div
                              key={rowIdx}
                              className={`absolute inset-x-0`}
                              style={{ top: `${rowIdx * 4}rem`, height: `4rem`, zIndex: 1 }}
                              onDragOver={e => { setDragOverCell(`${dateStr}-${interval.hour}`); handleSlotDragOver(e); }}
                              onDragLeave={() => setDragOverCell(null)}
                              onDrop={e => { setDragOverCell(null); handleSlotDrop(e, dateStr, { time: `${interval.hour.toString().padStart(2, '0')}:00`, end: `${(interval.hour + 1).toString().padStart(2, '0')}:00` }); }}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateShiftModal
        open={showCreateShift}
        onOpenChange={setShowCreateShift}
        selectedSlot={selectedSlot}
        employees={currentEmployees.map(emp => ({
          ...emp,
          scheduledShifts: weekShifts.filter(shift => shift.employeeId === emp.id)
        }))}
        maxHoursPerDay={maxHoursPerDay}
        onCreateShift={(shiftData: Omit<Shift, 'id' | 'status' | 'branchId' | 'branchName'> & { employeeId: string }) => {
          const employee = currentEmployees.find((emp) => emp.id === shiftData.employeeId)
          const newShift: Shift = {
            id: Date.now().toString(),
            ...shiftData,
            status: "scheduled",
            branchId: employee?.branchId || "1",
            branchName: employee?.branchName || "Kapitan Pepe 1",
          }
          setShifts((prev) => [...prev, newShift]);
          sendMessage({ type: "SHIFT_ADD", data: newShift });
          setShowCreateShift(false)
        }}
      />

      {showCrossBranchRequest && (
        <CrossBranchRequestModal
          open={showCrossBranchRequest}
          onOpenChange={setShowCrossBranchRequest}
          employee={pendingCrossBranchEmployee}
          shiftDetails={pendingShiftDetails}
          onRequestSent={handleCrossBranchRequestSent}
        />
      )}

      {/* Slot modal for viewing all assigned employees */}
      {slotModal && (
        <Dialog open={!!slotModal} onOpenChange={() => setSlotModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Employees Assigned<br/>to {weekDates.find(d => toPHYMD(d) === slotModal.dateStr)?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {format12HourTime(slotModal.hour)}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto divide-y">
              {slotModal.shifts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No employees assigned.</div>
              ) : (
                slotModal.shifts.map((shift, idx) => {
                  const employee = currentEmployees.find(e => e.id === shift.employeeId);
                  return (
                    <div key={shift.id} className="flex items-center gap-3 py-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${employee?.color || 'bg-blue-500'}`}>{employee?.avatar || shift.employeeName[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{shift.employeeName}</div>
                        <div className="text-xs text-gray-500">{shift.role}</div>
                        <div className="text-xs text-gray-500">{format12HourTime(Number(shift.startTime.split(':')[0]))} - {format12HourTime(Number(shift.endTime.split(':')[0]))}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Finalize Confirmation Dialog */}
      {pendingFinalize && (
        <Dialog open={!!pendingFinalize} onOpenChange={() => setPendingFinalize(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Finalize Schedule</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Is this schedule final for <b>{pendingFinalize.name}</b>?</p>
              <div className="flex gap-4 mt-6 justify-end">
                <Button variant="outline" onClick={() => setPendingFinalize(null)}>No</Button>
                <Button className="bg-teal-600 text-white" onClick={async () => {
                  await handleFinalize(pendingFinalize);
                  setPendingFinalize(null);
                }}>Yes, Finalize</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
