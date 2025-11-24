import { useState, useEffect, useCallback } from 'react'
import { notificationsAPI } from '../services/api'
import notificationService from '../services/notificationService'

const useNotifications = (userId, userRole = 'user') => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    console.log('🔔 useNotifications fetchNotifications called:', {
      userId: userId,
      userRole: userRole
    })
    
    if (!userId || userId === 'mock-user-id') {
      console.log('🔔 No valid userId provided, skipping fetch')
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    
    // Set a timeout to prevent infinite loading
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timeout. Please try again.'))
      }, 15000) // 15 second timeout
    })
    
    try {
      console.log('🔔 ========== FETCHING NOTIFICATIONS ==========')
      console.log('🔔 Step 1: Hook called with:', {
        userId: userId,
        userRole: userRole,
        userIdType: typeof userId,
        userRoleType: typeof userRole,
        isAdmin: userRole === 'admin',
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:7000/api'
      })
      
      // Use admin endpoint for admin users, regular endpoint for regular users
      const isAdminUser = userRole === 'admin'
      const apiCall = isAdminUser 
        ? notificationsAPI.getAdminNotifications({ page: 1, limit: 50 })
        : notificationsAPI.getNotifications({ page: 1, limit: 50 })
      
      console.log('🔔 Step 2: API Call selected:', {
        isAdminUser: isAdminUser,
        endpoint: isAdminUser ? '/api/notifications/admin' : '/api/notifications',
        apiCallType: typeof apiCall
      })
      
      // Race between API call and timeout
      console.log('🔔 Step 3: Making API request...')
      const response = await Promise.race([
        apiCall,
        timeoutPromise
      ])
      
      clearTimeout(timeoutId) // Clear timeout on success
      
      console.log('🔔 Step 4: API Response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        hasSuccess: !!response.data?.success,
        responseKeys: Object.keys(response.data || {}),
        fullResponse: response.data
      })
      
      console.log('🔔 Step 5: Parsing response data...')
      console.log('🔔 Raw response.data:', JSON.stringify(response.data, null, 2))
      
      // Handle response - check multiple possible structures
      let notificationsData = []
      let unreadCountData = 0
      
      if (response.data) {
        console.log('🔔 Step 6: Checking response structure...')
        // Try response.data.data structure first
        if (response.data.success && response.data.data) {
          console.log('🔔 Using response.data.data structure')
          notificationsData = response.data.data.notifications || []
          unreadCountData = response.data.data.unreadCount || 0
          console.log('🔔 Found notifications in data.data:', {
            count: notificationsData.length,
            unreadCount: unreadCountData,
            firstNotification: notificationsData[0]
          })
        }
        // Fallback to response.data structure
        else if (response.data.notifications) {
          console.log('🔔 Using response.data.notifications structure')
          notificationsData = response.data.notifications || []
          unreadCountData = response.data.unreadCount || 0
          console.log('🔔 Found notifications in data:', {
            count: notificationsData.length,
            unreadCount: unreadCountData
          })
        }
        // Fallback to direct response
        else if (Array.isArray(response.data)) {
          console.log('🔔 Using direct array structure')
          notificationsData = response.data
          unreadCountData = response.data.filter(n => !n.read).length
          console.log('🔔 Found notifications as array:', {
            count: notificationsData.length,
            unreadCount: unreadCountData
          })
        } else {
          console.warn('🔔 ⚠️ Unknown response structure:', {
            hasSuccess: !!response.data.success,
            hasData: !!response.data.data,
            hasNotifications: !!response.data.notifications,
            isArray: Array.isArray(response.data),
            keys: Object.keys(response.data || {})
          })
        }
      } else {
        console.error('🔔 ❌ No response.data found!')
      }
      
      // Ensure notifications is always an array
      console.log('🔔 Step 7: Validating notifications...')
      const validNotifications = Array.isArray(notificationsData) 
        ? notificationsData.filter(notification => {
            // Filter out invalid notifications
            if (!notification) {
              console.warn('🔔 Skipping null/undefined notification')
              return false
            }
            // Must have an ID
            if (!notification._id && !notification.id) {
              console.warn('🔔 Skipping notification without ID:', notification)
              return false
            }
            // Must have a message or title
            if (!notification.message && !notification.title) {
              console.warn('🔔 Skipping notification without message/title:', notification)
              return false
            }
            return true
          })
        : []
      
      console.log('🔔 Step 8: Final processed notifications:', {
        rawCount: notificationsData.length,
        validCount: validNotifications.length,
        unreadCount: unreadCountData,
        sampleNotification: validNotifications[0],
        allNotifications: validNotifications
      })
      console.log('🔔 ========== FETCH COMPLETE ==========')
      
      // Always set notifications to stop loading, even if empty
      setNotifications(validNotifications)
      setUnreadCount(typeof unreadCountData === 'number' ? unreadCountData : 0)
      
      // Clear any previous errors on success
      setError(null)
    } catch (err) {
      console.error('🔔 Error fetching notifications:', err)
      console.error('🔔 Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      })
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notifications'
      setError(errorMessage)
      
      // Always set empty arrays to stop loading state
      setNotifications([])
      setUnreadCount(0)
      
      // Don't show error for 404 or empty results - just show empty state
      if (err.response?.status === 404) {
        setError(null) // Clear error for 404
      }
    } finally {
      clearTimeout(timeoutId) // Clear timeout in finally
      setLoading(false)
    }
  }, [userId, userRole])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId)

      setNotifications(prev => 
        prev.map(notif => 
          (notif._id === notificationId || notif.id === notificationId)
            ? { ...notif, read: true, readAt: new Date() }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
      // Still update UI optimistically
      setNotifications(prev => 
        prev.map(notif => 
          (notif._id === notificationId || notif.id === notificationId)
            ? { ...notif, read: true, readAt: new Date() }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead()

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      // Still update UI optimistically
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    }
  }, [])

  // Add new notification (for real-time updates)
  const addNotification = useCallback((newNotification) => {
    setNotifications(prev => [newNotification, ...prev])
    if (!newNotification.read) {
      setUnreadCount(prev => prev + 1)
    }
  }, [])

  // Update notification (for real-time updates)
  const updateNotification = useCallback((updatedNotification) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif._id === updatedNotification._id ? updatedNotification : notif
      )
    )
  }, [])

  // Setup real-time listeners
  useEffect(() => {
    // Don't connect if userId is invalid or mock
    if (!userId || userId === 'mock-user-id') {
      // Only log in development and only if we've had time for auth to initialize
      if (process.env.NODE_ENV === 'development') {
        // Use debug log instead of warning for initial load cases
        console.debug('🔔 useNotifications: No valid userId yet, skipping socket connection (this is normal during initial load)')
      }
      return
    }

    console.log('🔌 Setting up notifications for user:', userId, 'role:', userRole)

    // Connect to notification service with real user details
    const socket = notificationService.connect(userId, userRole)
    
    // If connection failed, return early
    if (!socket) {
      return
    }

    // Listen for payment success notifications
    const handlePaymentSuccess = (data) => {
      console.log('💰 Payment success notification received:', data)
      addNotification({
        _id: `temp_${Date.now()}`,
        type: 'payment_success',
        title: 'Payment Successful! 🎉',
        message: data.message || 'Your payment has been processed successfully.',
        read: false,
        createdAt: new Date(),
        data: data
      })
    }

    // Listen for new paid prebook notifications (admin)
    const handleNewPaidPrebook = (data) => {
      console.log('📋 New paid prebook notification received:', data)
      addNotification({
        _id: `temp_${Date.now()}`,
        type: 'prebook_payment',
        title: 'New Paid Prebook Request 💰',
        message: data.message || 'New prebook request with payment received.',
        read: false,
        createdAt: new Date(),
        data: data
      })
    }

    // Listen for prebook status updates
    const handlePrebookStatusUpdate = (data) => {
      console.log('📋 Prebook status update received:', data)
      addNotification({
        _id: `temp_${Date.now()}`,
        type: 'prebook_status_update',
        title: 'Prebook Status Update',
        message: data.message || 'Your prebook status has been updated.',
        read: false,
        createdAt: new Date(),
        data: data
      })
    }

    // Listen for general notifications
    const handleGeneralNotification = (data) => {
      console.log('🔔 General notification received:', data)
      addNotification({
        _id: data._id || `temp_${Date.now()}`,
        type: data.type || 'general',
        title: data.title || 'Notification',
        message: data.message || 'You have a new notification.',
        read: data.read || false,
        createdAt: new Date(data.createdAt || Date.now()),
        data: data.data || {}
      })
    }

    // Listen for new_notification events (follow requests, follow accepted, etc.)
    const handleNewNotification = (data) => {
      console.log('🔔 New notification event received:', data)
      // Format notification based on type
      let title = 'Notification'
      if (data.type === 'follow_request') {
        title = 'Follow Request'
      } else if (data.type === 'follow') {
        title = 'New Follower'
      } else if (data.type === 'follow_accepted') {
        title = 'Follow Request Accepted'
      } else {
        title = data.title || 'Notification'
      }
      
      addNotification({
        _id: data._id || `notif_${Date.now()}`,
        type: data.type || 'general',
        title: title,
        message: data.message || 'You have a new notification.',
        read: false, // New notifications are always unread
        createdAt: new Date(data.createdAt || Date.now()),
        data: data.metadata || data.data || {},
        from: data.from || null
      })
      
      // Refresh notifications from API to get the full notification data
      setTimeout(() => {
        fetchNotifications()
      }, 500)
    }

    // Subscribe to events
    notificationService.on('payment_success', handlePaymentSuccess)
    notificationService.on('new_paid_prebook', handleNewPaidPrebook)
    notificationService.on('prebook_status_update', handlePrebookStatusUpdate)
    notificationService.on('notification', handleGeneralNotification)
    notificationService.on('new_notification', handleNewNotification)

    // Cleanup on unmount
    return () => {
      notificationService.off('payment_success', handlePaymentSuccess)
      notificationService.off('new_paid_prebook', handleNewPaidPrebook)
      notificationService.off('prebook_status_update', handlePrebookStatusUpdate)
      notificationService.off('notification', handleGeneralNotification)
      notificationService.off('new_notification', handleNewNotification)
    }
  }, [userId, userRole, addNotification, fetchNotifications])

  // Initial fetch and periodic refresh
  useEffect(() => {
    // Only fetch if we have a valid userId
    if (!userId || userId === 'mock-user-id') {
      setLoading(false)
      setNotifications([])
      setUnreadCount(0)
      setError(null)
      return
    }
    
    fetchNotifications()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      if (userId && userId !== 'mock-user-id') {
        fetchNotifications()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [fetchNotifications, userId])
  
  // Safety timeout - ensure loading stops after 20 seconds max
  useEffect(() => {
    if (loading) {
      const safetyTimeout = setTimeout(() => {
        console.warn('🔔 Safety timeout: Forcing loading to stop after 20 seconds')
        setLoading(false)
        if (notifications.length === 0 && !error) {
          setError('Request timeout. Please refresh the page.')
        }
      }, 20000) // 20 second safety timeout
      
      return () => clearTimeout(safetyTimeout)
    }
  }, [loading, notifications.length, error])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    updateNotification
  }
}

export default useNotifications
