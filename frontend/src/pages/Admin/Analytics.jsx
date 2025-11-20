import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Statistic, Progress, Table, Select, DatePicker, Space, Button } from 'antd'
import { 
  BarChartOutlined, 
  RiseOutlined, 
  FallOutlined, 
  TrophyOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'

const { Title, Paragraph } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const Analytics = () => {
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('7d')
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    totalUsers: 0,
    usersGrowth: 0,
    conversionRate: 0,
    conversionGrowth: 0
  })

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      console.log('🔄 Analytics: Loading analytics data...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Analytics: Dashboard data received:', data)
        
        if (data.success && data.data) {
          const { users, orders, products } = data.data
          
          setAnalytics({
            totalRevenue: orders?.totalRevenue || 0,
            revenueGrowth: 15.2, // This would come from comparison with previous period
            totalOrders: orders?.totalOrders || 0,
            ordersGrowth: 8.5, // This would come from comparison with previous period
            totalUsers: users?.totalUsers || 0,
            usersGrowth: 12.3, // This would come from comparison with previous period
            conversionRate: 85.6, // This would be calculated
            conversionGrowth: 3.2 // This would come from comparison with previous period
          })
          
          console.log('✅ Analytics: Analytics data updated successfully')
        } else {
          console.log('❌ Analytics: API returned unsuccessful response, using demo data')
          setAnalytics({
            totalRevenue: 12580,
            revenueGrowth: 15.2,
            totalOrders: 156,
            ordersGrowth: 8.5,
            totalUsers: 1247,
            usersGrowth: 12.3,
            conversionRate: 85.6,
            conversionGrowth: 3.2
          })
        }
      } else {
        console.error('❌ Analytics: Failed to fetch analytics data:', response.status)
        // Use demo data when API fails
        setAnalytics({
          totalRevenue: 12580,
          revenueGrowth: 15.2,
          totalOrders: 156,
          ordersGrowth: 8.5,
          totalUsers: 1247,
          usersGrowth: 12.3,
          conversionRate: 85.6,
          conversionGrowth: 3.2
        })
      }
    } catch (error) {
      console.error('❌ Analytics: Error loading analytics data:', error)
      // Use demo data when API fails
      setAnalytics({
        totalRevenue: 12580,
        revenueGrowth: 15.2,
        totalOrders: 156,
        ordersGrowth: 8.5,
        totalUsers: 1247,
        usersGrowth: 12.3,
        conversionRate: 85.6,
        conversionGrowth: 3.2
      })
    } finally {
      setLoading(false)
    }
  }

  const [topProducts] = useState([
    { id: 'product-1', name: 'E-commerce Website Template', sales: 45, revenue: 44955, growth: 12.5 },
    { id: 'product-2', name: 'Portfolio Website Template', sales: 32, revenue: 19168, growth: 8.3 },
    { id: 'product-3', name: 'Blog Website Template', sales: 28, revenue: 11172, growth: 15.7 },
    { id: 'product-4', name: 'Corporate Website Template', sales: 25, revenue: 19975, growth: 6.2 },
    { id: 'product-5', name: 'Landing Page Template', sales: 20, revenue: 5980, growth: 22.1 }
  ])

  const [trafficSources] = useState([
    { id: 'traffic-1', source: 'Google Search', visitors: 45.2, percentage: 45.2 },
    { id: 'traffic-2', source: 'Direct Traffic', visitors: 28.7, percentage: 28.7 },
    { id: 'traffic-3', source: 'Social Media', visitors: 15.3, percentage: 15.3 },
    { id: 'traffic-4', source: 'Email Marketing', visitors: 8.1, percentage: 8.1 },
    { id: 'traffic-5', source: 'Referrals', visitors: 2.7, percentage: 2.7 }
  ])

  const [recentActivity] = useState([
    { id: 'activity-1', action: 'New user registered', user: 'John Doe', time: '2 hours ago', type: 'user' },
    { id: 'activity-2', action: 'Order completed', user: 'Sarah Smith', time: '3 hours ago', type: 'order' },
    { id: 'activity-3', action: 'Product published', user: 'Admin', time: '5 hours ago', type: 'product' },
    { id: 'activity-4', action: 'Payment received', user: 'Mike Johnson', time: '6 hours ago', type: 'payment' },
    { id: 'activity-5', action: 'User logged in', user: 'Emily Davis', time: '8 hours ago', type: 'user' }
  ])

  const productColumns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Sales',
      dataIndex: 'sales',
      key: 'sales',
      render: (sales) => `${sales} units`
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue) => `$${revenue.toLocaleString()}`
    },
    {
      title: 'Growth',
      dataIndex: 'growth',
      key: 'growth',
      render: (growth) => (
        <span style={{ color: growth > 0 ? '#52c41a' : '#f5222d' }}>
          {growth > 0 ? '+' : ''}{growth}%
        </span>
      )
    }
  ]

  const activityColumns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user'
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{ 
          padding: '2px 8px', 
          borderRadius: '4px', 
          backgroundColor: type === 'user' ? '#e6f7ff' : type === 'order' ? '#f6ffed' : type === 'product' ? '#fff7e6' : '#f9f0ff',
          color: type === 'user' ? '#1890ff' : type === 'order' ? '#52c41a' : type === 'product' ? '#fa8c16' : '#722ed1'
        }}>
          {type.toUpperCase()}
        </span>
      )
    }
  ]

  return (
    <DashboardLayout userRole="admin">
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            📊 Analytics Dashboard
          </Title>
          <Paragraph>
            Monitor performance metrics, track growth, and analyze user behavior.
          </Paragraph>
        </div>

        {/* Time Range Selector */}
        <Card style={{ marginBottom: '2rem' }}>
          <Space>
            <span>Time Range:</span>
            <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
              <Option value="24h">Last 24h</Option>
              <Option value="7d">Last 7 days</Option>
              <Option value="30d">Last 30 days</Option>
              <Option value="90d">Last 90 days</Option>
            </Select>
            <RangePicker />
            <Button icon={<FilterOutlined />}>Apply Filters</Button>
            <Button icon={<DownloadOutlined />}>Export Report</Button>
          </Space>
        </Card>

        {/* Key Metrics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={analytics.totalRevenue}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                +{analytics.revenueGrowth}% from last period
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Orders"
                value={analytics.totalOrders}
                prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                +{analytics.ordersGrowth}% from last period
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={analytics.totalUsers}
                prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                suffix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                +{analytics.usersGrowth}% from last period
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Conversion Rate"
                value={analytics.conversionRate}
                suffix="%"
                prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                +{analytics.conversionGrowth}% from last period
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Top Products */}
          <Col xs={24} lg={12}>
            <Card title="Top Selling Products" extra={<Button type="link">View All</Button>}>
              <Table
                dataSource={topProducts}
                columns={productColumns}
                pagination={false}
                size="small"
                rowKey="id"
              />
            </Card>
          </Col>

          {/* Traffic Sources */}
          <Col xs={24} lg={12}>
            <Card title="Traffic Sources">
              {trafficSources.map((source) => (
                <div key={source.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{source.source}</span>
                    <span>{source.visitors}%</span>
                  </div>
                  <Progress 
                    percent={source.percentage} 
                    showInfo={false}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              ))}
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row style={{ marginTop: '2rem' }}>
          <Col span={24}>
            <Card title="Recent Activity" extra={<Button type="link">View All</Button>}>
              <Table
                dataSource={recentActivity}
                columns={activityColumns}
                pagination={false}
                size="small"
                rowKey="id"
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Charts Placeholder */}
        <Row gutter={[16, 16]} style={{ marginTop: '2rem' }}>
          <Col xs={24} lg={12}>
            <Card title="Revenue Trend">
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <BarChartOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  <div style={{ marginTop: 16, color: '#666' }}>Revenue Chart</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Chart visualization would be here</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="User Growth">
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                  <div style={{ marginTop: 16, color: '#666' }}>User Growth Chart</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Chart visualization would be here</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  )
}

export default Analytics




