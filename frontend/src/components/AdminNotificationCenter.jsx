import React, {useEffect} from 'react'
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
  Statistic
} from 'antd'
import { 
  BellOutlined, 
  CheckOutlined,
  DollarOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'

const { Title, Text } = Typography

const AdminNotificationCenter = () => {
  const { user, isAuthenticated } = useAuth()
  
  // Debug logging
  console.log('🔔 AdminNotificationCenter Debug:', {
    user: user,
    userId: user?._id,
    userRole: user?.role,
    isAuthenticated: isAuthenticated
  })
  
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications 
  } = useNotifications(
    isAuthenticated && user?._id ? user._id : null, 
    user?.role || 'admin'
  )
  
  // Debug notifications data
  console.log('🔔 Notifications Debug:', {
    notifications: notifications,
    unreadCount: unreadCount,
    loading: loading,
    error: error
  })

  // Get notification icon and color
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'prebook_payment':
        return {
          icon: <DollarOutlined />,
          color: '#1890ff',
          bgColor: '#e6f7ff'
        }
      case 'admin_action':
        return {
          icon: <UserOutlined />,
          color: '#52c41a',
          bgColor: '#f6ffed'
        }
      case 'system_announcement':
        return {
          icon: <InfoCircleOutlined />,
          color: '#fa8c16',
          bgColor: '#fff7e6'
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

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      {/* Notification Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '1rem' }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Notifications"
              value={notifications.length}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Unread"
              value={unreadCount}
              valueStyle={{ color: unreadCount > 0 ? '#f5222d' : '#666' }}
              prefix={<Badge dot color="#f5222d" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Prebook Payments"
              value={notifications.filter(n => n.type === 'prebook_payment').length}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Notifications List */}
      <Card 
        title={
          <Space>
            <BellOutlined />
            <span>Admin Notifications</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} size="small" />
            )}
          </Space>
        }
        extra={
          <Button 
            type="link" 
            size="small" 
            onClick={fetchNotifications}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
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
                  actions={[
                    !notification.read && (
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => markAsRead(notification._id)}
                      >
                        Mark read
                      </Button>
                    )
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={style.icon}
                        style={{ backgroundColor: style.color }}
                      />
                    }
                    title={
                      <Space>
                        <Text strong={!notification.read}>
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <Badge dot color="#f5222d" />
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text>{notification.message}</Text>
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
                            {notification.data.requesterName && (
                              <Text type="secondary">
                                User: {notification.data.requesterName}
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

export default AdminNotificationCenter
