// Real-time notification service using Socket.IO
import { io } from 'socket.io-client'

class NotificationService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.listeners = new Map()
  }

  connect(userId, userRole) {
    if (this.socket && this.isConnected) {
      return this.socket
    }

    // Validate user details
    if (!userId || userId === 'mock-user-id') {
      console.warn('⚠️ No valid user ID provided for socket connection')
      return null
    }

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000'
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      
      // Check if backend is available before connecting
      if (!token || !serverUrl) {
        console.warn('⚠️ Missing token or server URL, skipping socket connection')
        return null
      }
      
      console.log('🔌 Connecting to Socket.IO server:', serverUrl)
      console.log('🔌 User details:', { userId, userRole })
      
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3, // Reduced attempts
        reconnectionDelay: 5000, // Increased delay
        reconnectionDelayMax: 10000,
        timeout: 5000, // Reduced timeout
        forceNew: false, // Don't force new connection
        auth: {
          token: token,
          userId: userId,
          userRole: userRole
        }
      })

      this.socket.on('connect', () => {
        console.log('🔌 Connected to notification server for user:', userId, 'role:', userRole)
        console.log('🔌 Socket ID:', this.socket.id)
        this.isConnected = true
        
        // Send authentication
        this.socket.emit('authenticate', {
          userId: userId,
          userRole: userRole,
          token: token
        })
        
        // Join user-specific room for notifications (backend expects this format)
        if (userId && userId !== 'mock-user-id') {
          this.socket.emit('join-user-room', userId)
          console.log('🔌 Joining user room via join-user-room:', userId)
          
          // Wait a bit then verify
          setTimeout(() => {
            this.socket.emit('join-room', `user:${userId}`)
            console.log('🔌 Also joining room via join-room: user:' + userId)
          }, 100)
        }
        
        // Join admin room if user is admin
        if (userRole === 'admin' || userRole === 'superadmin') {
          this.socket.emit('join-room', 'admin')
          console.log('🔌 Joined admin room')
        }
        
        // Test connection
        this.socket.emit('ping')
      })

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from notification server')
        this.isConnected = false
      })

      this.socket.on('connect_error', (error) => {
        // Suppress timeout and network errors to reduce console spam
        const isTimeoutError = error.message?.includes('timeout') || 
                               error.message?.includes('xhr poll error') ||
                               error.type === 'TransportError'
        
        if (!isTimeoutError) {
          console.warn('🔌 Connection error:', error.message || error.type)
        }
        this.isConnected = false
        // Don't auto-reconnect on error - let Socket.IO handle it
      })

      this.socket.on('reconnect', () => {
        console.log('🔌 Reconnected to notification server')
        this.isConnected = true
        
        // Rejoin rooms after reconnection
        if (userId && userId !== 'mock-user-id') {
          this.socket.emit('join-user-room', userId)
          this.socket.emit('join-room', `user:${userId}`)
        }
        if (userRole === 'admin' || userRole === 'superadmin') {
          this.socket.emit('join-room', 'admin')
        }
      })

      // Add debugging listeners
      this.socket.on('room-joined', (data) => {
        console.log('🔌 Room joined confirmation:', data)
      })

      this.socket.on('user-room-joined', (data) => {
        console.log('🔌 User room joined confirmation:', data)
      })

      this.socket.on('authenticated', (data) => {
        console.log('🔌 Authentication confirmed:', data)
      })

      this.socket.on('pong', (data) => {
        console.log('🔌 Pong received:', data)
      })

      // Removed duplicate connect_error handler

      // Listen for payment success notifications
      this.socket.on('payment_success', (data) => {
        console.log('💰 Payment success notification:', data)
        this.emit('payment_success', data)
      })

      // Listen for new paid prebook notifications (admin)
      this.socket.on('new_paid_prebook', (data) => {
        console.log('📋 New paid prebook notification:', data)
        this.emit('new_paid_prebook', data)
      })

      // Listen for prebook status updates
      this.socket.on('prebook_status_update', (data) => {
        console.log('📋 Prebook status update:', data)
        this.emit('prebook_status_update', data)
      })

      // Listen for general notifications
      this.socket.on('notification', (data) => {
        console.log('🔔 General notification:', data)
        this.emit('notification', data)
      })

      // Listen for new_notification events (follow requests, etc.)
      this.socket.on('new_notification', (data) => {
        console.log('🔔 New notification received in notificationService:', data)
        console.log('🔔 Notification type:', data.type)
        console.log('🔔 Notification title:', data.title)
        console.log('🔔 Notification message:', data.message)
        console.log('🔔 Notification _id:', data._id)
        this.emit('new_notification', data)
      })

    } catch (error) {
      console.error('Failed to connect to notification server:', error)
    }

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Subscribe to specific notification types
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  // Unsubscribe from specific notification types
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  // Emit event to all listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in notification callback:', error)
        }
      })
    }
  }

  // Send notification to server
  sendNotification(notification) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_notification', notification)
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService()

export default notificationService

