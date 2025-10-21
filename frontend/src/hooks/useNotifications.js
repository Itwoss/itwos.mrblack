import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import notificationService from '../services/notificationService'

const useNotifications = (userId, userRole = 'user') => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api'

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  }

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    console.log('🔔 useNotifications fetchNotifications called:', {
      userId: userId,
      userRole: userRole,
      API_BASE_URL: API_BASE_URL
    })
    
    if (!userId) {
      console.log('🔔 No userId provided, skipping fetch')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const endpoint = userRole === 'admin' ? '/notifications/admin' : '/notifications'
      const url = `${API_BASE_URL}${endpoint}`
      const headers = getAuthHeaders()
      
      console.log('🔔 Fetching notifications:', {
        url: url,
        headers: headers,
        endpoint: endpoint
      })
      
      const response = await axios.get(url, headers)
      
      console.log('🔔 Notifications response:', {
        success: response.data.success,
        data: response.data.data,
        notifications: response.data.data?.notifications,
        unreadCount: response.data.data?.unreadCount
      })
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications || [])
        setUnreadCount(response.data.data.unreadCount || 0)
      }
    } catch (err) {
      console.error('🔔 Error fetching notifications:', err)
      setError(err.response?.data?.message || 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [userId, userRole])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        getAuthHeaders()
      )

      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true, readAt: new Date() }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        getAuthHeaders()
      )

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
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
    if (!userId) {
      console.warn('⚠️ useNotifications: No userId provided')
      return
    }

    console.log('🔌 Setting up notifications for user:', userId, 'role:', userRole)

    // Connect to notification service with real user details
    const socket = notificationService.connect(userId, userRole)

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

    // Subscribe to events
    notificationService.on('payment_success', handlePaymentSuccess)
    notificationService.on('new_paid_prebook', handleNewPaidPrebook)
    notificationService.on('prebook_status_update', handlePrebookStatusUpdate)
    notificationService.on('notification', handleGeneralNotification)

    // Cleanup on unmount
    return () => {
      notificationService.off('payment_success', handlePaymentSuccess)
      notificationService.off('new_paid_prebook', handleNewPaidPrebook)
      notificationService.off('prebook_status_update', handlePrebookStatusUpdate)
      notificationService.off('notification', handleGeneralNotification)
    }
  }, [userId, userRole, addNotification])

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchNotifications()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [fetchNotifications])

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
