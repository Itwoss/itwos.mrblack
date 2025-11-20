import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Tabs, 
  Avatar, 
  Typography, 
  Row, 
  Col, 
  Space, 
  Button, 
  message, 
  Spin, 
  Empty,
  Badge,
  Input,
  Tag
} from 'antd'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { 
  UserOutlined, 
  HeartOutlined, 
  UserDeleteOutlined,
  MessageOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const { Title, Paragraph, Text } = Typography
// const { TabPane } = Tabs // Deprecated, using items prop instead

const UserNetwork = () => {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('followers')

  useEffect(() => {
    loadFollowers()
    loadFollowing()
  }, [])

  const loadFollowers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/follow/followers')
      if (response.data.success) {
        setFollowers(response.data.followers)
      } else {
        message.error('Failed to load followers')
      }
    } catch (error) {
      console.error('Load followers error:', error)
      message.error('Failed to load followers')
    } finally {
      setLoading(false)
    }
  }

  const loadFollowing = async () => {
    setLoading(true)
    try {
      const response = await api.get('/follow/following')
      if (response.data.success) {
        setFollowing(response.data.following)
      } else {
        message.error('Failed to load following')
      }
    } catch (error) {
      console.error('Load following error:', error)
      message.error('Failed to load following')
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollow = async (userId) => {
    try {
      const response = await api.delete(`/follow/unfollow/${userId}`)
      if (response.data.success) {
        message.success('Unfollowed successfully')
        loadFollowing()
        loadFollowers()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('Unfollow error:', error)
      message.error('Failed to unfollow user')
    }
  }

  const handleStartChat = (userId) => {
    window.location.href = `/chat?user=${userId}`
  }

  const filteredFollowers = followers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFollowing = following.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const UserCard = ({ user, showUnfollow = false }) => (
    <Card 
      size="small" 
      style={{ height: '100%', cursor: 'pointer' }}
      hoverable
      onClick={() => navigate(`/profile/${user._id}`)}
      actions={[
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/profile/${user._id}`)
          }}
        >
          View Profile
        </Button>
      ]}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Avatar 
            size={64} 
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
          <Button 
            icon={<MessageOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleStartChat(user._id)
            }}
            style={{ width: '100%' }}
          >
            Message
          </Button>
          {showUnfollow && (
            <Button 
              danger
              icon={<UserDeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleUnfollow(user._id)
              }}
              style={{ width: '100%' }}
            >
              Unfollow
            </Button>
          )}
        </Space>
      </div>
    </Card>
  )

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>
        My Network
      </Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Input
              placeholder="Search network..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '200px' }}
            />
          }
          items={[
            {
              key: 'followers',
              label: (
                <span>
                  <HeartOutlined />
                  Followers ({followers.length})
                </span>
              ),
              children: loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                </div>
              ) : filteredFollowers.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {filteredFollowers.map((user) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={user._id}>
                      <UserCard user={user} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty 
                  description="No followers found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            },
            {
              key: 'following',
              label: (
                <span>
                  <UserOutlined />
                  Following ({following.length})
                </span>
              ),
              children: loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                </div>
              ) : filteredFollowing.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {filteredFollowing.map((user) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={user._id}>
                      <UserCard user={user} showUnfollow={true} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty 
                  description="No following found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default UserNetwork