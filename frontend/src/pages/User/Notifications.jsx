import React from 'react'
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
  ReloadOutlined
} from '@ant-design/icons'
import useNotifications from '../../hooks/useNotifications'
import { useAuth } from '../../contexts/AuthContextOptimized'

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
      prebookRejected: notifications.filter(n => n.type === 'prebook_rejected').length
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
                </Space>
              }
            >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spin size="large" />
            <div style={{ marginTop: '1rem' }}>Loading notifications...</div>
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