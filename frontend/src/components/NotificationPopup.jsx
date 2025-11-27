import React, { useState, useEffect } from 'react'
import { 
  Drawer, 
  List, 
  Badge, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Avatar, 
  Empty, 
  Spin,
  message,
  Popover,
  Card
} from 'antd'
import { 
  BellOutlined, 
  CheckOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  MoreOutlined,
  UserAddOutlined,
  UserOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'
import { followAPI } from '../services/api'
import api from '../services/api'
import { getUserAvatarUrl, getUserInitials } from '../utils/avatarUtils'

const { Title, Text } = Typography

const NotificationPopup = ({ visible, onClose, userId }) => {
  const { user, isAuthenticated } = useAuth()
  const effectiveUserId = userId || (isAuthenticated && user?._id ? user._id : null)
  // For admin users, ensure role is 'admin' to use admin endpoint
  const userRole = user?.role || (localStorage.getItem('adminUser') ? 'admin' : 'user')
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications
  } = useNotifications(effectiveUserId, userRole)

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_success':
        return <DollarOutlined style={{ color: '#52c41a' }} />
      case 'prebook_confirmed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'prebook_rejected':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />
      case 'prebook_payment':
        return <DollarOutlined style={{ color: '#1890ff' }} />
      case 'follow_request':
        return <UserAddOutlined style={{ color: '#1890ff' }} />
      case 'follow':
        return <UserOutlined style={{ color: '#52c41a' }} />
      case 'follow_accepted':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'payment_success':
        return '#52c41a'
      case 'prebook_confirmed':
        return '#52c41a'
      case 'prebook_rejected':
        return '#f5222d'
      case 'prebook_payment':
        return '#1890ff'
      case 'follow_request':
        return '#1890ff'
      case 'follow':
        return '#52c41a'
      case 'follow_accepted':
        return '#52c41a'
      default:
        return '#1890ff'
    }
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Don't navigate on click for follow requests (they have buttons)
    if (notification.type === 'follow_request') {
      return
    }
    // Mark as read if not already read
    if (!notification.read) {
      console.log('🔔 Marking notification as read:', {
        notificationId: notification._id || notification.id,
        notification: notification
      })
      try {
        const notificationId = notification._id || notification.id
        if (!notificationId) {
          console.error('❌ No notification ID found:', notification)
          return
        }
        await markAsRead(notificationId)
        console.log('✅ Notification marked as read successfully')
        // Refresh notifications to get updated state
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      } catch (error) {
        console.error('❌ Error marking notification as read:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
      }
    } else {
      console.log('ℹ️ Notification already read:', notification._id || notification.id)
    }
  }

  // Handle accept follow request
  const handleAcceptFollowRequest = async (notification, e) => {
    e.stopPropagation() // Prevent notification click
    try {
      const followId = notification.data?.followId || notification.metadata?.followId
      const requesterId = notification.from?._id || notification.from
      
      if (!requesterId) {
        message.error('Invalid follow request')
        return
      }

      let response
      if (followId) {
        try {
          response = await api.post(`/follow/accept/${followId}`)
        } catch (err) {
          response = await followAPI.acceptFollowRequest(requesterId)
        }
      } else {
        response = await followAPI.acceptFollowRequest(requesterId)
      }

      if (response.data.success) {
        message.success('Follow request accepted')
        await markAsRead(notification._id || notification.id)
        setTimeout(() => fetchNotifications(), 500)
      }
    } catch (error) {
      console.error('Accept follow request error:', error)
      message.error(error.response?.data?.message || 'Failed to accept follow request')
    }
  }

  // Handle decline follow request
  const handleDeclineFollowRequest = async (notification, e) => {
    e.stopPropagation() // Prevent notification click
    try {
      const followId = notification.data?.followId || notification.metadata?.followId
      const requesterId = notification.from?._id || notification.from
      
      if (!requesterId) {
        message.error('Invalid follow request')
        return
      }

      let response
      if (followId) {
        try {
          response = await api.post(`/follow/decline/${followId}`)
        } catch (err) {
          response = await followAPI.declineFollowRequest(requesterId)
        }
      } else {
        response = await followAPI.declineFollowRequest(requesterId)
      }

      if (response.data.success) {
        message.success('Follow request declined')
        await markAsRead(notification._id || notification.id)
        setTimeout(() => fetchNotifications(), 500)
      }
    } catch (error) {
      console.error('Decline follow request error:', error)
      message.error(error.response?.data?.message || 'Failed to decline follow request')
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      message.success('All notifications marked as read')
    } catch (error) {
      message.error('Failed to mark all as read')
    }
  }

  // Fetch notifications when popup opens
  useEffect(() => {
    if (visible) {
      fetchNotifications()
    }
  }, [visible, fetchNotifications])

  // No demo notifications - use real data only

  const popupContent = (
    <div style={{ width: 350, maxHeight: 500 }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
            🔔 Notifications
          </Title>
          {unreadCount > 0 && (
            <Button 
              type="link" 
              size="small" 
              onClick={handleMarkAllAsRead}
              style={{ padding: 0 }}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Spin size="small" />
            <div style={{ marginTop: '8px', color: '#666' }}>Loading notifications...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="danger">Failed to load notifications</Text>
            <br />
            <Button 
              type="link" 
              size="small" 
              onClick={fetchNotifications}
              style={{ marginTop: '8px' }}
            >
              Retry
            </Button>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: notification.type === 'follow_request' ? 'default' : 'pointer',
                  background: notification.read ? '#fff' : '#f6ffed',
                  transition: 'all 0.2s',
                  opacity: notification.read ? 0.7 : 1
                }}
                onClick={() => handleNotificationClick(notification)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = notification.read ? '#f5f5f5' : '#e6f7ff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.read ? '#fff' : '#f6ffed'
                }}
                actions={
                  notification.type === 'follow_request' ? [
                    <Space key="actions" size="small">
                      <Button 
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={(e) => handleAcceptFollowRequest(notification, e)}
                      >
                        Accept
                      </Button>
                      <Button 
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={(e) => handleDeclineFollowRequest(notification, e)}
                      >
                        Decline
                      </Button>
                    </Space>
                  ] : []
                }
              >
                <List.Item.Meta
                  avatar={
                    // Show user avatar for follow requests (Instagram style)
                    notification.type === 'follow_request' && notification.from ? (
                      <Avatar 
                        src={getUserAvatarUrl(notification.from)}
                        icon={<UserOutlined />}
                        size={40}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/users/${notification.from._id}`
                        }}
                      >
                        {getUserInitials(notification.from?.name || 'U')}
                      </Avatar>
                    ) : (
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        background: getNotificationColor(notification.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    )
                  }
                  title={
                    notification.type === 'follow_request' && notification.from ? (
                      // Instagram-style title for follow requests
                      <div>
                        <Text 
                          strong={!notification.read}
                          style={{ 
                            fontSize: '14px',
                            color: notification.read ? '#666' : '#333',
                            lineHeight: '1.4',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/users/${notification.from._id}`
                          }}
                        >
                          {notification.from?.name || 'Unknown User'}
                        </Text>
                        {!notification.read && (
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: '#1890ff',
                            marginLeft: '8px',
                            display: 'inline-block'
                          }} />
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text 
                          strong={!notification.read}
                          style={{ 
                            fontSize: '14px',
                            color: notification.read ? '#666' : '#333',
                            lineHeight: '1.4'
                          }}
                        >
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: '#1890ff',
                            marginLeft: '8px',
                            flexShrink: 0
                          }} />
                        )}
                      </div>
                    )
                  }
                  description={
                    <div>
                      <Text 
                        style={{ 
                          fontSize: '13px',
                          color: notification.read ? '#999' : '#666',
                          lineHeight: '1.4',
                          display: 'block',
                          marginBottom: '4px'
                        }}
                      >
                        {notification.message}
                      </Text>
                      {notification.type === 'follow_request' && notification.from?.email && (
                        <Text 
                          type="secondary" 
                          style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}
                        >
                          {notification.from.email}
                        </Text>
                      )}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '4px'
                      }}>
                        <Text style={{ fontSize: '12px', color: '#999' }}>
                          {formatDate(notification.createdAt)}
                        </Text>
                        <Tag 
                          size="small" 
                          color={getNotificationColor(notification.type)}
                          style={{ fontSize: '11px' }}
                        >
                          {notification.type.replace('_', ' ')}
                        </Tag>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">No notifications yet</Text>
              }
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications && notifications.length > 0 && (
        <div style={{ 
          padding: '12px 20px', 
          borderTop: '1px solid #f0f0f0',
          background: '#fafafa',
          borderRadius: '0 0 8px 8px',
          textAlign: 'center'
        }}>
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              onClose()
              // Navigate to full notifications page
              window.location.href = '/notifications'
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Popover
      content={popupContent}
      title={null}
      trigger="click"
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      placement="bottomRight"
      overlayStyle={{ padding: 0 }}
      styles={{ body: { padding: 0, borderRadius: '8px' } }}
    >
      <div />
    </Popover>
  )
}

export default NotificationPopup
