"use client"

import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

interface WebSocketMessage {
  type: string
  data: any
  timestamp?: number
}

function getSocketUrl() {
  // Use window.location.hostname for web, fallback to localhost
  let host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // If running on mobile or emulator, allow override via env
  const port = 3001;
  // If you want to force a specific IP for mobile, set REACT_APP_SOCKET_HOST
  const envHost = (typeof process !== 'undefined' && process.env.REACT_APP_SOCKET_HOST) || undefined;
  if (envHost) host = envHost;
  return `ws://${host}:${port}`;
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
