import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout as AntLayout, Menu, Button, Drawer, Typography, Space, Avatar, Dropdown, Spin } from 'antd'
import { 
  MenuOutlined, 
  HomeOutlined, 
  ShoppingCartOutlined, 
  UserOutlined, 
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContextOptimized'
import NotificationBell from './Notifications/NotificationBell'
import { getUserAvatarUrl, getUserInitials } from '../utils/avatarUtils'

const { Header, Content, Footer } = AntLayout
const { Title } = Typography

const LayoutFinal = ({ children }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, isLoading, authInitialized } = useAuth()

  // Initialize component state
  useEffect(() => {
    if (!isLoading && authInitialized) {
      setIsInitialized(true)
    }
  }, [isLoading, authInitialized])

  const menuItems = useMemo(() => [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Home</Link>,
    },
    ...(isAuthenticated ? [
      // Admin dashboard for admins only
      ...(user?.role === 'admin' ? [{
        key: '/admin/dashboard',
        icon: <SafetyCertificateOutlined />,
        label: <Link to="/admin/dashboard">Admin Dashboard</Link>,
      }] : [])
    ] : []),
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: <Link to="/chat">Chat</Link>,
    },
  ], [isAuthenticated, user?.role])

  // Don't show layout for dashboard pages (they have their own layout)
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/admin/dashboard'

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [logout, navigate])

  const userMenuItems = useMemo(() => [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ], [handleLogout])

  const isMobile = window.innerWidth < 768

  // Show loading while authentication is being checked
  if (!isInitialized || isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  // Don't render layout for dashboard pages
  if (isDashboardPage) {
    return children
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header 
        style={{ 
          background: '#fff', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            🚀 ITWOS AI
          </Title>
        </div>

        {/* Desktop Menu */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ 
              border: 'none', 
              background: 'transparent',
              minWidth: '400px'
            }}
          />
        </div>

        {/* Right Side Actions */}
        <Space size="middle">
          <Button type="text" icon={<BellOutlined />} />
          
          {isAuthenticated ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Avatar 
                style={{ 
                  backgroundColor: '#1890ff',
                  cursor: 'pointer'
                }}
                src={getUserAvatarUrl(user)}
                icon={<UserOutlined />}
              >
                {getUserInitials(user?.name)}
              </Avatar>
            </Dropdown>
          ) : (
            <Space>
              <Link to="/login">
                <Button type="primary" size="small">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="small">Register</Button>
              </Link>
            </Space>
          )}

          {/* Mobile Menu Button */}
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuVisible(true)}
            style={{ display: isMobile ? 'block' : 'none' }}
          />
        </Space>
      </Header>

      {/* Mobile Drawer */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ border: 'none' }}
        />
      </Drawer>

      {/* Main Content */}
      <Content style={{ 
        background: '#f5f5f5',
        minHeight: 'calc(100vh - 64px - 70px)'
      }}>
        {children}
      </Content>

      {/* Footer */}
      <Footer style={{ 
        textAlign: 'center', 
        background: '#001529',
        color: 'white',
        padding: '24px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <Title level={4} style={{ color: 'white', marginBottom: '16px' }}>
            🚀 ITWOS AI Platform
          </Title>
          <p style={{ margin: 0, opacity: 0.8 }}>
            © 2024 ITWOS AI. Built with React, Node.js, and MongoDB.
          </p>
        </div>
      </Footer>
    </AntLayout>
  )
}

export default LayoutFinal
