import React, { useState, useEffect } from 'react'
import { Form, Input, Typography, App } from 'antd'
import { MailOutlined, LockOutlined, GoogleOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import '../../styles/glass-login.css'

const { Text } = Typography

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isFacebookLoading, setIsFacebookLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login, googleLogin, isAuthenticated, user } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/feed'

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
      const result = await login(values)
      
      if (result.success) {
        message.success('Login successful!')
        const redirectPath = result.redirectTo || from
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
      const result = await googleLogin()
      
      if (result.success) {
        message.success('Google login successful!')
        const redirectPath = result.redirectTo || from
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

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true)
    try {
      message.info('Facebook login coming soon!')
    } catch (error) {
      console.error('❌ Facebook login error:', error)
      message.error('Facebook login failed')
    } finally {
      setIsFacebookLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setIsAppleLoading(true)
    try {
      message.info('Apple login coming soon!')
    } catch (error) {
      console.error('❌ Apple login error:', error)
      message.error('Apple login failed')
    } finally {
      setIsAppleLoading(false)
    }
  }

  return (
    <App>
      <div className="glass-login-wrapper">
        <div className="glass-login-container">
          <div className="glass-card">
            <div className="glass-card-header">
              <h1>Log in</h1>
              <p>
                Log in to your account and seamlessly continue managing your projects,
                ideas, and progress just where you left off.
              </p>
            </div>

            <Form
              name="login"
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
                      placeholder="Enter your email address"
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
                      placeholder="Enter your password"
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
                  disabled={isLoading || isGoogleLoading || isFacebookLoading || isAppleLoading}
                >
                  {isLoading ? 'Logging in...' : 'Log in'}
                </button>
              </Form.Item>
            </Form>

            <div className="glass-divider">or continue with</div>

            <div className="glass-social-row">
              <button
                className="glass-social-btn"
                type="button"
                onClick={handleFacebookLogin}
                disabled={isLoading || isGoogleLoading || isFacebookLoading || isAppleLoading}
              >
                <span className="glass-social-icon"><span>f</span></span>
                Facebook
              </button>
              <button
                className="glass-social-btn"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading || isFacebookLoading || isAppleLoading}
              >
                <span className="glass-social-icon"><span>G</span></span>
                Google
              </button>
              <button
                className="glass-social-btn"
                type="button"
                onClick={handleAppleLogin}
                disabled={isLoading || isGoogleLoading || isFacebookLoading || isAppleLoading}
              >
                <span className="glass-social-icon"><span>🍎</span></span>
                Apple
              </button>
            </div>

            <div className="glass-card-footer">
              Didn't have an account?
              <Link to="/register">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </App>
  )
}

export default LoginPage
