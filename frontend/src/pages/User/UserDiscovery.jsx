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
  Divider
} from 'antd'
import { 
  SearchOutlined, 
  UserAddOutlined, 
  UserOutlined, 
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
  HeartOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'

const { Title, Paragraph, Text } = Typography

const UserDiscovery = () => {
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState([])
  const [followRequests, setFollowRequests] = useState([])

  useEffect(() => {
    loadFollowRequests()
    loadRecommendedUsers()
    if (searchQuery.length >= 2) {
      searchUsers()
    }
  }, [searchQuery])

  const loadRecommendedUsers = async () => {
    try {
      const response = await api.get('/follow/recommendations')
      if (response.data.success) {
        // Add recommended users to the users list if no search query
        if (searchQuery.length < 2) {
          setUsers(response.data.users || [])
        }
      }
    } catch (error) {
      console.error('Load recommendations error:', error)
      
      // TODO: Replace with real API call
      if (searchQuery.length < 2) {
        setUsers([])
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
      
      // TODO: Replace with real API call
      setUsers([])
      message.error('Failed to search users. Please try again.')
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

  const handleFollowRequest = async (userId) => {
    try {
      // Optimistically update UI first
      setUsers(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, isFollowRequestSent: true }
            : user
        )
      )
      message.success('Follow request sent!')
      
      // Then try to update on server
      try {
        const response = await api.post(`/follow/request/${userId}`)
        if (!response.data.success) {
          // Revert UI change if server fails
          setUsers(prev => 
            prev.map(user => 
              user._id === userId 
                ? { ...user, isFollowRequestSent: false }
                : user
            )
          )
          message.error(response.data.message)
        }
      } catch (error) {
        console.log('Server update failed, but UI updated locally')
      }
    } catch (error) {
      console.error('Send follow request error:', error)
      message.error('Failed to send follow request')
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
      // Navigate to chat with this user
      window.location.href = `/chat?user=${userId}`
    } catch (error) {
      console.error('Start chat error:', error)
      message.error('Failed to start chat')
    }
  }

  const getFollowButton = (user) => {
    if (user.isFollowing) {
      return (
        <Button disabled icon={<CheckOutlined />}>
          Following
        </Button>
      )
    } else if (user.hasFollowRequest) {
      return (
        <Button disabled icon={<UserAddOutlined />}>
          Request Sent
        </Button>
      )
    } else {
      return (
        <Button 
          type="primary" 
          icon={<UserAddOutlined />}
          onClick={() => handleFollowRequest(user._id)}
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
                    style={{ height: '100%' }}
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
                      <Title level={5} style={{ marginTop: '12px', marginBottom: '4px' }}>
                        {user.name}
                      </Title>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {user.email}
                      </Text>
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
                        <Button 
                          icon={<MessageOutlined />}
                          onClick={() => handleStartChat(user._id)}
                          style={{ width: '100%' }}
                        >
                          Message
                        </Button>
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