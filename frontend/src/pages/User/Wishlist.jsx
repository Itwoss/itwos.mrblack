import React, { useState, useEffect } from 'react'
import { Card, Button, Space, Tag, Typography, Row, Col, Input, Select, message, Empty, Statistic } from 'antd'
import { 
  HeartOutlined, 
  ShoppingCartOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  FilterOutlined,
  StarOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import UserLayout from '../../components/UserLayout'
import api from '../../services/api'
// ProductDisplay removed - product management features removed

const { Title, Paragraph } = Typography
const { Search } = Input
const { Option } = Select

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalItems: 12,
    totalValue: 8999,
    onSale: 3,
    newItems: 2
  })

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    setLoading(true)
    try {
      // Use saved posts API as wishlist functionality
      const response = await api.get('/posts/saved')
      
      if (response.data.success) {
        const savedPosts = response.data.data?.posts || response.data.posts || []
        // Convert saved posts to wishlist format
        const wishlistItems = savedPosts.map(post => ({
          _id: post._id,
          product: {
            _id: post._id,
            title: post.caption || 'Untitled Post',
            thumbnail: post.imageUrl || '/placeholder-image.svg',
            price: 0,
            originalPrice: 0,
            discount: 0,
            rating: { average: post.likes || 0, count: post.comments?.length || 0 },
            shortDescription: post.caption || ''
          },
          addedDate: new Date(post.createdAt || Date.now()).toLocaleDateString()
        }))
        setWishlist(wishlistItems)
        
        // Calculate stats
        setStats({
          totalItems: wishlistItems.length,
          totalValue: 0,
          onSale: 0,
          newItems: wishlistItems.filter(item => {
            const addedDate = new Date(item.product.createdAt || item.addedDate)
            const daysSinceAdded = (Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24)
            return daysSinceAdded < 7
          }).length
        })
      } else {
        setWishlist([])
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
      setWishlist([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromWishlist = (itemId) => {
    setWishlist(prev => prev.filter(item => item._id !== itemId))
    message.success('Removed from wishlist')
  }

  const handleAddToCart = (product) => {
    // Simulate add to cart
    message.success('Added to cart')
  }

  const handleViewProduct = (productId) => {
    navigate(`/products/${productId}`)
  }

  const handlePreBook = (product) => {
    // This will be handled by ProductDisplay component
    console.log('Pre-booking product:', product)
  }

  const getWishlistProducts = () => {
    return wishlist.map(item => item.product)
  }

  return (
    <UserLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            ❤️ My Wishlist
          </Title>
          <Paragraph>
            Save your favorite products and track price changes.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Items"
                value={stats.totalItems}
                prefix={<HeartOutlined style={{ color: '#f5222d' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Value"
                value={stats.totalValue}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="On Sale"
                value={stats.onSale}
                prefix={<StarOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="New Items"
                value={stats.newItems}
                prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Wishlist Content */}
        {wishlist.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Your wishlist is empty"
              style={{ padding: '3rem 0' }}
            >
              <Button type="primary" onClick={() => navigate('/products')}>
                Browse Products
              </Button>
            </Empty>
          </Card>
        ) : (
          <div>
            {/* Filters */}
            <Card style={{ marginBottom: '2rem' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Search placeholder="Search wishlist..." style={{ width: '100%' }} />
                </Col>
                <Col xs={12} sm={4}>
                  <Select placeholder="Category" style={{ width: '100%' }}>
                    <Option value="all">All Categories</Option>
                    <Option value="E-commerce">E-commerce</Option>
                    <Option value="Portfolio">Portfolio</Option>
                    <Option value="Blog">Blog</Option>
                    <Option value="Corporate">Corporate</Option>
                  </Select>
                </Col>
                <Col xs={12} sm={4}>
                  <Select placeholder="Sort by" style={{ width: '100%' }}>
                    <Option value="newest">Newest First</Option>
                    <Option value="oldest">Oldest First</Option>
                    <Option value="price-low">Price: Low to High</Option>
                    <Option value="price-high">Price: High to Low</Option>
                    <Option value="rating">Highest Rated</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                  <Space>
                    <Button icon={<FilterOutlined />}>Filters</Button>
                    <Button type="primary" icon={<ShoppingCartOutlined />}>
                      Add All to Cart
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Wishlist Items */}
            <Row gutter={[16, 16]}>
              {wishlist.map((item) => (
                <Col xs={24} sm={12} lg={8} key={item._id}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ position: 'relative' }}>
                        <img
                          alt={item.product.title}
                          src={item.product.thumbnail}
                          style={{ height: 200, objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: 8, right: 8 }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveFromWishlist(item._id)}
                            style={{ background: 'rgba(255,255,255,0.9)' }}
                          />
                        </div>
                        {item.product.discount > 0 && (
                          <div style={{ position: 'absolute', top: 8, left: 8 }}>
                            <Tag color="red">-{item.product.discount}%</Tag>
                          </div>
                        )}
                      </div>
                    }
                    actions={[
                      <Button 
                        key="view" 
                        icon={<EyeOutlined />} 
                        onClick={() => handleViewProduct(item.product._id)}
                      >
                        View
                      </Button>,
                      <Button 
                        key="cart" 
                        type="primary" 
                        icon={<ShoppingCartOutlined />}
                        onClick={() => handleAddToCart(item.product)}
                      >
                        Add to Cart
                      </Button>,
                      <Button 
                        key="prebook" 
                        icon={<ClockCircleOutlined />}
                        onClick={() => handlePreBook(item.product)}
                      >
                        Pre-book
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>{item.product.title}</span>
                          <HeartOutlined style={{ color: '#f5222d' }} />
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>{item.product.shortDescription}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                                ${item.product.price}
                              </span>
                              {item.product.originalPrice > item.product.price && (
                                <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: 8 }}>
                                  ${item.product.originalPrice}
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Added: {item.addedDate}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {item.product.rating.average} ⭐ ({item.product.rating.count})
                              </div>
                            </div>
                          </div>
                          {item.notes && (
                            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: '12px' }}>
                              <strong>Note:</strong> {item.notes}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Quick Actions */}
            <Card title="Quick Actions" style={{ marginTop: '2rem' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Button type="primary" icon={<ShoppingCartOutlined />} block>
                    Add All to Cart
                  </Button>
                </Col>
                <Col xs={24} sm={8}>
                  <Button icon={<HeartOutlined />} block>
                    Share Wishlist
                  </Button>
                </Col>
                <Col xs={24} sm={8}>
                  <Button icon={<DeleteOutlined />} danger block>
                    Clear Wishlist
                  </Button>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </div>
    </UserLayout>
  )
}

export default Wishlist
