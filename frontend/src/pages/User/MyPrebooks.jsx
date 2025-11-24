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
      const response = await fetch('http://localhost:7000/api/prebook', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        const paid = data.data?.prebooks?.filter(p => p.paymentStatus === 'completed').length || 0
        const totalAmount = data.data?.prebooks?.reduce((sum, p) => sum + ((p.paymentAmount || 0) / 100), 0) || 0
        
        setStats({ total, pending, approved, rejected, paid, totalAmount })
      } else {
        if (!silent) messageApi.error('Failed to fetch prebooks')
      }
    } catch (error) {
      console.error('Error fetching prebooks:', error)
      if (!silent) messageApi.error('Network error')
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
      case 'pending': return 'orange'
      case 'reviewed': return 'blue'
      case 'approved': return 'green'
      case 'rejected': return 'red'
      case 'completed': return 'purple'
      default: return 'default'
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
      case 'completed': return 'green'
      case 'pending': return 'orange'
      default: return 'default'
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
            <Text strong style={{ fontSize: '14px' }}>{product?.title || 'Unknown Product'}</Text>
            <br />
            {product?.prebookAmount ? (
              <Text type="secondary" style={{ fontSize: '12px', color: '#52c41a', fontWeight: 'bold' }}>
                Prebook: ${product.prebookAmount.toLocaleString()} {product?.currency || 'USD'}
              </Text>
            ) : product?.price ? (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ${product.price.toLocaleString()} {product?.currency || 'USD'}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>Price: N/A</Text>
            )}
          </div>
        ),
        responsive: ['lg']
      },
      {
        title: 'Project',
        dataIndex: 'projectType',
        key: 'projectType',
        render: (type) => <Tag color="blue" style={{ fontSize: '12px' }}>{type}</Tag>,
        responsive: ['md']
      },
      {
        title: 'Budget',
        dataIndex: 'budget',
        key: 'budget',
        render: (budget) => (
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
            ${budget}
          </Text>
        ),
        responsive: ['md']
      },
      {
        title: 'Timeline',
        dataIndex: 'timeline',
        key: 'timeline',
        render: (timeline) => <Tag style={{ fontSize: '12px' }}>{timeline} days</Tag>,
        responsive: ['lg']
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status, record) => (
          <div>
            <Tag color={getStatusColor(status)} icon={getStatusIcon(status)} style={{ fontSize: '12px' }}>
              {status.toUpperCase()}
            </Tag>
            {record.adminNotes && (
              <Tooltip title={record.adminNotes}>
                <InfoCircleOutlined style={{ marginLeft: '4px', color: '#1890ff' }} />
              </Tooltip>
            )}
          </div>
        )
      },
      {
        title: 'Payment',
        key: 'payment',
        render: (_, record) => (
          <div>
            {record.paymentStatus === 'completed' ? (
              <div>
                <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: '12px' }}>
                  PAID
                </Tag>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  ₹{((record.paymentAmount || 0) / 100).toFixed(2)}
                </Text>
              </div>
            ) : record.paymentStatus === 'pending' ? (
              <Tag color="orange" icon={<ClockCircleOutlined />} style={{ fontSize: '12px' }}>
                PENDING
              </Tag>
            ) : (
              <Tag color="default" icon={<CreditCardOutlined />} style={{ fontSize: '12px' }}>
                UNPAID
              </Tag>
            )}
          </div>
        ),
        responsive: ['md']
      },
      {
        title: 'Created',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date) => (
          <Text style={{ fontSize: '12px' }}>
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
                style={{ fontSize: '12px' }}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button 
                type="default" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ fontSize: '12px' }}
              />
            </Tooltip>
            <Popconfirm
              title="Delete Prebook"
              description="Are you sure you want to delete this prebook?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Tooltip title="Delete">
                <Button 
                  type="primary" 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  loading={deleteLoading[record._id]}
                  style={{ fontSize: '12px' }}
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
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Title level={2} style={{ margin: 0, fontSize: '24px' }}>
                <BookOutlined style={{ marginRight: '8px' }} />
                My Prebooks
              </Title>
              <Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>
                Manage your prebooked products and track their status
              </Paragraph>
            </div>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchPrebooks()}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type={autoRefresh ? 'primary' : 'default'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
            </Space>
          </div>
        </div>

        {/* Statistics Cards - Responsive Grid */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Total</span>}
                value={stats.total}
                prefix={<BookOutlined style={{ fontSize: '14px' }} />}
                valueStyle={{ color: '#1890ff', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Pending</span>}
                value={stats.pending}
                prefix={<ClockCircleOutlined style={{ fontSize: '14px' }} />}
                valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Approved</span>}
                value={stats.approved}
                prefix={<CheckCircleOutlined style={{ fontSize: '14px' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Rejected</span>}
                value={stats.rejected}
                prefix={<DeleteOutlined style={{ fontSize: '14px' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Paid</span>}
                value={stats.paid}
                prefix={<DollarOutlined style={{ fontSize: '14px' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '18px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card size="small">
              <Statistic
                title={<span style={{ fontSize: '12px' }}>Total Paid</span>}
                value={stats.totalAmount}
                prefix="₹"
                valueStyle={{ color: '#52c41a', fontSize: '18px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Prebooks Table */}
        <Card>
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
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} prebooks`,
                  responsive: true
                }}
                size="small"
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
                <Tag color="blue">{selectedPrebook.projectType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Budget">
                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>${selectedPrebook.budget}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Timeline">
                <Tag>{selectedPrebook.timeline} days</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedPrebook.status)} icon={getStatusIcon(selectedPrebook.status)}>
                  {selectedPrebook.status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={getPaymentStatusColor(selectedPrebook.paymentStatus)}>
                  {selectedPrebook.paymentStatus?.toUpperCase()}
                </Tag>
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