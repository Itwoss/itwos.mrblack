import React, { useState } from 'react'
import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContextOptimized'
import useNotifications from '../hooks/useNotifications'
import NotificationPopup from './NotificationPopup'
import AdminDesignSystem from '../styles/admin-design-system'

const NotificationBell = () => {
  const { user, isAuthenticated } = useAuth()
  const [notificationVisible, setNotificationVisible] = useState(false)
  
  // Get admin user from localStorage if user object doesn't have role
  const adminUserStr = localStorage.getItem('adminUser')
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null
  
  // Determine user role - prioritize user.role, then check adminUser, then check localStorage
  const userRole = user?.role || adminUser?.role || (adminUserStr ? 'admin' : 'user')
  
  // Get userId - try user._id first, then user.id, then adminUser._id
  const userId = (isAuthenticated && user?._id) 
    ? user._id 
    : (isAuthenticated && user?.id) 
      ? user.id 
      : (adminUser?._id || adminUser?.id) || null
  
  console.log('🔔 NotificationBell Debug:', {
    userId,
    userRole,
    isAuthenticated,
    userFromAuth: user,
    adminUserFromStorage: adminUser,
    hasAdminUser: !!adminUserStr,
    finalUserRole: userRole,
    finalUserId: userId
  })
  
  const { unreadCount, fetchNotifications, notifications } = useNotifications(userId, userRole)
  
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
