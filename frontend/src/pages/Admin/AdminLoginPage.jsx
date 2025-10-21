import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Space, Divider, Row, Col, Alert, App } from 'antd'
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Title, Paragraph, Text } = Typography

const AdminLoginPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { adminLogin, isAuthenticated, user } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const onFinish = async (values) => {
    setIsLoading(true)
    try {
      const result = await adminLogin(values)
      if (result.success) {
        // Always redirect to admin dashboard for admin login
        navigate('/admin/dashboard', { replace: true })
      }
    } catch (error) {
      console.error('Admin login error:', error)
      message.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <App>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #001529 0%, #1890ff 100%)',
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              borderRadius: '16px',
              border: 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <SafetyCertificateOutlined style={{ fontSize: '3rem', color: '#1890ff', marginBottom: '1rem' }} />
              <Title level={2} style={{ marginBottom: '0.5rem', color: '#1890ff' }}>
                🔐 Admin Access
              </Title>
              <Paragraph style={{ color: '#666', fontSize: '1.1rem' }}>
                Sign in to access the admin dashboard
              </Paragraph>
            </div>

            <Alert
              message="Admin Credentials"
              description="Use admin@itwos.ai / admin123 to login"
              type="info"
              showIcon
              style={{ marginBottom: '1.5rem' }}
            />

            <Form
              name="adminLogin"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                label="Admin Email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                  placeholder="Enter admin email" 
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: '#1890ff' }} />} 
                  placeholder="Enter admin password" 
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
                  {isLoading ? 'Signing In...' : 'Access Admin Panel'}
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '1.5rem 0' }}>
              <Text style={{ color: '#999' }}>Or</Text>
            </Divider>

            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: '#666' }}>
                Regular user?{' '}
                <Link to="/login" style={{ 
                  color: '#1890ff',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}>
                  Sign in as user
                </Link>
              </Text>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/" style={{ 
                color: '#1890ff',
                fontSize: '14px'
              }}>
                ← Back to Homepage
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
      </div>
    </App>
  )
}

export default AdminLoginPage
