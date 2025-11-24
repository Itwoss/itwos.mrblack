import React, { useState } from 'react'
import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'
import NotificationPopup from './NotificationPopup'
import AdminDesignSystem from '../styles/admin-design-system'

const NotificationBell = () => {
  const { user } = useAuth()
  const [notificationVisible, setNotificationVisible] = useState(false)
  const { unreadCount, fetchNotifications, notifications } = useNotifications(user?._id, user?.role)
  
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
      <Badge 
        count={displayCount} 
        size="small"
        styles={{
          indicator: {
            backgroundColor: AdminDesignSystem.colors.error,
            color: AdminDesignSystem.colors.text.white,
          }
        }}
      >
        <Button
          type="text"
          icon={<BellOutlined />}
          onClick={handleBellClick}
          style={{
            fontSize: AdminDesignSystem.typography.fontSize.h4,
            color: displayCount > 0 
              ? AdminDesignSystem.colors.primary 
              : AdminDesignSystem.colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: AdminDesignSystem.borderRadius.md,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = AdminDesignSystem.colors.sidebar.hoverBackground
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
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
