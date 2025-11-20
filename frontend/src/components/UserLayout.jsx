import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Drawer, Button, Space, Typography } from 'antd'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BookOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  SearchOutlined,
  TeamOutlined,
  HeartOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContextOptimized"
import NotificationBell from './NotificationBell'

const { Title } = Typography
const { Sider, Content } = Layout

const UserLayout = ({ children }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get current path to determine active menu item
  const getCurrentMenuKey = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/user/dashboard') return 'dashboard'
    if (path.includes('/products')) return 'products'
    if (path.includes('/purchases')) return 'purchases'
    if (path.includes('/favorites')) return 'favorites'
    if (path.includes('/courses')) return 'courses'
    if (path.includes('/sessions')) return 'sessions'
    if (path.includes('/chat')) return 'chat'
    if (path.includes('/discover')) return 'discover'
    if (path.includes('/new-users')) return 'new-users'
    if (path.includes('/network')) return 'network'
    if (path.includes('/notifications')) return 'notifications'
    if (path.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const [selectedMenu, setSelectedMenu] = useState(getCurrentMenuKey())

  // Update selected menu when route changes
  useEffect(() => {
    setSelectedMenu(getCurrentMenuKey())
  }, [location.pathname])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sidebarItems = [
    {
      key: 'dashboard',
      icon: <UserOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'products',
      icon: <ShoppingCartOutlined />,
      label: 'Products',
    },
    {
      key: 'purchases',
      icon: <ShoppingCartOutlined />,
      label: 'My Purchases',
    },
    {
      key: 'favorites',
      icon: <HeartOutlined />,
      label: 'Favorites',
    },
    {
      key: 'courses',
      icon: <BookOutlined />,
      label: 'My Courses',
    },
    {
      key: 'sessions',
      icon: <VideoCameraOutlined />,
      label: 'Live Sessions',
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: 'Chat',
    },
    {
      key: 'discover',
      icon: <SearchOutlined />,
      label: 'Discover Users',
    },
    {
      key: 'new-users',
      icon: <UsergroupAddOutlined />,
      label: 'New Users',
    },
    {
      key: 'network',
      icon: <TeamOutlined />,
      label: 'My Network',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ]

  const handleMenuClick = ({ key }) => {
    setSelectedMenu(key)
    switch (key) {
      case 'dashboard':
        navigate('/dashboard')
        break
      case 'products':
        navigate('/products')
        break
      case 'purchases':
        navigate('/purchases')
        break
      case 'favorites':
        navigate('/favorites')
        break
      case 'courses':
        navigate('/user/courses')
        break
      case 'sessions':
        navigate('/user/sessions')
        break
      case 'chat':
        navigate('/chat')
        break
      case 'discover':
        navigate('/discover')
        break
      case 'new-users':
        navigate('/new-users')
        break
      case 'network':
        navigate('/network')
        break
      case 'notifications':
        navigate('/notifications')
        break
      case 'settings':
        navigate('/settings')
        break
      default:
        navigate('/dashboard')
    }
  }

  return (
    <div style={{ 
      background: '#f5f5f5', 
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem',
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#1890ff', margin: 0, marginRight: '2rem' }}>
            ITWOS AI
          </Title>
        </div>
        <Space>
          <NotificationBell />
          <UserOutlined style={{ fontSize: '18px', color: '#666' }} />
          <span style={{ color: '#666' }}>{user?.name || 'user123'}</span>
          <Button type="text" onClick={handleLogout} icon={<LogoutOutlined />}>
            Logout
          </Button>
        </Space>
        <Button 
          type="text" 
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuVisible(true)}
          style={{ display: window.innerWidth < 768 ? 'block' : 'none' }}
        />
      </div>

      <Layout style={{ background: '#f5f5f5' }}>
        {/* Sidebar */}
        <Sider 
          width={250} 
          style={{ 
            background: '#fff', 
            borderRight: '1px solid #e8e8e8',
            padding: '2rem 0',
            display: window.innerWidth < 768 ? 'none' : 'block'
          }}
        >
          <Menu
            mode="vertical"
            items={sidebarItems}
            selectedKeys={[selectedMenu]}
            onClick={handleMenuClick}
            style={{ 
              background: 'transparent', 
              border: 'none'
            }}
          />
        </Sider>

        {/* Main Content */}
        <Content style={{ 
          padding: window.innerWidth < 768 ? '1rem' : '2rem', 
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 80px)',
          overflow: 'visible',
          height: 'auto'
        }}>
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title="Navigation"
        placement="right"
        closable={true}
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="vertical"
          items={sidebarItems}
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => {
            handleMenuClick({ key })
            setMobileMenuVisible(false)
          }}
          style={{ 
            background: 'transparent', 
            border: 'none'
          }}
        />
      </Drawer>
    </div>
  )
}

export default UserLayout
