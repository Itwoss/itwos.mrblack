import React, { useState, useEffect } from 'react'
import { Card, List, Button, Space, Typography, Row, Col, Rate, Input, Select, Tag, Avatar, Modal, Form, message } from 'antd'
import { 
  StarOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  LikeOutlined,
  DislikeOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import UserLayout from '../../components/UserLayout'

const { Title, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const Reviews = () => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [form] = Form.useForm()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalReviews: 12,
    averageRating: 4.6,
    helpfulReviews: 8,
    pendingReviews: 2
  })

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      // Mock data
      const mockReviews = [
        {
          _id: '1',
          product: {
            _id: '1',
            title: 'E-commerce Website Template',
            thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop'
          },
          rating: 5,
          title: 'Excellent Template!',
          content: 'This template is exactly what I needed for my online store. The design is modern and the functionality is perfect. Highly recommended!',
          helpful: 12,
          notHelpful: 1,
          status: 'published',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15'
        },
        {
          _id: '2',
          product: {
            _id: '2',
            title: 'Portfolio Website Template',
            thumbnail: 'https://images.unsplash.com/photo-1522199755839-e2ba9b43d813?w=100&h=100&fit=crop'
          },
          rating: 4,
          title: 'Good Design',
          content: 'The portfolio template has a clean design and is easy to customize. The code is well-structured and documented.',
          helpful: 8,
          notHelpful: 0,
          status: 'published',
          createdAt: '2024-01-14',
          updatedAt: '2024-01-14'
        },
        {
          _id: '3',
          product: {
            _id: '3',
            title: 'Blog Website Template',
            thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=100&fit=crop'
          },
          rating: 3,
          title: 'Could be better',
          content: 'The template is okay but needs some improvements in the mobile responsiveness. Overall decent quality.',
          helpful: 3,
          notHelpful: 2,
          status: 'pending',
          createdAt: '2024-01-13',
          updatedAt: '2024-01-13'
        },
        {
          _id: '4',
          product: {
            _id: '4',
            title: 'Corporate Website Template',
            thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop'
          },
          rating: 5,
          title: 'Perfect for Business',
          content: 'This corporate template is professional and perfect for our business needs. The customer support was also excellent.',
          helpful: 15,
          notHelpful: 0,
          status: 'published',
          createdAt: '2024-01-12',
          updatedAt: '2024-01-12'
        }
      ]
      setReviews(mockReviews)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditReview = (review) => {
    setEditingReview(review)
    form.setFieldsValue({
      rating: review.rating,
      title: review.title,
      content: review.content
    })
    setModalVisible(true)
  }

  const handleDeleteReview = (reviewId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this review?',
      content: 'This action cannot be undone.',
      onOk: () => {
        setReviews(prev => prev.filter(r => r._id !== reviewId))
        message.success('Review deleted successfully')
      }
    })
  }

  const handleHelpful = (reviewId, isHelpful) => {
    setReviews(prev => prev.map(r => 
      r._id === reviewId 
        ? { 
            ...r, 
            helpful: isHelpful ? r.helpful + 1 : r.helpful,
            notHelpful: !isHelpful ? r.notHelpful + 1 : r.notHelpful
          }
        : r
    ))
    message.success(isHelpful ? 'Marked as helpful' : 'Marked as not helpful')
  }

  const handleSubmit = async (values) => {
    try {
      if (editingReview) {
        setReviews(prev => prev.map(r => r._id === editingReview._id ? { ...r, ...values, updatedAt: new Date().toISOString().split('T')[0] } : r))
        message.success('Review updated successfully')
      } else {
        const newReview = {
          _id: Date.now().toString(),
          product: {
            _id: '1',
            title: 'Sample Product',
            thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop'
          },
          ...values,
          helpful: 0,
          notHelpful: 0,
          status: 'pending',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0]
        }
        setReviews(prev => [...prev, newReview])
        message.success('Review submitted successfully')
      }
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save review')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'published': 'green',
      'pending': 'orange',
      'rejected': 'red'
    }
    return colors[status] || 'default'
  }

  const getStatusIcon = (status) => {
    const icons = {
      'published': <CheckCircleOutlined />,
      'pending': <ClockCircleOutlined />,
      'rejected': <DeleteOutlined />
    }
    return icons[status] || <ClockCircleOutlined />
  }

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            ⭐ My Reviews
          </Title>
          <Paragraph>
            Manage your product reviews and ratings.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Reviews"
                value={stats.totalReviews}
                prefix={<StarOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Average Rating"
                value={stats.averageRating}
                prefix={<StarOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Helpful Reviews"
                value={stats.helpfulReviews}
                prefix={<LikeOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Pending Reviews"
                value={stats.pendingReviews}
                prefix={<ClockCircleOutlined style={{ color: '#f5222d' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Reviews List */}
        <Card 
          title="My Reviews" 
          extra={
            <Space>
              <Input placeholder="Search reviews..." style={{ width: 200 }} prefix={<SearchOutlined />} />
              <Select placeholder="Filter by status" style={{ width: 150 }}>
                <Option value="all">All Reviews</Option>
                <Option value="published">Published</Option>
                <Option value="pending">Pending</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                Write Review
              </Button>
            </Space>
          }
        >
          {reviews.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No reviews yet"
              style={{ padding: '3rem 0' }}
            >
              <Button type="primary" onClick={() => setModalVisible(true)}>
                Write Your First Review
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={reviews}
              loading={loading}
              renderItem={(review) => (
                <List.Item
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    marginBottom: 16,
                    padding: 16
                  }}
                  actions={[
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEditReview(review)}>Edit</Button>,
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteReview(review._id)}>Delete</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <img 
                        src={review.product.thumbnail} 
                        alt={review.product.title}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{review.product.title}</div>
                          <div style={{ fontSize: '14px', color: '#666' }}>{review.title}</div>
                        </div>
                        <Space>
                          <Rate disabled value={review.rating} />
                          <Tag color={getStatusColor(review.status)} icon={getStatusIcon(review.status)}>
                            {review.status}
                          </Tag>
                        </Space>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 12 }}>{review.content}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {review.createdAt} {review.updatedAt !== review.createdAt && `(Updated: ${review.updatedAt})`}
                          </div>
                          <Space>
                            <Button 
                              size="small" 
                              type="text" 
                              icon={<LikeOutlined />}
                              onClick={() => handleHelpful(review._id, true)}
                            >
                              Helpful ({review.helpful})
                            </Button>
                            <Button 
                              size="small" 
                              type="text" 
                              icon={<DislikeOutlined />}
                              onClick={() => handleHelpful(review._id, false)}
                            >
                              Not Helpful ({review.notHelpful})
                            </Button>
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Review Form Modal */}
        <Modal
          title={editingReview ? 'Edit Review' : 'Write Review'}
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
            <Form.Item
              name="rating"
              label="Rating"
              rules={[{ required: true, message: 'Please select a rating' }]}
            >
              <Rate />
            </Form.Item>

            <Form.Item
              name="title"
              label="Review Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
            >
              <Input placeholder="Enter review title" />
            </Form.Item>

            <Form.Item
              name="content"
              label="Review Content"
              rules={[{ required: true, message: 'Please enter review content' }]}
            >
              <TextArea rows={4} placeholder="Share your experience with this product..." />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingReview ? 'Update Review' : 'Submit Review'}
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

export default Reviews




