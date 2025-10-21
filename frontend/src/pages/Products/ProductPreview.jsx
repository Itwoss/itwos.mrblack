import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Tag, 
  Space, 
  Rate, 
  Statistic, 
  Divider, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Checkbox, 
  message, 
  Spin, 
  Empty,
  Badge,
  Timeline,
  Progress
} from 'antd'
import { 
  EyeOutlined, 
  StarOutlined, 
  ShoppingCartOutlined, 
  FireOutlined,
  GlobalOutlined,
  LinkOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { productAPI } from '../../services/api'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const ProductPreview = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [prebookModalVisible, setPrebookModalVisible] = useState(false)
  const [prebookLoading, setPrebookLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (slug) {
      loadProduct()
    }
  }, [slug])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const response = await productAPI.getProductBySlug(slug)
      if (response.data.success) {
        setProduct(response.data.data.product)
        // Track visit
        trackVisit(response.data.data.product._id)
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const trackVisit = async (productId) => {
    try {
      await productAPI.trackVisit(productId, {
        ip: 'unknown',
        userAgent: navigator.userAgent,
        referrer: document.referrer
      })
    } catch (error) {
      console.error('Error tracking visit:', error)
    }
  }

  const handlePrebook = () => {
    if (!isAuthenticated) {
      message.warning('Please login to submit a prebook request')
      navigate('/login')
      return
    }
    setPrebookModalVisible(true)
  }

  const handlePrebookSubmit = async (values) => {
    setPrebookLoading(true)
    try {
      const response = await productAPI.createPrebook(product._id, values)
      if (response.data.success) {
        message.success('Prebook request submitted successfully!')
        setPrebookModalVisible(false)
        form.resetFields()
      }
    } catch (error) {
      console.error('Error submitting prebook:', error)
      message.error('Failed to submit prebook request')
    } finally {
      setPrebookLoading(false)
    }
  }

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem' }}>
          <Text type="secondary">Loading product details...</Text>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Empty description="Product not found" />
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Row gutter={[48, 48]}>
        {/* Left Column - Website Preview */}
        <Col xs={24} lg={12}>
          <Card title="Website Preview" style={{ height: '600px' }}>
            <div style={{ position: 'relative', height: '500px' }}>
              <iframe
                src={product.websiteUrl}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  borderRadius: '8px'
                }}
                title={product.title}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
              <div style={{ 
                position: 'absolute', 
                top: 8, 
                right: 8,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Live Preview
              </div>
            </div>
          </Card>
        </Col>

        {/* Right Column - Product Info */}
        <Col xs={24} lg={12}>
          <div>
            <Title level={1} style={{ marginBottom: '0.5rem' }}>
              {product.title}
            </Title>
            
            <div style={{ marginBottom: '1rem' }}>
              <Space>
                <Text type="secondary">by</Text>
                <Text strong>{product.developerName}</Text>
                <Text type="secondary">•</Text>
                <Text type="secondary">{formatDate(product.createdAt)}</Text>
              </Space>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Space wrap>
                {product.tags.map(tag => (
                  <Tag key={tag} color="blue">{tag}</Tag>
                ))}
                {product.trending && (
                  <Tag color="red" icon={<FireOutlined />}>Trending</Tag>
                )}
              </Space>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Price"
                    value={product.price}
                    prefix="$"
                    valueStyle={{ color: '#1890ff', fontSize: '24px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Rating"
                    value={product.averageRating}
                    precision={1}
                    suffix="/ 5"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Views"
                    value={product.totalVisits}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Title level={4}>Description</Title>
              <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
                {product.description}
              </Paragraph>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Title level={4}>Website Details</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>Website URL:</Text>
                  <br />
                  <Button 
                    type="link" 
                    href={product.websiteUrl}
                    target="_blank"
                    icon={<GlobalOutlined />}
                  >
                    {product.websiteUrl}
                  </Button>
                </div>
                {product.websiteLink && (
                  <div>
                    <Text strong>Additional Link:</Text>
                    <br />
                    <Button 
                      type="link" 
                      href={product.websiteLink}
                      target="_blank"
                      icon={<LinkOutlined />}
                    >
                      {product.websiteLink}
                    </Button>
                  </div>
                )}
              </Space>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Title level={4}>Analytics</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Total Visits (30 days)"
                    value={product.totalVisits}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Reviews"
                    value={product.reviewsCount}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <Button 
                type="primary" 
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={handlePrebook}
                style={{ width: '100%' }}
              >
                Prebook This Project
              </Button>
            </div>

            <Divider />

            <div>
              <Title level={4}>Reviews</Title>
              {product.reviewsCount > 0 ? (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <Rate disabled value={product.averageRating} />
                    <Text style={{ marginLeft: '8px' }}>
                      {product.averageRating} out of 5 ({product.reviewsCount} reviews)
                    </Text>
                  </div>
                  <Text type="secondary">
                    Reviews and ratings will be displayed here
                  </Text>
                </div>
              ) : (
                <Text type="secondary">No reviews yet</Text>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Prebook Modal */}
      <Modal
        title="Prebook This Project"
        open={prebookModalVisible}
        onCancel={() => setPrebookModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePrebookSubmit}
          initialValues={{
            contactInfo: {
              name: user?.name || '',
              email: user?.email || '',
              phone: user?.phone || ''
            }
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Title level={4}>Project Specifications</Title>
              
              <Form.Item
                name="projectType"
                label="Project Type"
                rules={[{ required: true, message: 'Please select project type' }]}
              >
                <Select placeholder="Select project type">
                  <Option value="website">Website</Option>
                  <Option value="web-app">Web Application</Option>
                  <Option value="mobile-app">Mobile App</Option>
                  <Option value="ecommerce">E-commerce</Option>
                  <Option value="landing-page">Landing Page</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="budget"
                label="Budget Range"
                rules={[{ required: true, message: 'Please select budget range' }]}
              >
                <Select placeholder="Select budget range">
                  <Option value="under-5k">Under $5,000</Option>
                  <Option value="5k-10k">$5,000 - $10,000</Option>
                  <Option value="10k-25k">$10,000 - $25,000</Option>
                  <Option value="25k-50k">$25,000 - $50,000</Option>
                  <Option value="50k-100k">$50,000 - $100,000</Option>
                  <Option value="100k-plus">$100,000+</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="timeline"
                label="Timeline (days)"
                rules={[{ required: true, message: 'Please enter timeline' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Enter timeline in days"
                  min={1}
                  max={365}
                />
              </Form.Item>

              <Form.Item
                name="features"
                label="Required Features"
              >
                <Checkbox.Group>
                  <Row>
                    <Col span={12}>
                      <Checkbox value="responsive-design">Responsive Design</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="seo-optimization">SEO Optimization</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="user-authentication">User Authentication</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="payment-integration">Payment Integration</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="admin-dashboard">Admin Dashboard</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="mobile-app">Mobile App</Checkbox>
                    </Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item
                name="notes"
                label="Additional Notes"
              >
                <TextArea
                  rows={4}
                  placeholder="Describe your project requirements in detail..."
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Title level={4}>Contact Information</Title>
              
              <Form.Item
                name={['contactInfo', 'name']}
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input placeholder="Enter your full name" />
              </Form.Item>

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

              <Form.Item
                name={['contactInfo', 'phone']}
                label="Phone Number"
              >
                <Input placeholder="Enter your phone number" />
              </Form.Item>

              <Form.Item
                name={['contactInfo', 'company']}
                label="Company"
              >
                <Input placeholder="Enter your company name" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPrebookModalVisible(false)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={prebookLoading}
              >
                Submit Prebook Request
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default ProductPreview





