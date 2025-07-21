"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Building2, Calendar, CheckCircle, XCircle, Timer } from "lucide-react"
import { CallEmployeeCard } from "./call-employee-card"

interface PendingRequest {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  employeeRole: string
  employeePhone: string // Add this
  fromBranch: string
  toBranch: string
  shiftDate: string
  startTime: string
  endTime: string
  requestedAt: number
  expiresAt: number
  status: "pending" | "approved" | "rejected" | "expired"
}

export type { PendingRequest };

interface PendingRequestsPanelProps {
  requests: PendingRequest[]
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
  onExpire: (requestId: string) => void
}

const getEmployeeByRequest = (request: PendingRequest) => {
  // In real app, this would fetch from database
  const employeePhones: Record<string, string> = {
    "4": "+63 917 111 2222", // Ana Garcia
    "5": "+63 917 333 4444", // Pedro Cruz
    "6": "+63 917 555 6666", // Lisa Wong
  }

  return {
    id: request.employeeId,
    name: request.employeeName,
    phone: employeePhones[request.employeeId] || "+63 917 000 0000",
    role: request.employeeRole,
    avatar: request.employeeAvatar,
    isOnline: Math.random() > 0.3, // Random online status for demo
    lastSeen: Math.random() > 0.5 ? "5 min ago" : undefined,
  }
}

export function PendingRequestsPanel({ requests, onApprove, onReject, onExpire }: PendingRequestsPanelProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Check for expired requests
  useEffect(() => {
    requests.forEach((request) => {
      if (request.status === "pending" && currentTime >= request.expiresAt) {
        onExpire(request.id)
      }
    })
  }, [currentTime, requests, onExpire])

  const formatTimeRemaining = (expiresAt: number) => {
    const remaining = Math.max(0, expiresAt - currentTime)
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getTimeRemainingColor = (expiresAt: number) => {
    const remaining = expiresAt - currentTime
    if (remaining <= 60000) return "text-red-600" // Last minute
    if (remaining <= 120000) return "text-orange-600" // Last 2 minutes
    return "text-green-600"
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  const pendingRequests = requests.filter((r) => r.status === "pending")

  if (pendingRequests.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5 text-orange-500" />
          Cross-Branch Requests
          <Badge variant="secondary">{pendingRequests.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map((request) => {
          const timeRemaining = formatTimeRemaining(request.expiresAt)
          const isExpiringSoon = request.expiresAt - currentTime <= 120000 // 2 minutes

          return (
            <div
              key={request.id}
              className={`rounded-lg p-4 ${isExpiringSoon ? "bg-orange-50" : "bg-white"}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {request.employeeAvatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{request.employeeName}</h4>
                      <p className="text-sm text-gray-600">{request.employeeRole}</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${getTimeRemainingColor(request.expiresAt)}`}>
                        <Timer className="w-4 h-4" />
                        <span className="font-mono font-semibold">{timeRemaining}</span>
                      </div>
                      <p className="text-xs text-gray-500">remaining</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">From: {request.fromBranch}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-600">To: {request.toBranch}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{formatDate(request.shiftDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>
                          {formatTime(request.startTime)} - {formatTime(request.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(request.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => onReject(request.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>

                  {currentTime >= request.expiresAt && (
                    <div className="mt-3">
                      <CallEmployeeCard
                        request={{
                          id: request.id,
                          employeeName: request.employeeName,
                          fromBranch: request.fromBranch,
                          shiftDate: request.shiftDate,
                          startTime: request.startTime,
                          endTime: request.endTime,
                        }}
                        employee={getEmployeeByRequest(request)}
                        onCallInitiated={(requestId, phone) => {
                          console.log(`Call initiated to employee for request ${requestId} at ${phone}`)
                          // Track call analytics here
                        }}
                      />
                    </div>
                  )}

                  {isExpiringSoon && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">⚠️ Request expires in {timeRemaining}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
