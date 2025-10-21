import React, { useEffect } from 'react'
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
  message
} from 'antd'
import { 
  BellOutlined, 
  CheckOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'

const { Title, Text } = Typography

const NotificationCenter = ({ visible, onClose, userId }) => {
  const { user } = useAuth()
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications
  } = useNotifications(userId || user?._id, user?.role)

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
      default:
        return '#1890ff'
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
    if (visible && (userId || user?._id)) {
      fetchNotifications()
    }
  }, [visible, userId, user?._id, fetchNotifications])

  return (
    <Drawer
      title={
        <Space>
          <BellOutlined />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge count={unreadCount} size="small" />
          )}
        </Space>
      }
      placement="right"
      width={400}
      onClose={onClose}
      open={visible}
      extra={
        unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )
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
          renderItem={(notification) => (
            <List.Item
              style={{
                backgroundColor: notification.read ? '#fff' : '#f6ffed',
                borderLeft: `4px solid ${getNotificationColor(notification.type)}`,
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
                    icon={getNotificationIcon(notification.type)}
                    style={{ backgroundColor: getNotificationColor(notification.type) }}
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
                      <Tag color={getNotificationColor(notification.type)} size="small">
                        {notification.type.replace('_', ' ').toUpperCase()}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatDate(notification.createdAt)}
                      </Text>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  )
}

export default NotificationCenter
