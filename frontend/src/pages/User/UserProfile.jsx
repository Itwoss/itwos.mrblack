import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Card,
  Tabs,
  Tag,
  Badge,
  Divider,
  Spin,
  Empty,
  message,
  Grid,
  Dropdown
} from 'antd'
import {
  UserOutlined,
  MessageOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  LockOutlined,
  EditOutlined,
  MoreOutlined,
  HeartOutlined,
  BookOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import api, { usersListAPI, threadsAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import UserLayout from '../../components/UserLayout'

const { Title, Paragraph, Text } = Typography

const UserProfile = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [activeTab, setActiveTab] = useState('posts')

  useEffect(() => {
    console.log('UserProfile useEffect - userId:', userId)
    if (userId) {
      loadUserProfile()
      checkFollowStatus()
      loadStats()
    } else {
      console.error('No userId in params')
      message.error('Invalid user ID')
      navigate('/discover')
    }
  }, [userId])

  const loadUserProfile = async () => {
    if (!userId) {
      console.error('No userId provided')
      message.error('Invalid user ID')
      navigate('/discover')
      return
    }

    setLoading(true)
    try {
      console.log('Loading user profile for userId:', userId)
      
      // Try different API endpoints
      let response
      try {
        response = await api.get(`/users/${userId}`)
      } catch (err) {
        // Fallback: try usersListAPI
        console.log('Trying alternative endpoint...')
        const usersResponse = await usersListAPI.getUsers({ userId })
        if (usersResponse.data.success && usersResponse.data.users?.length > 0) {
          setProfileUser(usersResponse.data.users[0])
          setLoading(false)
          return
        }
        throw err
      }

      console.log('API Response:', response.data)
      
      if (response.data.success) {
        // Backend returns response.data.user (from users.js route line 178)
        const userData = response.data.user || response.data.data || response.data
        console.log('Setting profile user:', userData)
        
        if (!userData || (!userData._id && !userData.id)) {
          console.error('Invalid user data received:', userData)
          message.error('Invalid user data received')
          navigate('/discover')
          return
        }
        
        setProfileUser(userData)
      } else {
        console.error('API returned success=false:', response.data)
        message.error(response.data.message || 'User not found')
        // Don't navigate immediately - let user see error
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Don't navigate away immediately - show error but keep on page
      message.error(error.response?.data?.message || 'Failed to load user profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    try {
      const response = await api.get(`/follow/check/${userId}`)
      if (response.data.success) {
        setFollowing(response.data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const loadStats = async () => {
    try {
      // Load followers count
      const followersRes = await api.get(`/follow/followers/${userId}`)
      if (followersRes.data.success) {
        setFollowersCount(followersRes.data.followers?.length || 0)
      }

      // Load following count
      const followingRes = await api.get(`/follow/following/${userId}`)
      if (followingRes.data.success) {
        setFollowingCount(followingRes.data.following?.length || 0)
      }

      // Load posts count (if you have posts/content)
      // const postsRes = await api.get(`/users/${userId}/posts`)
      // setPostsCount(postsRes.data.posts?.length || 0)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleFollow = async () => {
    try {
      if (following) {
        await api.delete(`/follow/${userId}`)
        setFollowing(false)
        setFollowersCount(prev => Math.max(0, prev - 1))
        message.success('Unfollowed')
      } else {
        await api.post(`/follow/${userId}`)
        setFollowing(true)
        setFollowersCount(prev => prev + 1)
        message.success('Following')
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error)
      message.error('Failed to update follow status')
    }
  }

  const handleStartChat = async () => {
    try {
      const response = await threadsAPI.createThread([userId])
      if (response.data.success) {
        navigate('/chat')
      }
    } catch (error) {
      console.error('Start chat error:', error)
      navigate('/chat')
    }
  }

  const isOwnProfile = currentUser?._id === userId || currentUser?.id === userId || currentUser?._id?.toString() === userId?.toString()

  if (loading) {
    return (
      <UserLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Spin size="large" />
        </div>
      </UserLayout>
    )
  }

  if (!profileUser && !loading) {
    return (
      <UserLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Empty 
            description={
              <div>
                <Title level={4}>User not found</Title>
                <Paragraph>Unable to load user profile. Please try again.</Paragraph>
                <Button type="primary" onClick={() => navigate('/discover')}>
                  Go to Discover Users
                </Button>
              </div>
            } 
          />
        </div>
      </UserLayout>
    )
  }

  if (!profileUser) {
    return null // Still loading
  }

  console.log('🔍 UserProfile render - profileUser:', profileUser, 'isOwnProfile:', isOwnProfile)

  return (
    <UserLayout>
      <div style={{ maxWidth: '935px', margin: '0 auto', padding: '20px' }}>
        {/* Profile Header - Instagram Style */}
        <div style={{ marginBottom: '44px' }}>
          <Row gutter={[30, 20]}>
            {/* Profile Picture */}
            <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  size={150}
                  src={getUserAvatarUrl(profileUser)}
                  icon={<UserOutlined />}
                  style={{ border: '3px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.0975)' }}
                >
                  {getUserInitials(profileUser.name)}
                </Avatar>
                {profileUser.isOnline && (
                  <Badge
                    status="success"
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      border: '3px solid #fff',
                      borderRadius: '50%'
                    }}
                  />
                )}
              </div>
            </Col>

            {/* Profile Info */}
            <Col xs={24} sm={16}>
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                {/* Top row with username and 3-dot menu */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between', 
                  marginBottom: '20px', 
                  width: '100%',
                  position: 'relative',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space align="center" style={{ flexWrap: 'wrap', marginBottom: '12px' }}>
                      <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 300 }}>
                        {profileUser.name}
                      </Title>
                      {profileUser.isPrivate && (
                        <LockOutlined style={{ fontSize: '20px', color: '#999' }} />
                      )}
                    </Space>
                  </div>
                  {/* 3-dot menu in top right - Always visible */}
                  <Dropdown
                    menu={{
                      items: !isOwnProfile ? [
                        {
                          key: 'startChat',
                          label: (
                            <Space>
                              <MessageOutlined />
                              <span>Start Chat</span>
                            </Space>
                          ),
                          onClick: () => {
                            console.log('🔍 Start Chat clicked from dropdown')
                            handleStartChat()
                          }
                        }
                      ] : [
                        {
                          key: 'settings',
                          label: (
                            <Space>
                              <EditOutlined />
                              <span>Settings</span>
                            </Space>
                          ),
                          onClick: () => navigate('/settings')
                        }
                      ]
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="default"
                      shape="circle"
                      icon={<MoreOutlined />}
                      size="large"
                      style={{ 
                        flexShrink: 0,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        border: '1px solid #d9d9d9',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        console.log('🔍 3-dot menu button clicked')
                        e.stopPropagation()
                      }}
                    />
                  </Dropdown>
                </div>
                {/* Action buttons row */}
                <Space align="center" style={{ flexWrap: 'wrap' }}>
                  {!isOwnProfile && (
                    <Button
                      type={following ? 'default' : 'primary'}
                      icon={following ? <UserDeleteOutlined /> : <UserAddOutlined />}
                      onClick={handleFollow}
                      style={{ borderRadius: '4px', fontWeight: 600 }}
                    >
                      {following ? 'Following' : 'Follow'}
                    </Button>
                  )}
                  {isOwnProfile && (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => navigate('/settings')}
                      style={{ borderRadius: '4px', fontWeight: 600 }}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Space>
              </div>

              {/* Stats */}
              <Space size="large" style={{ marginBottom: '20px', fontSize: '16px' }}>
                <div>
                  <Text strong style={{ fontSize: '16px' }}>{postsCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>posts</Text>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${userId}/followers`)}>
                  <Text strong style={{ fontSize: '16px' }}>{followersCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>followers</Text>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${userId}/following`)}>
                  <Text strong style={{ fontSize: '16px' }}>{followingCount}</Text>
                  <Text style={{ marginLeft: '4px' }}>following</Text>
                </div>
              </Space>

              {/* Bio and Details */}
              <div style={{ marginBottom: '12px' }}>
                <Title level={5} style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
                  {profileUser.name}
                </Title>
                {profileUser.bio && (
                  <Paragraph style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.5' }}>
                    {profileUser.bio}
                  </Paragraph>
                )}
                {profileUser.website && (
                  <div style={{ marginBottom: '8px' }}>
                    <a
                      href={profileUser.website.startsWith('http') ? profileUser.website : `https://${profileUser.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00376b', textDecoration: 'none', fontSize: '16px' }}
                    >
                      <GlobalOutlined style={{ marginRight: '4px' }} />
                      {profileUser.website}
                    </a>
                  </div>
                )}
                {profileUser.location && (
                  <div style={{ marginBottom: '8px', fontSize: '16px', color: '#666' }}>
                    <EnvironmentOutlined style={{ marginRight: '4px' }} />
                    {profileUser.location}
                  </div>
                )}
                {profileUser.createdAt && (
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    <CalendarOutlined style={{ marginRight: '4px' }} />
                    Joined {new Date(profileUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '0 0 0 0' }} />

        {/* Tabs - Instagram Style */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ borderBottom: '1px solid #dbdbdb' }}
          items={[
            {
              key: 'posts',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <BookOutlined style={{ marginRight: '6px' }} />
                  Posts
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No posts yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            },
            {
              key: 'products',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <ShoppingCartOutlined style={{ marginRight: '6px' }} />
                  Products
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No products yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            },
            {
              key: 'saved',
              label: (
                <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
                  <HeartOutlined style={{ marginRight: '6px' }} />
                  Saved
                </span>
              ),
              children: (
                <div style={{ marginTop: '40px', minHeight: '400px' }}>
                  <Empty
                    description="No saved items"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )
            }
          ]}
        />
      </div>
    </UserLayout>
  )
}

export default UserProfile

