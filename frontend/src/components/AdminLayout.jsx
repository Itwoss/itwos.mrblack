import React, { useState, useEffect } from 'react'
import { Layout, Menu, Drawer, Button } from 'antd'
import { 
  DashboardOutlined,
  TeamOutlined, 
  ShoppingCartOutlined, 
  BarChartOutlined,
  SettingOutlined,
  MenuOutlined,
  FileTextOutlined,
  MessageOutlined,
  BellOutlined,
  DollarOutlined,
  ShoppingOutlined,
  MonitorOutlined,
  PictureOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import AdminHeader from './Admin/AdminHeader'
import AdminDesignSystem from '../styles/admin-design-system'

const { Sider, Content } = Layout

const AdminLayout = ({ children }) => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const navigate = useNavigate()
  const location = useLocation()

  // Get current path to determine active menu item
  const getCurrentMenuKey = () => {
    const path = location.pathname
    if (path === '/admin/dashboard' || path === '/admin') return 'dashboard'
    if (path.includes('/admin/management')) return 'management'
    if (path.includes('/admin/orders')) return 'orders'
    if (path.includes('/admin/analytics')) return 'analytics'
    if (path.includes('/admin/trending/settings')) return 'trending-settings'
    if (path.includes('/admin/trending')) return 'trending'
    if (path.includes('/admin/notifications')) return 'notifications'
    if (path.includes('/admin/settings')) return 'settings'
    if (path.includes('/admin/products')) return 'products'
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
      setIsMobile(window.innerWidth < parseInt(AdminDesignSystem.breakpoints.mobile))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'management',
      icon: <SettingOutlined />,
      label: 'Management',
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
      key: 'trending',
      icon: <FireOutlined />,
      label: 'Trending Analytics',
    },
    {
      key: 'trending-settings',
      icon: <SettingOutlined />,
      label: 'Trending Settings',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
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
      case 'management':
        navigate('/admin/management/users')
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
      case 'trending':
        navigate('/admin/trending')
        break
      case 'trending-settings':
        navigate('/admin/trending/settings')
        break
      case 'notifications':
        navigate('/admin/notifications')
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
    if (isMobile) {
      setMobileMenuVisible(false)
    }
  }

  return (
    <div style={{ 
      background: AdminDesignSystem.colors.background,
      minHeight: '100vh',
      fontFamily: AdminDesignSystem.typography.fontFamily,
    }}>
      {/* Custom Styles for Menu */}
      <style>
        {`
          .admin-sidebar-menu .ant-menu-item {
            color: ${AdminDesignSystem.colors.sidebar.text} !important;
            font-size: ${AdminDesignSystem.typography.fontSize.small} !important;
            font-weight: ${AdminDesignSystem.typography.fontWeight.medium} !important;
            padding: ${AdminDesignSystem.spacing.md} ${AdminDesignSystem.spacing.lg} !important;
            margin: ${AdminDesignSystem.spacing.xs} ${AdminDesignSystem.spacing.md} !important;
            border-radius: ${AdminDesignSystem.borderRadius.md} !important;
            transition: all 0.2s ease !important;
            height: auto !important;
            line-height: ${AdminDesignSystem.typography.lineHeight} !important;
          }
          
          .admin-sidebar-menu .ant-menu-item:hover {
            color: ${AdminDesignSystem.colors.primary} !important;
            background-color: ${AdminDesignSystem.colors.sidebar.hoverBackground} !important;
          }
          
          .admin-sidebar-menu .ant-menu-item-selected {
            color: ${AdminDesignSystem.colors.sidebar.activeText} !important;
            background-color: ${AdminDesignSystem.colors.sidebar.activeBackground} !important;
            font-weight: ${AdminDesignSystem.typography.fontWeight.semibold} !important;
          }
          
          .admin-sidebar-menu .ant-menu-item .ant-menu-item-icon {
            color: inherit !important;
            font-size: ${AdminDesignSystem.typography.fontSize.body} !important;
            margin-right: ${AdminDesignSystem.spacing.md} !important;
          }
          
          .admin-sidebar-menu .ant-menu-item-selected .ant-menu-item-icon {
            color: ${AdminDesignSystem.colors.sidebar.activeText} !important;
          }
        `}
      </style>

      {/* Header */}
      <AdminHeader />

      <Layout style={{ 
        background: AdminDesignSystem.colors.background,
        marginTop: AdminDesignSystem.layout.header.height,
      }}>
        {/* Sidebar */}
        <Sider 
          width={AdminDesignSystem.layout.sidebar.width}
          style={{ 
            background: AdminDesignSystem.colors.sidebar.background,
            borderRight: `1px solid ${AdminDesignSystem.colors.sidebar.border}`,
            padding: `${AdminDesignSystem.spacing.lg} 0`,
            display: isMobile ? 'none' : 'block',
            position: 'fixed',
            left: 0,
            top: AdminDesignSystem.layout.header.height,
            height: `calc(100vh - ${AdminDesignSystem.layout.header.height})`,
            zIndex: 999,
            overflowY: 'auto',
            boxShadow: AdminDesignSystem.shadows.md,
          }}
        >
          <Menu
            mode="vertical"
            items={sidebarItems}
            selectedKeys={[selectedMenu]}
            onClick={handleMenuClick}
            className="admin-sidebar-menu"
            style={{ 
              background: 'transparent', 
              border: 'none',
              padding: `0 ${AdminDesignSystem.spacing.sm}`,
            }}
            theme="light"
          />
        </Sider>

        {/* Main Content */}
        <Content style={{ 
          padding: isMobile ? AdminDesignSystem.spacing.md : AdminDesignSystem.layout.content.padding,
          background: AdminDesignSystem.colors.background,
          minHeight: `calc(100vh - ${AdminDesignSystem.layout.header.height})`,
          marginLeft: isMobile ? '0' : AdminDesignSystem.layout.sidebar.width,
          transition: 'margin-left 0.3s ease',
        }}>
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title={
          <span style={{
            fontSize: AdminDesignSystem.typography.fontSize.h4,
            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
            color: AdminDesignSystem.colors.text.primary,
          }}>
            Admin Navigation
          </span>
        }
        placement="left"
        closable={true}
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        styles={{ 
          body: { padding: 0 },
          header: {
            borderBottom: `1px solid ${AdminDesignSystem.colors.sidebar.border}`,
          }
        }}
        width={280}
      >
        <Menu
          mode="vertical"
          items={sidebarItems}
          selectedKeys={[selectedMenu]}
          onClick={handleMenuClick}
          className="admin-sidebar-menu"
          style={{ 
            background: 'transparent', 
            border: 'none',
            padding: `${AdminDesignSystem.spacing.md} ${AdminDesignSystem.spacing.sm}`,
          }}
          theme="light"
        />
      </Drawer>

      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          type="primary"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuVisible(true)}
          style={{
            position: 'fixed',
            bottom: AdminDesignSystem.spacing.lg,
            right: AdminDesignSystem.spacing.lg,
            zIndex: 1001,
            width: '56px',
            height: '56px',
            borderRadius: AdminDesignSystem.borderRadius.full,
            boxShadow: AdminDesignSystem.shadows.lg,
          }}
        />
      )}
    </div>
  )
}

export default AdminLayout
