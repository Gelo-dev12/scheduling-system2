"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageCircle, Clock, Building2 } from "lucide-react"

interface CallEmployeeCardProps {
  request: {
    id: string
    employeeName: string
    employeePhone: string
    fromBranch: string
    shiftDate: string
    startTime: string
    endTime: string
  }
  employee: {
    id: string
    name: string
    phone: string
    role: string
    avatar: string
    isOnline: boolean
    lastSeen?: string
  }
  onCallInitiated: (requestId: string, employeePhone: string) => void
}

export function CallEmployeeCard({ request, employee, onCallInitiated }: CallEmployeeCardProps) {
  const [isCalling, setIsCalling] = useState(false)

  const handleCall = () => {
    setIsCalling(true)

    // Open phone dialer
    window.location.href = `tel:${employee.phone}`

    // Track call initiation
    onCallInitiated(request.id, employee.phone)

    // Reset calling state after a delay
    setTimeout(() => setIsCalling(false), 3000)
  }

  const handleSMS = () => {
    const message = `Hi ${employee.name}! You have a cross-branch shift request for ${request.shiftDate} (${request.startTime}-${request.endTime}). Please check your ShiftSync app to approve/decline. Thanks!`
    const encodedMessage = encodeURIComponent(message)
    window.location.href = `sms:${employee.phone}?body=${encodedMessage}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className="bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {employee.avatar}
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${employee.isOnline ? "bg-green-500" : "bg-gray-400"}`}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                <p className="text-sm text-gray-600">{employee.role}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{request.fromBranch}</span>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={employee.isOnline ? "default" : "secondary"} className="text-xs">
                  {employee.isOnline ? "Online" : "Offline"}
                </Badge>
                {!employee.isOnline && employee.lastSeen && (
                  <p className="text-xs text-gray-500 mt-1">Last seen: {employee.lastSeen}</p>
                )}
              </div>
            </div>

            <div className="bg-white p-3 rounded border mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-red-500" />
                <span className="text-sm font-medium text-red-600">Request Expired - No Response</span>
              </div>
              <div className="text-xs text-gray-600">
                <p>
                  <strong>Employee:</strong> {request.employeeName}
                </p>
                <p>
                  <strong>Shift:</strong> {formatDate(request.shiftDate)} • {request.startTime}-{request.endTime}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-600 mb-2">
                <p>
                  <strong>Direct Contact:</strong> {employee.phone}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`flex-1 ${isCalling ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={handleCall}
                  disabled={isCalling}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {isCalling ? "Calling..." : "Call Now"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
                  onClick={handleSMS}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center mt-2">
                💡 Tip: Call for urgent requests, SMS for non-urgent follow-ups
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
