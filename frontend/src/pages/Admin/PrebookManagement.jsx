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
  App
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
  MessageOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const PrebookManagement = () => {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [prebooks, setPrebooks] = useState([])
  const [selectedPrebook, setSelectedPrebook] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusForm] = Form.useForm()
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  useEffect(() => {
    fetchPrebooks()
  }, [])

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
      case 'pending': return 'orange'
      case 'reviewed': return 'blue'
      case 'accepted': return 'green'
      case 'rejected': return 'red'
      case 'completed': return 'purple'
      default: return 'default'
    }
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
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
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

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <BookOutlined style={{ marginRight: '8px' }} />
            Prebook Management
          </Title>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Total Prebooks" 
                value={stats.total} 
                prefix={<BookOutlined />} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Pending" 
                value={stats.pending} 
                prefix={<ClockCircleOutlined />} 
                valueStyle={{ color: '#faad14' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Approved" 
                value={stats.approved} 
                prefix={<CheckCircleOutlined />} 
                valueStyle={{ color: '#52c41a' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic 
                title="Rejected" 
                value={stats.rejected} 
                prefix={<CloseCircleOutlined />} 
                valueStyle={{ color: '#ff4d4f' }} 
              />
            </Card>
          </Col>
        </Row>

        {/* Prebooks Table */}
        <Card 
          title="All Prebook Requests" 
          extra={
            <Button 
              type="primary" 
              onClick={fetchPrebooks} 
              icon={<BookOutlined />}
            >
              Refresh
            </Button>
          }
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
