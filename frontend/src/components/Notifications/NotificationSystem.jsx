import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BellOutlined, CheckOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons'
import { Badge, Dropdown, List, Button, Space, Typography, Tag, Avatar, message, Modal, Pagination, Empty } from 'antd'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Text, Title } = Typography

const NotificationSystem = ({ 
  showDropdown = true, 
  showFullPage = false, 
  onNotificationClick 
}) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [pageSize] = useState(10)

  // Load notifications
  const loadNotifications = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      // Simulate API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock notifications data
      const mockNotifications = [
        {
          id: 1,
          type: 'prebook_created',
          title: 'Prebooking Created',
          message: 'Your prebooking for "Advanced React Patterns" has been created successfully.',
          isRead: false,
          priority: 'normal',
          createdAt: '2024-01-20T10:30:00Z',
          data: { productId: 1, productName: 'Advanced React Patterns' }
        },
        {
          id: 2,
          type: 'prebook_confirmed',
          title: 'Prebooking Confirmed',
          message: 'Your prebooking for "Vue.js Complete Guide" has been confirmed by admin.',
          isRead: false,
          priority: 'high',
          createdAt: '2024-01-19T15:45:00Z',
          data: { productId: 2, productName: 'Vue.js Complete Guide' }
        },
        {
          id: 3,
          type: 'purchase_completed',
          title: 'Purchase Completed',
          message: 'Your purchase of "Node.js Masterclass" has been completed successfully.',
          isRead: true,
          priority: 'normal',
          createdAt: '2024-01-18T09:20:00Z',
          data: { productId: 3, productName: 'Node.js Masterclass', amount: 149.99 }
        },
        {
          id: 4,
          type: 'system',
          title: 'System Update',
          message: 'New features have been added to your dashboard. Check them out!',
          isRead: true,
          priority: 'low',
          createdAt: '2024-01-17T14:10:00Z',
          data: {}
        },
      ]

      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length)
      setTotalNotifications(mockNotifications.length)
    } catch (error) {
      console.error('Error loading notifications:', error)
      message.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      if (onNotificationClick) {
        onNotificationClick(notificationId)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      message.error('Failed to mark notification as read')
    }
  }, [onNotificationClick])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      )
      
      setUnreadCount(0)
      message.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      message.error('Failed to mark all notifications as read')
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setTotalNotifications(prev => prev - 1)
      message.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      message.error('Failed to delete notification')
    }
  }, [])

  // Get notification icon based on type
  const getNotificationIcon = useCallback((type) => {
    const iconMap = {
      prebook_created: '📝',
      prebook_confirmed: '✅',
      purchase_completed: '💰',
      system: '🔧'
    }
    return iconMap[type] || '🔔'
  }, [])

  // Get priority color
  const getPriorityColor = useCallback((priority) => {
    const colorMap = {
      low: 'default',
      normal: 'blue',
      high: 'orange',
      urgent: 'red'
    }
    return colorMap[priority] || 'default'
  }, [])

  // Load notifications on mount
  useEffect(() => {
    if (user) {
      loadNotifications(currentPage)
    }
  }, [user, currentPage, loadNotifications])

  // Notification dropdown items
  const notificationItems = useMemo(() => [
    {
      key: 'mark-all-read',
      label: 'Mark All as Read',
      icon: <CheckOutlined />,
      onClick: markAllAsRead,
      disabled: unreadCount === 0
    },
    {
      type: 'divider'
    },
    ...notifications.slice(0, 5).map(notification => ({
      key: notification.id,
      label: (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>
              {getNotificationIcon(notification.type)}
            </span>
            <Text strong={!notification.isRead} style={{ fontSize: '14px' }}>
              {notification.title}
            </Text>
            {!notification.isRead && <Badge status="processing" />}
          </div>
          <Text style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
            {notification.message}
          </Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <Tag color={getPriorityColor(notification.priority)} size="small">
              {notification.priority}
            </Tag>
            <Text style={{ fontSize: '11px', color: '#999' }}>
              {new Date(notification.createdAt).toLocaleDateString()}
            </Text>
          </div>
        </div>
      ),
      onClick: () => markAsRead(notification.id)
    }))
  ], [notifications, unreadCount, markAllAsRead, markAsRead, getNotificationIcon, getPriorityColor])

  // Full page notification list
  const renderFullPageNotifications = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <Title level={3} style={{ margin: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: '8px' }} />
          )}
        </Title>
        <Space>
          <Button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            icon={<CheckOutlined />}
          >
            Mark All Read
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text>Loading notifications...</Text>
        </div>
      ) : notifications.length > 0 ? (
        <List
          dataSource={notifications}
          renderItem={notification => (
            <List.Item
              style={{
                background: notification.isRead ? '#fff' : '#f0f8ff',
                border: notification.isRead ? '1px solid #f0f0f0' : '1px solid #1890ff',
                borderRadius: '8px',
                marginBottom: '8px',
                padding: '16px'
              }}
              actions={[
                <Button
                  key="read"
                  type="text"
                  icon={<CheckOutlined />}
                  onClick={() => markAsRead(notification.id)}
                  disabled={notification.isRead}
                >
                  {notification.isRead ? 'Read' : 'Mark Read'}
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteNotification(notification.id)}
                >
                  Delete
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar 
                    style={{ 
                      backgroundColor: notification.isRead ? '#f0f0f0' : '#1890ff',
                      fontSize: '18px'
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong={!notification.isRead} style={{ fontSize: '16px' }}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && <Badge status="processing" />}
                    <Tag color={getPriorityColor(notification.priority)} size="small">
                      {notification.priority}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <Text style={{ fontSize: '14px', color: '#666' }}>
                      {notification.message}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text style={{ fontSize: '12px', color: '#999' }}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No notifications" />
      )}

      {totalNotifications > pageSize && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Pagination
            current={currentPage}
            total={totalNotifications}
            pageSize={pageSize}
            onChange={setCurrentPage}
            showSizeChanger={false}
            showQuickJumper
          />
        </div>
      )}
    </div>
  )

  // Notification bell dropdown
  const renderNotificationBell = () => (
    <Dropdown
      menu={{ items: notificationItems }}
      placement="bottomRight"
      trigger={['click']}
      overlayStyle={{ maxWidth: '400px' }}
    >
      <Button 
        type="text" 
        icon={<BellOutlined />}
        style={{ fontSize: '18px' }}
      >
        {unreadCount > 0 && (
          <Badge 
            count={unreadCount} 
            size="small"
            style={{ 
              position: 'absolute',
              top: '-2px',
              right: '-2px'
            }}
          />
        )}
      </Button>
    </Dropdown>
  )

  if (showFullPage) {
    return renderFullPageNotifications()
  }

  return showDropdown ? renderNotificationBell() : null
}

export default NotificationSystem

