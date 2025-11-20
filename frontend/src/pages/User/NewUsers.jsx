import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Avatar, 
  Typography, 
  Space, 
  Button, 
  Tag, 
  Badge,
  Spin,
  Empty,
  message,
  Divider
} from 'antd'
import { 
  UserOutlined, 
  MessageOutlined,
  UserAddOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  MailOutlined,
  LockOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { usersListAPI, threadsAPI, followAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const NewUsers = () => {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [newUsers, setNewUsers] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [followStatuses, setFollowStatuses] = useState({})

  useEffect(() => {
    loadNewUsers()
  }, [page, currentUser])

  const loadNewUsers = async () => {
    setLoading(true)
    try {
      const response = await usersListAPI.getUsers({
        sort: 'new',
        page: page,
        limit: 100, // Request more to ensure we get new users
        excludeSelf: false, // Show all users including self
        onlyNew: false // Let frontend filter to see all users
      })
      
      if (response.data.success) {
        // Get all users from response
        const allUsers = response.data.users || []
        
        // Filter to only show new users (created in last 7 days)
        const now = new Date()
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)
        
        const newUsersList = allUsers.filter(user => {
          // First check backend's isNew flag
          if (user.isNew === true) {
            return true
          }
          
          // Fallback: calculate if createdAt exists
          if (user.createdAt) {
            const userCreatedAt = new Date(user.createdAt)
            const isNew = userCreatedAt >= sevenDaysAgo
            const daysDiff = Math.ceil((now - userCreatedAt) / (1000 * 60 * 60 * 24))
            
            // Log for debugging
            if (daysDiff <= 8) { // Log users created in last 8 days
              console.log('🔍 Frontend Filter Check:', {
                name: user.name,
                email: user.email,
                createdAt: userCreatedAt.toISOString(),
                sevenDaysAgo: sevenDaysAgo.toISOString(),
                isNew: isNew,
                daysDiff: daysDiff,
                backendIsNew: user.isNew
              })
            }
            
            return isNew
          }
          return false
        })
        
        console.log('📊 New Users Debug:', {
          totalUsers: allUsers.length,
          newUsersCount: newUsersList.length,
          currentUserId: currentUser?._id,
          sampleUsers: allUsers.slice(0, 5).map(u => ({
            name: u.name,
            email: u.email,
            userId: u._id,
            isNew: u.isNew,
            createdAt: u.createdAt,
            daysAgo: u.createdAt ? Math.ceil((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24)) : null,
            hoursAgo: u.createdAt ? Math.ceil((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60)) : null,
            isCurrentUser: u._id === currentUser?._id
          }))
        })
        
        // If no new users found but there are users, show all recent users as fallback
        if (allUsers.length > 0 && newUsersList.length === 0) {
          console.warn('⚠️ No new users found in last 7 days')
          console.log('📋 All users received:', allUsers.map(u => ({
            name: u.name,
            createdAt: u.createdAt,
            isNew: u.isNew,
            daysAgo: u.createdAt ? Math.ceil((new Date() - new Date(u.createdAt)) / (1000 * 60 * 60 * 24)) : null
          })))
          
          // Show all users sorted by newest as fallback (last 30 days)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const recentUsers = allUsers.filter(u => {
            if (!u.createdAt) return false
            return new Date(u.createdAt) >= thirtyDaysAgo
          }).sort((a, b) => {
            const dateA = new Date(a.createdAt || 0)
            const dateB = new Date(b.createdAt || 0)
            return dateB - dateA
          })
          
          if (recentUsers.length > 0) {
            message.info(`No users created in the last 7 days. Showing ${recentUsers.length} recent users instead.`)
            setNewUsers(recentUsers.slice(0, 20))
            setTotal(recentUsers.length)
          } else {
            setNewUsers([])
            setTotal(0)
          }
        } else {
          setNewUsers(newUsersList)
          setTotal(response.data.pagination?.total || newUsersList.length)
          
          // Show success message if new users found
          if (newUsersList.length > 0) {
            console.log(`✅ Found ${newUsersList.length} new users`)
          }
        }
        
        // Load follow statuses
        if (currentUser?._id) {
          const userIds = newUsersList.map(u => u._id)
          loadFollowStatuses(userIds)
        }
      }
    } catch (error) {
      console.error('Load new users error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: error.config
      })
      
      // Show more specific error message
      if (error.response?.status === 401) {
        message.error('Authentication required. Please login again.')
      } else if (error.response?.status === 403) {
        message.error('Access denied. You need user permissions.')
      } else if (error.response?.status === 404) {
        message.error('API endpoint not found. Please check server configuration.')
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message.error('Cannot connect to server. Please check if backend is running.')
      } else {
        message.error(`Failed to load new users: ${error.response?.data?.message || error.message || 'Unknown error'}`)
      }
      
      setNewUsers([])
    } finally {
      setLoading(false)
    }
  }

  const loadFollowStatuses = async (userIds) => {
    try {
      // Get follow status for each user
      const statusMap = {}
      for (const userId of userIds) {
        // Check if user is already following
        const isFollowing = followStatuses[userId] || false
        statusMap[userId] = isFollowing
      }
      setFollowStatuses(statusMap)
    } catch (error) {
      console.error('Load follow statuses error:', error)
    }
  }

  const handleFollow = async (userId) => {
    try {
      console.log('📤 Sending follow request to user:', userId)
      
      const response = await followAPI.sendFollowRequest(userId)
      
      console.log('📤 Follow request response:', response.data)
      
      if (response.data.success) {
        const followStatus = response.data.follow?.status
        const status = followStatus === 'accepted' ? 'accepted' : 'pending'
        setFollowStatuses(prev => ({ ...prev, [userId]: status }))
        
        // Also update the user object in the list if needed
        setNewUsers(prev => 
          prev.map(user => 
            user._id === userId 
              ? { 
                  ...user, 
                  isFollowed: followStatus === 'accepted',
                  hasFollowRequest: followStatus === 'pending'
                }
              : user
          )
        )
        
        message.success(response.data.message || (followStatus === 'pending' ? 'Follow request sent!' : 'User followed successfully!'))
      } else {
        message.error(response.data.message || 'Failed to send follow request')
      }
    } catch (error) {
      console.error('❌ Follow error:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send follow request'
      message.error(errorMessage)
    }
  }

  const handleStartChat = async (userId) => {
    try {
      const response = await threadsAPI.createThread([userId])
      if (response.data.success) {
        navigate('/user/chat')
        message.success('Chat started!')
      }
    } catch (error) {
      console.error('Start chat error:', error)
      navigate('/user/chat')
      message.info('Opening chat...')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Space align="center" style={{ marginBottom: '0.5rem' }}>
          <Title level={2} style={{ margin: 0 }}>
            New Users
          </Title>
          <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
            This Week
          </Tag>
        </Space>
        <Paragraph style={{ fontSize: '16px', color: '#666', margin: 0 }}>
          Discover users who joined in the last 7 days
        </Paragraph>
      </div>

      {/* New Users Grid */}
      {loading && newUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : newUsers.length === 0 ? (
        <Card>
          <Empty
            description="No new users this week"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {newUsers.map((user) => (
            <Col xs={24} sm={12} md={8} lg={6} key={user._id}>
              <Card
                hoverable
                style={{ 
                  height: '100%',
                  border: '2px solid #52c41a',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                bodyStyle={{ padding: '20px' }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🔍 NewUsers: Clicked user card, navigating to:', `/profile/${user._id}`)
                  if (user._id) {
                    navigate(`/profile/${user._id}`)
                  } else {
                    console.error('No user._id found:', user)
                    message.error('Invalid user ID')
                  }
                }}
                actions={[
                  <Button 
                    type="link" 
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🔍 NewUsers: Clicked View Profile button, navigating to:', `/profile/${user._id}`)
                      if (user._id) {
                        navigate(`/profile/${user._id}`)
                      } else {
                        console.error('No user._id found:', user)
                        message.error('Invalid user ID')
                      }
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    View Profile
                  </Button>
                ]}
              >
                {/* Avatar with NEW badge */}
                <div 
                  style={{ position: 'relative', display: 'inline-block', marginBottom: '16px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/profile/${user._id}`)
                  }}
                >
                  <Avatar 
                    size={80} 
                    src={getUserAvatarUrl(user)} 
                    icon={<UserOutlined />}
                  >
                    {getUserInitials(user.name)}
                  </Avatar>
                  {user.isPrivate && (
                    <LockOutlined 
                      style={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0,
                        background: '#fff',
                        borderRadius: '50%',
                        padding: '4px',
                        fontSize: '14px',
                        color: '#666',
                        border: '1px solid #d9d9d9'
                      }} 
                    />
                  )}
                  <Tag 
                    color="green" 
                    style={{ 
                      position: 'absolute', 
                      top: '-8px', 
                      right: '-8px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 8px'
                    }}
                  >
                    NEW
                  </Tag>
                  {user.isOnline && (
                    <Badge 
                      status="success" 
                      style={{ 
                        position: 'absolute', 
                        bottom: '0', 
                        right: '0' 
                      }}
                    />
                  )}
                </div>

                {/* User Info */}
                <Title 
                  level={5} 
                  style={{ marginBottom: '8px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/profile/${user._id}`)
                  }}
                >
                  {user.name}
                </Title>
                
                <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: '16px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <MailOutlined /> {user.email}
                  </Text>
                  
                  {user.location && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <EnvironmentOutlined /> {user.location}
                    </Text>
                  )}
                  
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <CalendarOutlined /> Joined {formatDate(user.createdAt)}
                  </Text>
                  
                  {user.bio && (
                    <Paragraph 
                      style={{ 
                        fontSize: '12px',
                        color: '#666',
                        margin: '8px 0 0 0',
                        textAlign: 'center'
                      }}
                      ellipsis={{ rows: 2 }}
                    >
                      {user.bio}
                    </Paragraph>
                  )}
                </Space>

                <Divider style={{ margin: '12px 0' }} />

                {/* Stats */}
                <Space size="large" style={{ marginBottom: '16px', justifyContent: 'center', width: '100%' }}>
                  <div>
                    <Text strong style={{ display: 'block' }}>{user.followersCount || 0}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Followers</Text>
                  </div>
                  <div>
                    <Text strong style={{ display: 'block' }}>{user.followingCount || 0}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>Following</Text>
                  </div>
                </Space>

                {/* Actions */}
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {followStatuses[user._id] === 'accepted' || user.isFollowed ? (
                    <Button 
                      disabled 
                      icon={<CheckOutlined />} 
                      style={{ width: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Following
                    </Button>
                  ) : followStatuses[user._id] === 'pending' || user.hasFollowRequest ? (
                    <Button 
                      disabled 
                      icon={<UserAddOutlined />} 
                      style={{ width: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Request Sent
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      icon={<UserAddOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFollow(user._id)
                      }}
                      style={{ width: '100%' }}
                    >
                      Follow
                    </Button>
                  )}
                  
                  <Button 
                    icon={<MessageOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartChat(user._id)
                    }}
                    style={{ width: '100%' }}
                  >
                    Start Chat
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Button 
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
            style={{ marginRight: '8px' }}
          >
            Previous
          </Button>
          <Text>Page {page} of {Math.ceil(total / 20)}</Text>
          <Button 
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(prev => prev + 1)}
            style={{ marginLeft: '8px' }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default NewUsers

