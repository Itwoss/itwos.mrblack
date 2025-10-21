import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Form, Upload, message, Tabs } from 'antd'
import { 
  FileTextOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FilterOutlined,
  PlusOutlined,
  UploadOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'

const { Title, Paragraph } = Typography
const { Search } = Input
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs

const ContentManagement = () => {
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContent, setEditingContent] = useState(null)
  const [form] = Form.useForm()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalContent: 156,
    publishedContent: 134,
    draftContent: 22,
    totalViews: 45678
  })

  useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      setContent([])
    } catch (error) {
      message.error('Failed to fetch content')
    } finally {
      setLoading(false)
    }
  }

  const handleEditContent = (content) => {
    setEditingContent(content)
    form.setFieldsValue(content)
    setModalVisible(true)
  }

  const handleDeleteContent = (contentId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this content?',
      content: 'This action cannot be undone.',
      onOk: () => {
        setContent(prev => prev.filter(c => c._id !== contentId))
        message.success('Content deleted successfully')
      }
    })
  }

  const handleStatusChange = (contentId, status) => {
    setContent(prev => prev.map(c => c._id === contentId ? { ...c, status } : c))
    message.success(`Content ${status} successfully`)
  }

  const handleSubmit = async (values) => {
    try {
      if (editingContent) {
        setContent(prev => prev.map(c => c._id === editingContent._id ? { ...c, ...values } : c))
        message.success('Content updated successfully')
      } else {
        const newContent = {
          _id: Date.now().toString(),
          ...values,
          author: 'Admin',
          publishDate: values.status === 'published' ? new Date().toISOString().split('T')[0] : null,
          views: 0
        }
        setContent(prev => [...prev, newContent])
        message.success('Content created successfully')
      }
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save content')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'published': 'green',
      'draft': 'orange',
      'archived': 'gray'
    }
    return colors[status] || 'default'
  }

  const getTypeIcon = (type) => {
    const icons = {
      'blog': <FileTextOutlined />,
      'article': <FileTextOutlined />,
      'guide': <FileTextOutlined />,
      'image': <PictureOutlined />,
      'video': <VideoCameraOutlined />,
      'audio': <SoundOutlined />
    }
    return icons[type] || <FileTextOutlined />
  }

  const columns = [
    {
      title: 'Content',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          {getTypeIcon(record.type)}
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.type.toUpperCase()} • {record.category}
            </div>
          </div>
        </Space>
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
      title: 'Views',
      dataIndex: 'views',
      key: 'views',
      render: (views) => views.toLocaleString()
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
      render: (date) => date || 'Not published'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditContent(record)}>Edit</Button>
          <Button 
            size="small" 
            type={record.status === 'published' ? 'default' : 'primary'}
            onClick={() => handleStatusChange(record._id, record.status === 'published' ? 'draft' : 'published')}
          >
            {record.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteContent(record._id)}>Delete</Button>
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
            📝 Content Management
          </Title>
          <Paragraph>
            Manage blog posts, articles, guides, and other content across your platform.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Content"
                value={stats.totalContent}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Published"
                value={stats.publishedContent}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Drafts"
                value={stats.draftContent}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Views"
                value={stats.totalViews}
                prefix={<EyeOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Content Management Tabs */}
        <Card>
          <Tabs defaultActiveKey="all">
            <TabPane tab="All Content" key="all">
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Search placeholder="Search content..." style={{ width: 200 }} />
                  <Select placeholder="Filter by type" style={{ width: 150 }}>
                    <Option value="all">All Types</Option>
                    <Option value="blog">Blog</Option>
                    <Option value="article">Article</Option>
                    <Option value="guide">Guide</Option>
                  </Select>
                  <Select placeholder="Filter by status" style={{ width: 150 }}>
                    <Option value="all">All Status</Option>
                    <Option value="published">Published</Option>
                    <Option value="draft">Draft</Option>
                  </Select>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                    Create Content
                  </Button>
                </Space>
              </div>
              <Table
                columns={columns}
                dataSource={content}
                loading={loading}
                rowKey="_id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
              />
            </TabPane>
            <TabPane tab="Blog Posts" key="blog">
              <Table
                columns={columns}
                dataSource={content.filter(c => c.type === 'blog')}
                loading={loading}
                rowKey="_id"
                pagination={false}
              />
            </TabPane>
            <TabPane tab="Articles" key="article">
              <Table
                columns={columns}
                dataSource={content.filter(c => c.type === 'article')}
                loading={loading}
                rowKey="_id"
                pagination={false}
              />
            </TabPane>
            <TabPane tab="Guides" key="guide">
              <Table
                columns={columns}
                dataSource={content.filter(c => c.type === 'guide')}
                loading={loading}
                rowKey="_id"
                pagination={false}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* Content Form Modal */}
        <Modal
          title={editingContent ? 'Edit Content' : 'Create Content'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
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
                  label="Content Title"
                  rules={[{ required: true, message: 'Please enter title' }]}
                >
                  <Input placeholder="Enter content title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Content Type"
                  rules={[{ required: true, message: 'Please select type' }]}
                >
                  <Select placeholder="Select content type">
                    <Option value="blog">Blog Post</Option>
                    <Option value="article">Article</Option>
                    <Option value="guide">Guide</Option>
                    <Option value="tutorial">Tutorial</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select category' }]}
                >
                  <Select placeholder="Select category">
                    <Option value="Tutorial">Tutorial</Option>
                    <Option value="Business">Business</Option>
                    <Option value="Design">Design</Option>
                    <Option value="Technical">Technical</Option>
                    <Option value="News">News</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select placeholder="Select status">
                    <Option value="draft">Draft</Option>
                    <Option value="published">Published</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="content"
              label="Content"
              rules={[{ required: true, message: 'Please enter content' }]}
            >
              <TextArea rows={6} placeholder="Enter your content here..." />
            </Form.Item>

            <Form.Item
              name="tags"
              label="Tags"
            >
              <Select
                mode="tags"
                placeholder="Add tags"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="featuredImage"
              label="Featured Image"
            >
              <Upload
                listType="picture-card"
                showUploadList={false}
                beforeUpload={() => false}
              >
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingContent ? 'Update Content' : 'Create Content'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default ContentManagement




