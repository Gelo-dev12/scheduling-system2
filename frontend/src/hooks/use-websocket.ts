"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
}

function getSocketUrl() {
  // Use environment variable if set, otherwise use Render URL in production, localhost in dev
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://localhost:3001';
  }
  return 'wss://scheduling-system2.onrender.com';
}

export function useWebSocket(token?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {
    const url = getSocketUrl();
    const socket: Socket = io(url, token ? { auth: { token } } : {});
    setSocketInstance(socket);
    socket.on("connect", () => setIsConnected(true))
    socket.on("disconnect", () => setIsConnected(false))
    socket.on("employee_added", (data) => setLastMessage({ type: "employee_added", data }))
    socket.on("role_updated", (data) => setLastMessage({ type: "role_updated", data }))
    return () => { socket.disconnect(); };
  }, [token])

  const sendMessage = (msg: any) => {
    if (socketInstance) {
      socketInstance.emit("message", msg);
    }
  };

  return { isConnected, lastMessage, sendMessage }
}
