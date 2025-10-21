import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, Space, Layout, Menu, Drawer, Spin, Tag, Alert, Skeleton } from 'antd'
import { Column, Line, Pie, Area, Bar } from '@ant-design/charts'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  TrophyOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  CodeOutlined,
  ShoppingOutlined,
  ToolOutlined,
  EditOutlined,
  FileTextOutlined,
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
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import useDashboardData from '../../hooks/useDashboardData'
import useRealTimeUpdates from '../../hooks/useRealTimeUpdates'

const { Title, Paragraph } = Typography
const { Sider, Content } = Layout

// Prebook Payments Section Component - Optimized with better error handling
const PrebookPaymentsSection = memo(() => {
  const [prebooks, setPrebooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecentPrebooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/prebook?limit=5')
      if (response.data.success) {
        setPrebooks(response.data.data?.prebooks || [])
      } else {
        throw new Error('Failed to fetch prebooks')
      }
    } catch (error) {
      console.error('Error fetching prebooks:', error)
      setError('Failed to load prebook data')
      // Fallback to mock data
      setPrebooks([
        {
          _id: '1',
          product: { title: 'Advanced AI Course', slug: 'advanced-ai-course' },
          status: 'approved',
          paymentStatus: 'completed',
          paymentAmount: 100,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          product: { title: 'Machine Learning Bootcamp', slug: 'ml-bootcamp' },
          status: 'pending',
          paymentStatus: 'pending',
          paymentAmount: 200,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentPrebooks()
  }, [fetchRecentPrebooks])

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#52c41a'
      case 'pending': return '#faad14'
      case 'rejected': return '#ff4d4f'
      default: return '#666'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#52c41a'
      case 'pending': return '#faad14'
      case 'failed': return '#ff4d4f'
      default: return '#666'
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem', color: '#666' }}>
          Loading prebook data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Data"
        description={error}
        type="warning"
        showIcon
        action={
          <Button size="small" onClick={fetchRecentPrebooks} icon={<ReloadOutlined />}>
            Retry
          </Button>
        }
        style={{ marginBottom: '1rem' }}
      />
    )
  }

  return (
    <Row gutter={[16, 16]}>
      {prebooks.length > 0 ? (
        prebooks.map((prebook) => (
          <Col xs={24} sm={12} lg={8} key={prebook._id}>
            <Card
              bordered={false}
              style={{
                background: '#111',
                borderRadius: '12px',
                border: '1px solid #333',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <Title level={4} style={{ color: '#fff', margin: 0 }}>
                    {prebook.product?.title || 'Unknown Product'}
                  </Title>
                  <Paragraph style={{ color: '#666', margin: '0.5rem 0' }}>
                    {new Date(prebook.createdAt).toLocaleDateString()}
                  </Paragraph>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#ff6b6b', fontSize: '18px', fontWeight: 'bold' }}>
                    ₹{((prebook.paymentAmount || 0) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Tag color={getStatusColor(prebook.status)}>
                  {prebook.status?.toUpperCase()}
                </Tag>
                <Tag color={getPaymentStatusColor(prebook.paymentStatus)}>
                  {prebook.paymentStatus?.toUpperCase()}
                </Tag>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  ID: {prebook._id?.slice(-8)}
                </span>
                <Button 
                  type="text" 
                  size="small"
                  style={{ color: '#ff6b6b' }}
                  onClick={() => window.open(`/product/${prebook.product?.slug}`, '_blank')}
                >
                  View Product
                </Button>
              </div>
            </Card>
          </Col>
        ))
      ) : (
        <Col span={24}>
          <Card
            bordered={false}
            style={{
              background: '#111',
              borderRadius: '12px',
              border: '1px solid #333',
              textAlign: 'center',
              padding: '3rem'
            }}
          >
            <Title level={4} style={{ color: '#666' }}>
              No Prebook Payments Yet
            </Title>
            <Paragraph style={{ color: '#666' }}>
              Start prebooking products to see your payment history here.
            </Paragraph>
          </Card>
        </Col>
      )}
    </Row>
  )
})

PrebookPaymentsSection.displayName = 'PrebookPaymentsSection'

const Dashboard = () => {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMenu, setSelectedMenu] = useState('dashboard')
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  
  // Use custom hooks for data management
  const {
    stats,
    products,
    prebooks,
    loading,
    errors,
    fetchStats,
    fetchProducts,
    fetchPrebooks,
    refreshAll
  } = useDashboardData()
  
  const {
    isConnected,
    lastUpdate,
    notifications,
    clearNotifications,
    markNotificationAsRead
  } = useRealTimeUpdates()

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
  }, [isAuthenticated, user, selectedMenu, fetchStats])

  // Load products when products menu is selected
  useEffect(() => {
    if (selectedMenu === 'products') {
      fetchProducts()
    }
  }, [selectedMenu, fetchProducts])

  // Load prebooks when dashboard is selected
  useEffect(() => {
    if (selectedMenu === 'dashboard') {
      fetchPrebooks()
    }
  }, [selectedMenu, fetchPrebooks])


  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const sidebarItems = useMemo(() => [
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
    {
      key: 'cms',
      icon: <MonitorOutlined />,
      label: 'CMS',
    },
    {
      key: 'code',
      icon: <BranchesOutlined />,
      label: 'Code Repository',
    },
    {
      key: 'commerce',
      icon: <ShoppingOutlined />,
      label: 'Commerce',
    },
    {
      key: 'databases',
      icon: <DatabaseOutlined />,
      label: 'Databases',
    },
    {
      key: 'devtools',
      icon: <ToolOutlined />,
      label: 'DevTools',
    },
    {
      key: 'design',
      icon: <EditOutlined />,
      label: 'Design',
    },
    {
      key: 'logging',
      icon: <FileTextOutlined />,
      label: 'Logging',
    },
  ], [])

  const featuredIntegrations = []

  const analyticsIntegrations = []

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
      {/* Header - Responsive */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem',
        borderBottom: '1px solid #333',
        background: '#111',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' }}>
          <Title level={3} style={{ color: '#fff', margin: 0, marginRight: '2rem' }}>
            ITWOS AI
          </Title>
          <Space 
            style={{ 
              display: window.innerWidth < 768 ? 'none' : 'flex',
              flexWrap: 'wrap'
            }}
          >
            <Button type="text" style={{ color: '#fff' }}>Home</Button>
            <Button type="text" style={{ color: '#fff', borderBottom: '2px solid #ff6b6b' }}>Integrations</Button>
            <Button type="text" style={{ color: '#fff' }}>Pricing</Button>
            <Button type="text" style={{ color: '#fff' }}>Docs</Button>
            <Button type="text" style={{ color: '#fff' }}>Changelog</Button>
          </Space>
        </div>
        <Space style={{ display: window.innerWidth < 768 ? 'none' : 'flex' }}>
          {/* Real-time connection indicator */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: isConnected ? '#52c41a' : '#ff4d4f'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#52c41a' : '#ff4d4f',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '12px' }}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <Button type="text" style={{ color: '#fff' }}>Sign in</Button>
          <Button style={{ 
            background: 'transparent', 
            border: '1px solid #fff', 
            color: '#fff' 
          }}>
            Remix Template
          </Button>
        </Space>
        <Button 
          type="text" 
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuVisible(true)}
          style={{ color: '#fff' }}
        />
      </div>

      <Layout style={{ background: '#0a0a0a' }}>
        {/* Sidebar - Responsive */}
        <Sider 
          width={250} 
          style={{ 
            background: '#111', 
            borderRight: '1px solid #333',
            padding: '2rem 0',
            display: window.innerWidth < 768 ? 'none' : 'block'
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

        {/* Main Content - Responsive */}
        <Content style={{ 
          padding: window.innerWidth < 768 ? '1rem' : '2rem', 
          background: '#0a0a0a',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {selectedMenu === 'dashboard' && (
            <>
              {/* Welcome Section */}
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <Title level={1} style={{ color: '#fff', marginBottom: '0.5rem' }}>
                      Welcome back, {user?.name || 'User'}!
                    </Title>
                    <Paragraph style={{ color: '#666', fontSize: '18px' }}>
                      Your personal dashboard is ready. Start exploring and managing your account.
                    </Paragraph>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={refreshAll}
                    loading={loading.stats || loading.products || loading.prebooks}
                    style={{ 
                      background: '#ff6b6b', 
                      border: 'none',
                      borderRadius: '8px'
                    }}
                  >
                    Refresh All
                  </Button>
                </div>
                {lastUpdate && (
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
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
              {errors.products && (
                <Alert
                  message="Products Error"
                  description={errors.products}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={() => fetchProducts(true)} icon={<ReloadOutlined />}>
                      Retry
                    </Button>
                  }
                  style={{ marginBottom: '1rem' }}
                />
              )}
            </>
          )}

          {selectedMenu === 'dashboard' && (
            <>
              {/* Error Alert for Stats */}
              {errors.stats && (
                <Alert
                  message="Statistics Error"
                  description={errors.stats}
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" onClick={() => fetchStats(true)} icon={<ReloadOutlined />}>
                      Retry
                    </Button>
                  }
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {/* Statistics Cards - Responsive */}
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

          {/* Charts Section - Responsive */}
          <Row gutter={[16, 16]} style={{ marginBottom: '3rem' }}>
            {/* Spending Trend Chart */}
            <Col xs={24} lg={12}>
              <Card 
                title="Spending Trend" 
                extra={<BarChartOutlined style={{ color: '#fff' }} />}
                bordered={false}
                style={{ 
                  background: '#111', 
                  borderRadius: '12px', 
                  border: '1px solid #333'
                }}
                headStyle={{ 
                  background: '#111', 
                  borderBottom: '1px solid #333',
                  color: '#fff'
                }}
              >
                <Line
                  data={[
                    { month: 'Jan', amount: 1200 },
                    { month: 'Feb', amount: 1500 },
                    { month: 'Mar', amount: 1800 },
                    { month: 'Apr', amount: 2200 },
                    { month: 'May', amount: 2500 },
                    { month: 'Jun', amount: 2800 },
                    { month: 'Jul', amount: 3200 },
                    { month: 'Aug', amount: 3500 },
                    { month: 'Sep', amount: 3800 },
                    { month: 'Oct', amount: 4200 },
                    { month: 'Nov', amount: 4500 },
                    { month: 'Dec', amount: 4800 }
                  ]}
                  xField="month"
                  yField="amount"
                  point={{
                    size: 5,
                    shape: 'diamond',
                  }}
                  color="#ff6b6b"
                  smooth
                  height={300}
                />
              </Card>
            </Col>

            {/* Order Categories */}
            <Col xs={24} lg={12}>
              <Card 
                title="Order Categories" 
                extra={<ShoppingCartOutlined style={{ color: '#fff' }} />}
                bordered={false}
                style={{ 
                  background: '#111', 
                  borderRadius: '12px', 
                  border: '1px solid #333'
                }}
                headStyle={{ 
                  background: '#111', 
                  borderBottom: '1px solid #333',
                  color: '#fff'
                }}
              >
                <Pie
                  data={[
                    { category: 'Web Development', value: 40 },
                    { category: 'Mobile Apps', value: 30 },
                    { category: 'E-commerce', value: 20 },
                    { category: 'Other', value: 10 }
                  ]}
                  angleField="value"
                  colorField="category"
                  radius={0.8}
                  height={300}
                  label={{
                    type: 'outer',
                    content: '{name} {percentage}'
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Additional Charts Row - Responsive */}
          <Row gutter={[16, 16]} style={{ marginBottom: '3rem' }}>
            {/* Monthly Activity */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title="Monthly Activity" 
                extra={<TrophyOutlined style={{ color: '#fff' }} />}
                bordered={false}
                style={{ 
                  background: '#111', 
                  borderRadius: '12px', 
                  border: '1px solid #333'
                }}
                headStyle={{ 
                  background: '#111', 
                  borderBottom: '1px solid #333',
                  color: '#fff'
                }}
              >
                <Column
                  data={[
                    { month: 'Jan', orders: 5 },
                    { month: 'Feb', orders: 8 },
                    { month: 'Mar', orders: 12 },
                    { month: 'Apr', orders: 15 },
                    { month: 'May', orders: 18 },
                    { month: 'Jun', orders: 22 }
                  ]}
                  xField="month"
                  yField="orders"
                  color="#4ecdc4"
                  height={300}
                />
              </Card>
            </Col>

            {/* Payment Methods */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title="Payment Methods" 
                extra={<DollarOutlined style={{ color: '#fff' }} />}
                bordered={false}
                style={{ 
                  background: '#111', 
                  borderRadius: '12px', 
                  border: '1px solid #333'
                }}
                headStyle={{ 
                  background: '#111', 
                  borderBottom: '1px solid #333',
                  color: '#fff'
                }}
              >
                <Bar
                  data={[
                    { method: 'Credit Card', count: 45 },
                    { method: 'PayPal', count: 25 },
                    { method: 'Bank Transfer', count: 15 },
                    { method: 'Crypto', count: 5 }
                  ]}
                  xField="method"
                  yField="count"
                  color="#f9ca24"
                  height={300}
                />
              </Card>
            </Col>

            {/* Spending by Category */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title="Spending by Category" 
                extra={<BarChartOutlined style={{ color: '#fff' }} />}
                bordered={false}
                style={{ 
                  background: '#111', 
                  borderRadius: '12px', 
                  border: '1px solid #333'
                }}
                headStyle={{ 
                  background: '#111', 
                  borderBottom: '1px solid #333',
                  color: '#fff'
                }}
              >
                <Area
                  data={[
                    { category: 'Web Dev', amount: 2000 },
                    { category: 'Mobile', amount: 1500 },
                    { category: 'E-commerce', amount: 1000 },
                    { category: 'Design', amount: 800 },
                    { category: 'Other', amount: 500 }
                  ]}
                  xField="category"
                  yField="amount"
                  color="#6c5ce7"
                  smooth
                  height={300}
                />
              </Card>
            </Col>
          </Row>

          {/* Prebook Payments Section */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <Title level={2} style={{ color: '#fff', margin: 0 }}>
                Recent Prebook Payments
              </Title>
              <Button 
                type="primary" 
                onClick={() => navigate('/prebooks')}
                style={{ 
                  background: '#ff6b6b', 
                  border: 'none',
                  borderRadius: '8px'
                }}
              >
                View All Prebooks
              </Button>
            </div>
            <PrebookPaymentsSection />
          </div>

          {/* Featured Section */}
          <div style={{ marginBottom: '3rem' }}>
            <Title level={2} style={{ color: '#fff', marginBottom: '2rem' }}>
              Featured
            </Title>
            {featuredIntegrations.length > 0 ? (
              <Row gutter={[24, 24]}>
                {featuredIntegrations.map((integration, index) => (
                  <Col xs={24} sm={12} lg={8} key={index}>
                    <Card
                      bordered={false}
                      style={{
                        background: '#111',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        height: '140px'
                      }}
                      hoverable
                      styles={{ body: { padding: '1.5rem' } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ 
                          background: integration.color, 
                          borderRadius: '8px', 
                          padding: '8px',
                          marginRight: '1rem'
                        }}>
                          {integration.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Title level={4} style={{ color: '#fff', margin: 0, marginBottom: '0.5rem' }}>
                            {integration.title}
                          </Title>
                          <Paragraph style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                            {integration.description}
                          </Paragraph>
                        </div>
                      </div>
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
                  <AppstoreOutlined style={{ fontSize: '48px', marginBottom: '1rem', display: 'block' }} />
                  <Title level={4} style={{ color: '#666', marginBottom: '0.5rem' }}>
                    No featured integrations yet
                  </Title>
                  <Paragraph style={{ color: '#666', margin: 0 }}>
                    Your featured integrations will appear here when available.
                  </Paragraph>
                </div>
              </Card>
            )}
          </div>

          {/* Analytics Section */}
          <div>
            <Title level={2} style={{ color: '#fff', marginBottom: '2rem' }}>
              Analytics
            </Title>
            {analyticsIntegrations.length > 0 ? (
              <Row gutter={[24, 24]}>
                {analyticsIntegrations.map((integration, index) => (
                  <Col xs={24} sm={12} lg={8} key={index}>
                    <Card
                      bordered={false}
                      style={{
                        background: '#111',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        height: '140px'
                      }}
                      hoverable
                      styles={{ body: { padding: '1.5rem' } }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ 
                          background: integration.color, 
                          borderRadius: '8px', 
                          padding: '8px',
                          marginRight: '1rem'
                        }}>
                          {integration.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Title level={4} style={{ color: '#fff', margin: 0, marginBottom: '0.5rem' }}>
                            {integration.title}
                          </Title>
                          <Paragraph style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                            {integration.description}
                          </Paragraph>
                        </div>
                      </div>
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
                  <BarChartOutlined style={{ fontSize: '48px', marginBottom: '1rem', display: 'block' }} />
                  <Title level={4} style={{ color: '#666', marginBottom: '0.5rem' }}>
                    No analytics integrations yet
                  </Title>
                  <Paragraph style={{ color: '#666', margin: 0 }}>
                    Your analytics integrations will appear here when available.
                  </Paragraph>
                </div>
              </Card>
            )}
          </div>
            </>
          )}

          {selectedMenu === 'products' && (
            <>
              {/* Products Display */}
              {loading.products ? (
                <Row gutter={[24, 24]}>
                  {[1, 2, 3, 4].map((i) => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={i}>
                      <Card
                        style={{ 
                          background: '#111', 
                          borderRadius: '12px', 
                          border: '1px solid #333'
                        }}
                      >
                        <Skeleton.Image style={{ width: '100%', height: 200 }} />
                        <Skeleton active paragraph={{ rows: 2 }} />
                      </Card>
                    </Col>
                  ))}
                </Row>
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
                            {product.trending && (
                              <div style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                background: '#ff4d4f',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: 4,
                                fontSize: '12px'
                              }}>
                                Trending
                              </div>
                            )}
                          </div>
                        }
                        actions={[
                          <Button 
                            type="primary" 
                            icon={<ShoppingCartOutlined />}
                            onClick={() => window.open(`/product/${product.slug}`, '_blank')}
                          >
                            Prebook
                          </Button>
                        ]}
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

export default Dashboard