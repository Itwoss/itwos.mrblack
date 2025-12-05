import React, { useState, useEffect } from 'react'
import { Form, Input, Typography, App } from 'antd'
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import '../../styles/glass-login.css'

const { Text } = Typography

const AdminLoginPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
        message.success('Admin login successful!')
        navigate('/admin/dashboard', { replace: true })
      } else {
        message.error(result.error || 'Admin login failed')
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
      <div className="glass-login-wrapper">
        <div className="glass-login-container">
          <div className="glass-card">
            <div className="glass-card-header">
              <h1>Admin Log in</h1>
              <p>
                Log in to your admin account and seamlessly continue managing your projects,
                ideas, and progress just where you left off.
              </p>
            </div>

            <Form
              name="adminLogin"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
            >
              {/* Email */}
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
                style={{ marginBottom: '16px' }}
              >
                <div>
                  <label className="glass-field-label">Email address</label>
                  <div className="glass-input-wrapper">
                    <div className="glass-input-icon">
                      <MailOutlined />
                    </div>
                    <Input
                      placeholder="Enter admin email"
                      prefix={null}
                      bordered={false}
                    />
                  </div>
                </div>
              </Form.Item>

              {/* Password */}
              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
                style={{ marginBottom: '16px' }}
              >
                <div>
                  <label className="glass-field-label">Password</label>
                  <div className="glass-input-wrapper">
                    <div className="glass-input-icon">
                      <LockOutlined />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter admin password"
                      prefix={null}
                      bordered={false}
                    />
                    <button
                      type="button"
                      className="glass-input-action"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                    </button>
                  </div>
                </div>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <button
                  type="submit"
                  className="glass-primary-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Log in'}
                </button>
              </Form.Item>
            </Form>

            <div className="glass-card-footer">
              Regular user?
              <Link to="/login">Sign in as user</Link>
            </div>
          </div>
        </div>
      </div>
    </App>
  )
}

export default AdminLoginPage
