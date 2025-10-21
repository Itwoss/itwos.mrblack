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
  Spin, 
  Empty,
  Badge,
  Input
} from 'antd'
import { 
  EyeOutlined, 
  ShoppingCartOutlined,
  FireOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { productAPI } from '../../services/api'

const { Title, Paragraph, Text } = Typography
const { Search } = Input

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [trendingProducts, setTrendingProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadProducts()
    loadTrendingProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const response = await productAPI.getProducts({ limit: 6 })
      if (response.data.success) {
        setProducts(response.data.data.products)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTrendingProducts = async () => {
    try {
      const response = await productAPI.getTrendingProducts({ limit: 3 })
      if (response.data.success) {
        setTrendingProducts(response.data.data.products)
      }
    } catch (error) {
      console.error('Error loading trending products:', error)
    }
  }

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price)
  }

  const handleProductClick = (product) => {
    navigate(`/product/${product.slug}`)
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    // You can implement search functionality here
  }

  const ProductCard = ({ product }) => (
    <Col xs={24} sm={12} lg={8} key={product._id}>
      <Card
        hoverable
        cover={
          <div style={{ position: 'relative' }}>
            <img
              alt={product.title}
              src={product.thumbnailUrl ? `http://localhost:7000${product.thumbnailUrl}` : '/placeholder-image.svg'}
              onError={(e) => {
                e.target.src = '/placeholder-image.svg'
              }}
              style={{ 
                height: 200, 
                objectFit: 'cover',
                width: '100%'
              }}
            />
            {product.trending && (
              <Badge 
                count="Trending" 
                style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8,
                  backgroundColor: '#ff4d4f'
                }}
              />
            )}
          </div>
        }
        actions={[
          <Button 
            type="primary" 
            icon={<ShoppingCartOutlined />}
            onClick={() => handleProductClick(product)}
          >
            Prebook
          </Button>
        ]}
      >
        <Card.Meta
          title={
            <div>
              <Title level={4} style={{ margin: 0, marginBottom: '0.5rem' }}>
                {product.title}
              </Title>
              <Text type="secondary">by {product.developerName}</Text>
            </div>
          }
          description={
            <div>
              <Paragraph 
                ellipsis={{ rows: 2 }}
                style={{ marginBottom: '1rem' }}
              >
                {product.description}
              </Paragraph>
              
              <div style={{ marginBottom: '1rem' }}>
                <Space wrap>
                  {product.tags.slice(0, 3).map(tag => (
                    <Tag key={tag} color="blue">{tag}</Tag>
                  ))}
                  {product.tags.length > 3 && (
                    <Tag color="default">+{product.tags.length - 3}</Tag>
                  )}
                </Space>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: '1.2rem' }}>
                    {formatPrice(product.price, product.currency)}
                  </Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Rate disabled value={product.averageRating} style={{ fontSize: '14px' }} />
                    <Text type="secondary">({product.reviewsCount})</Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {product.totalVisits} views
                  </Text>
                </div>
              </div>
            </div>
          }
        />
      </Card>
    </Col>
  )

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spin size="large" />
        <div style={{ marginTop: '1rem' }}>
          <Text type="secondary">Loading products...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <Search
          placeholder="Search products..."
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          style={{ maxWidth: '400px' }}
          onSearch={handleSearch}
        />
      </div>

      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <Title level={2} style={{ marginBottom: '1rem', textAlign: 'center' }}>
            🔥 Trending Products
          </Title>
          <Row gutter={[24, 24]}>
            {trendingProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </Row>
        </div>
      )}

      {/* All Products */}
      <div>
        <Title level={2} style={{ marginBottom: '1rem', textAlign: 'center' }}>
          All Products
        </Title>
        {products.length === 0 ? (
          <Empty
            description="No products available"
            style={{ padding: '2rem' }}
          />
        ) : (
          <Row gutter={[24, 24]}>
            {products.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </Row>
        )}
      </div>

      {/* View All Button */}
      {products.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/products')}
          >
            View All Products
          </Button>
        </div>
      )}
    </div>
  )
}

export default ProductList


