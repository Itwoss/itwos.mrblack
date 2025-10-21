import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { HeartOutlined, EyeOutlined, ShoppingCartOutlined, DeleteOutlined } from '@ant-design/icons'
import { Button, Card, Row, Col, Image, Typography, Space, message, Modal, Drawer, List, Avatar, Empty, Tag, Badge } from 'antd'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Text, Title } = Typography

const FavoritesSystem = ({ 
  product, 
  showPopup = false, 
  showFullPage = false,
  onProductPreview,
  onProductPrebook 
}) => {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  // Load user's favorites
  const loadFavorites = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Simulate API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // TODO: Replace with real API call
      setFavorites([])
      
      // Check if current product is favorited
      if (product) {
        setIsFavorited(false)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
      message.error('Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }, [user, product])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productData) => {
    if (!user) {
      message.warning('Please login to add favorites')
      return
    }

    try {
      const isCurrentlyFavorited = favorites.some(fav => fav.productId === productData.id)
      
      if (isCurrentlyFavorited) {
        // Remove from favorites
        await new Promise(resolve => setTimeout(resolve, 200)) // Simulate API call
        
        setFavorites(prev => prev.filter(fav => fav.productId !== productData.id))
        setIsFavorited(false)
        message.success('Removed from favorites')
      } else {
        // Add to favorites
        await new Promise(resolve => setTimeout(resolve, 200)) // Simulate API call
        
        const newFavorite = {
          id: Date.now(),
          productId: productData.id,
          title: productData.title,
          price: productData.price,
          thumbnail: productData.thumbnail,
          developer: productData.developer || 'Unknown',
          category: productData.category || 'General',
          addedAt: new Date().toISOString(),
          isAvailable: true
        }
        
        setFavorites(prev => [newFavorite, ...prev])
        setIsFavorited(true)
        message.success('Added to favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      message.error('Failed to update favorites')
    }
  }, [user, favorites])

  // Remove favorite
  const removeFavorite = useCallback(async (favoriteId) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate API call
      
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
      message.success('Removed from favorites')
    } catch (error) {
      console.error('Error removing favorite:', error)
      message.error('Failed to remove favorite')
    }
  }, [])

  // Load favorites on mount
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Favorite button component
  const FavoriteButton = ({ productData, size = 'default', showText = false }) => (
    <Button
      type="text"
      icon={<HeartOutlined />}
      onClick={() => toggleFavorite(productData)}
      style={{
        color: isFavorited ? '#ff4d4f' : '#666',
        fontSize: size === 'large' ? '18px' : '14px'
      }}
    >
      {showText && (isFavorited ? 'Favorited' : 'Add to Favorites')}
    </Button>
  )

  // Favorites popup
  const renderFavoritesPopup = () => (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartOutlined style={{ color: '#ff4d4f' }} />
          My Favorites
          <Badge count={favorites.length} />
        </div>
      }
      placement="right"
      onClose={() => setPopupVisible(false)}
      open={popupVisible}
      width={400}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text>Loading favorites...</Text>
        </div>
      ) : favorites.length > 0 ? (
        <List
          dataSource={favorites}
          renderItem={favorite => (
            <List.Item
              actions={[
                <Button
                  key="preview"
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    if (onProductPreview) {
                      onProductPreview(favorite)
                    }
                    setPopupVisible(false)
                  }}
                >
                  Preview
                </Button>,
                <Button
                  key="remove"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeFavorite(favorite.id)}
                >
                  Remove
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Image
                    src={favorite.thumbnail}
                    alt={favorite.title}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px' }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3YODp+9aX7l4xGq9wB4e6B1QKiu9CknTAcXU9UCFJYCH2fAACUI2BuXJFSAYpO0WakQICBxVn8GIC9S34BGyAbJQ8HqkyMwmI2gBZxJAiHA+wW7SDx2BuHQkDo7mDDIIBWj+7G1pC5mNjBZAKqss8QwQrNvzqSTAPRrFElPNYQ2gApi0lTuJUHt6aA2YlGQ9haC+dX1Cew1HEwUGJ9MwJnCrqS60S8HA4JKJYGdSUSALpJ3OsFB7M4cBwJjeQrR4gBGB7w=="
                  />
                }
                title={
                  <div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {favorite.title}
                    </Text>
                    {!favorite.isAvailable && (
                      <Tag color="red" size="small" style={{ marginLeft: '8px' }}>
                        Unavailable
                      </Tag>
                    )}
                  </div>
                }
                description={
                  <div>
                    <Text style={{ fontSize: '12px', color: '#666' }}>
                      {favorite.developer} • {favorite.category}
                    </Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                        ${favorite.price}
                      </Text>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="No favorites yet" />
      )}
    </Drawer>
  )

  // Full page favorites
  const renderFullPageFavorites = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <Title level={3} style={{ margin: 0 }}>
          My Favorites
          <Badge count={favorites.length} style={{ marginLeft: '8px' }} />
        </Title>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text>Loading favorites...</Text>
        </div>
      ) : favorites.length > 0 ? (
        <Row gutter={[16, 16]}>
          {favorites.map(favorite => (
            <Col xs={24} sm={12} md={8} lg={6} key={favorite.id}>
              <Card
                hoverable
                cover={
                  <Image
                    src={favorite.thumbnail}
                    alt={favorite.title}
                    style={{ height: 200, objectFit: 'cover' }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3YODp+9aX7l4xGq9wB4e6B1QKiu9CknTAcXU9UCFJYCH2fAACUI2BuXJFSAYpO0WakQICBxVn8GIC9S34BGyAbJQ8HqkyMwmI2gBZxJAiHA+wW7SDx2BuHQkDo7mDDIIBWj+7G1pC5mNjBZAKqss8QwQrNvzqSTAPRrFElPNYQ2gApi0lTuJUHt6aA2YlGQ9haC+dX1Cew1HEwUGJ9MwJnCrqS60S8HA4JKJYGdSUSALpJ3OsFB7M4cBwJjeQrR4gBGB7w=="
                  />
                }
                actions={[
                  <Button
                    key="preview"
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => onProductPreview && onProductPreview(favorite)}
                  >
                    Preview
                  </Button>,
                  <Button
                    key="prebook"
                    type="text"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => onProductPrebook && onProductPrebook(favorite)}
                    disabled={!favorite.isAvailable}
                  >
                    Prebook
                  </Button>,
                  <Button
                    key="remove"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeFavorite(favorite.id)}
                  >
                    Remove
                  </Button>
                ]}
              >
                <Card.Meta
                  title={
                    <div>
                      <Text strong style={{ fontSize: '14px' }}>
                        {favorite.title}
                      </Text>
                      {!favorite.isAvailable && (
                        <Tag color="red" size="small" style={{ marginLeft: '8px' }}>
                          Unavailable
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        {favorite.developer}
                      </Text>
                      <div style={{ marginTop: '4px' }}>
                        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                          ${favorite.price}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No favorites yet" />
      )}
    </div>
  )

  if (showFullPage) {
    return renderFullPageFavorites()
  }

  return (
    <>
      {product && (
        <FavoriteButton 
          productData={product} 
          size="default" 
          showText={false}
        />
      )}
      
      {showPopup && (
        <>
          <Button
            type="text"
            icon={<HeartOutlined />}
            onClick={() => setPopupVisible(true)}
            style={{ color: '#ff4d4f' }}
          >
            Favorites ({favorites.length})
          </Button>
          {renderFavoritesPopup()}
        </>
      )}
    </>
  )
}

export default FavoritesSystem

