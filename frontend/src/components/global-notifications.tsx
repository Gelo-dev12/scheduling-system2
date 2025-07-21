"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, X, Check, Clock, Calendar, User, AlertCircle } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"

interface Notification {
  id: string
  type: "TIME_OFF_REQUEST" | "SHIFT_SWAP_REQUEST" | "EARLY_LEAVE_REQUEST" | "EMERGENCY_REQUEST" | "SCHEDULE_CONFLICT"
  title: string
  message: string
  employeeName: string
  employeeAvatar: string
  branchName: string
  date: string
  time: string
  timestamp: number
  priority: "low" | "medium" | "high"
  actions?: {
    approve?: boolean
    decline?: boolean
    view?: boolean
  }
}

export function GlobalNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const { lastMessage, isConnected, sendMessage } = useWebSocket()
  const navigate = useNavigate()
  const { theme, resolvedTheme } = useTheme()
  console.log('GlobalNotifications theme:', theme, 'resolvedTheme:', resolvedTheme)

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === "NEW_SHIFT_REQUEST") {
      const newNotification: Notification = {
        id: lastMessage.data.id,
        type: getNotificationType(lastMessage.data.requestType),
        title: lastMessage.data.requestType,
        message: lastMessage.data.message,
        employeeName: lastMessage.data.employeeName,
        employeeAvatar: lastMessage.data.employeeAvatar,
        branchName: lastMessage.data.branchName || "Unknown Branch",
        date: lastMessage.data.date,
        time: lastMessage.data.time,
        timestamp: lastMessage.data.timestamp,
        priority: getPriority(lastMessage.data.requestType),
        actions: {
          approve: true,
          decline: true,
          view: true,
        },
      }

      setNotifications((prev) => [newNotification, ...prev])

      // Notify timeoff page about new request
      if (typeof window !== 'undefined' && (window as any).addTimeOffRequest) {
        (window as any).addTimeOffRequest({
          id: newNotification.id,
          employeeName: newNotification.employeeName,
          employeeAvatar: newNotification.employeeAvatar,
          requestType: newNotification.title,
          date: newNotification.date,
          time: newNotification.time,
          message: newNotification.message,
          timestamp: newNotification.timestamp,
          status: "pending",
        })
      }

      // Auto-show notifications panel for high priority
      if (newNotification.priority === "high") {
        setShowNotifications(true)
      }

      // Show browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${newNotification.title} - ${newNotification.employeeName}`, {
          body: newNotification.message,
          icon: "/favicon.ico",
          tag: newNotification.id,
        })
      }
    }
  }, [lastMessage])

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const getNotificationType = (requestType: string): Notification["type"] => {
    switch (requestType) {
      case "Time Off Request":
        return "TIME_OFF_REQUEST"
      case "Shift Swap Request":
        return "SHIFT_SWAP_REQUEST"
      case "Early Leave Request":
        return "EARLY_LEAVE_REQUEST"
      default:
        return "TIME_OFF_REQUEST"
    }
  }

  const getPriority = (requestType: string): "low" | "medium" | "high" => {
    switch (requestType) {
      case "Emergency Request":
        return "high"
      case "Time Off Request":
        return "medium"
      case "Shift Swap Request":
        return "medium"
      case "Early Leave Request":
        return "low"
      default:
        return "medium"
    }
  }

  const handleNotificationAction = (notificationId: string, action: "approve" | "decline" | "view") => {
    const notification = notifications.find((n) => n.id === notificationId)
    if (!notification) return

    if (action === "view") {
      // Add the request to timeoff page directly
      if (typeof window !== 'undefined' && (window as any).addTimeOffRequest) {
        (window as any).addTimeOffRequest({
          id: notification.id,
          employeeName: notification.employeeName,
          employeeAvatar: notification.employeeAvatar,
          requestType: "Time Off Request",
          date: notification.date,
          time: notification.time,
          message: notification.message,
          timestamp: notification.timestamp,
          status: "pending",
          branchName: notification.branchName,
          priority: notification.priority,
        })
      }

      // Navigate to timeoff page without parameters
      navigate('/timeoff')
      setShowNotifications(false)
      return
    }

    // Send response via WebSocket for approve/decline
    sendMessage({
      type: "NOTIFICATION_RESPONSE",
      data: {
        notificationId,
        action,
        employeeName: notification.employeeName,
        requestType: notification.type,
      },
    })

    // Remove notification after action
    if (action === "approve" || action === "decline") {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    }
  }

  // Function to remove notification when request is processed in timeoff page
  const removeNotificationById = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  // Expose the function globally so timeoff page can access it
  useEffect(() => {
    (window as any).removeNotificationById = removeNotificationById
    return () => {
      delete (window as any).removeNotificationById
    }
  }, [])

  const dismissNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "TIME_OFF_REQUEST":
        return <Calendar className="w-4 h-4" />
      case "SHIFT_SWAP_REQUEST":
        return <Clock className="w-4 h-4" />
      case "EARLY_LEAVE_REQUEST":
        return <User className="w-4 h-4" />
      case "EMERGENCY_REQUEST":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  function getPriorityColor(priority: "low" | "medium" | "high", dark = false) {
    if (dark) {
      switch (priority) {
        case "high":
          return "border-l-red-500 bg-[#2a1a1a]"
        case "medium":
          return "border-l-orange-500 bg-[#2a211a]"
        case "low":
          return "border-l-blue-500 bg-[#1a1a2a]"
        default:
          return "border-l-gray-500 bg-[#23232a]"
      }
    } else {
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

  return (
    <>
      {/* Notification Bell - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className={
              `shadow-lg border ` +
              (resolvedTheme === 'dark'
                ? 'bg-[#232329] border-[#23232a] hover:bg-[#23232a] text-gray-100'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900')
            }
          >
            <Bell className={resolvedTheme === 'dark' ? 'w-4 h-4 text-gray-100' : 'w-4 h-4 text-gray-700'} />
            {notifications.length > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 min-w-[20px] h-5 flex items-center justify-center">
                {notifications.length}
              </Badge>
            )}
          </Button>

          {/* Connection Status Indicator */}
          <div className="absolute -bottom-1 -right-1">
            <div
              className={`w-3 h-3 rounded-full border-2 border-white ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-16 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]">
          <Card className={
            `shadow-xl ` +
            (resolvedTheme === 'dark'
              ? 'border-[#23232a] bg-[#232329] text-gray-100'
              : 'border-gray-200 bg-white text-gray-900')
          }>
            <div className={
              `p-4 border-b ` +
              (resolvedTheme === 'dark'
                ? 'bg-[#23232a] border-[#23232a]'
                : 'bg-gray-50 border-gray-200')
            }>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className={resolvedTheme === 'dark' ? 'w-5 h-5 text-gray-100' : 'w-5 h-5 text-gray-600'} />
                  <h3 className={resolvedTheme === 'dark' ? 'font-semibold text-gray-100' : 'font-semibold text-gray-900'}>Notifications</h3>
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {notifications.length}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)} className={resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-700'}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={resolvedTheme === 'dark' ? 'p-6 text-center text-gray-400' : 'p-6 text-center text-gray-500'}>
                  <Bell className={resolvedTheme === 'dark' ? 'w-8 h-8 mx-auto mb-2 text-gray-600' : 'w-8 h-8 mx-auto mb-2 text-gray-400'} />
                  <p className="text-sm">No new notifications</p>
                  <p className={resolvedTheme === 'dark' ? 'text-xs text-gray-500 mt-1' : 'text-xs text-gray-400 mt-1'}>
                    {isConnected ? "Listening for updates..." : "Reconnecting..."}
                  </p>
                </div>
              ) : (
                <div className={resolvedTheme === 'dark' ? 'divide-y divide-[#23232a]' : 'divide-y divide-gray-100'}>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={
                        `p-4 border-l-4 transition-colors ` +
                        (resolvedTheme === 'dark'
                          ? `${getPriorityColor(notification.priority, true)} hover:bg-[#23232a]`
                          : `${getPriorityColor(notification.priority, false)} hover:bg-gray-50`)
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {notification.employeeAvatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {getNotificationIcon(notification.type)}
                              <h4 className={resolvedTheme === 'dark' ? 'font-medium text-sm text-gray-100 truncate' : 'font-medium text-sm text-gray-900 truncate'}>{notification.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={resolvedTheme === 'dark' ? 'text-xs text-gray-400' : 'text-xs text-gray-500'}>{formatTimeAgo(notification.timestamp)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => dismissNotification(notification.id)}
                                className={resolvedTheme === 'dark' ? 'w-6 h-6 p-0 hover:bg-[#23232a] text-gray-100' : 'w-6 h-6 p-0 hover:bg-gray-200 text-gray-700'}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <p className={resolvedTheme === 'dark' ? 'text-sm text-gray-200 mb-2' : 'text-sm text-gray-700 mb-2'}>{notification.employeeName}</p>
                          <p className={resolvedTheme === 'dark' ? 'text-xs text-gray-400 mb-2 italic' : 'text-xs text-gray-600 mb-2 italic'}>"{notification.message}"</p>

                          <div className={resolvedTheme === 'dark' ? 'flex items-center gap-4 text-xs text-gray-400 mb-3' : 'flex items-center gap-4 text-xs text-gray-500 mb-3'}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{notification.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{notification.time}</span>
                            </div>
                          </div>

                          {notification.actions && (
                            <div className="flex gap-2">
                              {notification.actions.approve && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs h-7"
                                  onClick={() => handleNotificationAction(notification.id, "approve")}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {notification.actions.decline && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={resolvedTheme === 'dark' ? 'border-red-200 text-red-600 hover:bg-[#2a1a1a] text-xs h-7' : 'border-red-200 text-red-600 hover:bg-red-50 text-xs h-7'}
                                  onClick={() => handleNotificationAction(notification.id, "decline")}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              )}
                              {notification.actions.view && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => handleNotificationAction(notification.id, "view")}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className={resolvedTheme === 'dark' ? 'p-3 border-t bg-[#23232a] border-[#23232a]' : 'p-3 border-t bg-gray-50 border-gray-200'}>
                <Button variant="ghost" size="sm" className={resolvedTheme === 'dark' ? 'w-full text-xs text-gray-100' : 'w-full text-xs text-gray-700'} onClick={() => setNotifications([])}>
                  Clear All Notifications
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Toast Notifications for High Priority */}
      {notifications
        .filter((n) => n.priority === "high")
        .slice(0, 1)
        .map((notification) => (
          <div key={`toast-${notification.id}`} className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
            <Card className="border-l-4 border-l-red-500 shadow-xl bg-white">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {notification.employeeAvatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-red-700 text-sm">🚨 {notification.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissNotification(notification.id)}
                        className="w-6 h-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{notification.employeeName}</p>
                    <p className="text-xs text-gray-600 mb-2">"{notification.message}"</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs h-7"
                        onClick={() => handleNotificationAction(notification.id, "approve")}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setShowNotifications(true)}
                      >
                        View All
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
    </>
  )
}
