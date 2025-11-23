import React, { useState, useEffect, useMemo } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, Space, Table, Tag, Avatar, Spin, Alert, Empty } from 'antd'
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined,
  TeamOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import AdminDesignSystem from '../../styles/admin-design-system'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Title, Text } = Typography

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    users: {},
    products: {},
    orders: {},
    prebooks: {},
    chat: {}
  })
  const [recentData, setRecentData] = useState({
    users: [],
    orders: [],
    prebooks: []
  })

  // Load dashboard data from real API
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/admin/dashboard')
      
      if (response.data?.success && response.data?.data) {
        const { users, products, orders, prebooks, recent, chat } = response.data.data
        
        setStats({
          users: users || {},
          products: products || {},
          orders: orders || {},
          prebooks: prebooks || {},
          chat: chat || {}
        })
        
        setRecentData({
          users: recent?.users || [],
          orders: recent?.orders || [],
          prebooks: recent?.prebooks || []
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const handleRefresh = () => {
    loadDashboardData()
  }

  const handleViewAll = (path) => {
    navigate(path)
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount / 100) // Backend stores in paise
  }

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0)
  }

  // Recent Users Columns
  const userColumns = useMemo(() => [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar 
            src={getUserAvatarUrl(record)} 
            icon={<UserOutlined />}
            style={{ backgroundColor: AdminDesignSystem.colors.primary }}
          >
            {getUserInitials(record)}
          </Avatar>
          <div>
            <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
              {text || record.email}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.tiny }}>
              {record.email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isOnline',
      key: 'status',
      render: (isOnline) => (
        <Tag color={isOnline ? AdminDesignSystem.colors.success : AdminDesignSystem.colors.text.secondary}>
          {isOnline ? 'Online' : 'Offline'}
        </Tag>
      )
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
          {date ? new Date(date).toLocaleDateString() : '-'}
        </Text>
      )
    }
  ], [])

  // Recent Orders Columns
  const orderColumns = useMemo(() => [
    {
      title: 'Order ID',
      dataIndex: '_id',
      key: '_id',
      render: (id) => (
        <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
          {id ? id.substring(0, 8) : '-'}
        </Text>
      )
    },
    {
      title: 'Customer',
      dataIndex: ['buyer', 'name'],
      key: 'customer',
      render: (name, record) => name || record.buyer?.email || '-'
    },
    {
      title: 'Product',
      dataIndex: ['product', 'title'],
      key: 'product',
      render: (title) => title || '-'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <Text strong style={{ color: AdminDesignSystem.colors.success }}>
          {amount ? formatCurrency(amount) : '-'}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusColors = {
          'paid': AdminDesignSystem.colors.success,
          'created': AdminDesignSystem.colors.warning,
          'cancelled': AdminDesignSystem.colors.error,
        }
        return (
          <Tag color={statusColors[status] || AdminDesignSystem.colors.text.secondary}>
            {status?.toUpperCase() || '-'}
          </Tag>
        )
      }
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
          {date ? new Date(date).toLocaleDateString() : '-'}
        </Text>
      )
    }
  ], [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: AdminDesignSystem.spacing.md
      }}>
        <Spin size="large" />
        <Text type="secondary">Loading dashboard data...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
        style={{ margin: AdminDesignSystem.spacing.lg }}
      />
    )
  }

  return (
    <div 
      className="admin-dashboard"
      style={{
        padding: AdminDesignSystem.layout.content.padding,
        background: AdminDesignSystem.colors.background,
        minHeight: '100vh',
      }}
    >
      {/* Override CSS for Statistic values */}
      <style>
        {`
          .admin-dashboard .ant-statistic-content-value,
          .admin-dashboard .ant-statistic-content {
            color: #1F2937 !important;
          }
          .admin-dashboard .ant-card .ant-statistic-content-value {
            color: #1F2937 !important;
          }
        `}
      </style>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: AdminDesignSystem.spacing.xl,
      }}>
        <Title 
          level={2} 
          style={{
            margin: 0,
            color: AdminDesignSystem.colors.text.primary,
            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
          }}
        >
          Dashboard Overview
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
        {/* Users Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Total Users
                </Text>
              }
              value={formatNumber(stats.users.totalUsers)}
              prefix={<UserOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
            <div style={{ marginTop: AdminDesignSystem.spacing.sm }}>
              <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
                <RiseOutlined style={{ color: AdminDesignSystem.colors.success, marginRight: 4 }} />
                {formatNumber(stats.users.newUsersToday)} new today
              </Text>
            </div>
          </Card>
        </Col>

        {/* Products Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Total Products
                </Text>
              }
              value={formatNumber(stats.products.totalProducts)}
              prefix={<ShoppingOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
            <div style={{ marginTop: AdminDesignSystem.spacing.sm }}>
              <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
                {formatNumber(stats.products.publishedProducts)} published
              </Text>
            </div>
          </Card>
        </Col>

        {/* Orders Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Total Orders
                </Text>
              }
              value={formatNumber(stats.orders.totalOrders)}
              prefix={<ShoppingCartOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
            <div style={{ marginTop: AdminDesignSystem.spacing.sm }}>
              <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
                {formatNumber(stats.orders.pendingOrders)} pending
              </Text>
            </div>
          </Card>
        </Col>

        {/* Revenue Stats */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Total Revenue
                </Text>
              }
              value={formatCurrency(stats.orders.totalRevenue || 0)}
              prefix={<DollarOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
            <div style={{ marginTop: AdminDesignSystem.spacing.sm }}>
              <Text type="secondary" style={{ fontSize: AdminDesignSystem.typography.fontSize.small }}>
                {formatCurrency(stats.orders.todayRevenue || 0)} today
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Stats Row */}
      <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginTop: AdminDesignSystem.spacing.md }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Active Users
                </Text>
              }
              value={formatNumber(stats.users.activeUsers)}
              prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Low Stock Products
                </Text>
              }
              value={formatNumber(stats.products.lowStockProducts)}
              prefix={<WarningOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Completed Orders
                </Text>
              }
              value={formatNumber(stats.orders.completedOrders)}
              prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              valueStyle={{ 
                color: '#1F2937', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
              background: '#FFFFFF', // Explicit white background
            }}
          >
            <Statistic
              title={
                <Text style={{ color: AdminDesignSystem.colors.text.secondary }}>
                  Total Prebooks
                </Text>
              }
              value={formatNumber(stats.prebooks.total)}
              prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              valueStyle={{ 
                color: '#000000', // Explicit dark color for better contrast
                fontSize: AdminDesignSystem.typography.fontSize.h2,
                fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Data Tables */}
      <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginTop: AdminDesignSystem.spacing.lg }}>
        {/* Recent Users */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: AdminDesignSystem.colors.primary }} />
                <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                  Recent Users
                </Text>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => handleViewAll('/admin/users')}>
                View All
              </Button>
            }
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            }}
          >
            {recentData.users.length > 0 ? (
              <Table
                dataSource={recentData.users}
                columns={userColumns}
                pagination={false}
                size="small"
                rowKey="_id"
              />
            ) : (
              <Empty
                description="No recent users"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>

        {/* Recent Orders */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined style={{ color: AdminDesignSystem.colors.success }} />
                <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                  Recent Orders
                </Text>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => handleViewAll('/admin/orders')}>
                View All
              </Button>
            }
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            }}
          >
            {recentData.orders.length > 0 ? (
              <Table
                dataSource={recentData.orders}
                columns={orderColumns}
                pagination={false}
                size="small"
                rowKey="_id"
              />
            ) : (
              <Empty
                description="No recent orders"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginTop: AdminDesignSystem.spacing.lg }}>
        <Col xs={24}>
          <Card
            title={
              <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                Quick Actions
              </Text>
            }
            style={{
              borderRadius: AdminDesignSystem.borderRadius.md,
              boxShadow: AdminDesignSystem.shadows.md,
              border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            }}
          >
            <Space wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/products/new')}
                style={{
                  backgroundColor: AdminDesignSystem.colors.primary,
                  borderColor: AdminDesignSystem.colors.primary,
                }}
              >
                Add Product
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={() => navigate('/admin/users')}
              >
                Manage Users
              </Button>
              <Button
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/admin/orders')}
              >
                View Orders
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => navigate('/admin/analytics')}
              >
                View Analytics
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminDashboard
