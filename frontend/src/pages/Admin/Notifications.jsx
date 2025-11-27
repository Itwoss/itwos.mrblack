import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Form, Switch, App, Tabs, Badge } from 'antd'
import { 
  BellOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FilterOutlined,
  PlusOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MailOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import AdminDesignSystem from '../../styles/admin-design-system'
import { notificationsAPI } from '../../services/api'

const { Title, Paragraph } = Typography
const { Search } = Input
const { Option } = Select
const { TextArea } = Input

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNotification, setEditingNotification] = useState(null)
  const [form] = Form.useForm()
  const { user, isAuthenticated } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalNotifications: 0,
    sentNotifications: 0,
    pendingNotifications: 0,
    readRate: 0
  })

  useEffect(() => {
    fetchNotifications()
    fetchTemplates()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      // Use the API service which handles token refresh automatically
      const response = await notificationsAPI.getAdminNotifications({ page: 1, limit: 100 })
      
      if (response.data?.success) {
        const fetchedNotifications = response.data.data?.notifications || []
        
        // Format notifications for display
        const formattedNotifications = fetchedNotifications.map(notif => ({
          _id: notif._id,
          title: notif.title || notif.message || 'Notification',
          content: notif.message || notif.title || 'No content',
          type: notif.type || 'general',
          status: notif.read ? 'sent' : 'pending',
          recipients: 1, // Each notification is for one user
          sentDate: notif.createdAt ? new Date(notif.createdAt).toLocaleString() : null,
          readCount: notif.read ? 1 : 0,
          priority: notif.type === 'admin_action' ? 'high' : 
                   notif.type === 'prebook_payment' ? 'medium' : 'low',
          read: notif.read || false,
          createdAt: notif.createdAt
        }))
        
        setNotifications(formattedNotifications)
        
        // Calculate real statistics
        const total = formattedNotifications.length
        const sent = formattedNotifications.filter(n => n.read).length
        const pending = formattedNotifications.filter(n => !n.read).length
        const readRate = total > 0 ? ((sent / total) * 100).toFixed(1) : 0
        
        setStats({
          totalNotifications: total,
          sentNotifications: sent,
          pendingNotifications: pending,
          readRate: parseFloat(readRate)
        })
      } else {
        setNotifications([])
        message.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
      message.error('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAdminAsRead(notificationId)
      message.success('Notification marked as read')
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      message.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAdminAsRead()
      message.success('All notifications marked as read')
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      message.error('Failed to mark all notifications as read')
    }
  }

  const fetchTemplates = async () => {
    try {
      // Templates feature not implemented yet - set empty array
      setTemplates([])
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates([])
    }
  }

  const handleSendNotification = (notificationId) => {
    setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, status: 'sent', sentDate: new Date().toISOString() } : n))
    message.success('Notification sent successfully')
  }

  const handleDeleteNotification = (notificationId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this notification?',
      content: 'This action cannot be undone.',
      onOk: () => {
        setNotifications(prev => prev.filter(n => n._id !== notificationId))
        message.success('Notification deleted successfully')
      }
    })
  }

  const handleSubmit = async (values) => {
    try {
      if (editingNotification) {
        setNotifications(prev => prev.map(n => n._id === editingNotification._id ? { ...n, ...values } : n))
        message.success('Notification updated successfully')
      } else {
        const newNotification = {
          _id: Date.now().toString(),
          ...values,
          recipients: 0,
          sentDate: null,
          readCount: 0,
          status: 'pending'
        }
        setNotifications(prev => [...prev, newNotification])
        message.success('Notification created successfully')
      }
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save notification')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'sent': 'green',
      'pending': 'orange',
      'failed': 'red'
    }
    return colors[status] || 'default'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'red',
      'medium': 'orange',
      'low': 'green'
    }
    return colors[priority] || 'default'
  }

  const notificationColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.type?.toUpperCase() || 'GENERAL'} • {record.priority?.toUpperCase() || 'MEDIUM'} Priority
          </div>
        </div>
      )
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      render: (content) => (
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {content}
        </div>
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
      title: 'Recipients',
      dataIndex: 'recipients',
      key: 'recipients',
      render: (recipients, record) => (
        <div>
          <div>{recipients} users</div>
          {record.status === 'sent' && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.readCount} read ({Math.round((record.readCount / recipients) * 100)}%)
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Sent Date',
      dataIndex: 'sentDate',
      key: 'sentDate',
      render: (date) => date || 'Not sent'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingNotification(record)
            form.setFieldsValue(record)
            setModalVisible(true)
          }}>Edit</Button>
          {record.status === 'pending' && (
            <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleSendNotification(record._id)}>
              Send
            </Button>
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteNotification(record._id)}>Delete</Button>
        </Space>
      )
    }
  ]

  const templateColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'email' ? 'blue' : 'green'}>{type.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'gray'}>{status.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />}>Edit</Button>
          <Button size="small" type="primary" icon={<SendOutlined />}>Use</Button>
        </Space>
      )
    }
  ]

  return (
    <App>
      <DashboardLayout userRole="admin">
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            🔔 Notifications
          </Title>
          <Paragraph>
            Manage notifications, templates, and communication with your users.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Notifications"
                value={stats.totalNotifications}
                prefix={<BellOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Sent"
                value={stats.sentNotifications}
                prefix={<SendOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pendingNotifications}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Read Rate"
                value={stats.readRate}
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Notifications Tabs */}
        <Card>
          <Tabs 
            defaultActiveKey="notifications"
            items={[
              {
                key: 'notifications',
                label: 'Notifications',
                children: (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Search placeholder="Search notifications..." style={{ width: 200 }} />
                        <Select placeholder="Filter by status" style={{ width: 150 }}>
                          <Option value="all">All Status</Option>
                          <Option value="sent">Sent</Option>
                          <Option value="pending">Pending</Option>
                          <Option value="failed">Failed</Option>
                        </Select>
                        <Select placeholder="Filter by type" style={{ width: 150 }}>
                          <Option value="all">All Types</Option>
                          <Option value="welcome">Welcome</Option>
                          <Option value="product">Product</Option>
                          <Option value="maintenance">Maintenance</Option>
                          <Option value="payment">Payment</Option>
                        </Select>
                        {stats.pendingNotifications > 0 && (
                          <Button 
                            type="default" 
                            icon={<CheckCircleOutlined />}
                            onClick={handleMarkAllAsRead}
                          >
                            Mark All as Read
                          </Button>
                        )}
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                          Create Notification
                        </Button>
                      </Space>
                    </div>
                    <Table
                      columns={notificationColumns}
                      dataSource={notifications}
                      loading={loading}
                      rowKey="_id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true
                      }}
                    />
                  </>
                )
              },
              {
                key: 'templates',
                label: 'Templates',
                children: (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Search placeholder="Search templates..." style={{ width: 200 }} />
                        <Select placeholder="Filter by type" style={{ width: 150 }}>
                          <Option value="all">All Types</Option>
                          <Option value="email">Email</Option>
                          <Option value="sms">SMS</Option>
                          <Option value="push">Push</Option>
                        </Select>
                        <Button type="primary" icon={<PlusOutlined />}>
                          Create Template
                        </Button>
                      </Space>
                    </div>
                    <Table
                      columns={templateColumns}
                      dataSource={templates}
                      loading={loading}
                      rowKey="_id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true
                      }}
                    />
                  </>
                )
              },
              {
                key: 'settings',
                label: 'Settings',
                children: (
                  <Card title="Notification Settings" size="small">
                    <div style={{ marginBottom: 16 }}>
                      <h4>Email Settings</h4>
                      <Form layout="vertical">
                        <Form.Item label="SMTP Server">
                          <Input placeholder="smtp.example.com" />
                        </Form.Item>
                        <Form.Item label="Port">
                          <Input placeholder="587" />
                        </Form.Item>
                        <Form.Item label="Username">
                          <Input placeholder="your-email@example.com" />
                        </Form.Item>
                        <Form.Item label="Password">
                          <Input.Password placeholder="Your password" />
                        </Form.Item>
                      </Form>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <h4>Notification Preferences</h4>
                      <Form layout="vertical">
                        <Form.Item label="Send welcome emails">
                          <Switch defaultChecked />
                        </Form.Item>
                        <Form.Item label="Send product updates">
                          <Switch defaultChecked />
                        </Form.Item>
                        <Form.Item label="Send maintenance notifications">
                          <Switch defaultChecked />
                        </Form.Item>
                        <Form.Item label="Send payment confirmations">
                          <Switch defaultChecked />
                        </Form.Item>
                      </Form>
                    </div>
                    <Button type="primary">Save Settings</Button>
                  </Card>
                )
              }
            ]}
          />
        </Card>

        {/* Notification Form Modal */}
        <Modal
          title={editingNotification ? 'Edit Notification' : 'Create Notification'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Title"
                  rules={[{ required: true, message: 'Please enter title' }]}
                >
                  <Input placeholder="Enter notification title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Type"
                  rules={[{ required: true, message: 'Please select type' }]}
                >
                  <Select placeholder="Select type">
                    <Option value="welcome">Welcome</Option>
                    <Option value="product">Product</Option>
                    <Option value="maintenance">Maintenance</Option>
                    <Option value="payment">Payment</Option>
                    <Option value="general">General</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="content"
              label="Content"
              rules={[{ required: true, message: 'Please enter content' }]}
            >
              <TextArea rows={4} placeholder="Enter notification content" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label="Priority"
                  rules={[{ required: true, message: 'Please select priority' }]}
                >
                  <Select placeholder="Select priority">
                    <Option value="low">Low</Option>
                    <Option value="medium">Medium</Option>
                    <Option value="high">High</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="recipients"
                  label="Recipients"
                  rules={[{ required: true, message: 'Please enter recipients' }]}
                >
                  <Input type="number" placeholder="Number of recipients" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingNotification ? 'Update Notification' : 'Create Notification'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
        </div>
      </DashboardLayout>
    </App>
  )
}

export default Notifications




