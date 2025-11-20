import React, { useState } from 'react'
import { 
  Card, 
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
  Row,
  Col,
  Statistic,
  Divider
} from 'antd'
import { 
  BellOutlined, 
  CheckOutlined, 
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  UserAddOutlined,
  UserOutlined,
  CloseOutlined
} from '@ant-design/icons'
import useNotifications from '../../hooks/useNotifications'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { notificationsAPI, followAPI } from '../../services/api'
import api from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Title, Text } = Typography

const Notifications = () => {
  const { user } = useAuth()
  
  // Only render if user is authenticated
  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Title level={2}>Please log in to view notifications</Title>
      </div>
    )
  }

  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications 
  } = useNotifications(user._id, user.role)

  // Handle accept follow request
  const handleAcceptFollowRequest = async (notification) => {
    try {
      const followId = notification.data?.followId || notification.metadata?.followId
      const requesterId = notification.from?._id || notification.from
      
      if (!requesterId) {
        message.error('Invalid follow request')
        return
      }

      console.log('Accepting follow request:', { followId, requesterId, notification })

      // Try using followId first, then fallback to userId
      let response
      if (followId) {
        // Use followId endpoint if available
        try {
          response = await api.post(`/follow/accept/${followId}`)
        } catch (err) {
          // Fallback to userId endpoint
          response = await followAPI.acceptFollowRequest(requesterId)
        }
      } else {
        // Use userId endpoint
        response = await followAPI.acceptFollowRequest(requesterId)
      }

      if (response.data.success) {
        message.success('Follow request accepted')
        // Mark notification as read
        await markAsRead(notification._id)
        // Refresh notifications
        setTimeout(() => fetchNotifications(), 500)
      } else {
        message.error(response.data.message || 'Failed to accept follow request')
      }
    } catch (error) {
      console.error('Accept follow request error:', error)
      message.error(error.response?.data?.message || 'Failed to accept follow request')
    }
  }

  // Handle decline follow request
  const handleDeclineFollowRequest = async (notification) => {
    try {
      const followId = notification.data?.followId || notification.metadata?.followId
      const requesterId = notification.from?._id || notification.from
      
      if (!requesterId) {
        message.error('Invalid follow request')
        return
      }

      console.log('Declining follow request:', { followId, requesterId, notification })

      // Try using followId first, then fallback to userId
      let response
      if (followId) {
        // Use followId endpoint if available
        try {
          response = await api.post(`/follow/decline/${followId}`)
        } catch (err) {
          // Fallback to userId endpoint
          response = await followAPI.declineFollowRequest(requesterId)
        }
      } else {
        // Use userId endpoint
        response = await followAPI.declineFollowRequest(requesterId)
      }

      if (response.data.success) {
        message.success('Follow request declined')
        // Mark notification as read
        await markAsRead(notification._id)
        // Refresh notifications
        setTimeout(() => fetchNotifications(), 500)
      } else {
        message.error(response.data.message || 'Failed to decline follow request')
      }
    } catch (error) {
      console.error('Decline follow request error:', error)
      message.error(error.response?.data?.message || 'Failed to decline follow request')
    }
  }

  // Get notification icon and color
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'payment_success':
        return {
          icon: <DollarOutlined />,
          color: '#52c41a',
          bgColor: '#f6ffed'
        }
      case 'prebook_confirmed':
        return {
          icon: <CheckCircleOutlined />,
          color: '#52c41a',
          bgColor: '#f6ffed'
        }
      case 'prebook_rejected':
        return {
          icon: <CloseCircleOutlined />,
          color: '#f5222d',
          bgColor: '#fff2f0'
        }
      case 'prebook_status_update':
        return {
          icon: <InfoCircleOutlined />,
          color: '#1890ff',
          bgColor: '#e6f7ff'
        }
      case 'follow_request':
        return {
          icon: <UserAddOutlined />,
          color: '#1890ff',
          bgColor: '#e6f7ff'
        }
      case 'follow':
        return {
          icon: <UserOutlined />,
          color: '#52c41a',
          bgColor: '#f6ffed'
        }
      case 'follow_accepted':
        return {
          icon: <CheckCircleOutlined />,
          color: '#52c41a',
          bgColor: '#f6ffed'
        }
      default:
        return {
          icon: <BellOutlined />,
          color: '#666',
          bgColor: '#f5f5f5'
        }
    }
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Get notification statistics
  const getNotificationStats = () => {
    const stats = {
      total: notifications.length,
      unread: unreadCount,
      paymentSuccess: notifications.filter(n => n.type === 'payment_success').length,
      prebookConfirmed: notifications.filter(n => n.type === 'prebook_confirmed').length,
      prebookRejected: notifications.filter(n => n.type === 'prebook_rejected').length,
      followRequests: notifications.filter(n => n.type === 'follow_request').length,
      follows: notifications.filter(n => n.type === 'follow').length,
      followAccepted: notifications.filter(n => n.type === 'follow_accepted').length
    }
    return stats
  }

  const stats = getNotificationStats()

  return (
    <div style={{ padding: '2rem' }}>
      <Title level={2}>
            <BellOutlined style={{ marginRight: '8px' }} />
            Notifications
          </Title>

      {/* Notification Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
          <Card size="small">
              <Statistic
                title="Total Notifications"
              value={stats.total}
              prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
          <Card size="small">
              <Statistic
                title="Unread"
              value={stats.unread}
              valueStyle={{ color: stats.unread > 0 ? '#f5222d' : '#666' }}
              prefix={<Badge dot color="#f5222d" />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
          <Card size="small">
              <Statistic
              title="Payment Success"
              value={stats.paymentSuccess}
              prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
          <Card size="small">
              <Statistic
              title="Prebook Confirmed"
              value={stats.prebookConfirmed}
              prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

          {/* Notifications List */}
            <Card 
        title={
          <Space>
            <BellOutlined />
            <span>Your Notifications</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} size="small" />
            )}
          </Space>
        }
              extra={
                <Space>
            {unreadCount > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={markAllAsRead}
              >
                Mark all read
                  </Button>
            )}
            <Button 
              type="link" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={fetchNotifications}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              type="link" 
              size="small"
              onClick={async () => {
                try {
                  await notificationsAPI.createTest({
                    type: 'general',
                    title: 'Test Notification',
                    message: 'This is a test notification to verify the system is working!'
                  })
                  message.success('Test notification created! Refreshing...')
                  setTimeout(() => fetchNotifications(), 1000)
                } catch (err) {
                  message.error('Failed to create test notification')
                }
              }}
            >
              Create Test
            </Button>
                </Space>
              }
            >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
            <div style={{ marginTop: '1rem' }}>
              {error ? (
                <>
                  <Text type="danger">{error}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                    Please wait while we fetch your notifications...
                  </Text>
                </>
              ) : (
                'Loading notifications...'
              )}
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text type="danger">{error}</Text>
            <br />
            <Button onClick={fetchNotifications} style={{ marginTop: '1rem' }}>
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
                <Empty
            description="No notifications yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  dataSource={notifications}
            renderItem={(notification) => {
              const style = getNotificationStyle(notification.type)
              return (
                    <List.Item
                      style={{
                    backgroundColor: notification.read ? '#fff' : style.bgColor,
                    borderLeft: `4px solid ${style.color}`,
                    padding: '12px 16px',
                    marginBottom: '8px',
                    borderRadius: '6px'
                      }}
                      actions={
                        notification.type === 'follow_request' ? [
                          // Accept and Decline buttons for follow requests
                          <Space key="actions" size="small">
                            <Button 
                              type="primary"
                              size="small"
                              icon={<CheckOutlined />}
                              onClick={() => handleAcceptFollowRequest(notification)}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="small"
                              icon={<CloseOutlined />}
                              onClick={() => handleDeclineFollowRequest(notification)}
                            >
                              Decline
                            </Button>
                          </Space>
                        ] : [
                          // Mark as read for other notifications
                          !notification.read && (
                            <Button 
                              key="mark-read"
                              type="text"
                              size="small" 
                              icon={<CheckOutlined />}
                              onClick={() => markAsRead(notification._id)}
                            >
                              Mark read
                            </Button>
                          )
                        ]
                      }
                    >
                      <List.Item.Meta
                        avatar={
                          // Show requester's avatar for follow requests (Instagram style)
                          notification.type === 'follow_request' && notification.from ? (
                            <Avatar 
                              src={getUserAvatarUrl(notification.from)}
                              icon={<UserOutlined />}
                              size={64}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                // Navigate to user profile
                                window.location.href = `/users/${notification.from._id}`
                              }}
                            >
                              {getUserInitials(notification.from?.name || 'U')}
                            </Avatar>
                          ) : (
                            <Avatar 
                              icon={style.icon}
                              style={{ backgroundColor: style.color }}
                              size={48}
                            />
                          )
                        }
                        title={
                          notification.type === 'follow_request' && notification.from ? (
                            // Instagram-style title for follow requests
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                              <Space>
                                <Text 
                                  strong={!notification.read}
                                  style={{ fontSize: '14px', cursor: 'pointer' }}
                                  onClick={() => {
                                    window.location.href = `/users/${notification.from._id}`
                                  }}
                                >
                                  {notification.from?.name || 'Unknown User'}
                                </Text>
                                {!notification.read && (
                                  <Badge dot color="#f5222d" />
                                )}
                              </Space>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {notification.from?.email || notification.from?.username || ''}
                              </Text>
                            </Space>
                          ) : (
                            <Space>
                              <Text strong={!notification.read}>
                                {notification.title}
                              </Text>
                              {!notification.read && (
                                <Badge dot color="#f5222d" />
                              )}
                            </Space>
                          )
                        }
                        description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {/* Message for follow requests */}
                        {notification.type === 'follow_request' ? (
                          <div style={{ marginTop: '8px' }}>
                            <Text style={{ fontSize: '14px' }}>
                              {notification.message || 'wants to follow you'}
                            </Text>
                          </div>
                        ) : (
                          <Text>{notification.message}</Text>
                        )}
                        
                        {/* Show requester info for other notification types */}
                        {notification.type !== 'follow_request' && notification.from && (
                          <div style={{ 
                            padding: '8px', 
                            background: '#f5f5f5', 
                            borderRadius: '6px',
                            marginTop: '4px'
                          }}>
                            <Space>
                              <Avatar 
                                size="small"
                                src={getUserAvatarUrl(notification.from)}
                                icon={<UserOutlined />}
                              >
                                {getUserInitials(notification.from?.name || 'U')}
                              </Avatar>
                              <div>
                                <Text strong style={{ fontSize: '13px', display: 'block' }}>
                                  {notification.from?.name || 'Unknown User'}
                                </Text>
                                {notification.from?.email && (
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {notification.from.email}
                                  </Text>
                                )}
                              </div>
                            </Space>
                          </div>
                        )}
                        
                        <Space>
                          <Tag color={style.color} size="small">
                            {notification.type.replace('_', ' ').toUpperCase()}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatDate(notification.createdAt)}
                          </Text>
                        </Space>
                        {notification.data && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {notification.data.productTitle && (
                              <Text type="secondary">
                                Product: {notification.data.productTitle}
                              </Text>
                            )}
                            {notification.data.amount && (
                              <Text type="secondary">
                                Amount: ₹{notification.data.amount}
                              </Text>
                            )}
                          </div>
                        )}
                      </Space>
                        }
                      />
                    </List.Item>
              )
            }}
                />
              )}
            </Card>
      </div>
  )
}

export default Notifications