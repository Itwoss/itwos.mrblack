import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Button, Layout } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Title, Paragraph } = Typography
const { Content } = Layout

const DashboardSimple = () => {
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated && user?.role === 'user') {
        console.log('User is authenticated and authorized')
        setIsLoading(false)
        return
      }
      
      if (isAuthenticated && user?.role !== 'user') {
        console.log('Not a user role, redirecting to login. User role:', user?.role)
        navigate('/login')
        return
      }
      
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login')
        navigate('/login')
        return
      }
    }

    const timer = setTimeout(() => {
      checkAuth()
    }, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user, navigate])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div>
          <Title level={2} style={{ color: '#fff' }}>Loading...</Title>
          <Paragraph style={{ color: '#666' }}>Please wait while we load your dashboard.</Paragraph>
        </div>
      </div>
    )
  }

  if (user?.role !== 'user') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#fff'
      }}>
        <div>
          <Title level={2} style={{ color: '#fff' }}>Access Denied</Title>
          <Paragraph style={{ color: '#666' }}>Please login as a user to access this dashboard.</Paragraph>
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      background: '#0a0a0a', 
      minHeight: '100vh',
      color: '#fff',
      padding: '2rem'
    }}>
      <div style={{ marginBottom: '3rem' }}>
        <Title level={1} style={{ color: '#fff', marginBottom: '0.5rem' }}>
          Welcome back, {user?.name || 'User'}!
        </Title>
        <Paragraph style={{ color: '#666', fontSize: '18px' }}>
          Your personal dashboard is ready. Start exploring and managing your account.
        </Paragraph>
        <Button 
          type="primary" 
          onClick={handleLogout}
          style={{ 
            background: '#ff6b6b', 
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Logout
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card 
            bordered={false} 
            style={{ 
              background: '#111', 
              borderRadius: '12px', 
              border: '1px solid #333'
            }}
          >
            <Title level={3} style={{ color: '#fff' }}>Dashboard</Title>
            <Paragraph style={{ color: '#666' }}>
              This is a simplified dashboard to test the basic functionality.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardSimple
