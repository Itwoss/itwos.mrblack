import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Form, Progress, Badge, Timeline } from 'antd'
import { 
  DollarOutlined, 
  ShoppingCartOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  SearchOutlined, 
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  PrinterOutlined,
  DownloadOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import { paymentAPI, adminAPI, prebookAPI } from '../../services/api'
import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
const { Search } = Input
const { Option } = Select

const OrdersSales = () => {
  const [orders, setOrders] = useState([])
  const [prebooks, setPrebooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [prebookLoading, setPrebookLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [prebookModalVisible, setPrebookModalVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedPrebook, setSelectedPrebook] = useState(null)
  const [activeTab, setActiveTab] = useState('orders')
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    monthlyGrowth: 0
  })

  useEffect(() => {
    fetchOrders()
    fetchPrebooks()
    fetchStats()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await paymentAPI.getAllPurchases({ limit: 100 })
      if (response.data.success) {
        setOrders(response.data.purchases || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPrebooks = async () => {
    setPrebookLoading(true)
    try {
      const response = await prebookAPI.getAllPrebooks({ limit: 100 })
      if (response.data.success) {
        setPrebooks(response.data.data.prebooks || [])
      }
    } catch (error) {
      console.error('Failed to fetch prebooks:', error)
      setPrebooks([])
    } finally {
      setPrebookLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getDashboard()
      if (response.data.success && response.data.stats) {
        setStats({
          totalOrders: response.data.stats.totalOrders || 0,
          totalRevenue: response.data.stats.totalRevenue || 0,
          pendingOrders: response.data.stats.pendingOrders || 0,
          completedOrders: response.data.stats.completedOrders || 0,
          averageOrderValue: response.data.stats.averageOrderValue || 0,
          monthlyGrowth: response.data.stats.monthlyGrowth || 0
        })
      } else {
        // Calculate stats from orders if dashboard stats not available
        const totalOrders = orders.length
        const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0)
        const pendingOrders = orders.filter(o => o.status === 'pending').length
        const completedOrders = orders.filter(o => o.status === 'completed').length
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
        
        setStats({
          totalOrders,
          totalRevenue,
          pendingOrders,
          completedOrders,
          averageOrderValue,
          monthlyGrowth: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Calculate basic stats from orders
      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0)
      const pendingOrders = orders.filter(o => o.status === 'pending').length
      const completedOrders = orders.filter(o => o.status === 'completed').length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      
      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        averageOrderValue,
        monthlyGrowth: 0
      })
    }
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setModalVisible(true)
  }

  const handleViewPrebook = (prebook) => {
    setSelectedPrebook(prebook)
    setPrebookModalVisible(true)
  }

  const handleUpdatePrebookStatus = async (prebookId, status, adminNotes) => {
    try {
      const response = await prebookAPI.updatePrebookStatus(prebookId, {
        status,
        adminNotes
      })
      if (response.data.success) {
        fetchPrebooks() // Refresh the list
        setPrebookModalVisible(false)
      }
    } catch (error) {
      console.error('Failed to update prebook status:', error)
    }
  }

  const handleStatusChange = (orderId, status) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o))
    message.success(`Order ${status} successfully`)
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': AdminDesignSystem.colors.success,
      'paid': AdminDesignSystem.colors.success,
      'pending': AdminDesignSystem.colors.warning,
      'created': AdminDesignSystem.colors.warning,
      'processing': AdminDesignSystem.colors.primary,
      'cancelled': AdminDesignSystem.colors.error,
      'refunded': AdminDesignSystem.colors.secondary
    }
    return colors[status] || AdminDesignSystem.colors.text.secondary
  }

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (customer) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{customer.email}</div>
        </div>
      )
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      render: (product) => (
        <Space>
          <img src={product.thumbnail} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{product.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>${product.price}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <strong style={{ color: AdminDesignSystem.colors.success }}>
          {formatCurrency(amount || 0)}
        </strong>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      )
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
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewOrder(record)}>View</Button>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
          <Button size="small" icon={<PrinterOutlined />}>Print</Button>
        </Space>
      )
    }
  ]

  const prebookColumns = [
    {
      title: 'Customer',
      dataIndex: 'contactInfo',
      key: 'customer',
      render: (contactInfo) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{contactInfo.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{contactInfo.email}</div>
        </div>
      )
    },
    {
      title: 'Product',
      dataIndex: 'productId',
      key: 'product',
      render: (product) => product ? product.title : 'N/A'
    },
    {
      title: 'Project Type',
      dataIndex: 'projectType',
      key: 'projectType',
      render: (type) => type.replace('-', ' ').toUpperCase()
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
      render: (budget) => {
        const budgetMap = {
          'under-5k': 'Under $5,000',
          '5k-10k': '$5,000 - $10,000',
          '10k-25k': '$10,000 - $25,000',
          '25k-50k': '$25,000 - $50,000',
          '50k-100k': '$50,000 - $100,000',
          '100k-plus': '$100,000+'
        }
        return budgetMap[budget] || budget
      }
    },
    {
      title: 'Timeline',
      dataIndex: 'timeline',
      key: 'timeline',
      render: (timeline) => `${timeline} days`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'orange',
          reviewed: 'blue',
          accepted: 'green',
          rejected: 'red',
          completed: 'green'
        }
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewPrebook(record)}>
            View
          </Button>
        </Space>
      )
    }
  ]

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount / 100) // Backend stores in paise
  }

  return (
    <DashboardLayout userRole="admin">
      <div style={{
        padding: AdminDesignSystem.layout.content.padding,
        background: AdminDesignSystem.colors.background,
        minHeight: '100vh',
        fontFamily: AdminDesignSystem.typography.fontFamily,
      }}>
        {/* Header */}
        <div style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Title 
            level={2} 
            style={{ 
              marginBottom: AdminDesignSystem.spacing.sm,
              color: AdminDesignSystem.colors.text.primary,
              fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              fontSize: AdminDesignSystem.typography.fontSize.h2,
            }}
          >
            <DollarOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.success }} />
            Orders & Sales
          </Title>
          <Paragraph style={{ 
            color: AdminDesignSystem.colors.text.secondary,
            fontSize: AdminDesignSystem.typography.fontSize.body,
          }}>
            Track orders, manage sales, and monitor revenue performance.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Total Orders
                  </Text>
                }
                value={stats.totalOrders}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<ShoppingCartOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Total Revenue
                  </Text>
                }
                value={formatCurrency(stats.totalRevenue || 0)}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<DollarOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                suffix={<RiseOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Pending Orders
                  </Text>
                }
                value={stats.pendingOrders}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.warning,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Completed Orders
                  </Text>
                }
                value={stats.completedOrders}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Additional Stats */}
        <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Average Order Value
                  </Text>
                }
                value={formatCurrency(stats.averageOrderValue || 0)}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<TrophyOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Monthly Growth
                  </Text>
                }
                value={stats.monthlyGrowth || 0}
                suffix="%"
                valueStyle={{ 
                  color: stats.monthlyGrowth >= 0 ? AdminDesignSystem.colors.success : AdminDesignSystem.colors.error,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<RiseOutlined style={{ color: stats.monthlyGrowth >= 0 ? AdminDesignSystem.colors.success : AdminDesignSystem.colors.error }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Orders and Prebooks Tabs */}
        <Card 
          title={
            <Space>
              <Button 
                type={activeTab === 'orders' ? 'primary' : 'default'}
                onClick={() => setActiveTab('orders')}
                style={{
                  borderRadius: AdminDesignSystem.borderRadius.md,
                  backgroundColor: activeTab === 'orders' ? AdminDesignSystem.colors.primary : 'transparent',
                  borderColor: activeTab === 'orders' ? AdminDesignSystem.colors.primary : AdminDesignSystem.colors.card.border,
                }}
              >
                Orders ({orders.length})
              </Button>
              <Button 
                type={activeTab === 'prebooks' ? 'primary' : 'default'}
                onClick={() => setActiveTab('prebooks')}
                style={{
                  borderRadius: AdminDesignSystem.borderRadius.md,
                  backgroundColor: activeTab === 'prebooks' ? AdminDesignSystem.colors.primary : 'transparent',
                  borderColor: activeTab === 'prebooks' ? AdminDesignSystem.colors.primary : AdminDesignSystem.colors.card.border,
                }}
              >
                Prebook Requests ({prebooks.length})
              </Button>
            </Space>
          }
          extra={
            <Space>
              <Search 
                placeholder={`Search ${activeTab}...`} 
                style={{ width: 200 }}
                allowClear
              />
              <Select 
                placeholder="Filter by status" 
                style={{ width: 150 }}
              >
                <Option value="all">All {activeTab === 'orders' ? 'Orders' : 'Requests'}</Option>
                <Option value="pending">Pending</Option>
                <Option value="processing">Processing</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
              <Button 
                icon={<DownloadOutlined />}
                style={{
                  borderRadius: AdminDesignSystem.borderRadius.md,
                }}
              >
                Export
              </Button>
            </Space>
          }
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          {activeTab === 'orders' ? (
            <Table
              columns={columns}
              dataSource={orders}
              loading={loading}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          ) : (
            <Table
              columns={prebookColumns}
              dataSource={prebooks}
              loading={prebookLoading}
              rowKey="_id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          )}
        </Card>

        {/* Order Detail Modal */}
        <Modal
          title={`Order Details - ${selectedOrder?.orderId}`}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <div>
              {/* Order details content */}
            </div>
          )}
        </Modal>

        {/* Prebook Detail Modal */}
        <Modal
          title={`Prebook Request Details`}
          open={prebookModalVisible}
          onCancel={() => setPrebookModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedPrebook && (
            <div>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" title="Customer Information">
                    <p><strong>Name:</strong> {selectedPrebook.contactInfo.name}</p>
                    <p><strong>Email:</strong> {selectedPrebook.contactInfo.email}</p>
                    <p><strong>Phone:</strong> {selectedPrebook.contactInfo.phone || 'N/A'}</p>
                    <p><strong>Company:</strong> {selectedPrebook.contactInfo.company || 'N/A'}</p>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="Project Details">
                    <p><strong>Product:</strong> {selectedPrebook.productId?.title || 'N/A'}</p>
                    <p><strong>Project Type:</strong> {selectedPrebook.projectType.replace('-', ' ').toUpperCase()}</p>
                    <p><strong>Budget:</strong> {
                      selectedPrebook.budget === 'under-5k' ? 'Under $5,000' :
                      selectedPrebook.budget === '5k-10k' ? '$5,000 - $10,000' :
                      selectedPrebook.budget === '10k-25k' ? '$10,000 - $25,000' :
                      selectedPrebook.budget === '25k-50k' ? '$25,000 - $50,000' :
                      selectedPrebook.budget === '50k-100k' ? '$50,000 - $100,000' :
                      selectedPrebook.budget === '100k-plus' ? '$100,000+' :
                      selectedPrebook.budget
                    }</p>
                    <p><strong>Timeline:</strong> {selectedPrebook.timeline} days</p>
                  </Card>
                </Col>
              </Row>
              
              {selectedPrebook.features && selectedPrebook.features.length > 0 && (
                <Card size="small" title="Requested Features" style={{ marginTop: 16 }}>
                  <Space wrap>
                    {selectedPrebook.features.map((feature, index) => (
                      <Tag key={index}>{feature.replace('-', ' ').toUpperCase()}</Tag>
                    ))}
                  </Space>
                </Card>
              )}
              
              {selectedPrebook.notes && (
                <Card size="small" title="Additional Notes" style={{ marginTop: 16 }}>
                  <p>{selectedPrebook.notes}</p>
                </Card>
              )}
              
              <Card size="small" title="Admin Actions" style={{ marginTop: 16 }}>
                <Space>
                  <Select 
                    placeholder="Update Status" 
                    style={{ width: 150 }}
                    onChange={(value) => {
                      if (value) {
                        handleUpdatePrebookStatus(selectedPrebook._id, value, '')
                      }
                    }}
                  >
                    <Option value="pending">Pending</Option>
                    <Option value="reviewed">Reviewed</Option>
                    <Option value="accepted">Accepted</Option>
                    <Option value="rejected">Rejected</Option>
                    <Option value="completed">Completed</Option>
                  </Select>
                  <Button type="primary">Update Status</Button>
                </Space>
              </Card>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default OrdersSales




