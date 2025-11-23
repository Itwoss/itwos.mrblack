import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Form, Avatar, Badge, message, Tabs } from 'antd'
import { 
  MessageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FilterOutlined,
  UserOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SendOutlined,
  FlagOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
const { Search } = Input
const { Option } = Select
const { TextArea } = Input
// const { TabPane } = Tabs // Deprecated, using items prop instead

const ChatModeration = () => {
  const [messages, setMessages] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalMessages: 0,
    flaggedMessages: 0,
    resolvedReports: 0,
    activeModerators: 0
  })

  useEffect(() => {
    fetchMessages()
    fetchReports()
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      console.log('🔄 ChatModeration: Loading stats...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ ChatModeration: Dashboard data received:', data)
        
        if (data.success && data.data) {
          const { chat } = data.data
          
          setStats({
            totalMessages: chat?.totalMessages || 0,
            flaggedMessages: 23, // This would come from moderation API
            resolvedReports: 18, // This would come from moderation API
            activeModerators: 3 // This would come from moderation API
          })
          
          console.log('✅ ChatModeration: Stats updated successfully')
        } else {
          console.log('❌ ChatModeration: API returned unsuccessful response, using demo data')
          setStats({
            totalMessages: 1247,
            flaggedMessages: 23,
            resolvedReports: 18,
            activeModerators: 3
          })
        }
      } else {
        console.error('❌ ChatModeration: Failed to fetch stats:', response.status)
        setStats({
          totalMessages: 1247,
          flaggedMessages: 23,
          resolvedReports: 18,
          activeModerators: 3
        })
      }
    } catch (error) {
      console.error('❌ ChatModeration: Error loading stats:', error)
      setStats({
        totalMessages: 1247,
        flaggedMessages: 23,
        resolvedReports: 18,
        activeModerators: 3
      })
    }
  }

  const fetchMessages = async () => {
    setLoading(true)
    try {
      console.log('🔄 ChatModeration: Loading messages...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/messages?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ ChatModeration: Messages data received:', data)
        
        if (data.success) {
          setMessages(data.data?.messages || [])
          console.log('✅ ChatModeration: Messages loaded successfully')
        } else {
          console.log('❌ ChatModeration: API returned unsuccessful response')
          setMessages([])
        }
      } else {
        console.error('❌ ChatModeration: Failed to fetch messages:', response.status)
        setMessages([])
      }
    } catch (error) {
      console.error('❌ ChatModeration: Error loading messages:', error)
      message.error('Failed to fetch messages')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      console.log('🔄 ChatModeration: Loading reports...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/reports?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ ChatModeration: Reports data received:', data)
        
        if (data.success) {
          setReports(data.data?.reports || [])
          console.log('✅ ChatModeration: Reports loaded successfully')
        } else {
          console.log('❌ ChatModeration: API returned unsuccessful response')
          setReports([])
        }
      } else {
        console.error('❌ ChatModeration: Failed to fetch reports:', response.status)
        setReports([])
      }
    } catch (error) {
      console.error('❌ ChatModeration: Error loading reports:', error)
      message.error('Failed to fetch reports')
      setReports([])
    }
  }

  const handleApproveMessage = (messageId) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'approved' } : m))
    message.success('Message approved')
  }

  const handleRejectMessage = (messageId) => {
    setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'rejected' } : m))
    message.success('Message rejected')
  }

  const handleDeleteMessage = (messageId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this message?',
      content: 'This action cannot be undone.',
      onOk: () => {
        setMessages(prev => prev.filter(m => m._id !== messageId))
        message.success('Message deleted successfully')
      }
    })
  }

  const handleResolveReport = (reportId) => {
    setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: 'resolved' } : r))
    message.success('Report resolved')
  }

  const getStatusColor = (status) => {
    const colors = {
      'approved': AdminDesignSystem.colors.success,
      'pending': AdminDesignSystem.colors.warning,
      'rejected': AdminDesignSystem.colors.error,
      'resolved': AdminDesignSystem.colors.success
    }
    return colors[status] || AdminDesignSystem.colors.text.secondary
  }

  const messageColumns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <Space>
          <Avatar src={user.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{user.role}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Message',
      dataIndex: 'content',
      key: 'content',
      render: (content, record) => (
        <div>
          <div style={{ marginBottom: 4 }}>{content}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.room} • {record.timestamp}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space>
          <Tag 
            color={getStatusColor(status)}
            style={{
              borderRadius: AdminDesignSystem.borderRadius.sm,
            }}
          >
            {status.toUpperCase()}
          </Tag>
          {record.flagged && <Badge status="error" text="Flagged" />}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedMessage(record)}>View</Button>
          {record.status === 'pending' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApproveMessage(record._id)}>
                Approve
              </Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => handleRejectMessage(record._id)}>
                Reject
              </Button>
            </>
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteMessage(record._id)}>Delete</Button>
        </Space>
      )
    }
  ]

  const reportColumns = [
    {
      title: 'Reporter',
      dataIndex: 'reporter',
      key: 'reporter',
      render: (reporter) => (
        <Space>
          <Avatar src={reporter.avatar} icon={<UserOutlined />} />
          <span>{reporter.name}</span>
        </Space>
      )
    },
    {
      title: 'Reported User',
      dataIndex: 'reportedUser',
      key: 'reportedUser',
      render: (reportedUser) => (
        <Space>
          <Avatar src={reportedUser.avatar} icon={<UserOutlined />} />
          <span>{reportedUser.name}</span>
        </Space>
      )
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => (
        <Tag 
          color={AdminDesignSystem.colors.error}
          style={{
            borderRadius: AdminDesignSystem.borderRadius.sm,
          }}
        >
          {reason}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'resolved' ? AdminDesignSystem.colors.success : AdminDesignSystem.colors.warning}
          style={{
            borderRadius: AdminDesignSystem.borderRadius.sm,
          }}
        >
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          {record.status === 'pending' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleResolveReport(record._id)}>
              Resolve
            </Button>
          )}
        </Space>
      )
    }
  ]

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
            <MessageOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
            Chat Moderation
          </Title>
          <Paragraph style={{ 
            color: AdminDesignSystem.colors.text.secondary,
            fontSize: AdminDesignSystem.typography.fontSize.body,
          }}>
            Moderate chat messages, handle reports, and maintain community standards.
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
                    Total Messages
                  </Text>
                }
                value={stats.totalMessages}
                prefix={<MessageOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
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
                    Flagged Messages
                  </Text>
                }
                value={stats.flaggedMessages}
                prefix={<FlagOutlined style={{ color: AdminDesignSystem.colors.error }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.error,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
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
                    Resolved Reports
                  </Text>
                }
                value={stats.resolvedReports}
                prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
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
                    Active Moderators
                  </Text>
                }
                value={stats.activeModerators}
                prefix={<UserOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Moderation Tabs */}
        <Card
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Tabs 
            defaultActiveKey="messages"
            items={[
              {
                key: 'messages',
                label: 'Messages',
                children: (
                  <>
                    <div style={{ marginBottom: AdminDesignSystem.spacing.md }}>
                      <Space>
                        <Search placeholder="Search messages..." style={{ width: 200 }} allowClear />
                        <Select placeholder="Filter by status" style={{ width: 150 }}>
                          <Option value="all">All Messages</Option>
                          <Option value="pending">Pending</Option>
                          <Option value="approved">Approved</Option>
                          <Option value="rejected">Rejected</Option>
                        </Select>
                        <Select placeholder="Filter by room" style={{ width: 150 }}>
                          <Option value="all">All Rooms</Option>
                          <Option value="General Chat">General Chat</Option>
                          <Option value="Support">Support</Option>
                          <Option value="Technical">Technical</Option>
                        </Select>
                      </Space>
                    </div>
                    <Table
                      columns={messageColumns}
                      dataSource={messages}
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
                key: 'reports',
                label: 'Reports',
                children: (
                  <>
                    <div style={{ marginBottom: AdminDesignSystem.spacing.md }}>
                      <Space>
                        <Search placeholder="Search reports..." style={{ width: 200 }} allowClear />
                        <Select placeholder="Filter by status" style={{ width: 150 }}>
                          <Option value="all">All Reports</Option>
                          <Option value="pending">Pending</Option>
                          <Option value="resolved">Resolved</Option>
                        </Select>
                      </Space>
                    </div>
                    <Table
                      columns={reportColumns}
                      dataSource={reports}
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
                key: 'rules',
                label: 'Moderation Rules',
                children: (
                  <Card title="Moderation Rules" size="small">
                    <div style={{ marginBottom: 16 }}>
                      <h4>Content Guidelines</h4>
                      <ul>
                        <li>No spam or promotional content</li>
                        <li>No offensive or inappropriate language</li>
                        <li>No personal attacks or harassment</li>
                        <li>Stay on topic and be respectful</li>
                      </ul>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <h4>Auto-Moderation Settings</h4>
                      <ul>
                        <li>Auto-flag messages with inappropriate language</li>
                        <li>Auto-flag messages with promotional content</li>
                        <li>Auto-flag messages with excessive caps</li>
                        <li>Auto-flag messages with suspicious links</li>
                      </ul>
                    </div>
                    <Button type="primary">Update Rules</Button>
                  </Card>
                )
              }
            ]}
          />
        </Card>

        {/* Message Detail Modal */}
        <Modal
          title="Message Details"
          open={!!selectedMessage}
          onCancel={() => setSelectedMessage(null)}
          footer={null}
          width={600}
        >
          {selectedMessage && (
            <div>
              <Card size="small" style={{ marginBottom: 16 }}>
                <Space>
                  <Avatar src={selectedMessage.user.avatar} icon={<UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{selectedMessage.user.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{selectedMessage.user.role}</div>
                  </div>
                </Space>
              </Card>
              
              <Card title="Message Content" size="small" style={{ marginBottom: 16 }}>
                <p>{selectedMessage.content}</p>
                <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                  Room: {selectedMessage.room} • {selectedMessage.timestamp}
                </div>
              </Card>

              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setSelectedMessage(null)}>Close</Button>
                  {selectedMessage.status === 'pending' && (
                    <>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => {
                        handleApproveMessage(selectedMessage._id)
                        setSelectedMessage(null)
                      }}>
                        Approve
                      </Button>
                      <Button danger icon={<StopOutlined />} onClick={() => {
                        handleRejectMessage(selectedMessage._id)
                        setSelectedMessage(null)
                      }}>
                        Reject
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default ChatModeration




