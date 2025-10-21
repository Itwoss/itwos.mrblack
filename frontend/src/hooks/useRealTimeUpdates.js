import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContextOptimized'

// Custom hook for real-time updates
export const useRealTimeUpdates = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [notifications, setNotifications] = useState([])
  const { user } = useAuth()
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Skip WebSocket connection in development if no user
    if (!user?.id) {
      console.log('No user ID, skipping WebSocket connection')
      return
    }

    try {
      // Use WebSocket for real-time updates
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000'
      console.log('Attempting WebSocket connection to:', `${wsUrl}/ws/dashboard/${user?.id}`)
      wsRef.current = new WebSocket(`${wsUrl}/ws/dashboard/${user?.id}`)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastUpdate(new Date())
          
          switch (data.type) {
            case 'stats_update':
              // Handle stats updates
              console.log('Stats updated:', data.payload)
              break
            case 'notification':
              setNotifications(prev => [data.payload, ...prev.slice(0, 9)]) // Keep last 10
              break
            case 'prebook_update':
              // Handle prebook updates
              console.log('Prebook updated:', data.payload)
              break
            default:
              console.log('Unknown message type:', data.type)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`)
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        // Don't crash the app, just log the error
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setIsConnected(false)
      // Don't crash the app, just log the error
    }
  }, [user?.id])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected')
    }
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
  }, [])

  // Connect when user is available
  useEffect(() => {
    if (user?.id) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [user?.id, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    lastUpdate,
    notifications,
    sendMessage,
    clearNotifications,
    markNotificationAsRead,
    reconnect: connect
  }
}

export default useRealTimeUpdates
