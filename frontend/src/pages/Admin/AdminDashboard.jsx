import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, Space, Table, Tag, Avatar, Progress, Timeline, App, List, Badge, Alert, Image, Spin } from 'antd'
import { Column, Line, Pie, Area, Bar } from '@ant-design/charts'
import '../../styles/admin-responsive.css'
import { useDashboardData } from '../../hooks/useDashboardData'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  TrophyOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  MessageOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FireOutlined,
  GlobalOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'

const { Title, Paragraph, Text } = Typography

const AdminDashboardStable = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    newUsersToday: 0
  })

  const [recentUsers] = useState([])
  const [recentOrders] = useState([])
  const [topProducts] = useState([])
  const [alerts, setAlerts] = useState([])

  // Initialize component state - prevent blinking
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      setIsInitialized(true)
      loadDashboardData()
    }
  }, [isLoading, isAuthenticated, user])

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      setStats({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeUsers: 0,
        pendingOrders: 0,
        lowStockProducts: 0,
        newUsersToday: 0
      })

      setProducts([])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Memoize columns to prevent re-renders
  const userColumns = useMemo(() => [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <div className="admin-user-info">
          <Avatar 
            src={getUserAvatarUrl(record)} 
            icon={<UserOutlined />}
          >
            {getUserInitials(record.name)}
          </Avatar>
          <div className="user-details">
            <div className="user-name">{text}</div>
            <div className="user-email">{record.email}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => {
        const safeRole = role || 'user'
        const roleString = typeof safeRole === 'string' ? safeRole : String(safeRole)
        return (
          <Tag color={roleString === 'admin' ? 'red' : 'blue'} className="admin-role-tag">
            {roleString.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const safeStatus = status || 'inactive'
        const statusString = typeof safeStatus === 'string' ? safeStatus : String(safeStatus)
        return (
          <Tag color={statusString === 'active' ? 'green' : 'orange'} className="admin-status-tag">
            {statusString.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Last Active',
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <div className="admin-action-buttons">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/users/view/${record._id}`)}
            title="View User Details"
          >
            View
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/users/edit/${record._id}`)}
            title="Edit User"
          >
            Edit
          </Button>
        </div>
      )
    }
  ], [navigate])

  const orderColumns = useMemo(() => [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer'
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <Text style={{ color: '#52c41a' }}>{amount}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'completed': 'green',
          'pending': 'orange',
          'processing': 'blue'
        }
        const safeStatus = status || 'unknown'
        const statusString = typeof safeStatus === 'string' ? safeStatus : String(safeStatus)
        return <Tag color={colors[statusString]}>{statusString.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
        </Space>
      )
    }
  ], [])

  const productColumns = useMemo(() => [
    {
      title: 'Product',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          {record.thumbnailUrl ? (
            <Image
              src={record.thumbnailUrl}
              alt={text}
              width={40}
              height={40}
              style={{ borderRadius: '4px' }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3YODp+9aX7l4xGq9wB4e6B1QKiu9CknTAcXU9UCFJYCH2fAACUI2BuXJFSAYpO0WakQICBxVn8GIC9S34BGyAbJQ8HqkyMwmI2gBZxJAiHA+wW7SDx2BuHQkDo7mDDIIBWj+7G1pC5mNjBZAKqss8QwQrNvzqSTAPRrFElPNYQ2gApi0lTuJUHt6aA2YlGQ9haC+dX1Cew1HEwUGJ9MwJnCrqS60S8HA4JKJYGdSUSALpJ3OsFB7M4cBwJjeQrR4gBGB7w=="
            />
          ) : (
            <Avatar size={40} icon={<ShoppingCartOutlined />} />
          )}
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.developerName}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const safeStatus = status || 'unknown'
        const statusString = typeof safeStatus === 'string' ? safeStatus : String(safeStatus)
        
        const colors = {
          'published': 'green',
          'draft': 'orange',
          'archived': 'red',
          'unknown': 'default'
        }
        const icons = {
          'published': '✓',
          'draft': '✏️',
          'archived': '📦',
          'unknown': '❓'
        }
        return (
          <Tag color={colors[statusString]} icon={icons[statusString]}>
            {statusString.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => (
        <Text strong style={{ color: '#52c41a' }}>
          ${price} {record.currency}
        </Text>
      )
    },
    {
      title: 'Trending',
      dataIndex: 'trending',
      key: 'trending',
      render: (trending) => (
        trending ? <Tag color="red" icon={<FireOutlined />}>TRENDING</Tag> : <Tag>Normal</Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => window.open(`/product/${record.slug}`, '_blank')}
          >
            View
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/admin/products/edit/${record._id}`)}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            icon={<GlobalOutlined />}
            onClick={() => window.open(record.websiteUrl, '_blank')}
          >
            Website
          </Button>
        </Space>
      )
    }
  ], [navigate])

  const handleViewAll = useCallback((path) => {
    navigate(path)
  }, [navigate])

  const handleRefreshProducts = useCallback(async () => {
    console.log('Refreshing products...')
    try {
      setProductsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('Products refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing products:', error)
      message.error('Failed to refresh products. Please try again.')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const handleAlertAction = useCallback((alert) => {
    switch (alert.action) {
      case 'Add Product':
        navigate('/admin/products/new')
        break
      case 'View Users':
        navigate('/admin/users')
        break
      case 'View Order':
        navigate('/admin/orders')
        break
      default:
        message.info('Action not implemented yet')
    }
  }, [navigate])

  // Show loading while authentication is being checked
  if (isLoading || !isInitialized) {
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={2}>Access Denied</Title>
          <Paragraph>Please login as an admin to access this dashboard.</Paragraph>
          <Button type="primary" onClick={() => navigate('/admin/login')}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <App>
      <DashboardLayout userRole="admin">
      <div>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            Welcome back, {user?.name}! 👋
          </Title>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            Here's an overview of your platform performance.
          </Paragraph>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {alerts.map(alert => (
              <Alert
                key={alert.id}
                message={alert.title}
                description={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{alert.message}</span>
                    <Button 
                      size="small" 
                      type="link"
                      onClick={() => handleAlertAction(alert)}
                    >
                      {alert.action}
                    </Button>
                  </div>
                }
                type={alert.type}
                showIcon
                style={{ marginBottom: '8px' }}
              />
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={stats.totalUsers}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Products"
                value={stats.totalProducts}
                prefix={<ShoppingCartOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Orders"
                value={stats.totalOrders}
                prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={stats.totalRevenue}
                prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
                valueStyle={{ color: '#f5222d' }}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Secondary Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Active Users"
                value={stats.activeUsers}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Pending Orders"
                value={stats.pendingOrders}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Low Stock"
                value={stats.lowStockProducts}
                prefix={<WarningOutlined style={{ color: '#f5222d' }} />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="New Users Today"
                value={stats.newUsersToday}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          {/* Revenue Chart */}
          <Col xs={24} lg={12}>
            <Card title="Revenue Trend" extra={<BarChartOutlined />}>
              <Line
                data={[
                  { month: 'Jan', revenue: 12000 },
                  { month: 'Feb', revenue: 15000 },
                  { month: 'Mar', revenue: 18000 },
                  { month: 'Apr', revenue: 22000 },
                  { month: 'May', revenue: 25000 },
                  { month: 'Jun', revenue: 28000 },
                  { month: 'Jul', revenue: 32000 },
                  { month: 'Aug', revenue: 35000 },
                  { month: 'Sep', revenue: 38000 },
                  { month: 'Oct', revenue: 42000 },
                  { month: 'Nov', revenue: 45000 },
                  { month: 'Dec', revenue: 48000 }
                ]}
                xField="month"
                yField="revenue"
                point={{
                  size: 5,
                  shape: 'diamond',
                }}
                color="#1890ff"
                smooth
                height={300}
              />
            </Card>
          </Col>

          {/* User Growth Chart */}
          <Col xs={24} lg={12}>
            <Card title="User Growth" extra={<TeamOutlined />}>
              <Area
                data={[
                  { month: 'Jan', users: 120 },
                  { month: 'Feb', users: 180 },
                  { month: 'Mar', users: 250 },
                  { month: 'Apr', users: 320 },
                  { month: 'May', users: 400 },
                  { month: 'Jun', users: 480 },
                  { month: 'Jul', users: 560 },
                  { month: 'Aug', users: 650 },
                  { month: 'Sep', users: 750 },
                  { month: 'Oct', users: 850 },
                  { month: 'Nov', users: 950 },
                  { month: 'Dec', users: 1050 }
                ]}
                xField="month"
                yField="users"
                color="#52c41a"
                smooth
                height={300}
              />
            </Card>
          </Col>
        </Row>

        {/* Additional Charts Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          {/* Product Categories */}
          <Col xs={24} lg={8}>
            <Card title="Product Categories" extra={<ShoppingCartOutlined />}>
              <Pie
                data={[
                  { category: 'Web Development', value: 35 },
                  { category: 'Mobile Apps', value: 25 },
                  { category: 'E-commerce', value: 20 },
                  { category: 'Portfolio', value: 15 },
                  { category: 'Other', value: 5 }
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

          {/* Order Status */}
          <Col xs={24} lg={8}>
            <Card title="Order Status" extra={<TrophyOutlined />}>
              <Column
                data={[
                  { status: 'Completed', count: 45 },
                  { status: 'Pending', count: 12 },
                  { status: 'Processing', count: 8 },
                  { status: 'Cancelled', count: 3 }
                ]}
                xField="status"
                yField="count"
                color="#1890ff"
                height={300}
              />
            </Card>
          </Col>

          {/* Monthly Sales */}
          <Col xs={24} lg={8}>
            <Card title="Monthly Sales" extra={<DollarOutlined />}>
              <Bar
                data={[
                  { month: 'Jan', sales: 12000 },
                  { month: 'Feb', sales: 15000 },
                  { month: 'Mar', sales: 18000 },
                  { month: 'Apr', sales: 22000 },
                  { month: 'May', sales: 25000 },
                  { month: 'Jun', sales: 28000 }
                ]}
                xField="month"
                yField="sales"
                color="#52c41a"
                height={300}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Recent Users */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <TeamOutlined />
                  Recent Users
                </Space>
              }
              extra={
                <Button type="link" onClick={() => handleViewAll('/admin/users')}>
                  View All
                </Button>
              }
              style={{ height: '100%' }}
            >
              <div className="admin-table-container">
                <Table 
                  dataSource={recentUsers} 
                  columns={userColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: 600 }}
                  className="admin-table-responsive"
                />
              </div>
            </Card>
          </Col>

          {/* Recent Orders */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <ShoppingCartOutlined />
                  Recent Orders
                </Space>
              }
              extra={
                <Button type="link" onClick={() => handleViewAll('/admin/orders')}>
                  View All
                </Button>
              }
              style={{ height: '100%' }}
            >
              <Table 
                dataSource={recentOrders} 
                columns={orderColumns}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* Recent Products */}
        <Row style={{ marginTop: '1rem' }}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <ShoppingCartOutlined />
                  Recent Products
                </Space>
              }
              extra={
                <Space>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/admin/products/new')}
                  >
                    Add Product
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={handleRefreshProducts}
                    loading={productsLoading}
                  >
                    Refresh
                  </Button>
                  <Button type="link" onClick={() => handleViewAll('/admin/products')}>
                    View All
                  </Button>
                </Space>
              }
            >
              {productsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '1rem' }}>Loading products...</div>
                </div>
              ) : products.length > 0 ? (
                <Table 
                  dataSource={products} 
                  columns={productColumns}
                  pagination={false}
                  size="small"
                  rowKey="_id"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <ShoppingCartOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem' }} />
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '1rem' }}>
                    No products created yet
                  </div>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/admin/products/new')}
                  >
                    Create Your First Product
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
    </App>
  )
}

export default AdminDashboardStable
