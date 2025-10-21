import React, { useState, useEffect } from 'react'
import { Card, List, Button, Space, Typography, Row, Col, Input, Avatar, Badge, Empty, Tag, Modal, Form } from 'antd'
import { 
  MessageOutlined, 
  SendOutlined, 
  UserOutlined, 
  SearchOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'

const { Title, Paragraph } = Typography
const { TextArea } = Input

const Messages = () => {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalConversations: 8,
    unreadMessages: 12,
    onlineContacts: 3,
    totalMessages: 156
  })

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      // Mock data
      const mockConversations = [
        {
          _id: '1',
          contact: {
            name: 'Sarah Johnson',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
            role: 'admin',
            online: true
          },
          lastMessage: {
            text: 'Thank you for your order! It will be shipped within 2 business days.',
            timestamp: '2024-01-15 10:30:00',
            sender: 'admin',
            read: false
          },
          unreadCount: 2,
          status: 'active'
        },
        {
          _id: '2',
          contact: {
            name: 'Mike Chen',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
            role: 'support',
            online: false
          },
          lastMessage: {
            text: 'I can help you with any technical questions about our products.',
            timestamp: '2024-01-14 16:45:00',
            sender: 'support',
            read: true
          },
          unreadCount: 0,
          status: 'active'
        },
        {
          _id: '3',
          contact: {
            name: 'Emily Davis',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
            role: 'sales',
            online: true
          },
          lastMessage: {
            text: 'Would you like to know more about our premium templates?',
            timestamp: '2024-01-13 14:20:00',
            sender: 'sales',
            read: true
          },
          unreadCount: 0,
          status: 'active'
        },
        {
          _id: '4',
          contact: {
            name: 'John Smith',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
            role: 'user',
            online: false
          },
          lastMessage: {
            text: 'Thanks for the recommendation!',
            timestamp: '2024-01-12 11:00:00',
            sender: 'user',
            read: true
          },
          unreadCount: 0,
          status: 'archived'
        }
      ]
      setConversations(mockConversations)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId) => {
    // Mock messages for the selected conversation
    const mockMessages = [
      {
        _id: '1',
        text: 'Hello! How can I help you today?',
        sender: 'admin',
        timestamp: '2024-01-15 09:00:00',
        read: true
      },
      {
        _id: '2',
        text: 'I have a question about the E-commerce template.',
        sender: 'user',
        timestamp: '2024-01-15 09:15:00',
        read: true
      },
      {
        _id: '3',
        text: 'Sure! What would you like to know?',
        sender: 'admin',
        timestamp: '2024-01-15 09:16:00',
        read: true
      },
      {
        _id: '4',
        text: 'Does it include payment integration?',
        sender: 'user',
        timestamp: '2024-01-15 09:17:00',
        read: true
      },
      {
        _id: '5',
        text: 'Yes, it includes Razorpay integration and supports multiple payment methods.',
        sender: 'admin',
        timestamp: '2024-01-15 09:18:00',
        read: true
      },
      {
        _id: '6',
        text: 'Thank you for your order! It will be shipped within 2 business days.',
        sender: 'admin',
        timestamp: '2024-01-15 10:30:00',
        read: false
      }
    ]
    setMessages(mockMessages)
  }

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation._id)
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        _id: Date.now().toString(),
        text: newMessage,
        sender: 'user',
        timestamp: new Date().toLocaleString(),
        read: true
      }
      setMessages(prev => [...prev, message])
      setNewMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getContactStatus = (contact) => {
    if (contact.online) {
      return <Badge status="success" text="Online" />
    }
    return <Badge status="default" text="Offline" />
  }

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'red',
      'support': 'blue',
      'sales': 'green',
      'user': 'default'
    }
    return colors[role] || 'default'
  }

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            💬 Messages
          </Title>
          <Paragraph>
            Chat with our support team and get help with your orders.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Conversations"
                value={stats.totalConversations}
                prefix={<MessageOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Unread Messages"
                value={stats.unreadMessages}
                prefix={<Badge count={stats.unreadMessages}><MessageOutlined style={{ color: '#f5222d' }} /></Badge>}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Online Contacts"
                value={stats.onlineContacts}
                prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Messages"
                value={stats.totalMessages}
                prefix={<MessageOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* Conversations List */}
          <Col xs={24} lg={8}>
            <Card title="Conversations" extra={<SearchOutlined />}>
              <Input 
                placeholder="Search conversations..." 
                style={{ marginBottom: 16 }}
                prefix={<SearchOutlined />}
              />
              
              {conversations.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No conversations yet"
                  style={{ padding: '2rem 0' }}
                />
              ) : (
                <List
                  dataSource={conversations}
                  loading={loading}
                  renderItem={(conversation) => (
                    <List.Item
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedConversation?._id === conversation._id ? '#e6f7ff' : '#fff',
                        border: selectedConversation?._id === conversation._id ? '1px solid #1890ff' : '1px solid #f0f0f0',
                        borderRadius: 8,
                        marginBottom: 8,
                        padding: 12
                      }}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ position: 'relative' }}>
                            <Avatar src={conversation.contact.avatar} icon={<UserOutlined />} />
                            {conversation.contact.online && (
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: 12,
                                height: 12,
                                backgroundColor: '#52c41a',
                                borderRadius: '50%',
                                border: '2px solid #fff'
                              }} />
                            )}
                          </div>
                        }
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{conversation.contact.name}</span>
                            <Space>
                              <Tag color={getRoleColor(conversation.contact.role)}>
                                {conversation.contact.role}
                              </Tag>
                              {conversation.unreadCount > 0 && (
                                <Badge count={conversation.unreadCount} />
                              )}
                            </Space>
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#666',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {conversation.lastMessage.text}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#999',
                              marginTop: 4
                            }}>
                              {conversation.lastMessage.timestamp}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          {/* Chat Area */}
          <Col xs={24} lg={16}>
            {selectedConversation ? (
              <Card 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar src={selectedConversation.contact.avatar} icon={<UserOutlined />} />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{selectedConversation.contact.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {getContactStatus(selectedConversation.contact)}
                        </div>
                      </div>
                    </Space>
                    <Space>
                      <Button size="small" icon={<PhoneOutlined />}>Call</Button>
                      <Button size="small" icon={<VideoCameraOutlined />}>Video</Button>
                      <Button size="small" icon={<MoreOutlined />}>More</Button>
                    </Space>
                  </div>
                }
                style={{ height: '600px', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
              >
                {/* Messages */}
                <div style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '16px 0',
                  maxHeight: '400px'
                }}>
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      style={{
                        display: 'flex',
                        justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 16
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: message.sender === 'user' ? '#1890ff' : '#f5f5f5',
                          color: message.sender === 'user' ? '#fff' : '#000',
                          wordWrap: 'break-word'
                        }}
                      >
                        <div>{message.text}</div>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.7, 
                          marginTop: 4,
                          textAlign: 'right'
                        }}>
                          {message.timestamp}
                          {message.sender === 'user' && (
                            <span style={{ marginLeft: 4 }}>
                              {message.read ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <TextArea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      style={{ flex: 1 }}
                    />
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      Send
                    </Button>
                  </Space.Compact>
                </div>
              </Card>
            ) : (
              <Card style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Select a conversation to start chatting"
                  style={{ padding: '3rem 0' }}
                />
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  )
}

export default Messages




