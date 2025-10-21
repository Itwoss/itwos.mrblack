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

const { Title, Paragraph } = Typography
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
    totalMessages: 1247,
    flaggedMessages: 23,
    resolvedReports: 18,
    activeModerators: 3
  })

  useEffect(() => {
    fetchMessages()
    fetchReports()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      // Mock data
      const mockMessages = [
        {
          _id: '1',
          user: {
            name: 'John Doe',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
            role: 'user'
          },
          content: 'Hello everyone! How is everyone doing today?',
          timestamp: '2024-01-15 10:30:00',
          status: 'approved',
          flagged: false,
          room: 'General Chat'
        },
        {
          _id: '2',
          user: {
            name: 'Sarah Smith',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
            role: 'user'
          },
          content: 'This is inappropriate content that should be moderated',
          timestamp: '2024-01-15 10:25:00',
          status: 'pending',
          flagged: true,
          room: 'General Chat'
        },
        {
          _id: '3',
          user: {
            name: 'Mike Johnson',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
            role: 'user'
          },
          content: 'Great question! Let me help you with that.',
          timestamp: '2024-01-15 10:20:00',
          status: 'approved',
          flagged: false,
          room: 'Support'
        },
        {
          _id: '4',
          user: {
            name: 'Emily Davis',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            role: 'user'
          },
          content: 'Spam message with promotional content',
          timestamp: '2024-01-15 10:15:00',
          status: 'rejected',
          flagged: true,
          room: 'General Chat'
        }
      ]
      setMessages(mockMessages)
    } catch (error) {
      message.error('Failed to fetch messages')
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    try {
      // Mock data
      const mockReports = [
        {
          _id: '1',
          reporter: {
            name: 'User A',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UserA'
          },
          reportedUser: {
            name: 'User B',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UserB'
          },
          reason: 'Inappropriate language',
          description: 'User used offensive language in the chat',
          status: 'pending',
          timestamp: '2024-01-15 09:30:00'
        },
        {
          _id: '2',
          reporter: {
            name: 'User C',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UserC'
          },
          reportedUser: {
            name: 'User D',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=UserD'
          },
          reason: 'Spam',
          description: 'User is sending promotional messages repeatedly',
          status: 'resolved',
          timestamp: '2024-01-15 08:45:00'
        }
      ]
      setReports(mockReports)
    } catch (error) {
      message.error('Failed to fetch reports')
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
      'approved': 'green',
      'pending': 'orange',
      'rejected': 'red'
    }
    return colors[status] || 'default'
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
          <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
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
      render: (reason) => <Tag color="red">{reason}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'resolved' ? 'green' : 'orange'}>
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
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            💬 Chat Moderation
          </Title>
          <Paragraph>
            Moderate chat messages, handle reports, and maintain community standards.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Messages"
                value={stats.totalMessages}
                prefix={<MessageOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Flagged Messages"
                value={stats.flaggedMessages}
                prefix={<FlagOutlined style={{ color: '#f5222d' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Resolved Reports"
                value={stats.resolvedReports}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Active Moderators"
                value={stats.activeModerators}
                prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Moderation Tabs */}
        <Card>
          <Tabs 
            defaultActiveKey="messages"
            items={[
              {
                key: 'messages',
                label: 'Messages',
                children: (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Search placeholder="Search messages..." style={{ width: 200 }} />
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
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Search placeholder="Search reports..." style={{ width: 200 }} />
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




