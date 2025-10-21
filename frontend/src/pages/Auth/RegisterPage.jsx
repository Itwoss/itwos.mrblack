import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, Divider, message, Row, Col, Checkbox, Upload, Avatar, DatePicker, Select } from 'antd'
import { UserOutlined, LockOutlined, GoogleOutlined, MailOutlined, PhoneOutlined, CameraOutlined, EditOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [form] = Form.useForm()
  const navigate = useNavigate()

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
          dateOfBirth: values.dateOfBirth,
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
    } else if (info.file.status === 'uploading') {
      // Show upload progress if needed
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
    message.info('Google registration would be implemented here')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={24} sm={22} md={18} lg={14} xl={12}>
          <Card 
            style={{ 
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              borderRadius: '16px',
              border: 'none',
              margin: '0 auto'
            }}
            styles={{
              body: {
                padding: '1rem'
              }
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Title level={2} style={{ marginBottom: '0.5rem', color: '#1890ff' }}>
                🚀 Join ITWOS AI
              </Title>
              <Paragraph style={{ color: '#666', fontSize: '1.1rem' }}>
                Create your account and start your journey
              </Paragraph>
            </div>

            <Form
              form={form}
              name="register"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="fullName"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please input your full name!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                      placeholder="Enter your full name" 
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined style={{ color: '#1890ff' }} />} 
                      placeholder="Enter your email" 
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please input your phone number!' },
                      { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number!' }
                    ]}
                  >
                    <Input 
                      prefix={<PhoneOutlined style={{ color: '#1890ff' }} />} 
                      placeholder="Enter your phone number" 
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="location"
                    label="Location"
                    rules={[{ required: true, message: 'Please input your location!' }]}
                  >
                    <Input 
                      placeholder="Enter your city/country" 
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="dateOfBirth"
                    label="Date of Birth"
                    rules={[{ required: true, message: 'Please select your date of birth!' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%', borderRadius: '8px' }}
                      placeholder="Select your date of birth"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="interests"
                    label="Interests"
                    rules={[{ required: true, message: 'Please select your interests!' }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select your interests"
                      style={{ borderRadius: '8px' }}
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
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="bio"
                label="Bio"
                rules={[
                  { required: true, message: 'Please write a short bio!' },
                  { max: 500, message: 'Bio must be less than 500 characters!' }
                ]}
              >
                <TextArea 
                  rows={4}
                  placeholder="Tell us about yourself..."
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="avatar"
                label="Profile Picture"
              >
                <div style={{ textAlign: 'center' }}>
                  <Upload {...uploadProps}>
                    {avatarUrl ? (
                      <Avatar size={100} src={avatarUrl} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <CameraOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                        <div style={{ marginTop: '8px' }}>Upload Photo</div>
                      </div>
                    )}
                  </Upload>
                </div>
              </Form.Item>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please input your password!' },
                      { min: 6, message: 'Password must be at least 6 characters!' }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: '#1890ff' }} />} 
                      placeholder="Create a password" 
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
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
                  >
                    <Input.Password 
                      prefix={<LockOutlined style={{ color: '#1890ff' }} />} 
                      placeholder="Confirm password" 
                      style={{ borderRadius: '8px' }}
                    />
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
              >
                <Checkbox>
                  I agree to the{' '}
                  <Link to="/terms" style={{ color: '#1890ff' }}>
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" style={{ color: '#1890ff' }}>
                    Privacy Policy
                  </Link>
                </Checkbox>
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
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '1.5rem 0' }}>
              <Text style={{ color: '#999' }}>Or continue with</Text>
            </Divider>

            <Button
              icon={<GoogleOutlined />}
              onClick={handleGoogleRegister}
              disabled={isLoading}
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
              Continue with Google
            </Button>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Text style={{ color: '#666' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ 
                  color: '#1890ff',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}>
                  Sign in here
                </Link>
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RegisterPage