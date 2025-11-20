import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Menu, Drawer, Button, Space, Typography, Badge } from 'antd'
import { 
  DashboardOutlined,
  UserOutlined, 
  ShoppingCartOutlined, 
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  TeamOutlined,
  FileTextOutlined,
  MessageOutlined,
  VideoCameraOutlined,
  BellOutlined,
  DollarOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  ToolOutlined,
  EditOutlined,
  MonitorOutlined,
  BranchesOutlined,
  SoundOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  SketchOutlined,
  GlobalOutlined,
  FireOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "../contexts/AuthContextOptimized"
import NotificationBell from './NotificationBell'

const { Title } = Typography
const { Sider, Content } = Layout

const AdminLayout = ({ children }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { user, logout, forceRefreshAdminToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get current path to determine active menu item
  const getCurrentMenuKey = () => {
    const path = location.pathname
    if (path === '/admin/dashboard' || path === '/admin') return 'dashboard'
    if (path.includes('/admin/users')) return 'users'
    if (path.includes('/admin/orders')) return 'orders'
    if (path.includes('/admin/analytics')) return 'analytics'
    if (path.includes('/admin/content')) return 'content'
    if (path.includes('/admin/sessions')) return 'sessions'
    if (path.includes('/admin/chat')) return 'chat'
    if (path.includes('/admin/notifications')) return 'notifications'
    if (path.includes('/admin/settings')) return 'settings'
    if (path.includes('/admin/products')) return 'products'
    if (path.includes('/admin/prebooks')) return 'prebooks'
    if (path.includes('/admin/payments')) return 'payments'
    if (path.includes('/admin/user-activities')) return 'activities'
    return 'dashboard'
  }

  const [selectedMenu, setSelectedMenu] = useState(getCurrentMenuKey())

  // Update selected menu when route changes
  useEffect(() => {
    setSelectedMenu(getCurrentMenuKey())
  }, [location.pathname])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sidebarItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: 'products',
      icon: <ShoppingOutlined />,
      label: 'Products',
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: 'Orders & Sales',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: 'content',
      icon: <FileTextOutlined />,
      label: 'Content Management',
    },
    {
      key: 'sessions',
      icon: <VideoCameraOutlined />,
      label: 'Live Sessions',
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: 'Chat Moderation',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: 'prebooks',
      icon: <DollarOutlined />,
      label: 'Prebook Management',
    },
    {
      key: 'payments',
      icon: <DollarOutlined />,
      label: 'Payment Tracking',
    },
    {
      key: 'activities',
      icon: <MonitorOutlined />,
      label: 'User Activities',
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
        navigate('/admin/dashboard')
        break
      case 'users':
        navigate('/admin/users')
        break
      case 'products':
        navigate('/admin/products')
        break
      case 'orders':
        navigate('/admin/orders')
        break
      case 'analytics':
        navigate('/admin/analytics')
        break
      case 'content':
        navigate('/admin/content')
        break
      case 'sessions':
        navigate('/admin/sessions')
        break
      case 'chat':
        navigate('/admin/chat')
        break
      case 'notifications':
        navigate('/admin/notifications')
        break
      case 'prebooks':
        navigate('/admin/prebooks')
        break
      case 'payments':
        navigate('/admin/payments')
        break
      case 'activities':
        navigate('/admin/user-activities')
        break
      case 'settings':
        navigate('/admin/settings')
        break
      default:
        navigate('/admin/dashboard')
    }
  }

  return (
    <div style={{ 
      background: '#f5f5f5', 
      minHeight: '100vh'
    }}>
      <style>
        {`
          .ant-menu-vertical .ant-menu-item {
            color: #333 !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            padding: 12px 24px !important;
            margin: 4px 0 !important;
            border-radius: 6px !important;
            transition: all 0.3s ease !important;
            height: auto !important;
            line-height: 1.4 !important;
          }
          
          .ant-menu-vertical .ant-menu-item:hover {
            color: #1890ff !important;
            background-color: #f0f8ff !important;
          }
          
          .ant-menu-vertical .ant-menu-item-selected {
            color: #1890ff !important;
            background-color: #e6f7ff !important;
            font-weight: 600 !important;
          }
          
          .ant-menu-vertical .ant-menu-item .ant-menu-item-icon {
            color: inherit !important;
            font-size: 16px !important;
            margin-right: 12px !important;
          }
          
          .ant-menu-vertical .ant-menu-item-selected .ant-menu-item-icon {
            color: #1890ff !important;
          }
        `}
      </style>
      {/* Header */}
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
        zIndex: 1001,
        height: '80px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#1890ff', margin: 0, marginRight: '2rem' }}>
            ITWOS AI - Admin
          </Title>
        </div>
        <Space>
          <NotificationBell />
          <Button 
            type="text" 
            onClick={() => {
              const result = forceRefreshAdminToken()
              if (result.success) {
                console.log('✅ Admin token refreshed successfully')
                window.location.reload()
              } else {
                console.error('❌ Failed to refresh admin token:', result.error)
              }
            }}
            icon={<ReloadOutlined />}
            title="Refresh Admin Token"
          >
            Refresh
          </Button>
          <UserOutlined style={{ fontSize: '18px', color: '#666' }} />
          <span style={{ color: '#666' }}>{user?.name || 'Admin'}</span>
          <Button type="text" onClick={handleLogout} icon={<LogoutOutlined />}>
            Logout
          </Button>
        </Space>
        <Button 
          type="text" 
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuVisible(true)}
          style={{ display: isMobile ? 'block' : 'none' }}
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
            display: isMobile ? 'none' : 'block',
            position: 'fixed',
            left: 0,
            top: '80px',
            height: 'calc(100vh - 80px)',
            zIndex: 1000,
            overflowY: 'auto'
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
            theme="light"
          />
        </Sider>

        {/* Main Content */}
        <Content style={{ 
          padding: isMobile ? '1rem' : '2rem', 
          background: '#f5f5f5',
          minHeight: 'calc(100vh - 80px)',
          marginLeft: isMobile ? '0' : '250px',
          marginTop: '80px',
          transition: 'margin-left 0.3s ease'
        }}>
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title="Admin Navigation"
        placement="right"
        closable={true}
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        styles={{ body: { padding: 0 } }}
      >
        <style>
          {`
            .ant-drawer .ant-menu-vertical .ant-menu-item {
              color: #333 !important;
              font-size: 14px !important;
              font-weight: 500 !important;
              padding: 12px 24px !important;
              margin: 4px 0 !important;
              border-radius: 6px !important;
              transition: all 0.3s ease !important;
              height: auto !important;
              line-height: 1.4 !important;
            }
            
            .ant-drawer .ant-menu-vertical .ant-menu-item:hover {
              color: #1890ff !important;
              background-color: #f0f8ff !important;
            }
            
            .ant-drawer .ant-menu-vertical .ant-menu-item-selected {
              color: #1890ff !important;
              background-color: #e6f7ff !important;
              font-weight: 600 !important;
            }
            
            .ant-drawer .ant-menu-vertical .ant-menu-item .ant-menu-item-icon {
              color: inherit !important;
              font-size: 16px !important;
              margin-right: 12px !important;
            }
            
            .ant-drawer .ant-menu-vertical .ant-menu-item-selected .ant-menu-item-icon {
              color: #1890ff !important;
            }
          `}
        </style>
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
          theme="light"
        />
      </Drawer>
    </div>
  )
}

export default AdminLayout
