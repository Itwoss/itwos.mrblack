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
    if (!userId) {
      console.warn('⚠️ No user ID provided for socket connection')
      return null
    }

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000'
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      
      console.log('🔌 Connecting to Socket.IO server:', serverUrl)
      console.log('🔌 User details:', { userId, userRole })
      
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Try polling first
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
        forceNew: true,
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
        
        // Join user-specific room with actual user ID
        this.socket.emit('join-room', `user_${userId}`)
        
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
        console.error('🔌 Connection error:', error)
        this.isConnected = false
        
        // Try to reconnect after a delay
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('🔄 Attempting to reconnect...')
            this.socket.connect()
          }
        }, 5000)
      })

      this.socket.on('reconnect', () => {
        console.log('🔌 Reconnected to notification server')
        this.isConnected = true
        
        // Rejoin rooms after reconnection
        if (userId) {
          this.socket.emit('join-room', `user_${userId}`)
        }
        if (userRole === 'admin' || userRole === 'superadmin') {
          this.socket.emit('join-room', 'admin')
        }
      })

      // Add debugging listeners
      this.socket.on('room-joined', (data) => {
        console.log('🔌 Room joined confirmation:', data)
      })

      this.socket.on('authenticated', (data) => {
        console.log('🔌 Authentication confirmed:', data)
      })

      this.socket.on('pong', (data) => {
        console.log('🔌 Pong received:', data)
      })

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error)
        console.error('🔌 Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        })
        this.isConnected = false
      })

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

