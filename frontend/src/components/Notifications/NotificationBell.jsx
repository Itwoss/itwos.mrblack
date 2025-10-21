import React, { useState, useEffect } from 'react'
import { Badge, Dropdown, List, Button, Typography, Space, Spin, Empty, message } from 'antd'
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import { notificationsAPI } from '../../services/api'

const { Text, Title } = Typography

const NotificationBell = () => {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)
    
    try {
      console.log('🔔 Fetching notifications...')
      const response = await notificationsAPI.getNotifications({ limit: 10 })
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
        console.log('🔔 API returned error:', data.message)
        setNotifications([])
        setUnreadCount(0)
        setError('Failed to load notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      console.error('Error details:', error.response?.data)
      
      setNotifications([])
      setUnreadCount(0)
      setError('Failed to load notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
      default:
        return '🔔'
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

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
