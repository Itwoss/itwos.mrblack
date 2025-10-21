import React, { useState } from 'react'
import { Layout, Menu, Button, Drawer, Space, Typography, Avatar, Dropdown, Badge } from 'antd'
import { 
  MenuOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  BellOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  MessageOutlined,
  CompassOutlined,
  TeamOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContextOptimized'
import NotificationBell from './NotificationBell'
import { getUserAvatarUrl, getUserInitials } from '../utils/avatarUtils'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const UserLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const userMenuItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: '/purchases',
      icon: <ShoppingCartOutlined />,
      label: 'Purchases',
    },
    {
      key: '/favorites',
      icon: <HeartOutlined />,
      label: 'Favorites',
    },
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: 'Chat',
    },
    {
      key: '/discover',
      icon: <CompassOutlined />,
      label: 'Discover',
    },
    {
      key: '/network',
      icon: <TeamOutlined />,
      label: 'Network',
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
    setMobileDrawerOpen(false)
  }

  const userDropdownItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout
    },
  ]

  const selectedKeys = [location.pathname]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerOpen(true)}
            style={{ display: 'block', marginRight: '16px' }}
            className="md:hidden"
          />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            ITWOS AI
          </Title>
        </div>
        
        <Space>
          <NotificationBell />
          <UserOutlined style={{ fontSize: '18px', color: '#666' }} />
          <span style={{ color: '#666' }}>{user?.name || 'User'}</span>
          <Button type="text" onClick={handleLogout} icon={<LogoutOutlined />}>
            Logout
          </Button>
        </Space>
      </Header>

      <Layout>
        {/* Desktop Sidebar */}
        <Sider
          width={280}
          style={{
            background: '#fff',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            height: 'calc(100vh - 64px)',
            overflow: 'auto'
          }}
          className="hidden md:block"
        >
          <div style={{ padding: '24px 16px' }}>
            <Title level={4} style={{ textAlign: 'center', marginBottom: '24px' }}>
              User Menu
            </Title>
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              items={userMenuItems}
              onClick={handleMenuClick}
              style={{ border: 'none' }}
            />
          </div>
        </Sider>

        {/* Mobile Drawer */}
        <Drawer
          title="User Menu"
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          width={280}
          className="md:hidden"
        >
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={userMenuItems}
            onClick={handleMenuClick}
            style={{ border: 'none' }}
          />
        </Drawer>

        {/* Main Content */}
        <Layout style={{ padding: '24px' }}>
          <Content style={{ 
            background: '#fff', 
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minHeight: 'calc(100vh - 112px)'
          }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default UserLayout
