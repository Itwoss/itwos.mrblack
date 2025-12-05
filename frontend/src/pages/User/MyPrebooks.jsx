import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Spin, 
  Empty, 
  Row, 
  Col, 
  Statistic, 
  App, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  message, 
  Popconfirm, 
  Drawer, 
  Descriptions, 
  Badge,
  Tooltip,
  Divider,
  Alert
} from 'antd'
import { 
  BookOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  DollarOutlined, 
  CreditCardOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  DollarCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { prebookAPI } from '../../services/api'
import dayjs from 'dayjs'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const MyPrebooks = () => {
  const { user, isAuthenticated } = useAuth()
  const { message: messageApi } = App.useApp()
  const [form] = Form.useForm()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [prebooks, setPrebooks] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    totalAmount: 0
  })
  
  // Modal and drawer states
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedPrebook, setSelectedPrebook] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState({})
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(null)

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && isAuthenticated) {
      const interval = setInterval(() => {
        fetchPrebooks(true) // Silent refresh
      }, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPrebooks()
    }
  }, [isAuthenticated, user])

  const fetchPrebooks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await prebookAPI.getUserPrebooks()
      
      if (response.data.success) {
        const prebooks = response.data.data?.prebooks || response.data.prebooks || []
        setPrebooks(prebooks)
        
        // Calculate stats
        const total = prebooks.length || 0
        const pending = prebooks.filter(p => p.status === 'pending').length || 0
        const approved = prebooks.filter(p => p.status === 'approved').length || 0
        const rejected = prebooks.filter(p => p.status === 'rejected').length || 0
        const paid = prebooks.filter(p => p.paymentStatus === 'completed').length || 0
        const totalAmount = prebooks.reduce((sum, p) => sum + ((p.paymentAmount || 0) / 100), 0) || 0
        
        setStats({ total, pending, approved, rejected, paid, totalAmount })
      } else {
        if (!silent) messageApi.error(response.data.message || 'Failed to fetch prebooks')
      }
    } catch (error) {
      console.error('Error fetching prebooks:', error)
      if (!silent) messageApi.error(error.response?.data?.message || 'Network error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [messageApi])

  const handleView = (prebook) => {
    setSelectedPrebook(prebook)
    setViewModalVisible(true)
  }

  const handleEdit = (prebook) => {
    setSelectedPrebook(prebook)
    form.setFieldsValue({
      projectType: prebook.projectType,
      budget: prebook.budget,
      timeline: prebook.timeline,
      features: prebook.features?.join(', '),
      notes: prebook.notes,
      contactInfo: {
        name: prebook.contactInfo?.name,
        email: prebook.contactInfo?.email,
        phone: prebook.contactInfo?.phone,
        company: prebook.contactInfo?.company
      }
    })
    setEditModalVisible(true)
  }

  const handleEditSubmit = async () => {
    try {
      setEditLoading(true)
      const values = await form.validateFields()
      
      const response = await fetch(`http://localhost:7000/api/prebook/${selectedPrebook._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...values,
          features: values.features ? values.features.split(',').map(f => f.trim()) : []
        })
      })
      
      if (response.ok) {
        messageApi.success('Prebook updated successfully')
        setEditModalVisible(false)
        fetchPrebooks()
      } else {
        messageApi.error('Failed to update prebook')
      }
    } catch (error) {
      console.error('Error updating prebook:', error)
      messageApi.error('Failed to update prebook')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      setDeleteLoading(prev => ({ ...prev, [id]: true }))
      
      const response = await fetch(`http://localhost:7000/api/prebook/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        messageApi.success('Prebook deleted successfully')
        fetchPrebooks()
      } else {
        messageApi.error('Failed to delete prebook')
      }
    } catch (error) {
      console.error('Error deleting prebook:', error)
      messageApi.error('Network error')
    } finally {
      setDeleteLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' }
      case 'reviewed': return { color: '#3b82f6', bg: '#eff6ff', border: '#3b82f6' }
      case 'approved': return { color: '#22c55e', bg: '#f0fdf4', border: '#22c55e' }
      case 'rejected': return { color: '#ef4444', bg: '#fef2f2', border: '#ef4444' }
      case 'completed': return { color: '#ec4899', bg: '#fdf2f8', border: '#ec4899' }
      default: return { color: '#64748b', bg: '#f1f5f9', border: '#64748b' }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />
      case 'reviewed': return <EyeOutlined />
      case 'approved': return <CheckCircleOutlined />
      case 'rejected': return <DeleteOutlined />
      case 'completed': return <CheckCircleOutlined />
      default: return <ClockCircleOutlined />
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed': return { color: '#22c55e', bg: '#f0fdf4', border: '#22c55e' }
      case 'pending': return { color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' }
      default: return { color: '#64748b', bg: '#f1f5f9', border: '#64748b' }
    }
  }

  // Responsive columns for different screen sizes
  const getColumns = () => {
    const baseColumns = [
      {
        title: 'Product',
        dataIndex: 'productId',
        key: 'product',
        render: (product) => (
          <div>
            <Text strong style={{ fontSize: '13px', color: '#1e293b' }}>{product?.title || 'Unknown Product'}</Text>
            <br />
            {product?.prebookAmount ? (
              <Text style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                Prebook: ${product.prebookAmount.toLocaleString()} {product?.currency || 'USD'}
              </Text>
            ) : product?.price ? (
              <Text style={{ fontSize: '12px', color: '#64748b' }}>
                ${product.price.toLocaleString()} {product?.currency || 'USD'}
              </Text>
            ) : (
              <Text style={{ fontSize: '12px', color: '#64748b' }}>Price: N/A</Text>
            )}
          </div>
        ),
        responsive: ['lg']
      },
      {
        title: 'Project',
        dataIndex: 'projectType',
        key: 'projectType',
        render: (type) => (
          <Tag style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '18px', background: '#eff6ff', border: '1px solid #3b82f6', color: '#3b82f6', margin: 0 }}>
            {type}
          </Tag>
        ),
        responsive: ['md']
      },
      {
        title: 'Budget',
        dataIndex: 'budget',
        key: 'budget',
        render: (budget) => (
          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>
            ${budget}
          </Text>
        ),
        responsive: ['md']
      },
      {
        title: 'Timeline',
        dataIndex: 'timeline',
        key: 'timeline',
        render: (timeline) => (
          <Tag style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '18px', background: '#f0fdf4', border: '1px solid #22c55e', color: '#22c55e', margin: 0 }}>
            {timeline} days
          </Tag>
        ),
        responsive: ['lg']
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status, record) => {
          const statusColors = {
            pending: { color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' },
            reviewed: { color: '#3b82f6', bg: '#eff6ff', border: '#3b82f6' },
            approved: { color: '#22c55e', bg: '#f0fdf4', border: '#22c55e' },
            rejected: { color: '#ef4444', bg: '#fef2f2', border: '#ef4444' },
            completed: { color: '#ec4899', bg: '#fdf2f8', border: '#ec4899' }
          }
          const statusInfo = statusColors[status] || { color: '#64748b', bg: '#f1f5f9', border: '#64748b' }
          return (
            <div>
              <Tag 
                icon={getStatusIcon(status)} 
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  height: '22px', 
                  lineHeight: '18px',
                  background: statusInfo.bg,
                  border: `1px solid ${statusInfo.border}`,
                  color: statusInfo.color,
                  margin: 0
                }}
              >
                {status.toUpperCase()}
              </Tag>
              {record.adminNotes && (
                <Tooltip title={record.adminNotes}>
                  <InfoCircleOutlined style={{ marginLeft: '4px', color: '#3b82f6', fontSize: '14px' }} />
                </Tooltip>
              )}
            </div>
          )
        }
      },
      {
        title: 'Payment',
        key: 'payment',
        render: (_, record) => {
          if (record.paymentStatus === 'completed') {
            return (
              <div>
                <Tag 
                  icon={<CheckCircleOutlined />} 
                  style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    height: '22px', 
                    lineHeight: '18px',
                    background: '#f0fdf4',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    margin: 0
                  }}
                >
                  PAID
                </Tag>
                <br />
                <Text style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  ₹{((record.paymentAmount || 0) / 100).toFixed(2)}
                </Text>
              </div>
            )
          } else if (record.paymentStatus === 'pending') {
            return (
              <Tag 
                icon={<ClockCircleOutlined />} 
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  height: '22px', 
                  lineHeight: '18px',
                  background: '#fffbeb',
                  border: '1px solid #f59e0b',
                  color: '#f59e0b',
                  margin: 0
                }}
              >
                PENDING
              </Tag>
            )
          } else {
            return (
              <Tag 
                icon={<CreditCardOutlined />} 
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  height: '22px', 
                  lineHeight: '18px',
                  background: '#f1f5f9',
                  border: '1px solid #64748b',
                  color: '#64748b',
                  margin: 0
                }}
              >
                UNPAID
              </Tag>
            )
          }
        },
        responsive: ['md']
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date) => (
          <Text style={{ fontSize: '12px', color: '#64748b' }}>
            {dayjs(date).format('MMM DD, YYYY')}
          </Text>
        ),
        responsive: ['lg']
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space size="small" wrap>
            <Tooltip title="View Details">
              <Button 
                type="primary" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
                style={{ fontSize: '12px', height: '24px', padding: '0 8px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button 
                type="default" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ fontSize: '12px', height: '24px', padding: '0 8px', borderColor: '#e2e8f0', color: '#1e293b' }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete Prebook"
              description="Are you sure you want to delete this prebook?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              icon={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
            >
              <Tooltip title="Delete">
                <Button 
                  type="primary" 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  loading={deleteLoading[record._id]}
                  style={{ fontSize: '12px', height: '24px', padding: '0 8px' }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
        fixed: 'right',
        width: 120
      }
    ]

    return baseColumns
  }

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Empty description="Please login to view your prebooks" />
      </div>
    )
  }

  return (
    <App>
      <div style={{ padding: '16px', background: '#f5f7fa', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                <BookOutlined style={{ marginRight: '8px', fontSize: '18px', color: '#3b82f6' }} />
                My Prebooks
              </Title>
              <Text style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Manage your prebooked products and track their status
              </Text>
            </div>
            <Space size="small">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchPrebooks()}
                loading={loading}
                size="small"
                style={{ fontSize: '12px', height: '32px' }}
              >
                Refresh
              </Button>
              <Button 
                type={autoRefresh ? 'primary' : 'default'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="small"
                style={{ 
                  fontSize: '12px', 
                  height: '32px',
                  backgroundColor: autoRefresh ? '#3b82f6' : undefined,
                  borderColor: autoRefresh ? '#3b82f6' : undefined
                }}
              >
                Auto {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </Space>
          </div>
        </div>

        {/* Statistics Cards - Responsive Grid */}
        <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Total</span>}
                value={stats.total}
                prefix={<BookOutlined style={{ fontSize: '18px', color: '#3b82f6' }} />}
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Pending</span>}
                value={stats.pending}
                prefix={<ClockCircleOutlined style={{ fontSize: '18px', color: '#f59e0b' }} />}
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Approved</span>}
                value={stats.approved}
                prefix={<CheckCircleOutlined style={{ fontSize: '18px', color: '#22c55e' }} />}
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Rejected</span>}
                value={stats.rejected}
                prefix={<DeleteOutlined style={{ fontSize: '18px', color: '#ef4444' }} />}
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Paid</span>}
                value={stats.paid}
                prefix={<DollarOutlined style={{ fontSize: '18px', color: '#22c55e' }} />}
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              styles={{ body: { padding: '12px' } }}
            >
              <Statistic
                title={<span style={{ fontSize: '11px', color: '#64748b' }}>Total Paid</span>}
                value={stats.totalAmount}
                prefix="₹"
                valueStyle={{ color: '#1e293b', fontSize: '20px', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Prebooks Table */}
        <Card
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          styles={{ body: { padding: '12px' } }}
        >
          <style>{`
            .ant-table-tbody > tr:hover > td {
              background: #f8fafc !important;
            }
            .ant-table-tbody > tr > td {
              border-bottom: 1px solid #e2e8f0;
            }
          `}</style>
          <Spin spinning={loading}>
            {prebooks.length === 0 ? (
              <Empty 
                description="No prebooks found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" href="/products">
                  Browse Products
                </Button>
              </Empty>
            ) : (
              <Table
                columns={getColumns()}
                dataSource={prebooks}
                rowKey="_id"
                scroll={{ x: 800 }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => (
                    <Text style={{ fontSize: '12px', color: '#64748b' }}>
                      {range[0]}-{range[1]} of {total} prebooks
                    </Text>
                  ),
                  responsive: true,
                  size: 'small'
                }}
                size="small"
                style={{ fontSize: '12px' }}
              />
            )}
          </Spin>
        </Card>

        {/* View Modal */}
        <Modal
          title="Prebook Details"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              Close
            </Button>
          ]}
          width={800}
        >
          {selectedPrebook && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Product">
                <div>
                  <Text strong>{selectedPrebook.productId?.title || 'Unknown Product'}</Text>
                  <br />
                  {selectedPrebook.productId?.prebookAmount ? (
                    <Text type="secondary" style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      Prebook Price: ${selectedPrebook.productId.prebookAmount.toLocaleString()} {selectedPrebook.productId?.currency || 'USD'}
                    </Text>
                  ) : selectedPrebook.productId?.price ? (
                    <Text type="secondary">
                      Price: ${selectedPrebook.productId.price.toLocaleString()} {selectedPrebook.productId?.currency || 'USD'}
                    </Text>
                  ) : null}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Project Type">
                <Tag style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '18px', background: '#eff6ff', border: '1px solid #3b82f6', color: '#3b82f6', margin: 0 }}>
                  {selectedPrebook.projectType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Budget">
                <Text style={{ color: '#22c55e', fontWeight: 600, fontSize: '13px' }}>${selectedPrebook.budget}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Timeline">
                <Tag style={{ fontSize: '11px', padding: '2px 8px', height: '22px', lineHeight: '18px', background: '#f0fdf4', border: '1px solid #22c55e', color: '#22c55e', margin: 0 }}>
                  {selectedPrebook.timeline} days
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {(() => {
                  const statusInfo = getStatusColor(selectedPrebook.status)
                  return (
                    <Tag 
                      icon={getStatusIcon(selectedPrebook.status)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        height: '22px',
                        lineHeight: '18px',
                        background: statusInfo.bg,
                        border: `1px solid ${statusInfo.border}`,
                        color: statusInfo.color,
                        margin: 0
                      }}
                    >
                      {selectedPrebook.status?.toUpperCase()}
                    </Tag>
                  )
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {(() => {
                  const paymentInfo = getPaymentStatusColor(selectedPrebook.paymentStatus)
                  return (
                    <Tag 
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        height: '22px',
                        lineHeight: '18px',
                        background: paymentInfo.bg,
                        border: `1px solid ${paymentInfo.border}`,
                        color: paymentInfo.color,
                        margin: 0
                      }}
                    >
                      {selectedPrebook.paymentStatus?.toUpperCase()}
                    </Tag>
                  )
                })()}
              </Descriptions.Item>
              {selectedPrebook.features && selectedPrebook.features.length > 0 && (
                <Descriptions.Item label="Features">
                  {selectedPrebook.features.map((feature, index) => (
                    <Tag key={index} style={{ marginBottom: '4px' }}>{feature}</Tag>
                  ))}
                </Descriptions.Item>
              )}
              {selectedPrebook.notes && (
                <Descriptions.Item label="Notes">
                  <Text>{selectedPrebook.notes}</Text>
                </Descriptions.Item>
              )}
              {selectedPrebook.adminNotes && (
                <Descriptions.Item label="Admin Notes">
                  <Alert message={selectedPrebook.adminNotes} type="info" />
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Contact Information">
                <div>
                  <div><MailOutlined /> {selectedPrebook.contactInfo?.email}</div>
                  <div><PhoneOutlined /> {selectedPrebook.contactInfo?.phone || 'N/A'}</div>
                  <div><Text strong>{selectedPrebook.contactInfo?.name}</Text></div>
                  {selectedPrebook.contactInfo?.company && (
                    <div><Text type="secondary">{selectedPrebook.contactInfo.company}</Text></div>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                <CalendarOutlined /> {dayjs(selectedPrebook.createdAt).format('MMMM DD, YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          title="Edit Prebook"
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          onOk={handleEditSubmit}
          confirmLoading={editLoading}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              projectType: '',
              budget: '',
              timeline: '',
              features: '',
              notes: '',
              contactInfo: {
                name: '',
                email: '',
                phone: '',
                company: ''
              }
            }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="projectType"
                  label="Project Type"
                  rules={[{ required: true, message: 'Please select project type' }]}
                >
                  <Select placeholder="Select project type">
                    <Option value="web-development">Web Development</Option>
                    <Option value="mobile-app">Mobile App</Option>
                    <Option value="e-commerce">E-commerce</Option>
                    <Option value="custom">Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="budget"
                  label="Budget ($)"
                  rules={[{ required: true, message: 'Please enter budget' }]}
                >
                  <Input type="number" placeholder="Enter budget" />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="timeline"
                  label="Timeline (days)"
                  rules={[{ required: true, message: 'Please enter timeline' }]}
                >
                  <Input type="number" placeholder="Enter timeline" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="features"
              label="Features (comma-separated)"
            >
              <TextArea rows={3} placeholder="Enter features separated by commas" />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Additional Notes"
            >
              <TextArea rows={3} placeholder="Enter any additional notes" />
            </Form.Item>

            <Divider>Contact Information</Divider>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['contactInfo', 'name']}
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input placeholder="Enter your full name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['contactInfo', 'email']}
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input placeholder="Enter your email" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['contactInfo', 'phone']}
                  label="Phone Number"
                >
                  <Input placeholder="Enter your phone number" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['contactInfo', 'company']}
                  label="Company"
                >
                  <Input placeholder="Enter your company name" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </App>
  )
}

export default MyPrebooks