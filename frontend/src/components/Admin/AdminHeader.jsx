import React, { useState } from 'react'
import { Layout, Input, Avatar, Dropdown, Space, Badge, Button, Typography } from 'antd'
import { 
  SearchOutlined, 
  BellOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContextOptimized'
import NotificationBell from '../NotificationBell'
import AdminDesignSystem from '../../styles/admin-design-system'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Header } = Layout
const { Text } = Typography
const { Search } = Input

const AdminHeader = ({ onSearch }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (value) => {
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/admin/settings')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/admin/settings')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout
    }
  ]

  return (
    <Header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: AdminDesignSystem.layout.header.height,
        background: AdminDesignSystem.colors.header.background,
        borderBottom: `1px solid ${AdminDesignSystem.colors.header.border}`,
        boxShadow: AdminDesignSystem.shadows.md,
        zIndex: 1000,
        padding: `0 ${AdminDesignSystem.spacing.lg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left Section - Logo/Brand */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Text
          strong
          style={{
            fontSize: AdminDesignSystem.typography.fontSize.h3,
            color: AdminDesignSystem.colors.primary,
            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
            margin: 0,
          }}
        >
          ITWOS AI Admin
        </Text>
      </div>

      {/* Center Section - Search */}
      <div style={{ flex: 1, maxWidth: '500px', margin: `0 ${AdminDesignSystem.spacing.lg}` }}>
        <Search
          placeholder="Search users, products, orders..."
          allowClear
          onSearch={handleSearch}
          onChange={(e) => setSearchValue(e.target.value)}
          value={searchValue}
          style={{
            width: '100%',
          }}
          prefix={<SearchOutlined style={{ color: AdminDesignSystem.colors.text.secondary }} />}
        />
      </div>

      {/* Right Section - Notifications & User */}
      <Space size="large" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space
            style={{
              cursor: 'pointer',
              padding: `${AdminDesignSystem.spacing.sm} ${AdminDesignSystem.spacing.md}`,
              borderRadius: AdminDesignSystem.borderRadius.md,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = AdminDesignSystem.colors.sidebar.hoverBackground
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Avatar
              src={getUserAvatarUrl(user)}
              icon={!user?.avatarUrl && <UserOutlined />}
              style={{
                backgroundColor: AdminDesignSystem.colors.primary,
              }}
            >
              {!user?.avatarUrl && getUserInitials(user)}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text
                strong
                style={{
                  fontSize: AdminDesignSystem.typography.fontSize.small,
                  color: AdminDesignSystem.colors.text.primary,
                  lineHeight: 1.2,
                }}
              >
                {user?.name || 'Admin'}
              </Text>
              <Text
                style={{
                  fontSize: AdminDesignSystem.typography.fontSize.tiny,
                  color: AdminDesignSystem.colors.text.secondary,
                  lineHeight: 1.2,
                }}
              >
                {user?.role || 'admin'}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}

export default AdminHeader

