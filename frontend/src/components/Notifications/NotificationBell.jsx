import React, { useState, useEffect, useCallback } from 'react'
import { Badge, Dropdown, List, Button, Typography, Space, Spin, Empty, message } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import { notificationsAPI } from '../../services/api'
import notificationService from '../../services/notificationService'

const { Text, Title } = Typography

const NotificationBell = () => {
  const { isAuthenticated, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    setError(null)
    
    // Add timeout to prevent infinite loading
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, 15000) // 15 second timeout
    })
    
    try {
      console.log('🔔 Fetching notifications...')
      
      // Race between API call and timeout
      const response = await Promise.race([
        notificationsAPI.getNotifications({ limit: 10 }),
        timeoutPromise
      ])
      
      clearTimeout(timeoutId) // Clear timeout on success
      
      console.log('🔔 Notifications response:', response.data)
      if (response.data.success) {
        const notificationsData = response.data.data?.notifications || []
        const unreadCountData = response.data.data?.unreadCount || 0
        
        // Ensure notifications is always an array and filter valid notifications
        const validNotifications = Array.isArray(notificationsData) 
          ? notificationsData.filter(notification => notification && (notification._id || notification.id))
          : []
        
        setNotifications(validNotifications)
        setUnreadCount(typeof unreadCountData === 'number' ? unreadCountData : 0)
        console.log('🔔 Notifications loaded:', validNotifications.length)
      } else {
        console.log('🔔 API returned unsuccessful response:', response.data)
        setNotifications([])
        setUnreadCount(0)
        setError(null) // Don't show error for empty/unsuccessful responses
      }
    } catch (error) {
      clearTimeout(timeoutId) // Clear timeout on error
      console.error('Error fetching notifications:', error)
      console.error('Error details:', error.response?.data)
      
      setNotifications([])
      setUnreadCount(0)
      
      // Don't show error for 404, network errors, or timeout - just show empty state
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK' || error.message === 'Request timeout') {
        setError(null)
      } else {
        setError('Failed to load notifications. Please try again.')
      }
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }, [isAuthenticated])

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      // Optimistically update UI first
      setNotifications(prev => 
        prev.map(notif => 
          (notif._id || notif.id) === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      // Then try to update on server
      try {
        await notificationsAPI.markAsRead(notificationId)
      } catch (error) {
        console.log('Server update failed, but UI updated locally')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      // Optimistically update UI first
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      )
      setUnreadCount(0)
      message.success('All notifications marked as read')
      
      // Then try to update on server
      try {
        await notificationsAPI.markAllAsRead()
      } catch (error) {
        console.log('Server update failed, but UI updated locally')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInSeconds = Math.floor((now - notificationDate) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'product_published':
        return '📦'
      case 'product_updated':
        return '🔄'
      case 'product_deleted':
        return '🗑️'
      case 'user_registered':
        return '👤'
      case 'admin_action':
        return '⚙️'
      case 'system_announcement':
        return '📢'
      case 'prebook_payment':
        return '💰'
      case 'payment_success':
        return '✅'
      case 'prebook_approved':
        return '🎉'
      case 'prebook_rejected':
        return '❌'
      case 'follow_request':
        return '👤➕'
      case 'follow':
        return '👤'
      case 'follow_accepted':
        return '✅'
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'comment_like':
        return '👍'
      default:
        return '🔔'
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔔 NotificationBell: Setting up notifications for user:', user._id || user.id)
      
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      
      // Listen for real-time notifications via Socket.IO
      const handleNewNotification = (data) => {
        console.log('🔔 Real-time notification received in NotificationBell:', data)
        console.log('🔔 Notification type:', data.type)
        console.log('🔔 Notification title:', data.title)
        console.log('🔔 Notification message:', data.message)
        console.log('🔔 Notification _id:', data._id || data.id)
        console.log('🔔 Notification from:', data.from)
        console.log('🔔 Current user ID:', user?._id || user?.id)
        
        // Verify this notification is for the current user
        const currentUserId = (user?._id || user?.id)?.toString()
        if (!currentUserId) {
          console.warn('⚠️ NotificationBell: No user ID available, ignoring notification')
          return
        }
        
        // Add the new notification to the list
        setNotifications(prev => {
          // Check if notification already exists (avoid duplicates)
          const notificationId = data._id || data.id
          const exists = prev.some(n => {
            const nId = (n._id || n.id)?.toString()
            const dataId = notificationId?.toString()
            return nId === dataId
          })
          
          if (exists) {
            console.log('🔔 Notification already exists, skipping:', notificationId)
            return prev
          }
          
          console.log('🔔 Adding new notification to list:', notificationId)
          
          // Add new notification at the beginning
          return [{
            _id: notificationId || `notif_${Date.now()}`,
            id: notificationId || `notif_${Date.now()}`,
            type: data.type || 'general',
            title: data.title || 'Notification',
            message: data.message || 'You have a new notification.',
            read: false,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            data: data.data || {},
            from: data.from || null
          }, ...prev]
        })
        
        // Increment unread count
        setUnreadCount(prev => {
          const newCount = prev + 1
          console.log('🔔 Unread count updated:', newCount)
          return newCount
        })
        
        // Refresh notifications after a short delay to ensure consistency
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      }
      
      // Connect to notification service
      const userId = user._id || user.id
      const userRole = user?.role || 'user'
      
      if (userId) {
        console.log('🔔 NotificationBell: Connecting to Socket.IO for user:', userId, 'role:', userRole)
        const socket = notificationService.connect(userId, userRole)
        if (socket) {
          console.log('🔔 NotificationBell: Socket.IO connected, setting up listener')
          notificationService.on('new_notification', handleNewNotification)
        } else {
          console.error('❌ NotificationBell: Failed to connect to Socket.IO')
        }
      } else {
        console.warn('⚠️ NotificationBell: No user ID available for Socket.IO connection')
      }
      
      return () => {
        console.log('🔔 NotificationBell: Cleaning up listeners')
        clearInterval(interval)
        notificationService.off('new_notification', handleNewNotification)
      }
    }
  }, [isAuthenticated, user, fetchNotifications])

  if (!isAuthenticated) {
    return null
  }

  const notificationItems = (notifications || [])
    .filter(notification => notification && (notification._id || notification.id)) // Filter out invalid notifications
    .map(notification => ({
      key: notification._id || notification.id,
      label: (
        <div 
          style={{ 
            padding: '16px 20px',
            borderBottom: '1px solid rgba(240, 240, 240, 0.4)',
            backgroundColor: notification.read 
              ? 'rgba(255, 255, 255, 0.6)' 
              : 'rgba(246, 255, 237, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            borderLeft: notification.read ? 'none' : '4px solid rgba(82, 196, 26, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = notification.read 
              ? 'rgba(255, 255, 255, 0.8)' 
              : 'rgba(246, 255, 237, 0.9)'
            e.currentTarget.style.transform = 'translateX(4px)'
            e.currentTarget.style.backdropFilter = 'blur(15px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = notification.read 
              ? 'rgba(255, 255, 255, 0.6)' 
              : 'rgba(246, 255, 237, 0.7)'
            e.currentTarget.style.transform = 'translateX(0)'
            e.currentTarget.style.backdropFilter = 'blur(10px)'
          }}
          onClick={() => !notification.read && markAsRead(notification._id || notification.id)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '20px', marginTop: '2px' }}>
              {getNotificationIcon(notification.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '4px'
              }}>
                <Text strong style={{ 
                  fontSize: '14px',
                  color: notification.read ? '#666' : '#333'
                }}>
                  {notification.title || 'Notification'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                  {formatTimeAgo(notification.createdAt)}
                </Text>
              </div>
              <Text 
                style={{ 
                  fontSize: '13px',
                  color: notification.read ? '#999' : '#666',
                  display: 'block',
                  lineHeight: '1.4'
                }}
              >
                {notification.message || 'No message'}
              </Text>
              {!notification.read && (
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#52c41a', 
                  borderRadius: '50%',
                  marginTop: '4px'
                }} />
              )}
            </div>
          </div>
        </div>
      )
    }))

  const dropdownContent = (
    <div style={{ 
      width: '350px', 
      maxHeight: '400px',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid rgba(240, 240, 240, 0.6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px'
      }}>
        <Title level={5} style={{ margin: 0 }}>Notifications</Title>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button 
              type="link" 
              size="small"
              onClick={markAllAsRead}
              style={{ padding: 0, height: 'auto' }}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <Text type="danger">{error}</Text>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ margin: 0 }}
          />
        </div>
      ) : (
        <List
          dataSource={notificationItems || []}
          renderItem={item => item?.label || null}
          style={{ maxHeight: '300px', overflowY: 'auto' }}
        />
      )}
      
      {notifications.length > 0 && (
        <div style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid rgba(240, 240, 240, 0.4)',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <Button 
            type="link" 
            size="small"
            style={{
              color: '#1890ff',
              fontWeight: '500',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#40a9ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#1890ff'
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
      
    </div>
  )

  return (
    <Dropdown
      popupRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      overlayStyle={{
        zIndex: 1000
      }}
    >
      <div 
        style={{ 
          position: 'relative', 
          cursor: 'pointer',
          padding: '12px',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <Badge 
          count={unreadCount} 
          size="small" 
          offset={[8, -2]}
          style={{
            backgroundColor: '#ff4d4f',
            boxShadow: '0 2px 4px rgba(255, 77, 79, 0.3)'
          }}
        >
          <BellOutlined 
            style={{ 
              fontSize: '22px', 
              color: unreadCount > 0 ? '#1890ff' : '#666',
              transition: 'all 0.3s ease'
            }} 
          />
        </Badge>
      </div>
    </Dropdown>
  )
}

export default NotificationBell
