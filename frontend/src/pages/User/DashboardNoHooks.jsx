import React, { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, Space, Layout, Menu, Drawer, Spin, Tag, Alert } from 'antd'
import { Column, Line, Pie, Area, Bar } from '@ant-design/charts'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  TrophyOutlined,
  MenuOutlined,
  BarChartOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'

const { Title, Paragraph } = Typography
const { Sider, Content } = Layout

const DashboardNoHooks = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    activeSubscriptions: 0,
    loyaltyPoints: 0
  })
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMenu, setSelectedMenu] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)
  const [productsError, setProductsError] = useState(null)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  // Optimized authentication check with useCallback
  const checkAuth = useCallback(() => {
    if (isAuthenticated && user?.role === 'user') {
      console.log('User is authenticated and authorized')
      setIsLoading(false)
      return true
    }
    
    if (isAuthenticated && user?.role !== 'user') {
      console.log('Not a user role, redirecting to login. User role:', user?.role)
      navigate('/login')
      return false
    }
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      navigate('/login')
      return false
    }
    
    return false
  }, [isAuthenticated, user, navigate])

  // Single authentication effect
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)
    return () => clearTimeout(timer)
  }, [checkAuth])

  // Load stats when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role === 'user' && selectedMenu === 'dashboard') {
      fetchStats()
    }
  }, [isAuthenticated, user, selectedMenu])

  // Load products when products menu is selected
  useEffect(() => {
    if (selectedMenu === 'products') {
      fetchProducts()
    }
  }, [selectedMenu])

  const fetchStats = useCallback(async () => {
    setStatsError(null)
    try {
      const response = await api.get('/users/me/stats')
      if (response.data.success) {
        setStats(response.data.data)
      } else {
        throw new Error('Failed to fetch user statistics')
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStatsError('Failed to load statistics')
      // Fallback to default stats
      setStats({
        totalOrders: 0,
        totalSpent: 0,
        activeSubscriptions: 0,
        loyaltyPoints: 0
      })
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const response = await api.get('/products')
      if (response.data.success) {
        setProducts(response.data.data.products || [])
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setProductsError('Failed to load products')
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

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
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
  ]

  // Show loading state - only when actually loading
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div>
          <Title level={2} style={{ color: '#fff' }}>Loading...</Title>
          <Paragraph style={{ color: '#666' }}>Please wait while we load your dashboard.</Paragraph>
        </div>
      </div>
    )
  }

  // Show access denied for non-users
  if (user?.role !== 'user') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div>
          <Title level={2} style={{ color: '#fff' }}>Access Denied</Title>
          <Paragraph style={{ color: '#666' }}>Please login as a user to access this dashboard.</Paragraph>
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      background: '#0a0a0a', 
      minHeight: '100vh',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem',
        borderBottom: '1px solid #333',
        background: '#111'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#fff', margin: 0, marginRight: '2rem' }}>
            ITWOS AI
          </Title>
        </div>
        <Space>
          <Button 
            type="text" 
            icon={<MenuOutlined />}
            onClick={() => setMobileMenuVisible(true)}
            style={{ color: '#fff' }}
          />
        </Space>
      </div>

      <Layout style={{ background: '#0a0a0a' }}>
        {/* Sidebar */}
        <Sider 
          width={250} 
          style={{ 
            background: '#111', 
            borderRight: '1px solid #333',
            padding: '2rem 0'
          }}
        >
          <Menu
            mode="vertical"
            items={sidebarItems}
            selectedKeys={[selectedMenu]}
            onClick={({ key }) => setSelectedMenu(key)}
            style={{ 
              background: 'transparent', 
              border: 'none',
              color: '#fff'
            }}
            theme="dark"
          />
        </Sider>

        {/* Main Content */}
        <Content style={{ 
          padding: '2rem', 
          background: '#0a0a0a',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {selectedMenu === 'dashboard' && (
            <>
              {/* Welcome Section */}
              <div style={{ marginBottom: '3rem' }}>
                <Title level={1} style={{ color: '#fff', marginBottom: '0.5rem' }}>
                  Welcome back, {user?.name || 'User'}!
                </Title>
                <Paragraph style={{ color: '#666', fontSize: '18px' }}>
                  Your personal dashboard is ready. Start exploring and managing your account.
                </Paragraph>
                <Button 
                  type="primary" 
                  onClick={handleLogout}
                  style={{ 
                    background: '#ff6b6b', 
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  Logout
                </Button>
              </div>

              {/* Error Alert for Stats */}
              {statsError && (
                <Alert
                  message="Statistics Error"
                  description={statsError}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={fetchStats} icon={<ReloadOutlined />}>
                      Retry
                    </Button>
                  }
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {/* Statistics Cards */}
              <Row gutter={[16, 16]} style={{ marginBottom: '3rem' }}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card 
                    bordered={false} 
                    style={{ 
                      background: '#111', 
                      borderRadius: '12px', 
                      border: '1px solid #333'
                    }}
                  >
                    <Statistic 
                      title={<span style={{ color: '#666' }}>Total Orders</span>}
                      value={stats.totalOrders} 
                      prefix={<ShoppingCartOutlined style={{ color: '#4ecdc4' }} />} 
                      valueStyle={{ color: '#fff' }} 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card 
                    bordered={false} 
                    style={{ 
                      background: '#111', 
                      borderRadius: '12px', 
                      border: '1px solid #333'
                    }}
                  >
                    <Statistic 
                      title={<span style={{ color: '#666' }}>Total Spent</span>}
                      value={stats.totalSpent} 
                      prefix={<DollarOutlined style={{ color: '#ff6b6b' }} />} 
                      valueStyle={{ color: '#fff' }} 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card 
                    bordered={false} 
                    style={{ 
                      background: '#111', 
                      borderRadius: '12px', 
                      border: '1px solid #333'
                    }}
                  >
                    <Statistic 
                      title={<span style={{ color: '#666' }}>Active Subscriptions</span>}
                      value={stats.activeSubscriptions} 
                      prefix={<TrophyOutlined style={{ color: '#f9ca24' }} />} 
                      valueStyle={{ color: '#fff' }} 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Card 
                    bordered={false} 
                    style={{ 
                      background: '#111', 
                      borderRadius: '12px', 
                      border: '1px solid #333'
                    }}
                  >
                    <Statistic 
                      title={<span style={{ color: '#666' }}>Loyalty Points</span>}
                      value={stats.loyaltyPoints} 
                      prefix={<TrophyOutlined style={{ color: '#6c5ce7' }} />} 
                      valueStyle={{ color: '#fff' }} 
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {selectedMenu === 'products' && (
            <>
              {/* Products Section */}
              <div style={{ marginBottom: '3rem' }}>
                <Title level={1} style={{ color: '#fff', marginBottom: '0.5rem' }}>
                  Products
                </Title>
                <Paragraph style={{ color: '#666', fontSize: '18px' }}>
                  Browse and discover amazing products from our marketplace.
                </Paragraph>
              </div>

              {/* Error Alert for Products */}
              {productsError && (
                <Alert
                  message="Products Error"
                  description={productsError}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={fetchProducts} icon={<ReloadOutlined />}>
                      Retry
                    </Button>
                  }
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {/* Products Display */}
              {productsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '1rem', color: '#666' }}>
                    Loading products...
                  </div>
                </div>
              ) : products.length > 0 ? (
                <Row gutter={[24, 24]}>
                  {products.map(product => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={product._id}>
                      <Card
                        hoverable
                        style={{ 
                          background: '#111', 
                          borderRadius: '12px', 
                          border: '1px solid #333',
                          height: '100%'
                        }}
                        cover={
                          <div style={{ position: 'relative' }}>
                            <img
                              alt={product.title}
                              src={product.thumbnailUrl || product.thumbnail}
                              style={{ 
                                height: 200, 
                                objectFit: 'cover',
                                width: '100%'
                              }}
                            />
                          </div>
                        }
                      >
                        <Card.Meta
                          title={
                            <Title level={4} style={{ color: '#fff', margin: 0 }}>
                              {product.title}
                            </Title>
                          }
                          description={
                            <div>
                              <Paragraph 
                                style={{ color: '#666', margin: '0.5rem 0' }}
                                ellipsis={{ rows: 2 }}
                              >
                                {product.description}
                              </Paragraph>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#4ecdc4', fontSize: '18px', fontWeight: 'bold' }}>
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: product.currency || 'USD'
                                  }).format(product.price)}
                                </span>
                                <Tag color={product.status === 'published' ? 'green' : 'orange'}>
                                  {String(product.status || 'draft').toUpperCase()}
                                </Tag>
                              </div>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Card
                  bordered={false}
                  style={{
                    background: '#111',
                    borderRadius: '12px',
                    border: '1px solid #333',
                    textAlign: 'center',
                    padding: '3rem 2rem'
                  }}
                >
                  <div style={{ color: '#666', fontSize: '16px' }}>
                    <ShoppingCartOutlined style={{ fontSize: '48px', marginBottom: '1rem', display: 'block' }} />
                    <Title level={4} style={{ color: '#666', marginBottom: '0.5rem' }}>
                      No products available
                    </Title>
                    <Paragraph style={{ color: '#666', margin: 0 }}>
                      Products will appear here when they are added by administrators.
                    </Paragraph>
                  </div>
                </Card>
              )}
            </>
          )}
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        title="Navigation"
        placement="right"
        closable={true}
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        styles={{ body: { padding: 0, background: '#111' } }}
      >
        <Menu
          mode="vertical"
          items={sidebarItems}
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => {
            setSelectedMenu(key)
            setMobileMenuVisible(false)
          }}
          style={{ 
            background: 'transparent', 
            border: 'none',
            color: '#fff'
          }}
          theme="dark"
        />
      </Drawer>
    </div>
  )
}

export default DashboardNoHooks
