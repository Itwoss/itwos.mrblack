import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Drawer } from 'antd'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  MessageOutlined, 
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BellOutlined,
  HomeOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BarChartOutlined,
  CustomerServiceOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContextOptimized'
import NotificationBell from '../Notifications/NotificationBell'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import '../../styles/mobile-layout.css'

const { Header, Sider, Content } = Layout

const LayoutWrapper = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Safely get auth context
  let authContext = null
  try {
    authContext = useAuth()
  } catch (error) {
    console.error('LayoutWrapper: useAuth error:', error)
    // Return a fallback layout without auth features
    return (
      <Layout className="mobile-layout-wrapper">
        <Layout className="mobile-layout-main">
          <Header className="mobile-layout-header">
            <div className="mobile-header">
              <div className="mobile-header-brand">
                <h1 className="mobile-dashboard-title">ITWOS AI</h1>
              </div>
            </div>
          </Header>
          <Content className="mobile-layout-content">
            {children}
          </Content>
        </Layout>
      </Layout>
    )
  }
  
  const { user, isAuthenticated, logout } = authContext
  
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarAlwaysVisible, setSidebarAlwaysVisible] = useState(true) // Always visible by default

  const isAdmin = user?.role === 'admin'

  // Ensure sidebar stays visible when always-visible mode is enabled
  useEffect(() => {
    if (sidebarAlwaysVisible) {
      setSidebarCollapsed(false)
    }
  }, [sidebarAlwaysVisible])

  // Force sidebar to stay visible for admin users
  useEffect(() => {
    if (isAdmin) {
      setSidebarAlwaysVisible(true)
      setSidebarCollapsed(false)
    }
  }, [isAdmin])

  // Ensure admin sidebar never collapses
  useEffect(() => {
    if (isAdmin) {
      setSidebarCollapsed(false)
      setSidebarAlwaysVisible(true)
    }
  }, [isAdmin, location.pathname])

  // Force admin sidebar to stay open on every render
  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(() => {
        setSidebarCollapsed(false)
        setSidebarAlwaysVisible(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMenuClick = ({ key }) => {
    navigate(key)
    setMobileDrawerOpen(false)
    // Always keep sidebar visible for admin users
    if (isAdmin) {
      setSidebarCollapsed(false)
      setSidebarAlwaysVisible(true)
    } else if (sidebarAlwaysVisible) {
      setSidebarCollapsed(false)
      setSidebarAlwaysVisible(true)
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
      label: 'My Purchases',
    },
    {
      key: '/following',
      icon: <TeamOutlined />,
      label: 'Following',
    },
    {
      key: '/chat',
      icon: <MessageOutlined />,
      label: 'Chat',
    },
  ]

  const adminMenuItems = [
    {
      key: '/admin',
      icon: <BarChartOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/admin/users',
      icon: <TeamOutlined />,
      label: 'Users',
    },
    {
      key: '/admin/products',
      icon: <AppstoreOutlined />,
      label: 'Products',
    },
    {
      key: '/admin/prebooks',
      icon: <ShoppingCartOutlined />,
      label: 'Prebook Management',
    },
    {
      key: '/admin/payments',
      icon: <DollarOutlined />,
      label: 'Payment Tracking',
    },
    {
      key: '/admin/user-activities',
      icon: <UserOutlined />,
      label: 'User Activities',
    },
    {
      key: '/admin/sales',
      icon: <BarChartOutlined />,
      label: 'Sales',
    },
    {
      key: '/admin/chat',
      icon: <CustomerServiceOutlined />,
      label: 'Chat Moderation',
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ]

  const menuItems = isAdmin ? adminMenuItems : userMenuItems

  // Combined menu for always-visible mode
  const combinedMenuItems = [
    {
      key: 'user-section',
      label: 'User Menu',
      type: 'group',
      children: userMenuItems
    },
    {
      key: 'admin-section',
      label: 'Admin Menu',
      type: 'group',
      children: adminMenuItems
    }
  ]

  const handleUserDropdownClick = ({ key }) => {
    switch (key) {
      case 'profile':
        navigate('/profile')
        break
      case 'settings':
        navigate('/settings')
        break
      case 'logout':
        handleLogout()
        break
      default:
        break
    }
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
      onClick: () => handleLogout()
    },
  ]

  const selectedKeys = [location.pathname]
  
  // For admin users, sidebar should never be collapsed
  const isSidebarCollapsed = isAdmin ? false : (sidebarCollapsed && !sidebarAlwaysVisible)
  
  // Force sidebar to be visible for admin users
  const sidebarStyle = isAdmin ? { display: 'block !important', visibility: 'visible !important' } : {}
  
  // Debug log for admin sidebar state
  if (isAdmin) {
    console.log('🔧 Admin sidebar state:', { 
      isAdmin, 
      sidebarCollapsed, 
      sidebarAlwaysVisible, 
      isSidebarCollapsed,
      pathname: location.pathname,
      userRole: user?.role
    })
  }

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-center">
          {sidebarAlwaysVisible ? 'ITWOS AI - All Menus' : (isAdmin ? 'Admin Panel' : 'ITWOS AI')}
        </h2>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        items={sidebarAlwaysVisible ? combinedMenuItems : menuItems}
        onClick={handleMenuClick}
        className="flex-1 border-r-0"
      />
    </div>
  )

  return (
    <Layout className="mobile-layout-wrapper">
      {/* Desktop Sidebar - Always visible for admin users */}
      <Sider
        trigger={null}
        collapsible={isAdmin ? false : true}
        collapsed={isAdmin ? false : isSidebarCollapsed}
        className={`mobile-layout-sidebar ${isAdmin ? 'block admin-sidebar' : 'hidden md:block'}`}
        style={isAdmin ? { 
          display: 'block !important', 
          visibility: 'visible !important',
          position: 'static !important',
          left: '0 !important',
          width: '280px !important',
          height: '100vh !important',
          background: '#ffffff !important',
          borderRight: '1px solid rgba(0, 0, 0, 0.1) !important',
          zIndex: '1001 !important'
        } : {}}
        width={280}
        collapsedWidth={isAdmin ? 280 : 80}
      >
        {sidebarContent}
      </Sider>

      {/* Admin Sidebar Fallback - Always visible */}
      {isAdmin && (
        <div 
          className="admin-sidebar-fallback"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '280px',
            height: '100vh',
            background: '#ffffff',
            borderRight: '1px solid rgba(0, 0, 0, 0.1)',
            zIndex: 1001,
            overflowY: 'auto',
            padding: '16px',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            display: 'block',
            visibility: 'visible'
          }}
        >
          {sidebarContent}
        </div>
      )}

      {/* Mobile Drawer */}
      <Drawer
        title={sidebarAlwaysVisible ? "All Menus" : "Menu"}
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
        className="mobile-drawer md:hidden"
        styles={{
          body: { padding: 0 },
          header: { padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }
        }}
      >
        {sidebarContent}
      </Drawer>

      <Layout className="mobile-layout-main">
        <Header className="mobile-layout-header">
          <div className="mobile-header">
                    <div className="mobile-header-brand">
                      <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={() => setMobileDrawerOpen(true)}
                        className="mobile-header-toggle md:hidden"
                      />
                      <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={() => {
                          if (sidebarAlwaysVisible || isAdmin) {
                            // Don't collapse when always-visible is enabled or for admin users
                            return
                          }
                          setSidebarCollapsed(!sidebarCollapsed)
                        }}
                        className="mobile-header-toggle hidden md:block"
                        disabled={sidebarAlwaysVisible || isAdmin}
                        title={sidebarAlwaysVisible || isAdmin ? 'Menu is always visible for admin' : 'Toggle menu'}
                      />
                      <Button
                        type="text"
                        icon={sidebarAlwaysVisible ? <AppstoreOutlined /> : <MenuOutlined />}
                        onClick={() => {
                          if (!isAdmin) {
                            setSidebarAlwaysVisible(!sidebarAlwaysVisible)
                          }
                        }}
                        className="mobile-header-toggle hidden md:block"
                        disabled={isAdmin}
                        title={isAdmin ? 'Menu is always visible for admin users' : (sidebarAlwaysVisible ? 'Hide Persistent Menu' : 'Show Persistent Menu')}
                      />
                      <h1 className="mobile-dashboard-title">
                        {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
                      </h1>
                    </div>

            <div className="mobile-header-actions">
              <Button
                type="text"
                icon={<MessageOutlined />}
                onClick={() => navigate('/chat')}
                className="mobile-header-action"
              />
              
              <NotificationBell />

              {isAuthenticated && user && (
                <div className="mobile-header-user">
                  <Dropdown
                    menu={{ 
                      items: userDropdownItems
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                    overlayStyle={{ zIndex: 1050 }}
                    getPopupContainer={(trigger) => trigger.parentElement}
                  >
                    <div 
                      className="mobile-header-action cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar 
                        src={getUserAvatarUrl(user)} 
                        icon={<UserOutlined />}
                        size={32}
                      >
                        {getUserInitials(user?.name)}
                      </Avatar>
                      <span className="mobile-header-user-name hidden sm:block">
                        {user?.name}
                      </span>
                    </div>
                  </Dropdown>
                </div>
              )}
            </div>
          </div>
        </Header>

        <Content className="mobile-layout-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default LayoutWrapper
