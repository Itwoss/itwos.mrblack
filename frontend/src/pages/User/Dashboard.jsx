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
import { IconlyTickSquare } from '../../components/IconlyTickSquare'

const { Title, Paragraph, Text } = Typography

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, updateUser, authInitialized } = useAuth()
  const navigate = useNavigate()
  
  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Dashboard: Loading timeout - forcing render')
        setIsLoading(false)
      }
    }, 3000) // 3 second timeout
    
    return () => clearTimeout(timeout)
  }, [isLoading])
  
  // Authentication check
  const checkAuth = useCallback(() => {
    // Only check if auth is initialized
    if (!authInitialized) {
      return false
    }
    
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
  }, [isAuthenticated, user, navigate, authInitialized])

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

  // Sync active status from user context immediately
  useEffect(() => {
    if (user) {
      setIsActiveStatusVisible(user.activeStatusVisible !== false)
    }
  }, [user?.activeStatusVisible])

  // Handle active status toggle
  const handleActiveStatusToggle = async (checked) => {
    setIsActiveStatusVisible(checked)
    
    if (updateUser) {
      updateUser({ activeStatusVisible: checked })
    }
    
    try {
      const response = await api.put('/users/me', { 
        activeStatusVisible: checked 
      })
      if (response.data.success) {
        message.success(`Active status ${checked ? 'enabled' : 'disabled'}`)
      } else {
        throw new Error(response.data.message || 'Update failed')
      }
    } catch (error) {
      console.error('Error updating active status:', error)
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
        background: '#f5f7fa'
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
        background: '#f5f7fa'
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

  // Check if user has verified badge
  const isVerified = user?.isVerified && user?.verifiedTill && new Date(user.verifiedTill) > new Date()

  return (
    <div style={{ 
      background: '#f5f7fa', 
      minHeight: '100vh',
      padding: '16px'
    }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Title 
            level={2} 
            style={{ 
              color: '#1e293b', 
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: '1.4'
            }}
          >
            Welcome back, {user?.name || 'user123'}! 👋
          </Title>
          {isVerified && (
            <IconlyTickSquare size={20} color="#0aa2ee" />
          )}
        </div>
        <Text style={{ 
          color: '#64748b', 
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          Here's what's happening with your learning journey.
        </Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={12} md={6}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingCartOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Total Purchases
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.totalPurchases}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOutlined style={{ color: '#22c55e', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Courses Enrolled
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.coursesEnrolled}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#fffbeb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrophyOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Completed
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  {stats.completed}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card 
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: '#fdf2f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarOutlined style={{ color: '#ec4899', fontSize: '18px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: '11px', 
                  display: 'block',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  Total Spent
                </Text>
                <Text style={{ 
                  color: '#1e293b', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}>
                  ${stats.totalSpent}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* New Users Section */}
      {newUsers.length > 0 && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag color="#22c55e" style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}>NEW</Tag>
              <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                New Users This Week
              </Text>
            </div>
          }
          extra={
            <Button 
              type="link" 
              onClick={() => navigate('/discover')}
              style={{ fontSize: '12px', padding: 0, height: 'auto' }}
            >
              See All
            </Button>
          }
          style={{ 
            marginBottom: '16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#fff'
          }}
          bodyStyle={{ padding: '12px' }}
        >
          <Row gutter={[12, 12]}>
            {newUsers.map((newUser) => (
              <Col xs={8} sm={8} md={4} lg={4} key={newUser._id}>
                <div
                  style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/profile/${newUser._id}`)}
                >
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '6px' }}>
                    <Avatar 
                      size={48} 
                      src={getUserAvatarUrl(newUser)} 
                      icon={<UserOutlined />}
                    >
                      {getUserInitials(newUser.name)}
                    </Avatar>
                    <Tag 
                      color="#22c55e" 
                      style={{ 
                        position: 'absolute', 
                        top: '-4px', 
                        right: '-4px',
                        fontSize: '9px',
                        padding: '0 4px',
                        margin: 0,
                        lineHeight: '16px'
                      }}
                    >
                      NEW
                    </Tag>
                  </div>
                  <Text 
                    style={{ 
                      fontSize: '12px', 
                      fontWeight: 500,
                      color: '#1e293b',
                      display: 'block',
                      marginBottom: '2px',
                      lineHeight: '1.3'
                    }}
                  >
                    {newUser.name}
                  </Text>
                  <Text style={{ 
                    fontSize: '11px', 
                    color: '#64748b',
                    display: 'block',
                    lineHeight: '1.2'
                  }}>
                    {newUser.email?.split('@')[0] || 'User'}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Quick Settings */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SettingOutlined style={{ fontSize: '14px', color: '#64748b' }} />
            <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              Quick Settings
            </Text>
          </div>
        }
        extra={
          <Button 
            type="link" 
            onClick={() => navigate('/settings')} 
            style={{ fontSize: '12px', padding: 0, height: 'auto' }}
          >
            View All
          </Button>
        }
        style={{
          marginBottom: '16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          background: '#fff'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px',
          background: '#f8fafc',
          borderRadius: '6px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px'
            }}>
              <CheckCircleOutlined style={{
                color: isActiveStatusVisible ? '#22c55e' : '#94a3b8',
                fontSize: '14px'
              }} />
              <Text style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                Activity Status
              </Text>
              <Tag 
                color={isActiveStatusVisible ? '#22c55e' : 'default'} 
                style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}
              >
                {isActiveStatusVisible ? 'ON' : 'OFF'}
              </Tag>
            </div>
            <Text style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
              {isActiveStatusVisible 
                ? 'Others can see when you\'re online' 
                : 'Your activity status is hidden'}
            </Text>
          </div>
          <Switch
            checked={isActiveStatusVisible}
            onChange={handleActiveStatusToggle}
            size="small"
            style={{ marginLeft: '12px' }}
          />
        </div>
      </Card>

      {/* Verified Badge Section */}
      <Card
        onClick={() => navigate('/dashboard/products')}
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        bodyStyle={{ padding: '12px' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            background: isVerified ? '#f0fdf4' : '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isVerified ? (
              <IconlyTickSquare size={20} color="#0aa2ee" />
            ) : (
              <CheckCircleOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <Text style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: '#1e293b',
                display: 'block'
              }}>
                {isVerified ? 'Verified Badge Active' : 'Get Verified Badge'}
              </Text>
              {isVerified && (
                <Tag color="#22c55e" style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}>
                  Active
                </Tag>
              )}
            </div>
            <Text style={{ 
              fontSize: '11px', 
              color: '#64748b',
              display: 'block'
            }}>
              {isVerified 
                ? `Your verified badge is active until ${new Date(user.verifiedTill).toLocaleDateString()}`
                : 'Show your authenticity with a blue checkmark badge'}
            </Text>
          </div>
          {!isVerified && (
            <Button
              type="primary"
              size="small"
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                height: '28px',
                padding: '0 12px'
              }}
            >
              View Plans
            </Button>
          )}
        </div>
      </Card>

      {/* Recent Purchases */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingCartOutlined style={{ fontSize: '14px', color: '#64748b' }} />
            <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              Recent Purchases
            </Text>
          </div>
        }
        extra={
          <Button 
            type="link" 
            onClick={() => navigate('/purchases')}
            style={{ fontSize: '12px', padding: 0, height: 'auto' }}
          >
            View All
          </Button>
        }
        style={{
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          background: '#fff'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <div style={{ textAlign: 'center', padding: '24px 12px' }}>
          <Text style={{ 
            fontSize: '13px', 
            fontWeight: 500,
            color: '#64748b',
            display: 'block',
            marginBottom: '4px'
          }}>
            No recent purchases
          </Text>
          <Text style={{ 
            fontSize: '11px', 
            color: '#94a3b8',
            display: 'block',
            marginBottom: '12px'
          }}>
            Your recent purchases will appear here
          </Text>
          <Button 
            type="primary" 
            size="small"
            onClick={() => navigate('/purchases')}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              height: '28px',
              padding: '0 16px'
            }}
          >
            View All Purchases
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
