import React, { useState } from 'react'
import { Form, Input, Typography, App, Row, Col, Checkbox, Upload, Avatar, DatePicker, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CameraOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import '../../styles/glass-login.css'

const { Text } = Typography
const { TextArea } = Input

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const onFinish = async (values) => {
    setIsLoading(true)
    try {
      // Generate a public key for E2EE chat
      const publicKey = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Call real registration API
      const response = await fetch('http://localhost:7000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.fullName,
          email: values.email,
          password: values.password,
          publicKey: publicKey,
          phone: values.phone,
          bio: values.bio,
          avatarUrl: avatarUrl,
          dateOfBirth: values.dateOfBirth ? (values.dateOfBirth.format ? values.dateOfBirth.format('YYYY-MM-DD') : values.dateOfBirth) : null,
          location: values.location,
          interests: values.interests
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success('Registration successful! Welcome to ITWOS AI!')
        navigate('/login')
      } else {
        message.error(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      message.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (info) => {
    if (info.file.status === 'done') {
      setAvatarUrl(info.file.response.url)
      message.success('Avatar uploaded successfully!')
    } else if (info.file.status === 'error') {
      message.error('Avatar upload failed. Please try again.')
    }
  }

  const uploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    showUploadList: false,
    action: 'http://localhost:7000/api/upload/avatar',
    onChange: handleAvatarChange,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Image must be smaller than 5MB!');
        return false;
      }
      return true;
    },
    customRequest: ({ file, onSuccess, onError }) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      fetch('http://localhost:7000/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setAvatarUrl(data.url);
          onSuccess(data);
        } else {
          onError(new Error(data.message));
        }
      })
      .catch(error => {
        onError(error);
      });
    }
  }

  const handleGoogleRegister = () => {
    setIsGoogleLoading(true)
    message.info('Google registration coming soon!')
    setTimeout(() => setIsGoogleLoading(false), 1000)
  }

  return (
    <App>
      <div className="glass-login-wrapper">
        <div className="glass-login-container" style={{ maxWidth: '800px' }}>
          <div className="glass-card">
            <div className="glass-card-header">
              <h1>Sign up</h1>
              <p>
                Create your account and seamlessly start managing your projects,
                ideas, and progress.
              </p>
            </div>

            <Form
              form={form}
              name="register"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="fullName"
                    rules={[{ required: true, message: 'Please input your full name!' }]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Full Name</label>
                      <div className="glass-input-wrapper">
                        <div className="glass-input-icon">
                          <UserOutlined />
                        </div>
                        <Input
                          placeholder="Enter your full name"
                          prefix={null}
                          bordered={false}
                        />
                      </div>
                    </div>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
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
                          placeholder="Enter your email"
                          prefix={null}
                          bordered={false}
                        />
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    rules={[
                      { required: true, message: 'Please input your phone number!' },
                      { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number!' }
                    ]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Phone Number</label>
                      <div className="glass-input-wrapper">
                        <div className="glass-input-icon">
                          <PhoneOutlined />
                        </div>
                        <Input
                          placeholder="Enter your phone number"
                          prefix={null}
                          bordered={false}
                        />
                      </div>
                    </div>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="location"
                    rules={[{ required: true, message: 'Please input your location!' }]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Location</label>
                      <div className="glass-input-wrapper">
                        <div className="glass-input-icon">
                          <UserOutlined />
                        </div>
                        <Input
                          placeholder="Enter your city/country"
                          prefix={null}
                          bordered={false}
                        />
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="dateOfBirth"
                    rules={[{ required: true, message: 'Please select your date of birth!' }]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Date of Birth</label>
                      <DatePicker
                        placeholder="Select your date of birth"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="interests"
                    rules={[{ required: true, message: 'Please select your interests!' }]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Interests</label>
                      <Select
                        mode="multiple"
                        placeholder="Select your interests"
                        style={{ width: '100%' }}
                        options={[
                          { value: 'technology', label: 'Technology' },
                          { value: 'business', label: 'Business' },
                          { value: 'design', label: 'Design' },
                          { value: 'marketing', label: 'Marketing' },
                          { value: 'education', label: 'Education' },
                          { value: 'health', label: 'Health' },
                          { value: 'sports', label: 'Sports' },
                          { value: 'music', label: 'Music' },
                          { value: 'art', label: 'Art' },
                          { value: 'travel', label: 'Travel' }
                        ]}
                      />
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="bio"
                rules={[
                  { required: true, message: 'Please write a short bio!' },
                  { max: 500, message: 'Bio must be less than 500 characters!' }
                ]}
                style={{ marginBottom: '16px' }}
              >
                <div>
                  <label className="glass-field-label">Bio</label>
                  <TextArea
                    rows={4}
                    placeholder="Tell us about yourself..."
                    style={{ width: '100%' }}
                  />
                </div>
              </Form.Item>

              <Form.Item
                name="avatar"
                style={{ marginBottom: '16px' }}
              >
                <div>
                  <label className="glass-field-label">Profile Picture</label>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <Upload {...uploadProps}>
                      {avatarUrl ? (
                        <Avatar size={100} src={avatarUrl} />
                      ) : (
                        <div style={{ 
                          textAlign: 'center',
                          padding: '20px',
                          cursor: 'pointer'
                        }}>
                          <CameraOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                          <div style={{ marginTop: '8px', color: '#9ca3af' }}>Upload Photo</div>
                        </div>
                      )}
                    </Upload>
                  </div>
                </div>
              </Form.Item>

              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Please input your password!' },
                      { min: 6, message: 'Password must be at least 6 characters!' }
                    ]}
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
                          placeholder="Create a password"
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
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('Passwords do not match!'))
                        },
                      }),
                    ]}
                    style={{ marginBottom: '16px' }}
                  >
                    <div>
                      <label className="glass-field-label">Confirm Password</label>
                      <div className="glass-input-wrapper">
                        <div className="glass-input-icon">
                          <LockOutlined />
                        </div>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          prefix={null}
                          bordered={false}
                        />
                        <button
                          type="button"
                          className="glass-input-action"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label="Toggle password visibility"
                        >
                          {showConfirmPassword ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                        </button>
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="agreement"
                valuePropName="checked"
                rules={[
                  { 
                    validator: (_, value) => 
                      value ? Promise.resolve() : Promise.reject(new Error('Please accept the terms and conditions'))
                  }
                ]}
                style={{ marginBottom: '16px' }}
              >
                <Checkbox>
                  I agree to the{' '}
                  <Link to="/terms" style={{ color: '#60a5fa' }}>
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" style={{ color: '#60a5fa' }}>
                    Privacy Policy
                  </Link>
                </Checkbox>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <button
                  type="submit"
                  className="glass-primary-btn"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </Form.Item>
            </Form>

            <div className="glass-divider">or continue with</div>

            <div className="glass-social-row">
              <button
                className="glass-social-btn"
                type="button"
                onClick={handleGoogleRegister}
                disabled={isLoading || isGoogleLoading}
              >
                <span className="glass-social-icon"><span>G</span></span>
                Google
              </button>
            </div>

            <div className="glass-card-footer">
              Already have an account?
              <Link to="/login">Sign in here</Link>
            </div>
          </div>
        </div>
      </div>
    </App>
  )
}

export default RegisterPage
