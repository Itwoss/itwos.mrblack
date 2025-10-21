import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Spin, Empty, Row, Col, Statistic, App, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { 
  DollarOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined, 
  EyeOutlined, 
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const PaymentTracking = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { message: messageApi } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    dateRange: null,
    search: ''
  })
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
      const response = await fetch('http://localhost:7000/api/prebook?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const fetchedPrebooks = data.data?.prebooks || []
        
        // Filter only paid prebooks
        const paidPrebooks = fetchedPrebooks.filter(p => p.paymentStatus === 'completed')
        setPayments(paidPrebooks)
        
        // Calculate stats
        const totalPayments = paidPrebooks.length
        const totalAmount = paidPrebooks.reduce((sum, p) => sum + ((p.paymentAmount || 0) / 100), 0)
        const completedPayments = paidPrebooks.filter(p => p.paymentStatus === 'completed').length
        const pendingPayments = fetchedPrebooks.filter(p => p.paymentStatus === 'pending').length
        const failedPayments = fetchedPrebooks.filter(p => p.paymentStatus === 'failed').length
        
        setStats({
          totalPayments,
          totalAmount,
          completedPayments,
          pendingPayments,
          failedPayments
        })
      } else {
        messageApi.error('Failed to fetch payments')
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      messageApi.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchPayments()
    } else if (!authLoading && !isAuthenticated) {
      navigate('/admin/login')
    }
  }, [isAuthenticated, user, authLoading, navigate])

  const handleViewDetails = (record) => {
    setSelectedPayment(record)
    setDetailModalVisible(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green'
      case 'pending': return 'orange'
      case 'failed': return 'red'
      default: return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />
      case 'pending': return <ClockCircleOutlined />
      case 'failed': return <CloseCircleOutlined />
      default: return <ClockCircleOutlined />
    }
  }

  const columns = [
    {
      title: 'Payment ID',
      dataIndex: 'paymentId',
      key: 'paymentId',
      render: (paymentId) => (
        <Text code>{paymentId || 'N/A'}</Text>
      )
    },
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div>
          <Text strong>{record.userId?.name || 'Unknown User'}</Text>
          <br />
          <Text type="secondary">{record.userId?.email || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <Text strong>{record.productId?.title || 'Product Deleted'}</Text>
          <br />
          <Text type="secondary">₹{((record.paymentAmount || 0) / 100).toFixed(2)}</Text>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'paymentAmount',
      key: 'paymentAmount',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>₹{((amount || 0) / 100).toFixed(2)}</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status?.toUpperCase() || 'PENDING'}
        </Tag>
      )
    },
    {
      title: 'Payment Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            View Details
          </Button>
        </Space>
      )
    }
  ]

  const filteredPayments = payments.filter(payment => {
    if (filters.status && payment.paymentStatus !== filters.status) return false
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return (
        payment.userId?.name?.toLowerCase().includes(searchTerm) ||
        payment.userId?.email?.toLowerCase().includes(searchTerm) ||
        payment.productId?.title?.toLowerCase().includes(searchTerm) ||
        payment.paymentId?.toLowerCase().includes(searchTerm)
      )
    }
    return true
  })

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Payment Tracking</Title>
        <Paragraph type="secondary">
          Monitor all payment transactions and prebook payments
        </Paragraph>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={stats.totalPayments}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completedPayments}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pendingPayments}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search payments..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="completed">Completed</Option>
              <Option value="pending">Pending</Option>
              <Option value="failed">Failed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchPayments}
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Payment Details Modal */}
      <Modal
        title="Payment Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedPayment && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="Payment Information" size="small">
                  <p><strong>Payment ID:</strong> {selectedPayment.paymentId || 'N/A'}</p>
                  <p><strong>Order ID:</strong> {selectedPayment.paymentOrderId || 'N/A'}</p>
                  <p><strong>Amount:</strong> ₹{((selectedPayment.paymentAmount || 0) / 100).toFixed(2)}</p>
                  <p><strong>Status:</strong> 
                    <Tag color={getStatusColor(selectedPayment.paymentStatus)}>
                      {selectedPayment.paymentStatus?.toUpperCase() || 'PENDING'}
                    </Tag>
                  </p>
                  <p><strong>Payment Date:</strong> {selectedPayment.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleString() : 'N/A'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="User Information" size="small">
                  <p><strong>Name:</strong> {selectedPayment.userId?.name || 'N/A'}</p>
                  <p><strong>Email:</strong> {selectedPayment.userId?.email || 'N/A'}</p>
                  <p><strong>User ID:</strong> {selectedPayment.userId?._id || 'N/A'}</p>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Card title="Product Information" size="small">
                  <p><strong>Product:</strong> {selectedPayment.productId?.title || 'Product Deleted'}</p>
                  <p><strong>Project Type:</strong> {selectedPayment.projectType || 'N/A'}</p>
                  <p><strong>Budget:</strong> {selectedPayment.budget || 'N/A'}</p>
                  <p><strong>Timeline:</strong> {selectedPayment.timeline || 'N/A'} days</p>
                  <p><strong>Features:</strong> {selectedPayment.features?.join(', ') || 'N/A'}</p>
                  <p><strong>Notes:</strong> {selectedPayment.notes || 'N/A'}</p>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PaymentTracking
