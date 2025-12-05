import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Row, 
  Col, 
  Space, 
  message, 
  Spin, 
  Empty,
  Badge,
  Tag,
  Divider,
  Modal,
  Descriptions
} from 'antd'
import { 
  SearchOutlined, 
  UserAddOutlined, 
  UserOutlined, 
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
  HeartOutlined,
  EnvironmentOutlined,
  LockOutlined,
  GlobalOutlined,
  CalendarOutlined,
  MailOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import { usersListAPI, threadsAPI, followAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const UserDiscovery = () => {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [newUsers, setNewUsers] = useState([])
  const [followRequests, setFollowRequests] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [profileModalVisible, setProfileModalVisible] = useState(false)

  useEffect(() => {
    loadFollowRequests()
    loadNewUsers()
    if (searchQuery.length >= 2) {
      searchUsers()
    } else {
      loadRecommendedUsers()
    }
  }, [searchQuery])

  // Load follow statuses when users change
  useEffect(() => {
    if (users.length > 0) {
      loadFollowStatuses()
    }
  }, [users.length])

  const loadNewUsers = async () => {
    try {
      // Load new users (created in last 7 days) sorted by newest
      const response = await usersListAPI.getUsers({
        sort: 'new',
        limit: 12,
        excludeSelf: true
      })
      
      if (response.data.success) {
        // Filter to only show new users (isNew flag)
        const newUsersList = (response.data.users || []).filter(user => user.isNew)
        setNewUsers(newUsersList.slice(0, 8)) // Show top 8 new users
      }
    } catch (error) {
      console.error('Load new users error:', error)
      setNewUsers([])
    }
  }

  const loadRecommendedUsers = async () => {
    try {
      // Use users-list API to get all users
      const response = await usersListAPI.getUsers({
        limit: 20,
        excludeSelf: true
      })
      
      if (response.data.success) {
        // Add recommended users to the users list if no search query
        if (searchQuery.length < 2) {
          setUsers(response.data.users || [])
        }
      }
    } catch (error) {
      console.error('Load recommendations error:', error)
      
      // Fallback to old API
      try {
        const response = await api.get('/follow/recommendations')
        if (response.data.success && searchQuery.length < 2) {
          setUsers(response.data.users || [])
        }
      } catch (fallbackError) {
        if (searchQuery.length < 2) {
          setUsers([])
        }
      }
    }
  }

  const searchUsers = async () => {
    if (searchQuery.length < 2) return

    setLoading(true)
    try {
      const response = await api.get('/follow/search', {
        params: { q: searchQuery, limit: 20 }
      })

      if (response.data.success) {
        setUsers(response.data.users)
      } else {
        message.error('Failed to search users')
      }
    } catch (error) {
      console.error('Search users error:', error)
      setUsers([])
      message.error(error.response?.data?.message || 'Failed to search users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadFollowRequests = async () => {
    try {
      const response = await api.get('/follow/requests')
      if (response.data.success) {
        setFollowRequests(response.data.requests)
      }
    } catch (error) {
      console.error('Load follow requests error:', error)
    }
  }

  const loadFollowStatuses = async () => {
    try {
      // Get current user's following list
      const response = await followAPI.getFollowing()
      if (response.data.success && response.data.following) {
        const followingList = response.data.following || []
        const followingIds = new Set(
          followingList.map(user => user._id?.toString() || user._id)
        )
        
        // Update users list with follow status
        setUsers(prev => 
          prev.map(user => {
            const userIdStr = user._id?.toString() || user._id
            const isFollowing = followingIds.has(userIdStr)
            return {
              ...user,
              isFollowing: isFollowing || user.isFollowing || false
            }
          })
        )
      }
    } catch (error) {
      console.error('Load follow statuses error:', error)
    }
  }

  const handleFollowRequest = async (userId) => {
    try {
      console.log('📤 Sending follow request to user:', userId)
      
      // Send request to server first
      const response = await api.post(`/follow/request/${userId}`)
      
      console.log('📤 Follow request response:', response.data)
      
      if (response.data.success) {
        const followStatus = response.data.follow?.status
        const isAccepted = followStatus === 'accepted'
        const isPending = followStatus === 'pending'
        
        // Update UI on success - set correct state based on status
        setUsers(prev => 
          prev.map(user => 
            user._id === userId 
              ? { 
                  ...user, 
                  isFollowing: isAccepted,
                  isFollowRequestSent: isPending,
                  hasFollowRequest: isPending, // Also set this for button check
                  // Update follow counts if accepted
                  ...(isAccepted && {
                    followersCount: (user.followersCount || 0) + 1
                  })
                }
              : user
          )
        )
        
        // Also update newUsers list if this user is in it
        setNewUsers(prev => 
          prev.map(user => 
            user._id === userId 
              ? { 
                  ...user, 
                  isFollowing: isAccepted,
                  isFollowRequestSent: isPending,
                  hasFollowRequest: isPending,
                  ...(isAccepted && {
                    followersCount: (user.followersCount || 0) + 1
                  })
                }
              : user
          )
        )
        
        message.success(response.data.message || (isPending ? 'Follow request sent!' : 'User followed successfully!'))
        
        // Refresh follow statuses to ensure consistency across all pages
        setTimeout(() => {
          loadFollowStatuses()
          if (searchQuery) {
            handleSearch(searchQuery)
          } else {
            loadRecommendedUsers()
          }
        }, 500)
      } else {
        message.error(response.data.message || 'Failed to send follow request')
      }
    } catch (error) {
      console.error('❌ Send follow request error:', error)
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

  const handleAcceptRequest = async (userId) => {
    try {
      // Optimistically update UI first
      setFollowRequests(prev => 
        prev.filter(request => request._id !== userId)
      )
      message.success('Follow request accepted!')
      
      // Then try to update on server
      try {
        const response = await api.post(`/follow/accept/${userId}`)
        if (!response.data.success) {
          // Revert UI change if server fails
          loadFollowRequests()
          message.error(response.data.message)
        }
      } catch (error) {
        console.log('Server update failed, but UI updated locally')
      }
    } catch (error) {
      console.error('Accept follow request error:', error)
      message.error('Failed to accept follow request')
    }
  }

  const handleDeclineRequest = async (userId) => {
    try {
      // Optimistically update UI first
      setFollowRequests(prev => 
        prev.filter(request => request._id !== userId)
      )
      message.success('Follow request declined')
      
      // Then try to update on server
      try {
        const response = await api.post(`/follow/decline/${userId}`)
        if (!response.data.success) {
          // Revert UI change if server fails
          loadFollowRequests()
          message.error(response.data.message)
        }
      } catch (error) {
        console.log('Server update failed, but UI updated locally')
      }
    } catch (error) {
      console.error('Decline follow request error:', error)
      message.error('Failed to decline follow request')
    }
  }

  const handleStartChat = async (userId) => {
    try {
      // Create a thread with this user
      const response = await threadsAPI.createThread([userId])
      if (response.data.success) {
        const threadId = response.data.thread?._id
        navigate(`/user/chat`)
        // Optionally scroll to or select the thread
        message.success('Chat started!')
      }
    } catch (error) {
      console.error('Start chat error:', error)
      // Fallback to navigation
      navigate(`/user/chat`)
      message.info('Opening chat...')
    }
  }

  const getFollowButton = (user) => {
    if (user.isFollowing) {
      return (
        <Button 
          disabled 
          icon={<CheckOutlined />}
          onClick={(e) => e.stopPropagation()}
        >
          Following
        </Button>
      )
    } else if (user.hasFollowRequest) {
      return (
        <Button 
          disabled 
          icon={<UserAddOutlined />}
          onClick={(e) => e.stopPropagation()}
        >
          Request Sent
        </Button>
      )
    } else {
      return (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFollowRequest(user._id)
          }}
        >
          Follow
        </Button>
      )
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        Discover People
      </Title>

      {/* Search Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Input
          size="large"
          placeholder="Search for people by name or email..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: '16px' }}
        />
        <Text type="secondary">
          Enter at least 2 characters to search for users
        </Text>
      </Card>

      {/* New Users Section */}
      {newUsers.length > 0 && searchQuery.length < 2 && (
        <Card 
          title={
            <Space>
              <Tag color="green" style={{ fontSize: '12px' }}>NEW</Tag>
              <span>New Users This Week</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 16]}>
            {newUsers.map((user) => (
              <Col xs={24} sm={12} md={8} lg={6} key={user._id}>
                <Card 
                  size="small"
                  hoverable
                  style={{ height: '100%', border: user.isNew ? '2px solid #52c41a' : '1px solid #f0f0f0', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔍 UserDiscovery: Clicked user card, navigating to:', `/profile/${user._id}`)
                    if (user._id) {
                      navigate(`/profile/${user._id}`)
                    } else {
                      console.error('No user._id found:', user)
                      message.error('Invalid user ID')
                    }
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Avatar 
                          size={64} 
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
                              color: '#666'
                            }} 
                          />
                        )}
                      </div>
                      {user.isNew && (
                        <Tag 
                          color="green" 
                          style={{ 
                            position: 'absolute', 
                            top: '-8px', 
                            right: '-8px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}
                        >
                          NEW
                        </Tag>
                      )}
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
                    <Title 
                      level={5} 
                      style={{ marginTop: '12px', marginBottom: '4px', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('🔍 UserDiscovery: Clicked name, navigating to:', `/profile/${user._id}`)
                        if (user._id) {
                          navigate(`/profile/${user._id}`)
                        }
                      }}
                    >
                      {user.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {user.email}
                    </Text>
                    {user.website && (
                      <div style={{ marginTop: '4px' }}>
                        <GlobalOutlined style={{ fontSize: '12px', color: '#1890ff', marginRight: '4px' }} />
                        <Text 
                          type="secondary" 
                          style={{ fontSize: '12px', color: '#1890ff', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(user.website.startsWith('http') ? user.website : `https://${user.website}`, '_blank')
                          }}
                        >
                          {user.website}
                        </Text>
                      </div>
                    )}
                    {user.bio && (
                      <Paragraph 
                        style={{ 
                          marginTop: '8px', 
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '12px'
                        }}
                        ellipsis={{ rows: 2 }}
                      >
                        {user.bio}
                      </Paragraph>
                    )}
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div onClick={(e) => e.stopPropagation()}>
                        {getFollowButton(user)}
                      </div>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Follow Requests Section */}
      {followRequests.length > 0 && (
        <Card title="Follow Requests" style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]}>
            {followRequests.map((request) => (
              <Col xs={24} sm={12} md={8} key={request._id}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Avatar 
                      size={64} 
                      src={getUserAvatarUrl(request.user)} 
                      icon={<UserOutlined />}
                    >
                      {getUserInitials(request.user.name)}
                    </Avatar>
                    <Title level={5} style={{ marginTop: '8px', marginBottom: '4px' }}>
                      {request.user.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {request.user.email}
                    </Text>
                    {request.user.bio && (
                      <Paragraph 
                        style={{ 
                          marginTop: '8px', 
                          fontSize: '12px',
                          color: '#666'
                        }}
                        ellipsis={{ rows: 2 }}
                      >
                        {request.user.bio}
                      </Paragraph>
                    )}
                    <Space style={{ marginTop: '12px' }}>
                      <Button 
                        type="primary" 
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => handleAcceptRequest(request.user._id)}
                      >
                        Accept
                      </Button>
                      <Button 
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => handleDeclineRequest(request.user._id)}
                      >
                        Decline
                      </Button>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <Card title="Search Results">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
            </div>
          ) : users.length > 0 ? (
            <Row gutter={[16, 16]}>
              {users.map((user) => (
                <Col xs={24} sm={12} md={8} lg={6} key={user._id}>
                  <Card 
                    size="small"
                    hoverable
                    style={{ height: '100%', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🔍 UserDiscovery Search: Clicked user card, navigating to:', `/profile/${user._id}`)
                      if (user._id) {
                        navigate(`/profile/${user._id}`)
                      } else {
                        console.error('No user._id found:', user)
                        message.error('Invalid user ID')
                      }
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar 
                          size={80} 
                          src={getUserAvatarUrl(user)} 
                          icon={<UserOutlined />}
                        >
                          {getUserInitials(user.name)}
                        </Avatar>
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
                      <Title level={5} style={{ marginTop: '12px', marginBottom: '4px', cursor: 'pointer' }}>
                        {user.name}
                        {user.isNew && (
                          <Tag color="green" style={{ marginLeft: '8px', fontSize: '10px' }}>
                            NEW
                          </Tag>
                        )}
                      </Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {user.email}
                      </Text>
                      {user.website && (
                        <div style={{ marginTop: '4px' }}>
                          <GlobalOutlined style={{ fontSize: '12px', color: '#1890ff', marginRight: '4px' }} />
                          <Text 
                            type="secondary" 
                            style={{ fontSize: '12px', color: '#1890ff', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(user.website.startsWith('http') ? user.website : `https://${user.website}`, '_blank')
                            }}
                          >
                            {user.website}
                          </Text>
                        </div>
                      )}
                      {user.location && (
                        <div style={{ marginTop: '4px' }}>
                          <EnvironmentOutlined style={{ fontSize: '12px', color: '#666' }} />
                          <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
                            {user.location}
                          </Text>
                        </div>
                      )}
                      {user.bio && (
                        <Paragraph 
                          style={{ 
                            marginTop: '8px', 
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '12px'
                          }}
                          ellipsis={{ rows: 2 }}
                        >
                          {user.bio}
                        </Paragraph>
                      )}
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {getFollowButton(user)}
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty 
              description="No users found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      )}

      {/* User Profile Detail Modal */}
      <Modal
        title={
          <Space>
            <Avatar 
              size={40} 
              src={selectedUser ? getUserAvatarUrl(selectedUser) : null} 
              icon={<UserOutlined />}
            >
              {selectedUser ? getUserInitials(selectedUser.name) : ''}
            </Avatar>
            <span>{selectedUser?.name || 'User Profile'}</span>
            {selectedUser?.isOnline && <Badge status="success" text="Online" />}
          </Space>
        }
        open={profileModalVisible}
        onCancel={() => {
          setProfileModalVisible(false)
          setSelectedUser(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setProfileModalVisible(false)
            setSelectedUser(null)
          }}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar 
                size={120} 
                src={getUserAvatarUrl(selectedUser)} 
                icon={<UserOutlined />}
                style={{ marginBottom: '16px' }}
              >
                {getUserInitials(selectedUser.name)}
              </Avatar>
              <Title level={3} style={{ marginBottom: '8px' }}>
                {selectedUser.name}
                {selectedUser.isPrivate && <LockOutlined style={{ marginLeft: '8px', color: '#999' }} />}
              </Title>
              {selectedUser.bio && (
                <Paragraph style={{ fontSize: '14px', color: '#666', maxWidth: '500px', margin: '0 auto 16px' }}>
                  {selectedUser.bio}
                </Paragraph>
              )}
            </div>

            <Descriptions bordered column={1}>
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {selectedUser.email}
              </Descriptions.Item>
              {selectedUser.location && (
                <Descriptions.Item label={<><EnvironmentOutlined /> Location</>}>
                  {selectedUser.location}
                </Descriptions.Item>
              )}
              {selectedUser.website && (
                <Descriptions.Item label={<><GlobalOutlined /> Website</>}>
                  <a 
                    href={selectedUser.website.startsWith('http') ? selectedUser.website : `https://${selectedUser.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff' }}
                  >
                    {selectedUser.website}
                  </a>
                </Descriptions.Item>
              )}
              {selectedUser.createdAt && (
                <Descriptions.Item label={<><CalendarOutlined /> Member Since</>}>
                  {new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Account Type">
                <Tag color={selectedUser.isPrivate ? 'orange' : 'blue'}>
                  {selectedUser.isPrivate ? 'Private Account' : 'Public Account'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Space>
                  <Tag color={selectedUser.isOnline ? 'green' : 'default'}>
                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                  </Tag>
                  {selectedUser.isNew && <Tag color="green">New User</Tag>}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* No search query message */}
      {searchQuery.length < 2 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <SearchOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} type="secondary">
              Search for People
            </Title>
            <Paragraph type="secondary">
              Enter a name or email to discover and connect with other users
            </Paragraph>
          </div>
        </Card>
      )}
    </div>
  )
}

export default UserDiscovery