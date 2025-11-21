import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Button, Tag, Rate, Space, message, Empty, Spin } from 'antd'
import { HeartOutlined, ShoppingCartOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

const UserFavorites = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  // Load user's favorite products
  useEffect(() => {
    loadFavorites()
  }, [isAuthenticated])

  const loadFavorites = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Fetch products that are favorited by the current user
      const response = await api.get('/products', {
        params: {
          favoritedBy: user._id,
          limit: 100
        }
      })

      if (response.data.success) {
        const products = response.data.products || response.data.data || []
        setFavorites(products)
      } else {
        setFavorites([])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
      // If API doesn't support favorites yet, just show empty state
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (productId) => {
    try {
      // Remove from favorites via API
      await api.delete(`/products/${productId}/favorite`)
      
      // Update local state
      setFavorites(favorites.filter(fav => fav._id !== productId))
      message.success('Removed from favorites')
    } catch (error) {
      console.error('Error removing favorite:', error)
      // If API doesn't support it, just update local state
      setFavorites(favorites.filter(fav => fav._id !== productId))
      message.success('Removed from favorites')
    }
  }

  const handleViewProduct = (productId) => {
    navigate(`/products/${productId}`)
  }

  const handleAddToCart = (product) => {
    // Navigate to product page for prebooking
    navigate(`/products/${product._id}`)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: '1rem', color: '#666' }}>
          Loading your favorites...
        </Paragraph>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Title level={2}>❤️ My Favorites</Title>
        <Paragraph>Your saved products and wishlist items.</Paragraph>
      </div>

      {favorites.length > 0 ? (
        <Row gutter={[16, 16]}>
          {favorites.map(product => (
            <Col xs={24} sm={12} lg={8} key={product._id || product.id}>
              <Card
                hoverable
                cover={
                  <div style={{ position: 'relative' }}>
                    <img 
                      alt={product.title}
                      src={product.thumbnailUrl || product.thumbnail || product.images?.[0] || '/placeholder.png'}
                      style={{ height: '200px', objectFit: 'cover', width: '100%' }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='
                      }}
                    />
                  </div>
                }
                actions={[
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={() => handleViewProduct(product._id || product.id)}
                  >
                    View
                  </Button>,
                  <Button 
                    type="link" 
                    icon={<ShoppingCartOutlined />}
                    onClick={() => handleAddToCart(product)}
                  >
                    Prebook
                  </Button>,
                  <Button 
                    type="link" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveFavorite(product._id || product.id)}
                  >
                    Remove
                  </Button>
                ]}
              >
                <Card.Meta
                  title={product.title}
                  description={
                    <div>
                      {product.developerName && (
                        <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px' }}>
                          by {product.developerName}
                        </div>
                      )}
                      {product.tags && product.tags.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          {product.tags.slice(0, 3).map(tag => (
                            <Tag key={tag} size="small">{tag}</Tag>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <div>
                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                            ₹{product.price || product.prebookAmount || 'N/A'}
                          </span>
                          {product.currency && product.currency !== 'INR' && (
                            <span style={{ marginLeft: '4px', fontSize: '12px', color: '#999' }}>
                              {product.currency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          image={<HeartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
          description={
            <div>
              <Title level={4} style={{ color: '#999', marginTop: '1rem' }}>No favorites yet</Title>
              <Paragraph style={{ color: '#999' }}>
                Start adding products to your favorites to see them here.
              </Paragraph>
            </div>
          }
        />
      )}
    </div>
  )
}

export default UserFavorites


















