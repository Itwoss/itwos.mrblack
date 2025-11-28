import React, { useState, useEffect, useCallback } from 'react'
import { Card, Row, Col, Statistic, Typography, Button, Avatar, Space, Tag, Badge, Switch, message, Dropdown } from 'antd'
import { 
  ShoppingCartOutlined, 
  DollarOutlined,
  TrophyOutlined,
  BookOutlined,
  UserOutlined,
  MessageOutlined,
  UserAddOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  MoreOutlined,
  CrownOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import { usersListAPI, threadsAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import api from '../../services/api'

const { Title, Paragraph, Text } = Typography

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, updateUser } = useAuth()
  const navigate = useNavigate()
  
  // Authentication check
  const checkAuth = useCallback(() => {
    if (isAuthenticated && user?.role === 'user') {
      console.log('User is authenticated and authorized')
      setIsLoading(false)
      return true
    }
    
    if (isAuthenticated && user?.role !== 'user') {
      console.log('Not a user role, redirecting to login. User role:', user?.role)
      navigate('/login')
      return false
    }
    
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      navigate('/login')
      return false
    }
    
    return false
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)
    return () => clearTimeout(timer)
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated && user?.role === 'user') {
      loadNewUsers()
    }
  }, [isAuthenticated, user])

  const [stats, setStats] = useState({
    totalPurchases: 0,
    coursesEnrolled: 0,
    completed: 0,
    totalSpent: 0
  })
  const [newUsers, setNewUsers] = useState([])
  const [loadingNewUsers, setLoadingNewUsers] = useState(false)
  const [isActiveStatusVisible, setIsActiveStatusVisible] = useState(true)

  // Sync active status from user context immediately (0 delay, no API call)
  useEffect(() => {
    if (user) {
      // Update immediately from user context - instant sync
      setIsActiveStatusVisible(user.activeStatusVisible !== false)
    }
  }, [user?.activeStatusVisible]) // Only re-run when activeStatusVisible changes

  // Handle active status toggle - immediate update (0 delay)
  const handleActiveStatusToggle = async (checked) => {
    // Update UI immediately (0 delay) - no waiting for API
    setIsActiveStatusVisible(checked)
    
    // Update user context immediately for instant sync across app
    if (updateUser) {
      updateUser({ activeStatusVisible: checked })
    }
    
    // Save to backend asynchronously (non-blocking)
    try {
      const response = await api.put('/users/me', { 
        activeStatusVisible: checked 
      })
      console.log('✅ Active status update response:', response.data)
      if (response.data.success) {
        message.success(`Active status ${checked ? 'enabled' : 'disabled'}`)
      } else {
        throw new Error(response.data.message || 'Update failed')
      }
    } catch (error) {
      console.error('❌ Error updating active status:', error)
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      // Revert on error
      setIsActiveStatusVisible(!checked)
      if (updateUser) {
        updateUser({ activeStatusVisible: !checked })
      }
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update active status'
      message.error(errorMsg)
    }
  }

  const loadNewUsers = async () => {
    setLoadingNewUsers(true)
    try {
      const response = await usersListAPI.getUsers({
        sort: 'new',
        limit: 6,
        excludeSelf: true
      })
      
      if (response.data.success) {
        // Filter to only show new users
        const newUsersList = (response.data.users || []).filter(user => user.isNew)
        setNewUsers(newUsersList.slice(0, 6))
      }
    } catch (error) {
      console.error('Load new users error:', error)
      setNewUsers([])
    } finally {
      setLoadingNewUsers(false)
    }
  }

  const handleStartChat = async (userId) => {
    try {
      const response = await threadsAPI.createThread([userId])
      if (response.data.success) {
        navigate('/user/chat')
      }
    } catch (error) {
      console.error('Start chat error:', error)
      navigate('/user/chat')
    }
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        background: '#f5f5f5'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (user?.role !== 'user') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        background: '#f5f5f5'
      }}>
        <div>
          <Title level={2}>Access Denied</Title>
          <Paragraph>Please login as a user to access this dashboard.</Paragraph>
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-xl)', padding: '0 var(--container-padding-mobile)' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-small)' }}>
          Home / Dashboard
        </span>
      </div>

      {/* Welcome Section */}
      <div style={{ 
        marginBottom: 'var(--space-xxl)',
        padding: '0 var(--container-padding-mobile)'
      }}>
        <Title 
          level={1} 
          style={{ 
            color: 'var(--text-primary)', 
            marginBottom: 'var(--space-sm)',
            fontSize: 'var(--type-display)',
            fontWeight: 'var(--weight-bold)',
            lineHeight: 'var(--line-tight)'
          }}
        >
          Welcome back, {user?.name || 'user123'}! 👋
        </Title>
        <Paragraph style={{ 
          color: 'var(--text-secondary)', 
          fontSize: 'var(--type-body)',
          lineHeight: 'var(--line-relaxed)'
        }}>
          Here's what's happening with your learning journey.
        </Paragraph>
      </div>

      {/* New Users Suggestions */}
      {newUsers.length > 0 && (
        <Card 
          title={
            <Space>
              <Tag color="green">NEW</Tag>
              <span>New Users This Week - Start Chatting!</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/discover')}>
              See All
            </Button>
          }
          style={{ 
            marginBottom: 'var(--space-xl)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--elev-1)'
          }}
        >
          <Row gutter={[16, 16]}>
            {newUsers.map((newUser) => (
              <Col xs={24} sm={12} md={8} lg={4} key={newUser._id}>
                <Card
                  size="small"
                  hoverable
                  style={{ 
                    textAlign: 'center',
                    border: '2px solid var(--success)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all var(--transition-base)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔍 Dashboard: Clicked user card, navigating to:', `/profile/${newUser._id}`)
                    if (newUser._id) {
                      navigate(`/profile/${newUser._id}`)
                    } else {
                      console.error('No newUser._id found:', newUser)
                      message.error('Invalid user ID')
                    }
                  }}
                >

                  <div 
                    style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/profile/${newUser._id}`)
                    }}
                  >
                    <Avatar 
                      size={64} 
                      src={getUserAvatarUrl(newUser)} 
                      icon={<UserOutlined />}
                    >
                      {getUserInitials(newUser.name)}
                    </Avatar>
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
                  </div>
                  <Title 
                    level={5} 
                    style={{ marginTop: '12px', marginBottom: '4px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/profile/${newUser._id}`)
                    }}
                  >
                    {newUser.name}
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                    {newUser.email}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Summary Cards */}
      <div style={{ padding: '0 var(--container-padding-mobile)' }}>
        <Row gutter={[24, 24]} style={{ marginBottom: 'var(--space-xxl)' }}>
          <Col xs={24} sm={12} md={6}>
            <Card 
                variant="borderless"
              hoverable
              style={{ 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--radius-lg)', 
                boxShadow: 'var(--elev-1)',
                padding: 'var(--space-lg)',
                transition: 'all var(--transition-base)'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-small)' }}>Total Purchases</span>}
                value={stats.totalPurchases} 
                prefix={<ShoppingCartOutlined style={{ color: 'var(--accent-primary)' }} />} 
                valueStyle={{ color: 'var(--accent-primary)', fontSize: 'var(--type-h1)' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
                variant="borderless"
              hoverable
              style={{ 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--radius-lg)', 
                boxShadow: 'var(--elev-1)',
                padding: 'var(--space-lg)',
                transition: 'all var(--transition-base)'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-small)' }}>Courses Enrolled</span>}
                value={stats.coursesEnrolled} 
                prefix={<BookOutlined style={{ color: 'var(--success)' }} />} 
                valueStyle={{ color: 'var(--success)', fontSize: 'var(--type-h1)' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
                variant="borderless"
              hoverable
              style={{ 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--radius-lg)', 
                boxShadow: 'var(--elev-1)',
                padding: 'var(--space-lg)',
                transition: 'all var(--transition-base)'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-small)' }}>Completed</span>}
                value={stats.completed} 
                prefix={<TrophyOutlined style={{ color: 'var(--warning)' }} />} 
                valueStyle={{ color: 'var(--warning)', fontSize: 'var(--type-h1)' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card 
                variant="borderless"
              hoverable
              style={{ 
                background: 'var(--bg-primary)', 
                borderRadius: 'var(--radius-lg)', 
                boxShadow: 'var(--elev-1)',
                padding: 'var(--space-lg)',
                transition: 'all var(--transition-base)'
              }}
            >
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)', fontSize: 'var(--type-small)' }}>Total Spent</span>}
                value={stats.totalSpent} 
                prefix={<DollarOutlined style={{ color: 'var(--danger)' }} />} 
                valueStyle={{ color: 'var(--danger)', fontSize: 'var(--type-h1)' }} 
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Quick Settings Section */}
      <div style={{ padding: '0 16px', marginBottom: '48px' }}>
        <Card
          title={
            <Space>
              <SettingOutlined />
              <span style={{ fontSize: '16px', fontWeight: '600' }}>Quick Settings</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/settings')} style={{ fontSize: '14px' }}>
              View All Settings
            </Button>
          }
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  border: '1px solid #e8e8e8'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <CheckCircleOutlined style={{
                        color: isActiveStatusVisible ? '#52c41a' : '#999',
                        fontSize: '16px'
                      }} />
                      <Text strong style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        Activity Status
                      </Text>
                      <Tag color={isActiveStatusVisible ? 'green' : 'default'} style={{ margin: 0, fontSize: '11px' }}>
                        {isActiveStatusVisible ? 'ON' : 'OFF'}
                      </Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px', color: '#666', display: 'block' }}>
                      {isActiveStatusVisible 
                        ? 'Others can see when you\'re online' 
                        : 'Your activity status is hidden'}
                    </Text>
                  </div>
                  <Switch
                    checked={isActiveStatusVisible}
                    onChange={handleActiveStatusToggle}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                    style={{
                      minWidth: '50px',
                      marginLeft: '16px'
                    }}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  border: '1px solid #e8e8e8',
                  textAlign: 'center'
                }}
              >
                <Paragraph style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '12px'
                }}>
                  Need more settings?
                </Paragraph>
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => navigate('/settings')}
                  style={{
                    marginTop: '8px',
                    minHeight: '44px',
                    borderRadius: '6px'
                  }}
                >
                  Go to Settings
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Verified Badge Products Section */}
      <div style={{ padding: '0 var(--container-padding-mobile)', marginBottom: 'var(--space-xl)' }}>
        <Card
          hoverable
          onClick={() => navigate('/dashboard/products')}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: 'none',
            cursor: 'pointer',
            color: '#fff'
          }}
          styles={{ body: { padding: '24px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              <CheckCircleOutlined style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <Title level={4} style={{ color: '#fff', margin: 0, marginBottom: '4px' }}>
                Get Verified Badge
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                Show your authenticity with a blue checkmark badge
              </Paragraph>
            </div>
            <Button
              type="primary"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              View Plans
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Purchases Section */}
              <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCartOutlined />
            Recent Purchases
                          </div>
                        }
        extra={
          <Button type="link" onClick={() => navigate('/purchases')}>
            View All
                          </Button>
        }
                  variant="borderless"
                  style={{
          background: '#fff', 
                    borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Title level={4} style={{ color: '#666' }}>
            Recent Purchases
                    </Title>
          <Paragraph style={{ color: '#666' }}>
            Your recent purchases will appear here. Click "View All" to see your complete purchase history.
                    </Paragraph>
          <Button type="primary" onClick={() => navigate('/purchases')}>
            View All Purchases
          </Button>
                  </div>
                </Card>
    </div>
  )
}

export default Dashboard