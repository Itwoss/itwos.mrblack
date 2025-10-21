import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Space, Divider, Row, Col, App } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Title, Paragraph, Text } = Typography

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { login, googleLogin, isAuthenticated, user } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 User already authenticated, redirecting to:', from)
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, user, navigate, from])

  const onFinish = async (values) => {
    setIsLoading(true)
    try {
      console.log('🔐🔐🔐 LOGIN PAGE: Attempting login for:', values.email)
      console.log('🔐🔐🔐 LOGIN PAGE: Attempting login for:', values.email)
      console.log('🔐🔐🔐 LOGIN PAGE: Attempting login for:', values.email)
      const result = await login(values)
      console.log('🔐 Login result:', result)
      
      if (result.success) {
        console.log('✅ Login successful, redirecting to:', result.redirectTo || from)
        message.success('Login successful!')
        
        // Navigate immediately - the auth state should be set by now
        const redirectPath = result.redirectTo || from
        console.log('🚀 Navigating to:', redirectPath)
        navigate(redirectPath, { replace: true })
      } else {
        message.error(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      message.error('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      console.log('🔐 Starting Google login...')
      const result = await googleLogin()
      console.log('🔐 Google login result:', result)
      
      if (result.success) {
        console.log('✅ Google login successful, redirecting to:', result.redirectTo || from)
        message.success('Google login successful!')
        
        // Navigate immediately
        const redirectPath = result.redirectTo || from
        console.log('🚀 Navigating to:', redirectPath)
        navigate(redirectPath, { replace: true })
      } else {
        message.error(result.error || 'Google login failed')
      }
    } catch (error) {
      console.error('❌ Google login error:', error)
      message.error('Google login failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <App>
      <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Row justify="center" style={{ width: '100%' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <Card 
            style={{ 
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              borderRadius: '16px',
              border: 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Title level={2} style={{ marginBottom: '0.5rem', color: '#1890ff' }}>
                🚀 Welcome Back
              </Title>
              <Paragraph style={{ color: '#666', fontSize: '1.1rem' }}>
                Sign in to your ITWOS AI account
              </Paragraph>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                  placeholder="Enter your email address" 
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: '#1890ff' }} />} 
                  placeholder="Enter your password" 
                  style={{ borderRadius: '8px' }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={isLoading}
                  size="large"
                  style={{ 
                    width: '100%',
                    height: '48px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '1.5rem 0' }}>
              <Text style={{ color: '#999' }}>Or continue with</Text>
            </Divider>

            <Button
              icon={<GoogleOutlined />}
              onClick={handleGoogleLogin}
              loading={isGoogleLoading}
              disabled={isLoading || isGoogleLoading}
              size="large"
              style={{ 
                width: '100%',
                height: '48px',
                borderRadius: '8px',
                border: '2px solid #f0f0f0',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              {isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/forgot-password" style={{ 
                color: '#1890ff',
                fontWeight: '500',
                textDecoration: 'none'
              }}>
                Forgot your password?
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Text style={{ color: '#666' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ 
                  color: '#1890ff',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}>
                  Create one now
                </Link>
              </Text>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/forgot-password" style={{ 
                color: '#1890ff',
                fontSize: '14px'
              }}>
                Forgot your password?
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
    </App>
  )
}

export default LoginPage