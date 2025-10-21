import React, { useState } from 'react'
import { Card, Row, Col, Typography, Button, Tag, Rate, Space, message } from 'antd'
import { HeartOutlined, ShoppingCartOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

const UserFavorites = () => {
  const [favorites, setFavorites] = useState([
    {
      id: '1',
      title: 'E-commerce Website Template',
      price: 999,
      originalPrice: 1299,
      thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
      rating: { average: 4.8, count: 89 },
      tags: ['Trending', 'Popular', 'E-commerce'],
      discount: 23
    },
    {
      id: '2',
      title: 'Portfolio Website Template',
      price: 599,
      originalPrice: 799,
      thumbnail: 'https://images.unsplash.com/photo-1522199755839-e2ba9b43d813?w=400&h=300&fit=crop',
      rating: { average: 4.6, count: 45 },
      tags: ['New', 'Modern', 'Portfolio'],
      discount: 25
    },
    {
      id: '3',
      title: 'Blog Website Template',
      price: 399,
      originalPrice: 499,
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop',
      rating: { average: 4.7, count: 32 },
      tags: ['SEO', 'Blog', 'Content'],
      discount: 20
    }
  ])

  const handleRemoveFavorite = (id) => {
    setFavorites(favorites.filter(fav => fav.id !== id))
    message.success('Removed from favorites')
  }

  const handleAddToCart = (product) => {
    message.success(`${product.title} added to cart`)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Title level={2}>❤️ My Favorites</Title>
        <Paragraph>Your saved products and wishlist items.</Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {favorites.map(product => (
          <Col xs={24} sm={12} lg={8} key={product.id}>
            <Card
              hoverable
              cover={
                <div style={{ position: 'relative' }}>
                  <img 
                    alt={product.title}
                    src={product.thumbnail}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  {product.discount > 0 && (
                    <Tag 
                      color="red" 
                      style={{ 
                        position: 'absolute', 
                        top: '8px', 
                        right: '8px' 
                      }}
                    >
                      -{product.discount}%
                    </Tag>
                  )}
                </div>
              }
              actions={[
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => message.info('View product details')}
                >
                  View
                </Button>,
                <Button 
                  type="link" 
                  icon={<ShoppingCartOutlined />}
                  onClick={() => handleAddToCart(product)}
                >
                  Add to Cart
                </Button>,
                <Button 
                  type="link" 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveFavorite(product.id)}
                >
                  Remove
                </Button>
              ]}
            >
              <Card.Meta
                title={product.title}
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <Rate 
                        disabled 
                        value={product.rating.average} 
                        style={{ fontSize: '14px' }}
                      />
                      <span style={{ marginLeft: '8px', color: '#666' }}>
                        ({product.rating.count})
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      {product.tags.map(tag => (
                        <Tag key={tag} size="small">{tag}</Tag>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                          ${product.price}
                        </span>
                        {product.originalPrice > product.price && (
                          <span style={{ 
                            marginLeft: '8px', 
                            textDecoration: 'line-through', 
                            color: '#999' 
                          }}>
                            ${product.originalPrice}
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

      {favorites.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <HeartOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem' }} />
          <Title level={4} style={{ color: '#999' }}>No favorites yet</Title>
          <Paragraph style={{ color: '#999' }}>
            Start adding products to your favorites to see them here.
          </Paragraph>
        </Card>
      )}
    </div>
  )
}

export default UserFavorites















