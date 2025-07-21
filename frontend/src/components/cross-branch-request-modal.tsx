"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Building2, Calendar, AlertCircle } from "lucide-react"

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  branchId: string
  branchName: string
}

interface CrossBranchRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  shiftDetails: {
    date: string
    startTime: string
    endTime: string
  } | null
  onRequestSent: (requestId: string) => void
}

export function CrossBranchRequestModal({
  open,
  onOpenChange,
  employee,
  shiftDetails,
  onRequestSent,
}: CrossBranchRequestModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)

  const handleSendRequest = async () => {
    if (!employee || !shiftDetails) return

    setIsRequesting(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const requestId = `req_${Date.now()}`
    onRequestSent(requestId)
    setIsRequesting(false)
    onOpenChange(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (!employee || !shiftDetails) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            Cross-Branch Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className={`w-12 h-12 ${employee.color} rounded-full flex items-center justify-center text-white font-medium`}
            >
              {employee.avatar}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{employee.name}</h3>
              <p className="text-sm text-gray-600">{employee.role}</p>
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-600">{employee.branchName}</span>
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Requested Shift Details:</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{formatDate(shiftDetails.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {formatTime(shiftDetails.startTime)} - {formatTime(shiftDetails.endTime)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {Number.parseInt(shiftDetails.endTime.split(":")[0]) -
                    Number.parseInt(shiftDetails.startTime.split(":")[0])}{" "}
                  hours
                </Badge>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-700">Cross-Branch Employee Request</p>
              <p className="text-orange-600 mt-1">
                A notification will be sent to {employee.name}'s mobile device for approval. They have 5 minutes to
                respond to this shift request.
              </p>
              <p className="text-orange-600 mt-1 text-xs">
                💡 <strong>Tip:</strong> If no response after 5 minutes, you can call {employee.name} directly.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={isRequesting}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isRequesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
