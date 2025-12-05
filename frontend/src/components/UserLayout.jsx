import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Drawer, Button, Space, Typography, message } from 'antd'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BookOutlined,
  MessageOutlined,
  SearchOutlined,
  TeamOutlined,
  HeartOutlined,
  UsergroupAddOutlined,
  AppstoreOutlined,
  PictureOutlined,
  SoundOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContextOptimized"
import NotificationBell from './NotificationBell'

const { Title } = Typography
const { Sider, Content } = Layout

const UserLayout = ({ children }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get current path to determine active menu item
  const getCurrentMenuKey = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/user/dashboard') return 'dashboard'
    if (path.includes('/profile')) return 'profile'
    if (path.includes('/feed')) return 'feed'
    if (path.includes('/products')) return 'products'
    if (path.includes('/purchases')) return 'purchases'
    if (path.includes('/prebooks')) return 'prebooks'
    if (path.includes('/favorites')) return 'favorites'
    if (path.includes('/store')) return 'store'
    if (path.includes('/banner-store')) return 'banner-store'
    if (path.includes('/banner-inventory')) return 'banner-inventory'
    if (path.includes('/chat') && !path.includes('/global-chat')) return 'chat'
    if (path.includes('/global-chat')) return 'global-chat'
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
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'feed',
      icon: <AppstoreOutlined />,
      label: 'Feed',
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
      key: 'prebooks',
      icon: <BookOutlined />,
      label: 'My Prebooks',
    },
    {
      key: 'store',
      icon: <PictureOutlined />,
      label: 'Store',
    },
    {
      key: 'audio-downloader',
      icon: <SoundOutlined />,
      label: 'Audio Downloader',
    },
    {
      key: 'banner-inventory',
      icon: <PictureOutlined />,
      label: 'My Banners',
    },
    {
      key: 'favorites',
      icon: <HeartOutlined />,
      label: 'Favorites',
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: 'Chat',
    },
    {
      key: 'global-chat',
      icon: <MessageOutlined />,
      label: 'All Chat',
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
      case 'profile':
        // Navigate to user's own profile
        if (user?._id || user?.id) {
          const userId = user._id || user.id
          console.log('Navigating to profile:', userId)
          navigate(`/profile/${userId}`)
        } else {
          console.error('No user ID available for profile navigation')
          message.error('Unable to load profile. Please try again.')
        }
        break
      case 'feed':
        navigate('/feed')
        break
      case 'products':
        navigate('/dashboard/products')
        break
      case 'purchases':
        navigate('/purchases')
        break
      case 'prebooks':
        navigate('/prebooks')
        break
      case 'favorites':
        navigate('/favorites')
        break
      case 'store':
        navigate('/dashboard/store')
        break
      case 'audio-downloader':
        navigate('/audio-downloader')
        break
      case 'banner-store':
        navigate('/dashboard/banner-store')
        break
      case 'banner-inventory':
        navigate('/dashboard/banner-inventory')
        break
      case 'chat':
        navigate('/chat')
        break
      case 'global-chat':
        navigate('/global-chat')
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
      {/* Header - Fixed */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem',
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '80px'
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
          style={{ 
            display: isMobile ? 'block' : 'none',
            position: 'absolute',
            left: '16px'
          }}
        />
      </div>

      <Layout style={{ background: '#f5f5f5' }}>
        {/* Sidebar - Always visible on desktop, hidden on mobile */}
        {!isMobile && (
          <Sider 
            width={250} 
            style={{ 
              background: '#fff', 
              borderRight: '1px solid #e8e8e8',
              padding: '2rem 0',
              position: 'fixed',
              left: 0,
              top: '80px',
              bottom: 0,
              height: 'calc(100vh - 80px)',
              overflowY: 'auto',
              zIndex: 100
            }}
            collapsible={false}
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
        )}

        {/* Main Content - Offset for fixed sidebar and header */}
        <Content style={{ 
          marginLeft: isMobile ? '0' : '250px',
          marginTop: '80px',
          padding: isMobile ? '1rem' : '2rem', 
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 80px)',
          overflow: 'visible',
          height: 'auto',
          transition: 'margin-left 0.2s ease'
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
