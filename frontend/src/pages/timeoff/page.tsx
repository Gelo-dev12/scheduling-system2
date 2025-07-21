"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Clock, Calendar, ArrowLeft, User, Building2, AlertCircle } from "lucide-react"

interface TimeOffRequest {
  id: string
  employeeName: string
  employeeAvatar: string
  requestType: string
  date: string
  time: string
  message: string
  timestamp: number
  status: "pending" | "approved" | "denied"
  branchName?: string
  priority?: "low" | "medium" | "high"
}

export default function TimeOffPage() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])

  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null)
  const [newRequestCount, setNewRequestCount] = useState(0)

  // Function to add new time-off request from notifications
  const addTimeOffRequest = (newRequest: TimeOffRequest) => {
    setRequests((prev) => {
      // Check if request already exists
      const exists = prev.find(r => r.id === newRequest.id)
      if (exists) {
        return prev
      }
      // Add new request to the beginning of the list
      setNewRequestCount(prev => prev + 1)
      return [newRequest, ...prev]
    })
  }

  // Expose the function globally so notifications can call it
  useEffect(() => {
    (window as any).addTimeOffRequest = addTimeOffRequest
    return () => {
      delete (window as any).addTimeOffRequest
    }
  }, [])

  // Reset new request count when viewing pending requests
  useEffect(() => {
    if (newRequestCount > 0) {
      const timer = setTimeout(() => {
        setNewRequestCount(0)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [newRequestCount])

  const handleRequestAction = (requestId: string, action: "approved" | "denied") => {
    setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status: action } : request)))

    // Remove corresponding notification if it exists
    if ((window as any).removeNotificationById) {
      (window as any).removeNotificationById(requestId)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getPriorityColor = (priority?: "low" | "medium" | "high") => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50"
      case "medium":
        return "border-l-orange-500 bg-orange-50"
      case "low":
        return "border-l-blue-500 bg-blue-50"
      default:
        return "border-l-gray-500 bg-gray-50"
    }
  }

  const getPriorityIcon = (priority?: "low" | "medium" | "high") => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "medium":
        return <Clock className="w-4 h-4 text-orange-500" />
      case "low":
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const processedRequests = requests.filter((r) => r.status !== "pending")

  // If there's a selected request, show detailed view
  if (selectedRequest) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedRequest(null)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Requests
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Request Details</h1>
          </div>

          <Card className={`${getPriorityColor(selectedRequest.priority)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getPriorityIcon(selectedRequest.priority)}
                  {selectedRequest.requestType}
                  {selectedRequest.priority && (
                    <Badge variant="secondary" className="capitalize">
                      {selectedRequest.priority} Priority
                    </Badge>
                  )}
                </CardTitle>
                <Badge
                  variant={selectedRequest.status === "approved" ? "default" : selectedRequest.status === "denied" ? "destructive" : "secondary"}
                  className={selectedRequest.status === "approved" ? "bg-green-600" : ""}
                >
                  {selectedRequest.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-medium">
                    {selectedRequest.employeeAvatar}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedRequest.employeeName}</h2>
                    {selectedRequest.branchName && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span>{selectedRequest.branchName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{selectedRequest.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{selectedRequest.time}</p>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Message</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 italic">"{selectedRequest.message}"</p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-sm text-gray-500">
                  Requested {formatTimeAgo(selectedRequest.timestamp)}
                </div>

                {/* Action Buttons */}
                {selectedRequest.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      onClick={() => handleRequestAction(selectedRequest.id, "approved")}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
                      onClick={() => handleRequestAction(selectedRequest.id, "denied")}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Deny Request
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Time Off Requests</h1>
          <p className="text-gray-600 mt-2">Manage employee time off requests and approvals</p>
        </div>

        {/* Pending Requests */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Requests
              <Badge variant="secondary">{pendingRequests.length}</Badge>
              {newRequestCount > 0 && (
                <Badge className="bg-green-600 text-white animate-pulse">
                  +{newRequestCount} New
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request, index) => (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-4 bg-white ${
                      index < newRequestCount ? 'border-green-500 bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {request.employeeAvatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{request.employeeName}</h3>
                          <div className="flex items-center gap-2">
                            {index < newRequestCount && (
                              <Badge className="bg-green-600 text-white text-xs">
                                New
                              </Badge>
                            )}
                            <span className="text-sm text-gray-500">{formatTimeAgo(request.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{request.requestType}</p>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">{request.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{request.time}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 italic mb-4">"{request.message}"</p>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(request)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRequestAction(request.id, "approved")}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleRequestAction(request.id, "denied")}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Recent Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processedRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No processed requests</p>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {request.employeeAvatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{request.employeeName}</h3>
                          <Badge
                            variant={request.status === "approved" ? "default" : "destructive"}
                            className={request.status === "approved" ? "bg-green-600" : ""}
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{request.requestType}</p>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">{request.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{request.time}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 italic mb-2">"{request.message}"</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
