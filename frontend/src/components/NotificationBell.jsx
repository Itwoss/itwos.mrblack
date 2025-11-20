import React, { useState } from 'react'
import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'
import NotificationPopup from './NotificationPopup'

const NotificationBell = () => {
  const { user } = useAuth()
  const [notificationVisible, setNotificationVisible] = useState(false)
  const { unreadCount, fetchNotifications, notifications } = useNotifications(user?._id, user?.role)
  
  // Debug logging
  console.log('🔔 NotificationBell Debug:', {
    userId: user?._id,
    userRole: user?.role,
    unreadCount: unreadCount,
    notificationsCount: notifications?.length || 0
  })

  // Use actual unread count (no demo count)
  const displayCount = unreadCount > 0 ? unreadCount : 0

  const handleBellClick = () => {
    setNotificationVisible(true)
  }

  const handleNotificationClose = () => {
    setNotificationVisible(false)
    // Refresh notifications when closing
    fetchNotifications()
  }

  return (
    <>
      <Badge count={displayCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={handleBellClick}
          style={{
            fontSize: '18px',
            color: displayCount > 0 ? '#1890ff' : '#666'
          }}
        />
      </Badge>

      <NotificationPopup
        visible={notificationVisible}
        onClose={handleNotificationClose}
        userId={user?._id}
      />
    </>
  )
}

export default NotificationBell
