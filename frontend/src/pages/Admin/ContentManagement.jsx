// ContentManagement.jsx - Updated with error handling fixes v2.0
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
import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
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
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    totalViews: 0
  })

  useEffect(() => {
    fetchContent()
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      console.log('🔄 ContentManagement: Loading stats...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ ContentManagement: Dashboard data received:', data)
        
        if (data.success && data.data) {
          const { products } = data.data
          
          setStats({
            totalContent: products?.totalProducts || 0,
            publishedContent: products?.publishedProducts || 0,
            draftContent: products?.draftProducts || 0,
            totalViews: 45678 // This would come from analytics
          })
          
          console.log('✅ ContentManagement: Stats updated successfully')
        } else {
          console.log('❌ ContentManagement: API returned unsuccessful response, using demo data')
          setStats({
            totalContent: 156,
            publishedContent: 134,
            draftContent: 22,
            totalViews: 45678
          })
        }
      } else {
        console.error('❌ ContentManagement: Failed to fetch stats:', response.status)
        setStats({
          totalContent: 156,
          publishedContent: 134,
          draftContent: 22,
          totalViews: 45678
        })
      }
    } catch (error) {
      console.error('❌ ContentManagement: Error loading stats:', error)
      setStats({
        totalContent: 156,
        publishedContent: 134,
        draftContent: 22,
        totalViews: 45678
      })
    }
  }

  const fetchContent = async () => {
    setLoading(true)
    try {
      console.log('🔄 ContentManagement: Loading content...')
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/products?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ ContentManagement: Content data received:', data)
        
        if (data.success) {
          const rawContent = data.data?.products || data.data?.content || data.data || []
          // Normalize content data to ensure all fields exist with proper types
          const normalizedContent = rawContent.map((item, index) => {
            // Ensure item is an object
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              return {
                _id: `fallback-${index}-${Date.now()}`,
                title: 'Untitled',
                type: 'unknown',
                status: 'draft',
                views: 0,
                category: 'Uncategorized',
                publishDate: null
              }
            }
            // Safely extract and normalize all fields
            const safeId = item._id || item.id || `item-${index}-${Date.now()}`
            const safeType = (item.type && typeof item.type === 'string') ? String(item.type).trim() : 'unknown'
            const safeStatus = (item.status && typeof item.status === 'string') ? String(item.status).trim() : 'draft'
            const safeViews = (item.views != null && !isNaN(Number(item.views))) ? Number(item.views) : 0
            const safeCategory = (item.category && typeof item.category === 'string') ? String(item.category).trim() : 'Uncategorized'
            const safeTitle = (item.title && typeof item.title === 'string') ? String(item.title).trim() : 
                              (item.name && typeof item.name === 'string') ? String(item.name).trim() : 'Untitled'
            
            return {
              ...item,
              _id: safeId,
              type: safeType,
              status: safeStatus,
              views: safeViews,
              category: safeCategory,
              title: safeTitle,
              publishDate: item.publishDate || item.createdAt || null
            }
          })
          setContent(normalizedContent)
          console.log('✅ ContentManagement: Content loaded successfully', normalizedContent.length, 'items')
        } else {
          console.log('❌ ContentManagement: API returned unsuccessful response')
          setContent([])
        }
      } else {
        console.error('❌ ContentManagement: Failed to fetch content:', response.status)
        setContent([])
      }
    } catch (error) {
      console.error('❌ ContentManagement: Error loading content:', error)
      message.error('Failed to fetch content')
      setContent([])
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
    if (!status || typeof status !== 'string') return AdminDesignSystem.colors.text.secondary
    const colors = {
      'published': AdminDesignSystem.colors.success,
      'draft': AdminDesignSystem.colors.warning,
      'archived': AdminDesignSystem.colors.text.secondary
    }
    return colors[status.toLowerCase()] || AdminDesignSystem.colors.text.secondary
  }

  const getTypeIcon = (type) => {
    if (!type || typeof type !== 'string') return <FileTextOutlined />
    const icons = {
      'blog': <FileTextOutlined />,
      'article': <FileTextOutlined />,
      'guide': <FileTextOutlined />,
      'image': <PictureOutlined />,
      'video': <VideoCameraOutlined />,
      'audio': <SoundOutlined />
    }
    return icons[type.toLowerCase()] || <FileTextOutlined />
  }

  const columns = [
    {
      title: 'Content',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
        try {
          if (!record || typeof record !== 'object') return <span>No data</span>
          const safeText = text || record.title || record.name || 'Untitled'
          const safeType = (record.type && typeof record.type === 'string') ? String(record.type).trim() : 'unknown'
          const safeCategory = (record.category && typeof record.category === 'string') ? String(record.category).trim() : 'Uncategorized'
          return (
        <Space>
              {getTypeIcon(safeType)}
          <div>
                <div style={{ fontWeight: 'bold' }}>{String(safeText)}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
                  {safeType.toUpperCase()} • {safeCategory}
            </div>
          </div>
        </Space>
      )
        } catch (error) {
          console.error('Error rendering content cell:', error, { text, record })
          return <span style={{ color: 'red' }}>Error rendering</span>
        }
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        try {
          const safeStatus = (status && typeof status === 'string') ? String(status).trim() : 'unknown'
          return (
            <Tag 
              color={getStatusColor(safeStatus)}
              style={{
                borderRadius: AdminDesignSystem.borderRadius.sm,
              }}
            >
              {safeStatus.toUpperCase()}
            </Tag>
          )
        } catch (error) {
          console.error('Error rendering status:', error, status)
          return <Tag color="default">UNKNOWN</Tag>
        }
      }
    },
    {
      title: 'Views',
      dataIndex: 'views',
      key: 'views',
      render: (views) => {
        try {
          if (views == null || views === undefined) return '0'
          if (typeof views === 'number' && !isNaN(views)) {
            return views.toLocaleString()
          }
          if (typeof views === 'string') {
            const numViews = parseInt(views, 10)
            return isNaN(numViews) ? '0' : numViews.toLocaleString()
          }
          return '0'
        } catch (error) {
          console.error('Error rendering views:', error, views)
          return '0'
        }
      }
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
      render: (date) => {
        if (!date) return 'Not published'
        try {
          return new Date(date).toLocaleDateString()
        } catch (e) {
          return date
        }
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            style={{ minHeight: '32px', minWidth: '32px' }}
          >
            View
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEditContent(record)}
            style={{ minHeight: '32px', minWidth: '32px' }}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            type={record.status && record.status === 'published' ? 'default' : 'primary'}
            onClick={() => {
              const currentStatus = record.status && typeof record.status === 'string' ? record.status : 'draft'
              handleStatusChange(record._id, currentStatus === 'published' ? 'draft' : 'published')
            }}
            style={{ minHeight: '32px' }}
          >
            {record.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteContent(record._id)}
            style={{ minHeight: '32px', minWidth: '32px' }}
          >
            Delete
          </Button>
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
            <FileTextOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
            Content Management
          </Title>
          <Paragraph style={{ 
            fontSize: AdminDesignSystem.typography.fontSize.body,
            color: AdminDesignSystem.colors.text.secondary,
            lineHeight: AdminDesignSystem.typography.lineHeight,
          }}>
            Manage blog posts, articles, guides, and other content across your platform.
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
                    Total Content
                  </Text>
                }
                value={stats.totalContent}
                prefix={<FileTextOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
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
                    Published
                  </Text>
                }
                value={stats.publishedContent}
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
                    Drafts
                  </Text>
                }
                value={stats.draftContent}
                prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.warning,
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
                    Total Views
                  </Text>
                }
                value={stats.totalViews}
                prefix={<EyeOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Content Management Tabs */}
        <Card
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Tabs defaultActiveKey="all">
            <TabPane tab="All Content" key="all">
              <div style={{ marginBottom: AdminDesignSystem.spacing.lg }}>
                <Space size="middle" wrap>
                  <Search 
                    placeholder="Search content..." 
                    style={{ width: 200 }} 
                    allowClear
                  />
                  <Select 
                    placeholder="Filter by type" 
                    style={{ width: 150 }}
                  >
                    <Option value="all">All Types</Option>
                    <Option value="blog">Blog</Option>
                    <Option value="article">Article</Option>
                    <Option value="guide">Guide</Option>
                  </Select>
                  <Select 
                    placeholder="Filter by status" 
                    style={{ width: 150 }}
                  >
                    <Option value="all">All Status</Option>
                    <Option value="published">Published</Option>
                    <Option value="draft">Draft</Option>
                  </Select>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setModalVisible(true)}
                    style={{
                      borderRadius: AdminDesignSystem.borderRadius.md,
                      backgroundColor: AdminDesignSystem.colors.primary,
                      borderColor: AdminDesignSystem.colors.primary,
                    }}
                  >
                    Create Content
                  </Button>
                </Space>
              </div>
              <div className="table-container">
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
                  className="table"
                  style={{
                    backgroundColor: 'var(--bg-primary)'
                  }}
              />
              </div>
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




