import React, { useState, useEffect } from 'react'
import { Card, Collapse, Button, Space, Typography, Row, Col, Input, Select, Tag, List, Avatar, message, Modal, Form } from 'antd'
import { 
  QuestionCircleOutlined, 
  SearchOutlined, 
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  LikeOutlined,
  DislikeOutlined,
  SendOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BookOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import UserLayout from '../../components/UserLayout'

const { Title, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

const HelpCenter = () => {
  const [faqs, setFaqs] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalTickets: 5,
    openTickets: 2,
    resolvedTickets: 3,
    averageResponseTime: '2 hours'
  })

  useEffect(() => {
    fetchFAQs()
    fetchTickets()
  }, [])

  const fetchFAQs = async () => {
    try {
      // Mock data
      const mockFAQs = [
        {
          _id: '1',
          question: 'How do I place an order?',
          answer: 'To place an order, browse our products, select the one you want, and click "Pre-book Now". Fill out the pre-booking form with your requirements and contact information.',
          category: 'Orders',
          helpful: 15,
          notHelpful: 2
        },
        {
          _id: '2',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through our payment gateway.',
          category: 'Payment',
          helpful: 12,
          notHelpful: 1
        },
        {
          _id: '3',
          question: 'How long does it take to complete a project?',
          answer: 'Project completion time varies depending on complexity. Simple websites take 1-2 weeks, while complex e-commerce sites may take 4-6 weeks.',
          category: 'Projects',
          helpful: 8,
          notHelpful: 0
        },
        {
          _id: '4',
          question: 'Can I modify my order after placing it?',
          answer: 'Yes, you can modify your order within 24 hours of placing it. Contact our support team to make changes to your requirements.',
          category: 'Orders',
          helpful: 10,
          notHelpful: 1
        },
        {
          _id: '5',
          question: 'Do you provide ongoing support?',
          answer: 'Yes, we provide 3 months of free support after project completion. Additional support can be purchased if needed.',
          category: 'Support',
          helpful: 7,
          notHelpful: 0
        }
      ]
      setFaqs(mockFAQs)
    } catch (error) {
      console.error('Failed to fetch FAQs:', error)
    }
  }

  const fetchTickets = async () => {
    try {
      // Mock data
      const mockTickets = [
        {
          _id: '1',
          subject: 'Website customization request',
          description: 'I need help customizing my e-commerce website template.',
          status: 'open',
          priority: 'medium',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
          responses: 2
        },
        {
          _id: '2',
          subject: 'Payment issue',
          description: 'I am unable to complete my payment for order #ORD-001.',
          status: 'resolved',
          priority: 'high',
          createdAt: '2024-01-14',
          updatedAt: '2024-01-14',
          responses: 3
        },
        {
          _id: '3',
          subject: 'Technical support needed',
          description: 'My website is not loading properly after deployment.',
          status: 'open',
          priority: 'high',
          createdAt: '2024-01-13',
          updatedAt: '2024-01-13',
          responses: 1
        }
      ]
      setTickets(mockTickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    }
  }

  const handleCreateTicket = async (values) => {
    try {
      const newTicket = {
        _id: Date.now().toString(),
        ...values,
        status: 'open',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        responses: 0
      }
      setTickets(prev => [...prev, newTicket])
      message.success('Support ticket created successfully')
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to create ticket')
    }
  }

  const handleHelpful = (faqId, isHelpful) => {
    setFaqs(prev => prev.map(f => 
      f._id === faqId 
        ? { 
            ...f, 
            helpful: isHelpful ? f.helpful + 1 : f.helpful,
            notHelpful: !isHelpful ? f.notHelpful + 1 : f.notHelpful
          }
        : f
    ))
    message.success(isHelpful ? 'Marked as helpful' : 'Marked as not helpful')
  }

  const getStatusColor = (status) => {
    const colors = {
      'open': 'orange',
      'resolved': 'green',
      'closed': 'gray'
    }
    return colors[status] || 'default'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'green',
      'medium': 'orange',
      'high': 'red'
    }
    return colors[priority] || 'default'
  }

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            🆘 Help Center
          </Title>
          <Paragraph>
            Find answers to common questions and get support for your issues.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Tickets"
                value={stats.totalTickets}
                prefix={<QuestionCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Open Tickets"
                value={stats.openTickets}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Resolved"
                value={stats.resolvedTickets}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Avg Response Time"
                value={stats.averageResponseTime}
                prefix={<ClockCircleOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* FAQ Section */}
          <Col xs={24} lg={12}>
            <Card title="Frequently Asked Questions" extra={<SearchOutlined />}>
              <Input 
                placeholder="Search FAQs..." 
                style={{ marginBottom: 16 }}
                prefix={<SearchOutlined />}
              />
              
              <Collapse>
                {faqs.map((faq) => (
                  <Panel 
                    header={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{faq.question}</span>
                        <Tag color="blue">{faq.category}</Tag>
                      </div>
                    } 
                    key={faq._id}
                  >
                    <div>
                      <p>{faq.answer}</p>
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Button 
                            size="small" 
                            type="text" 
                            icon={<LikeOutlined />}
                            onClick={() => handleHelpful(faq._id, true)}
                          >
                            Helpful ({faq.helpful})
                          </Button>
                          <Button 
                            size="small" 
                            type="text" 
                            icon={<DislikeOutlined />}
                            onClick={() => handleHelpful(faq._id, false)}
                          >
                            Not Helpful ({faq.notHelpful})
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </Panel>
                ))}
              </Collapse>
            </Card>
          </Col>

          {/* Support Tickets */}
          <Col xs={24} lg={12}>
            <Card 
              title="Support Tickets" 
              extra={
                <Button type="primary" icon={<SendOutlined />} onClick={() => setModalVisible(true)}>
                  New Ticket
                </Button>
              }
            >
              {tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <QuestionCircleOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <p>No support tickets yet</p>
                  <Button type="primary" onClick={() => setModalVisible(true)}>
                    Create Your First Ticket
                  </Button>
                </div>
              ) : (
                <List
                  dataSource={tickets}
                  renderItem={(ticket) => (
                    <List.Item
                      style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        marginBottom: 8,
                        padding: 12
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{ticket.subject}</span>
                            <Space>
                              <Tag color={getStatusColor(ticket.status)}>{ticket.status}</Tag>
                              <Tag color={getPriorityColor(ticket.priority)}>{ticket.priority}</Tag>
                            </Space>
                          </div>
                        }
                        description={
                          <div>
                            <p style={{ marginBottom: 8 }}>{ticket.description}</p>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Created: {ticket.createdAt} • Responses: {ticket.responses}
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
        </Row>

        {/* Contact Methods */}
        <Row gutter={[24, 24]} style={{ marginTop: '2rem' }}>
          <Col xs={24} sm={8}>
            <Card title="Live Chat" style={{ textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <p>Chat with our support team in real-time</p>
              <Button type="primary" icon={<MessageOutlined />}>
                Start Chat
              </Button>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Phone Support" style={{ textAlign: 'center' }}>
              <PhoneOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <p>Call us for immediate assistance</p>
              <Button type="primary" icon={<PhoneOutlined />}>
                Call Now
              </Button>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Email Support" style={{ textAlign: 'center' }}>
              <MailOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
              <p>Send us an email and we'll respond within 24 hours</p>
              <Button type="primary" icon={<MailOutlined />}>
                Send Email
              </Button>
            </Card>
          </Col>
        </Row>

        {/* Resources */}
        <Card title="Helpful Resources" style={{ marginTop: '2rem' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <FileTextOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                  <h4>Documentation</h4>
                  <p>Comprehensive guides and tutorials</p>
                  <Button type="link">View Docs</Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <VideoCameraOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                  <h4>Video Tutorials</h4>
                  <p>Step-by-step video guides</p>
                  <Button type="link">Watch Videos</Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center' }}>
                  <BookOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 8 }} />
                  <h4>Knowledge Base</h4>
                  <p>Search our knowledge base</p>
                  <Button type="link">Browse Articles</Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Create Ticket Modal */}
        <Modal
          title="Create Support Ticket"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateTicket}
          >
            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true, message: 'Please enter a subject' }]}
            >
              <Input placeholder="Brief description of your issue" />
            </Form.Item>

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

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please describe your issue' }]}
            >
              <TextArea rows={4} placeholder="Please provide detailed information about your issue..." />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                  Create Ticket
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </UserLayout>
  )
}

export default HelpCenter




