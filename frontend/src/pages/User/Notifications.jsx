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
  Col
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
  CloseOutlined,
  HeartOutlined,
  CommentOutlined
} from '@ant-design/icons'
import useNotifications from '../../hooks/useNotifications'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { notificationsAPI, followAPI } from '../../services/api'
import api from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Title, Text } = Typography

const Notifications = () => {
  const { user } = useAuth()
  
  if (!user) {
    return (
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        background: '#f5f7fa',
        minHeight: '100vh'
      }}>
        <Title level={2} style={{ color: '#1e293b', fontSize: '18px' }}>
          Please log in to view notifications
        </Title>
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
        await markAsRead(notification._id)
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
        await markAsRead(notification._id)
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
          color: '#22c55e',
          bgColor: '#f0fdf4'
        }
      case 'prebook_confirmed':
        return {
          icon: <CheckCircleOutlined />,
          color: '#22c55e',
          bgColor: '#f0fdf4'
        }
      case 'prebook_rejected':
        return {
          icon: <CloseCircleOutlined />,
          color: '#ef4444',
          bgColor: '#fef2f2'
        }
      case 'prebook_status_update':
        return {
          icon: <InfoCircleOutlined />,
          color: '#3b82f6',
          bgColor: '#eff6ff'
        }
      case 'follow_request':
        return {
          icon: <UserAddOutlined />,
          color: '#3b82f6',
          bgColor: '#eff6ff'
        }
      case 'follow':
        return {
          icon: <UserOutlined />,
          color: '#22c55e',
          bgColor: '#f0fdf4'
        }
      case 'follow_accepted':
        return {
          icon: <CheckCircleOutlined />,
          color: '#22c55e',
          bgColor: '#f0fdf4'
        }
      case 'like':
        return {
          icon: <HeartOutlined />,
          color: '#ec4899',
          bgColor: '#fdf2f8'
        }
      case 'comment':
        return {
          icon: <CommentOutlined />,
          color: '#3b82f6',
          bgColor: '#eff6ff'
        }
      case 'comment_like':
        return {
          icon: <HeartOutlined />,
          color: '#ec4899',
          bgColor: '#fdf2f8'
        }
      default:
        return {
          icon: <BellOutlined />,
          color: '#64748b',
          bgColor: '#f8fafc'
        }
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

  // Get notification statistics
  const getNotificationStats = () => {
    return {
      total: notifications.length,
      unread: unreadCount,
      paymentSuccess: notifications.filter(n => n.type === 'payment_success').length,
      prebookConfirmed: notifications.filter(n => n.type === 'prebook_confirmed').length,
      followRequests: notifications.filter(n => n.type === 'follow_request').length,
      likes: notifications.filter(n => n.type === 'like' || n.type === 'comment_like').length
    }
  }

  const stats = getNotificationStats()

  return (
    <div style={{ 
      background: '#f5f7fa', 
      minHeight: '100vh',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellOutlined style={{ fontSize: '18px', color: '#1e293b' }} />
            <Title level={2} style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600,
              color: '#1e293b'
            }}>
              Notifications
            </Title>
            {unreadCount > 0 && (
              <Badge count={unreadCount} size="small" style={{ backgroundColor: '#ef4444' }} />
            )}
          </div>
          <Space size="small">
            {unreadCount > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={markAllAsRead}
                style={{ fontSize: '12px', padding: 0, height: 'auto' }}
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
              style={{ fontSize: '12px', padding: 0, height: 'auto' }}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      {/* Notification Statistics */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col xs={6} sm={6} md={4}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BellOutlined style={{ color: '#64748b', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Total
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.total}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Badge dot style={{ backgroundColor: '#ef4444' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Unread
                </Text>
                <Text style={{ 
                  color: stats.unread > 0 ? '#ef4444' : '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.unread}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarOutlined style={{ color: '#22c55e', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Payments
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.paymentSuccess}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={6} sm={6} md={4}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#fdf2f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <HeartOutlined style={{ color: '#ec4899', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Likes
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.likes}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Notifications List */}
      <Card 
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Spin size="small" />
            <div style={{ marginTop: '12px' }}>
              <Text style={{ fontSize: '12px', color: '#64748b' }}>
                {error ? error : 'Loading notifications...'}
              </Text>
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Text style={{ fontSize: '13px', color: '#ef4444', display: 'block', marginBottom: '12px' }}>
              {error}
            </Text>
            <Button 
              size="small"
              onClick={fetchNotifications}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                height: '28px',
                padding: '0 16px'
              }}
            >
              Try Again
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            description={
              <Text style={{ fontSize: '13px', color: '#64748b' }}>
                No notifications yet
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '32px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => {
              const style = getNotificationStyle(notification.type)
              return (
                <div
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!notification.read) {
                      try {
                        const notificationId = notification._id || notification.id
                        if (!notificationId) return
                        await markAsRead(notificationId)
                        setTimeout(() => fetchNotifications(), 500)
                      } catch (error) {
                        console.error('Error marking notification as read:', error)
                      }
                    }
                  }}
                  style={{
                    background: notification.read ? '#fff' : style.bgColor,
                    border: `1px solid ${notification.read ? '#e2e8f0' : style.color}`,
                    borderLeft: `3px solid ${style.color}`,
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: notification.read ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Avatar/Icon */}
                    <div>
                      {notification.type === 'follow_request' && notification.from ? (
                        <Avatar 
                          src={getUserAvatarUrl(notification.from)}
                          icon={<UserOutlined />}
                          size={48}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/profile/${notification.from._id}`
                          }}
                        >
                          {getUserInitials(notification.from?.name || 'U')}
                        </Avatar>
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '6px',
                          background: style.bgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ color: style.color, fontSize: '20px' }}>
                            {style.icon}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {notification.type === 'follow_request' && notification.from ? (
                          <Text 
                            strong={!notification.read}
                            style={{ 
                              fontSize: '13px', 
                              fontWeight: !notification.read ? 600 : 500,
                              color: '#1e293b',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/profile/${notification.from._id}`
                            }}
                          >
                            {notification.from?.name || 'Unknown User'}
                          </Text>
                        ) : (
                          <Text 
                            strong={!notification.read}
                            style={{ 
                              fontSize: '13px', 
                              fontWeight: !notification.read ? 600 : 500,
                              color: '#1e293b'
                            }}
                          >
                            {notification.title}
                          </Text>
                        )}
                        {!notification.read && (
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            flexShrink: 0
                          }} />
                        )}
                      </div>

                      {/* Message */}
                      <Text style={{ 
                        fontSize: '12px', 
                        color: '#64748b',
                        display: 'block',
                        marginBottom: '6px',
                        lineHeight: '1.4'
                      }}>
                        {notification.message}
                      </Text>

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <Tag 
                            color={style.color} 
                            style={{ 
                              margin: 0, 
                              fontSize: '10px', 
                              padding: '2px 6px',
                              border: 'none',
                              background: style.bgColor,
                              color: style.color
                            }}
                          >
                            {notification.type.replace('_', ' ')}
                          </Tag>
                          <Text style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {formatDate(notification.createdAt)}
                          </Text>
                        </div>

                        {/* Actions */}
                        <div>
                          {notification.type === 'follow_request' ? (
                            <Space size="small">
                              <Button 
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAcceptFollowRequest(notification)
                                }}
                                style={{
                                  background: '#22c55e',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  height: '24px',
                                  padding: '0 10px'
                                }}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeclineFollowRequest(notification)
                                }}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  height: '24px',
                                  padding: '0 10px'
                                }}
                              >
                                Decline
                              </Button>
                            </Space>
                          ) : !notification.read && (
                            <Button 
                              type="text"
                              size="small" 
                              icon={<CheckOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification._id)
                              }}
                              style={{ 
                                fontSize: '11px',
                                height: '24px',
                                padding: '0 8px'
                              }}
                            >
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default Notifications
