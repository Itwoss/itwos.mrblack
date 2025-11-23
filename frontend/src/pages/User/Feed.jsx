import React, { useState, useEffect, useRef } from 'react'
import { Card, Empty, Spin, Typography, Space, Avatar, Button, Alert, Tag, message } from 'antd'
import { MessageOutlined, HeartOutlined, HeartFilled, ShareAltOutlined, HomeOutlined, EyeOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const { Title, Text, Paragraph } = Typography

const Feed = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [likingPosts, setLikingPosts] = useState(new Set()) // Track which posts are being liked
  const viewedPostsRef = useRef(new Set()) // Track which posts have been viewed

  useEffect(() => {
    if (user) {
      loadFeed()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadFeed = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/posts/feed')
      if (response.data?.success && response.data?.data?.posts) {
        const posts = response.data.data.posts
        console.log('📸 Feed posts loaded:', posts.map(p => ({
          id: p._id,
          imageUrl: p.imageUrl,
          hasImage: !!p.imageUrl,
          likes: p.likes,
          views: p.views
        })))
        setPosts(posts)
        
        // Track views for posts that are visible
        posts.forEach(post => {
          if (post._id && !viewedPostsRef.current.has(post._id)) {
            trackView(post._id)
            viewedPostsRef.current.add(post._id)
          }
        })
      } else {
        setPosts([])
      }
    } catch (apiError) {
      console.error('Error loading feed:', apiError)
      if (apiError.response?.status === 404) {
        setPosts([])
      } else {
        setError('Failed to load feed. Please try again later.')
        setPosts([])
      }
    } finally {
      setLoading(false)
    }
  }

  const trackView = async (postId) => {
    try {
      await api.post(`/posts/${postId}/view`)
    } catch (error) {
      console.error('Error tracking view:', error)
      // Don't show error to user, just log it
    }
  }

  const handleLike = async (e, postId, currentLikes, isLiked) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!postId) {
      console.error('Post ID is missing')
      message.error('Post ID is missing')
      return
    }

    // Prevent double-clicks
    if (likingPosts.has(postId)) {
      console.log('Already liking this post, ignoring click')
      return
    }

    try {
      // Add to liking set
      setLikingPosts(prev => new Set(prev).add(postId))
      
      console.log('🔄 Liking post:', postId, 'Current likes:', currentLikes, 'Is liked:', isLiked)
      
      const response = await api.post(`/posts/${postId}/like`)
      
      console.log('✅ Like response:', response.data)
      
      if (response.data?.success) {
        // Update the post in the local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  likes: response.data.data.likes,
                  isLiked: response.data.data.isLiked
                }
              : post
          )
        )
      } else {
        console.error('Like failed:', response.data?.message)
        message.error(response.data?.message || 'Failed to like post')
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error)
      if (error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
        message.error(error.response.data?.message || 'Failed to like post. Please try again.')
      } else if (error.request) {
        message.error('Network error. Please check your connection.')
      } else {
        message.error('Failed to like post. Please try again.')
      }
    } finally {
      // Remove from liking set
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <Alert
          message="Authentication Required"
          description="Please log in to view your feed."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/login')}>
              Login
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Title level={2} style={{ margin: 0 }}>
          Feed
        </Title>
        <Space>
          <Button 
            type="primary"
            onClick={() => navigate('/post/create')}
          >
            Create Post
          </Button>
          <Button 
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {posts.length === 0 && !loading ? (
        <Card>
          <Empty
            description="No posts yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Text type="secondary">
              Your feed will show posts from users you follow
            </Text>
            <br />
            <Button 
              type="link" 
              onClick={() => navigate('/discover')}
              style={{ marginTop: '1rem' }}
            >
              Discover users to follow
            </Button>
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {posts.map((post) => (
            <Card key={post._id} style={{ width: '100%' }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space>
                  <Avatar src={post.author?.avatarUrl} icon={<MessageOutlined />} />
                  <div>
                    <Text strong>{post.author?.name || 'Anonymous'}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </Text>
                  </div>
                </Space>
                
                {post.title && (
                  <Title level={4} style={{ margin: 0 }}>
                    {post.title}
                  </Title>
                )}
                
                {post.bio && (
                  <Paragraph style={{ marginBottom: post.tags?.length > 0 ? '8px' : '0' }}>
                    {post.bio}
                  </Paragraph>
                )}
                
                {post.tags && post.tags.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {post.tags.map((tag, index) => (
                      <Tag key={index} style={{ marginBottom: '4px' }}>
                        #{tag}
                      </Tag>
                    ))}
                  </div>
                )}
                
                {post.imageUrl && (
                  <div style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={
                        post.imageUrl.startsWith('http') 
                          ? post.imageUrl 
                          : `${(import.meta.env.VITE_API_URL || 'http://localhost:7000/api').replace('/api', '')}${post.imageUrl}`
                      }
                      alt="Post" 
                      style={{ 
                        width: '100%',
                        maxWidth: '614px', // Instagram max width
                        height: 'auto',
                        display: 'block',
                        cursor: 'pointer',
                        objectFit: 'contain' // Show full image without cropping
                      }}
                      onError={(e) => {
                        console.error('Failed to load post image:', post.imageUrl)
                        e.target.style.display = 'none'
                      }}
                      onClick={() => {
                        if (post.instagramRedirectUrl) {
                          window.open(post.instagramRedirectUrl, '_blank')
                        }
                      }}
                    />
                  </div>
                )}
                
                <Space>
                  <Button 
                    type="text" 
                    icon={post.isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                    onClick={(e) => handleLike(e, post._id, post.likes, post.isLiked)}
                    style={{ color: post.isLiked ? '#ff4d4f' : undefined }}
                    disabled={!post._id || likingPosts.has(post._id)}
                    loading={likingPosts.has(post._id)}
                  >
                    {post.likes || 0}
                  </Button>
                  <Button type="text" icon={<MessageOutlined />}>
                    {post.comments || 0}
                  </Button>
                  <Button type="text" icon={<EyeOutlined />}>
                    {post.views || 0}
                  </Button>
                  <Button type="text" icon={<ShareAltOutlined />}>
                    Share
                  </Button>
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </div>
  )
}

export default Feed

