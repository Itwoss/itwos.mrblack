import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Spin, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Row, 
  Col, 
  Statistic,
  Badge,
  Tooltip,
  App,
  Tabs,
  Avatar,
  Popconfirm
} from 'antd'
import { 
  BookOutlined, 
  EyeOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  CalendarOutlined,
  TagOutlined,
  MessageOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'

import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const PrebookManagement = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [prebooks, setPrebooks] = useState([])
  const [selectedPrebook, setSelectedPrebook] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusForm] = Form.useForm()
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('prebooks')
  const [paymentTracking, setPaymentTracking] = useState([])
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    subscriptions: 0,
    products: 0,
    totalAmount: 0
  })

  useEffect(() => {
    fetchPrebooks()
    fetchPaymentTracking()
  }, [])

  const fetchPaymentTracking = async () => {
    setPaymentLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('accessToken')
      const response = await fetch('http://localhost:7000/api/payment-tracking?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.payments) {
          setPaymentTracking(data.payments)
          
          // Calculate stats
          const total = data.payments.length
          const subscriptions = data.payments.filter(p => p.paymentType === 'subscription').length
          const products = data.payments.filter(p => p.paymentType === 'product').length
          const totalAmount = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
          
          setPaymentStats({ total, subscriptions, products, totalAmount })
        }
      } else {
        message.error('Failed to fetch payment tracking')
      }
    } catch (error) {
      console.error('Error fetching payment tracking:', error)
      message.error('Network error')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleRequestDeletion = async (paymentId) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('accessToken')
      const response = await fetch(`http://localhost:7000/api/payment-tracking/${paymentId}/request-deletion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        message.success(data.message || 'Deletion requested. 2 more confirmations required.')
        fetchPaymentTracking()
      } else {
        message.error('Failed to request deletion')
      }
    } catch (error) {
      console.error('Error requesting deletion:', error)
      message.error('Network error')
    }
  }

  const handleConfirmDeletion = async (paymentId) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('accessToken')
      const response = await fetch(`http://localhost:7000/api/payment-tracking/${paymentId}/confirm-deletion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        message.success(data.message)
        if (data.deleted) {
          message.success('Payment record deleted successfully after 3 confirmations.')
        }
        fetchPaymentTracking()
      } else {
        message.error('Failed to confirm deletion')
      }
    } catch (error) {
      console.error('Error confirming deletion:', error)
      message.error('Network error')
    }
  }

  const fetchPrebooks = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:7000/api/prebook/admin/all?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token') || 'mock-token'}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPrebooks(data.data?.prebooks || [])
        
        // Calculate stats
        const total = data.data?.prebooks?.length || 0
        const pending = data.data?.prebooks?.filter(p => p.status === 'pending').length || 0
        const approved = data.data?.prebooks?.filter(p => p.status === 'approved').length || 0
        const rejected = data.data?.prebooks?.filter(p => p.status === 'rejected').length || 0
        
        setStats({ total, pending, approved, rejected })
      } else {
        message.error('Failed to fetch prebooks')
      }
    } catch (error) {
      console.error('Error fetching prebooks:', error)
      message.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (prebook) => {
    setSelectedPrebook(prebook)
    setDetailModalVisible(true)
  }

  const handleStatusChange = (prebook) => {
    setSelectedPrebook(prebook)
    statusForm.setFieldsValue({
      status: prebook.status,
      adminNotes: prebook.adminNotes || ''
    })
    setStatusModalVisible(true)
  }

  const handleStatusUpdate = async (values) => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:7000/api/prebook/${selectedPrebook._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token') || 'mock-token'}`
        },
        body: JSON.stringify({
          status: values.status,
          adminNotes: values.adminNotes
        })
      })

      if (response.ok) {
        setUpdateSuccess(true) // Show success state
        message.success(`Prebook ${values.status} successfully!`)
        
        // Close modals and refresh data after a short delay
        setTimeout(() => {
          setStatusModalVisible(false)
          setDetailModalVisible(false) // Close detail modal too
          setSelectedPrebook(null) // Clear selected prebook
          setUpdateSuccess(false) // Reset success state
          fetchPrebooks() // Refresh the list
        }, 1500) // 1.5 second delay to show success message
      } else {
        const error = await response.json()
        message.error(error.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      message.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return AdminDesignSystem.colors.warning
      case 'reviewed': return AdminDesignSystem.colors.primary
      case 'accepted': return AdminDesignSystem.colors.success
      case 'rejected': return AdminDesignSystem.colors.error
      case 'completed': return AdminDesignSystem.colors.secondary
      default: return AdminDesignSystem.colors.text.secondary
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount / 100) // Backend stores in paise
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />
      case 'reviewed': return <EyeOutlined />
      case 'accepted': return <CheckCircleOutlined />
      case 'rejected': return <CloseCircleOutlined />
      case 'completed': return <CheckCircleOutlined />
      default: return null
    }
  }

  const columns = [
    {
      title: 'User',
      dataIndex: ['userId', 'name'],
      key: 'userName',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div>{text || 'N/A'}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.userId?.email || 'N/A'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Product',
      dataIndex: ['productId', 'title'],
      key: 'productTitle',
      render: (text, record) => (
        <Space>
          {record.productId?.thumbnailUrl && (
            <img 
              src={record.productId.thumbnailUrl} 
              alt="product" 
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }} 
            />
          )}
          <div>
            <div>{text || 'N/A'}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ${record.productId?.price || 'N/A'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Project Details',
      key: 'projectDetails',
      render: (_, record) => (
        <div>
          <div><TagOutlined /> {record.projectType}</div>
          <div><DollarOutlined /> {record.budget}</div>
          <div><CalendarOutlined /> {record.timeline} days</div>
        </div>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contactInfo',
      render: (_, record) => (
        <div>
          <div><UserOutlined /> {record.contactInfo?.name || 'N/A'}</div>
          <div><MailOutlined /> {record.contactInfo?.email || 'N/A'}</div>
          <div><PhoneOutlined /> {record.contactInfo?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={getStatusColor(status)} 
          icon={getStatusIcon(status)}
          style={{
            borderRadius: AdminDesignSystem.borderRadius.sm,
          }}
        >
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Change Status">
            <Button 
              type="primary"
              icon={getStatusIcon(record.status)}
              onClick={() => handleStatusChange(record)}
            >
              {record.status === 'pending' ? 'Review' : 'Update'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const paymentColumns = [
    {
      title: 'User',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            src={record.userAvatar} 
            icon={<UserOutlined />}
          >
            {record.userName ? record.userName.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.userName || 'Unknown User'}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.userEmail || record.username}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Payment Type',
      key: 'paymentType',
      render: (_, record) => (
        <Tag 
          color={
            record.paymentType === 'subscription' ? AdminDesignSystem.colors.primary : 
            record.paymentType === 'product' ? AdminDesignSystem.colors.success : 
            AdminDesignSystem.colors.warning
          }
          style={{
            borderRadius: AdminDesignSystem.borderRadius.sm,
          }}
        >
          {record.paymentType?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => (
        <Text 
          strong 
          style={{ 
            color: AdminDesignSystem.colors.success, 
            fontSize: AdminDesignSystem.typography.fontSize.body,
          }}
        >
          {formatCurrency(record.amount || 0)}
        </Text>
      )
    },
    {
      title: 'Payment Details',
      key: 'paymentDetails',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '11px', marginBottom: '4px' }}>
            <Text code copyable style={{ fontSize: '11px' }}>
              {record.razorpayPaymentId || '-'}
            </Text>
          </div>
          {record.razorpayOrderId && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              Order: <Text code style={{ fontSize: '11px' }}>{record.razorpayOrderId}</Text>
            </div>
          )}
          {record.planMonths && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Plan: {record.planMonths} Month{record.planMonths > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const statusColors = {
          'completed': AdminDesignSystem.colors.success,
          'pending': AdminDesignSystem.colors.warning,
          'failed': AdminDesignSystem.colors.error,
          'refunded': AdminDesignSystem.colors.primary,
          'cancelled': AdminDesignSystem.colors.text.secondary
        }
        return (
          <Tag 
            color={statusColors[record.status] || AdminDesignSystem.colors.text.secondary}
            style={{
              borderRadius: AdminDesignSystem.borderRadius.sm,
            }}
          >
            {record.status?.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Date',
      key: 'createdAt',
      render: (_, record) => (
        <div>
          <div>{new Date(record.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}</div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {new Date(record.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isDeletionRequested = record.deletionRequested
        const confirmationCount = record.deletionConfirmationCount || 0
        
        return (
          <Space>
            {!isDeletionRequested ? (
              <Popconfirm
                title="Request Deletion?"
                description={`This will start the 3-step deletion process. You'll need to confirm 2 more times.`}
                onConfirm={() => handleRequestDeletion(record._id)}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Popconfirm>
            ) : confirmationCount < 3 ? (
              <Popconfirm
                title={`Confirm Deletion (${confirmationCount}/3)?`}
                description={`This is confirmation ${confirmationCount + 1} of 3. ${3 - confirmationCount - 1} more confirmation(s) needed.`}
                onConfirm={() => handleConfirmDeletion(record._id)}
                okText="Confirm"
                cancelText="Cancel"
                icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
              >
                <Button 
                  danger 
                  size="small" 
                  icon={<ExclamationCircleOutlined />}
                >
                  Confirm ({confirmationCount}/3)
                </Button>
              </Popconfirm>
            ) : (
              <Tag color="red">Deleted</Tag>
            )}
          </Space>
        )
      }
    }
  ]

  return (
    <App>
      <div style={{
        padding: AdminDesignSystem.layout.content.padding,
        background: AdminDesignSystem.colors.background,
        minHeight: '100vh',
        fontFamily: AdminDesignSystem.typography.fontFamily,
      }}>
        <div style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Title 
            level={2}
            style={{
              color: AdminDesignSystem.colors.text.primary,
              fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              fontSize: AdminDesignSystem.typography.fontSize.h2,
            }}
          >
            <BookOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
            Prebook Management & Payment Tracking
          </Title>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'prebooks',
              label: (
                <span>
                  <BookOutlined /> Prebooks
                </span>
              ),
              children: (
                <>
                  {/* Statistics */}
                  <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
                    <Col xs={24} sm={12} md={6}>
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
                              Total Prebooks
                            </Text>
                          }
                          value={stats.total} 
                          prefix={<BookOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.text.primary,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                              Pending
                            </Text>
                          }
                          value={stats.pending} 
                          prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.warning,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                              Approved
                            </Text>
                          }
                          value={stats.approved} 
                          prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.success,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                              Rejected
                            </Text>
                          }
                          value={stats.rejected} 
                          prefix={<CloseCircleOutlined style={{ color: AdminDesignSystem.colors.error }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.error,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>
                  {/* Prebooks Table */}
                  <Card 
                    title={
                      <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                        All Prebook Requests
                      </Text>
                    }
                    extra={
                      <Button 
                        type="primary" 
                        onClick={fetchPrebooks} 
                        icon={<BookOutlined />}
                        style={{
                          borderRadius: AdminDesignSystem.borderRadius.md,
                          backgroundColor: AdminDesignSystem.colors.primary,
                          borderColor: AdminDesignSystem.colors.primary,
                        }}
                      >
                        Refresh
                      </Button>
                    }
                    style={{
                      borderRadius: AdminDesignSystem.borderRadius.md,
                      border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                      boxShadow: AdminDesignSystem.shadows.md,
                      background: AdminDesignSystem.colors.card.background,
                    }}
                  >
                    <Spin spinning={loading}>
                      <Table
                        columns={columns}
                        dataSource={prebooks}
                        rowKey="_id"
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} prebooks`
                        }}
                      />
                    </Spin>
                  </Card>
                </>
              )
            },
            {
              key: 'payments',
              label: (
                <span>
                  <CreditCardOutlined /> Payment Tracking
                </span>
              ),
              children: (
                <>
                  {/* Payment Tracking Statistics */}
                  <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
                    <Col xs={24} sm={12} md={6}>
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
                              Total Payments
                            </Text>
                          }
                          value={paymentStats.total} 
                          prefix={<CreditCardOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.text.primary,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                              Subscriptions
                            </Text>
                          }
                          value={paymentStats.subscriptions} 
                          prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.primary,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                              Product Purchases
                            </Text>
                          }
                          value={paymentStats.products} 
                          prefix={<DollarOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.success,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
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
                          value={formatCurrency(paymentStats.totalAmount || 0)} 
                          valueStyle={{ 
                            color: AdminDesignSystem.colors.error,
                            fontSize: AdminDesignSystem.typography.fontSize.h3,
                            fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                          }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Payment Tracking Table */}
                  <Card 
                    title={
                      <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                        Payment Tracking Records
                      </Text>
                    }
                    extra={
                      <Button 
                        type="primary" 
                        onClick={fetchPaymentTracking} 
                        icon={<CreditCardOutlined />}
                        style={{
                          borderRadius: AdminDesignSystem.borderRadius.md,
                          backgroundColor: AdminDesignSystem.colors.primary,
                          borderColor: AdminDesignSystem.colors.primary,
                        }}
                      >
                        Refresh
                      </Button>
                    }
                    style={{
                      borderRadius: AdminDesignSystem.borderRadius.md,
                      border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                      boxShadow: AdminDesignSystem.shadows.md,
                      background: AdminDesignSystem.colors.card.background,
                    }}
                  >
                    <Spin spinning={paymentLoading}>
                      <Table
                        dataSource={paymentTracking}
                        columns={paymentColumns}
                        rowKey="_id"
                        scroll={{ x: 1200 }}
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} payment records`
                        }}
                      />
                    </Spin>
                  </Card>
                </>
              )
            }
          ]}
        />

        {/* Detail Modal */}
        <Modal
          title="Prebook Details"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Close
            </Button>,
            <Button 
              key="status" 
              type="primary"
              loading={loading}
              onClick={() => {
                setDetailModalVisible(false)
                handleStatusChange(selectedPrebook)
              }}
            >
              Change Status
            </Button>
          ]}
          width="90%"
          style={{ maxWidth: '1000px' }}
        >
          {selectedPrebook && (
            <div>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card title="User Information" size="small">
                    <Paragraph>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div><UserOutlined /> <strong>Name:</strong> {selectedPrebook.userId?.name || 'N/A'}</div>
                        <div><MailOutlined /> <strong>Email:</strong> {selectedPrebook.userId?.email || 'N/A'}</div>
                        <div><UserOutlined /> <strong>Contact:</strong> {selectedPrebook.contactInfo?.name || 'N/A'}</div>
                        <div><PhoneOutlined /> <strong>Phone:</strong> {selectedPrebook.contactInfo?.phone || 'N/A'}</div>
                        <div><strong>Company:</strong> {selectedPrebook.contactInfo?.company || 'N/A'}</div>
                      </Space>
                    </Paragraph>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Project Information" size="small">
                    <Paragraph>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div><strong>Product:</strong> {selectedPrebook.productId?.title || 'N/A'}</div>
                        <div><TagOutlined /> <strong>Type:</strong> {selectedPrebook.projectType}</div>
                        <div><DollarOutlined /> <strong>Budget:</strong> {selectedPrebook.budget}</div>
                        <div><CalendarOutlined /> <strong>Timeline:</strong> {selectedPrebook.timeline} days</div>
                        <div><strong>Status:</strong> <Tag color={getStatusColor(selectedPrebook.status)}>{selectedPrebook.status?.toUpperCase()}</Tag></div>
                      </Space>
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
              
              <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col xs={24} sm={12}>
                  <Card title="Payment Information" size="small">
                    <Paragraph>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div><strong>Payment Status:</strong> 
                          <Tag color={selectedPrebook.paymentStatus === 'completed' ? 'green' : 'orange'}>
                            {selectedPrebook.paymentStatus?.toUpperCase() || 'UNPAID'}
                          </Tag>
                        </div>
                        <div><strong>Amount:</strong> ₹{((selectedPrebook.paymentAmount || 0) / 100).toFixed(2)}</div>
                        <div><strong>Payment ID:</strong> {selectedPrebook.paymentId || 'N/A'}</div>
                        <div><strong>Payment Date:</strong> {selectedPrebook.paymentDate ? new Date(selectedPrebook.paymentDate).toLocaleString() : 'N/A'}</div>
                      </Space>
                    </Paragraph>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Request Details" size="small">
                    <Paragraph>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div><strong>Created:</strong> {new Date(selectedPrebook.createdAt).toLocaleString()}</div>
                        <div><strong>Updated:</strong> {new Date(selectedPrebook.updatedAt).toLocaleString()}</div>
                        <div><strong>Request ID:</strong> {selectedPrebook._id}</div>
                      </Space>
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
              
              <Title level={5}>Features Requested</Title>
              <div style={{ marginBottom: '16px' }}>
                {selectedPrebook.features?.map((feature, index) => (
                  <Tag key={index} color="blue">{feature}</Tag>
                ))}
              </div>

              <Title level={5}>Notes</Title>
              <Paragraph>{selectedPrebook.notes || 'No notes provided'}</Paragraph>

              {selectedPrebook.adminNotes && (
                <>
                  <Title level={5}>Admin Notes</Title>
                  <Paragraph>{selectedPrebook.adminNotes}</Paragraph>
                </>
              )}
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          title="Update Prebook Status"
          open={statusModalVisible}
          onCancel={() => setStatusModalVisible(false)}
          footer={null}
          width="90%"
          style={{ maxWidth: '600px' }}
        >
          {updateSuccess && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px', 
              marginBottom: '20px' 
            }}>
              <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <div style={{ color: '#52c41a', fontWeight: 'bold' }}>Status Updated Successfully!</div>
            </div>
          )}
          <Form
            form={statusForm}
            layout="vertical"
            onFinish={handleStatusUpdate}
          >
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select a status!' }]}
            >
              <Select placeholder="Select status" disabled={updateSuccess}>
                <Option value="pending">Pending</Option>
                <Option value="reviewed">Reviewed</Option>
                <Option value="accepted">Accepted</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="completed">Completed</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="adminNotes"
              label="Admin Notes (Optional)"
            >
              <TextArea 
                rows={4} 
                placeholder="Add notes for the user..."
                disabled={updateSuccess}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button onClick={() => setStatusModalVisible(false)}>
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  disabled={updateSuccess}
                >
                  {updateSuccess ? 'Updated!' : 'Update Status'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </App>
  )
}

export default PrebookManagement
