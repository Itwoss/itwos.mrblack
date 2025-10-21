import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Switch, Select, Upload, Avatar, message, Tabs, Row, Col, Typography, Divider, Space, Tag } from 'antd'
import { 
  SettingOutlined, 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  GlobalOutlined, 
  SecurityScanOutlined, 
  BellOutlined, 
  SaveOutlined, 
  UploadOutlined, 
  CameraOutlined,
  EditOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'

const { Title, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input
// const { TabPane } = Tabs // Not needed, using items prop

const Settings = () => {
  const [form] = Form.useForm()
  const [profileForm] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [notificationForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const { user, isAuthenticated, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    bio: '',
    location: '',
    website: ''
  })

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      console.log('🖼️ Settings: User changed, loading profile data:', user)
      
      // Ensure avatar URL is full URL
      const avatarUrl = user.avatarUrl || user.avatar || ''
      const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
        ? `http://localhost:7000${avatarUrl}` 
        : avatarUrl
      
      const newProfileData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: fullAvatarUrl,
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || ''
      }
      
      console.log('🖼️ Settings: Setting new profile data:', newProfileData)
      setProfileData(newProfileData)
    }
  }, [user])

  // Debug: Log when profileData changes (only in development)
  useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      console.log('🖼️ Settings: profileData changed:', profileData)
    }
  }, [profileData])

  // Update form when profileData changes
  useEffect(() => {
    if (profileData) {
      if (import.meta.env.MODE === 'development') {
        console.log('📝 Settings: Updating form with profileData:', profileData)
      }
      profileForm.setFieldsValue(profileData)
    }
  }, [profileData, profileForm])

  // Fetch user profile data from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && user._id) {
        try {
          if (import.meta.env.MODE === 'development') {
            console.log('📝 Settings: Fetching user profile from backend')
          }
          const response = await api.get('/users/me')
          if (response.data.success) {
            const userData = response.data.data
            
            // Update profileData with real user data
            const avatarUrl = userData.avatarUrl || userData.avatar || ''
            const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
              ? `http://localhost:7000${avatarUrl}` 
              : avatarUrl
            
            const newProfileData = {
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              avatar: fullAvatarUrl,
              bio: userData.bio || '',
              location: userData.location || '',
              website: userData.website || ''
            }
            
            if (import.meta.env.MODE === 'development') {
              console.log('📝 Settings: Setting real user profile data:', newProfileData)
            }
            setProfileData(newProfileData)
          }
        } catch (error) {
          console.error('📝 Settings: Error fetching user profile:', error)
        }
      }
    }
    
    fetchUserProfile()
  }, [user])

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginNotifications: true,
    sessionTimeout: 30,
    passwordExpiry: 90
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    orderUpdates: true,
    priceAlerts: true,
    newProducts: true,
    securityAlerts: true
  })

  const handleProfileUpdate = async (values) => {
    setProfileLoading(true)
    try {
      console.log('📝 Settings: Updating profile with values:', values)
      const response = await api.put('/users/me', values)
      console.log('📝 Settings: Profile update response:', response.data)
      
      if (response.data.success) {
        setProfileData(prev => ({ ...prev, ...values }))
        
        // Update user context
        if (user && updateUser) {
          const updatedUser = { ...user, ...values }
          updateUser(updatedUser)
          console.log('📝 Settings: Updated user context:', updatedUser)
        }
        
        message.success('Profile updated successfully')
      } else {
        message.error(response.data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      message.error('Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSecurityUpdate = async (values) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSecuritySettings(prev => ({ ...prev, ...values }))
      message.success('Security settings updated successfully')
    } catch (error) {
      message.error('Failed to update security settings')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async (values) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setNotificationSettings(prev => ({ ...prev, ...values }))
      message.success('Notification settings updated successfully')
    } catch (error) {
      message.error('Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (values) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('Password changed successfully')
      securityForm.resetFields()
    } catch (error) {
      message.error('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (info) => {
    console.log('Avatar upload info:', info) // Debug log
    if (info.file.status === 'done') {
      const uploadedUrl = info.file.response?.url || info.file.response?.data?.url
      console.log('Uploaded URL:', uploadedUrl) // Debug log
      if (uploadedUrl) {
        // Construct full URL for display
        const fullAvatarUrl = uploadedUrl.startsWith('http') 
          ? uploadedUrl 
          : `http://localhost:7000${uploadedUrl}`
        
        console.log('🖼️ Settings: Updating profileData with new avatar:', fullAvatarUrl)
        
        // Update profileData immediately for instant display
        setProfileData(prev => ({ ...prev, avatar: fullAvatarUrl }))
        
        // Save avatar URL to backend
        try {
          console.log('Saving avatar URL to backend:', fullAvatarUrl)
          
          const response = await api.put('/users/me', { avatarUrl: fullAvatarUrl })
          console.log('🖼️ Settings: Backend response:', response.data)
          
          if (response.data.success) {
            message.success('Avatar updated successfully')
            
            // Update the user context to persist the change
            if (user && updateUser) {
              const updatedUser = { ...user, avatarUrl: fullAvatarUrl }
              console.log('🖼️ Settings: Updating user context with:', updatedUser)
              updateUser(updatedUser)
              console.log('Updated user with new avatar:', updatedUser)
            }
          } else {
            message.error('Failed to save avatar to profile')
          }
        } catch (error) {
          console.error('Failed to save avatar:', error)
          message.error('Failed to save avatar to profile')
        }
      } else {
        message.error('Failed to get uploaded image URL')
      }
    } else if (info.file.status === 'error') {
      message.error('Avatar upload failed')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem', color: '#1890ff' }}>
            <SettingOutlined style={{ marginRight: '8px' }} />
            Settings
          </Title>
          <Paragraph style={{ fontSize: '16px', color: '#666' }}>
            Manage your account settings, security preferences, and notifications.
          </Paragraph>
        </div>

        {/* Settings Tabs */}
        <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Tabs 
            defaultActiveKey="profile"
            size="large"
            style={{ minHeight: '600px' }}
            items={[
              {
                key: 'profile',
                label: (
                  <span>
                    <UserOutlined />
                    Profile
                  </span>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={8}>
                      <Card title="Profile Picture" size="small" style={{ borderRadius: '8px' }}>
                        <div style={{ textAlign: 'center' }}>
                          {profileData.avatar ? (
                            <div style={{ position: 'relative' }}>
                              <img
                                key={`avatar-${profileData.avatar}-${Date.now()}`} // Force re-render with timestamp
                                src={profileData.avatar}
                                alt="User Avatar"
                                style={{
                                  width: 120,
                                  height: 120,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginBottom: 16,
                                  display: 'block',
                                  margin: '0 auto 16px auto',
                                  border: '2px solid #f0f0f0',
                                  backgroundColor: '#f5f5f5'
                                }}
                                onError={(e) => {
                                  console.log('🖼️ Image load error:', e)
                                  console.log('🖼️ Image src was:', profileData.avatar)
                                  console.log('🖼️ Error details:', e.target.error)
                                  // Show error message instead of hiding
                                  e.target.style.display = 'none'
                                  const errorDiv = document.createElement('div')
                                  errorDiv.innerHTML = '❌ Image failed to load'
                                  errorDiv.style.cssText = 'color: red; font-size: 12px; text-align: center;'
                                  e.target.parentNode.appendChild(errorDiv)
                                }}
                                onLoad={() => {
                                  console.log('🖼️ Image loaded successfully:', profileData.avatar)
                                }}
                                crossOrigin="anonymous" // Allow cross-origin loading
                              />
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <Avatar 
                                size={120} 
                                icon={<UserOutlined />}
                                style={{ marginBottom: 16 }}
                              />
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                No avatar set
                              </div>
                            </div>
                          )}
                          <div>
                            <Upload
                              name="avatar"
                              listType="picture-card"
                              showUploadList={false}
                              action="http://localhost:7000/api/upload/avatar"
                              onChange={handleAvatarUpload}
                              customRequest={async ({ file, onSuccess, onError, onProgress }) => {
                                try {
                                  console.log('Starting avatar upload:', file.name)
                                  const formData = new FormData()
                                  formData.append('avatar', file)
                                  
                                  // Simulate progress
                                  onProgress({ percent: 10 })
                                  
                                  const response = await fetch('http://localhost:7000/api/upload/avatar', {
                                    method: 'POST',
                                    body: formData,
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('accessToken')}`
                                    }
                                  })
                                  
                                  const data = await response.json()
                                  console.log('Upload response:', data)
                                  
                                  if (data.success) {
                                    onProgress({ percent: 100 })
                                    onSuccess({ url: data.url })
                                  } else {
                                    onError(new Error(data.message || 'Upload failed'))
                                  }
                                } catch (error) {
                                  console.error('Upload error:', error)
                                  onError(error)
                                }
                              }}
                            >
                              <Button icon={<CameraOutlined />}>Change Avatar</Button>
                            </Upload>
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} lg={16}>
                      <Card title="Profile Information" size="small" style={{ borderRadius: '8px' }}>
                        <Form
                          form={profileForm}
                          layout="vertical"
                          initialValues={profileData}
                          onFinish={handleProfileUpdate}
                        >
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                name="name"
                                label="Full Name"
                                rules={[{ required: true, message: 'Please enter your name' }]}
                              >
                                <Input prefix={<UserOutlined />} placeholder="Enter your name" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="email"
                                label="Email"
                                rules={[{ required: true, message: 'Please enter your email' }]}
                              >
                                <Input prefix={<MailOutlined />} placeholder="Enter your email" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item
                                name="phone"
                                label="Phone"
                              >
                                <Input prefix={<PhoneOutlined />} placeholder="Enter your phone" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="location"
                                label="Location"
                              >
                                <Input placeholder="Enter your location" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Form.Item
                            name="website"
                            label="Website"
                          >
                            <Input prefix={<GlobalOutlined />} placeholder="Enter your website" />
                          </Form.Item>

                          <Form.Item
                            name="bio"
                            label="Bio"
                          >
                            <TextArea rows={3} placeholder="Tell us about yourself" />
                          </Form.Item>

                          <Form.Item>
                            <Button type="primary" htmlType="submit" loading={profileLoading} icon={<SaveOutlined />}>
                              Update Profile
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                )
              },

              {
                key: 'security',
                label: (
                  <span>
                    <LockOutlined />
                    Security
                  </span>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                      <Card title="Change Password" size="small" style={{ borderRadius: '8px' }}>
                        <Form
                          form={securityForm}
                          layout="vertical"
                          onFinish={handlePasswordChange}
                        >
                          <Form.Item
                            name="currentPassword"
                            label="Current Password"
                            rules={[{ required: true, message: 'Please enter current password' }]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" />
                          </Form.Item>

                          <Form.Item
                            name="newPassword"
                            label="New Password"
                            rules={[{ required: true, message: 'Please enter new password' }]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" />
                          </Form.Item>

                          <Form.Item
                            name="confirmPassword"
                            label="Confirm New Password"
                            rules={[{ required: true, message: 'Please confirm new password' }]}
                          >
                            <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
                          </Form.Item>

                          <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<LockOutlined />}>
                              Change Password
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="Security Settings" size="small" style={{ borderRadius: '8px' }}>
                        <Form
                          form={securityForm}
                          layout="vertical"
                          initialValues={securitySettings}
                          onFinish={handleSecurityUpdate}
                        >
                          <Form.Item
                            name="twoFactorAuth"
                            label="Two-Factor Authentication"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="loginNotifications"
                            label="Login Notifications"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="sessionTimeout"
                            label="Session Timeout (minutes)"
                          >
                            <Input type="number" placeholder="30" />
                          </Form.Item>

                          <Form.Item
                            name="passwordExpiry"
                            label="Password Expiry (days)"
                          >
                            <Input type="number" placeholder="90" />
                          </Form.Item>

                          <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<SecurityScanOutlined />}>
                              Update Security Settings
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                )
              },

              {
                key: 'notifications',
                label: (
                  <span>
                    <BellOutlined />
                    Notifications
                  </span>
                ),
                children: (
                  <Card title="Notification Preferences" size="small" style={{ borderRadius: '8px' }}>
                    <Form
                      form={notificationForm}
                      layout="vertical"
                      initialValues={notificationSettings}
                      onFinish={handleNotificationUpdate}
                    >
                      <Row gutter={[24, 24]}>
                        <Col xs={24} sm={12}>
                          <h4>Email Notifications</h4>
                          <Form.Item
                            name="emailNotifications"
                            label="Email Notifications"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="marketingEmails"
                            label="Marketing Emails"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="orderUpdates"
                            label="Order Updates"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="priceAlerts"
                            label="Price Alerts"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <h4>Other Notifications</h4>
                          <Form.Item
                            name="pushNotifications"
                            label="Push Notifications"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="smsNotifications"
                            label="SMS Notifications"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="newProducts"
                            label="New Products"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>

                          <Form.Item
                            name="securityAlerts"
                            label="Security Alerts"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Divider />

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} icon={<BellOutlined />}>
                          Update Notification Settings
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },

              {
                key: 'account',
                label: (
                  <span>
                    <UserOutlined />
                    Account
                  </span>
                ),
                children: (
                  <Card title="Account Management" size="small" style={{ borderRadius: '8px' }}>
                    <Row gutter={[24, 24]}>
                      <Col xs={24} sm={12}>
                        <h4>Account Information</h4>
                        <div style={{ marginBottom: 16 }}>
                          <p><strong>Account Type:</strong> Premium User</p>
                          <p><strong>Member Since:</strong> January 2024</p>
                          <p><strong>Last Login:</strong> Today, 10:30 AM</p>
                          <p><strong>Account Status:</strong> <Tag color="green">Active</Tag></p>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <h4>Quick Actions</h4>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Button icon={<EditOutlined />} block>
                            Edit Profile
                          </Button>
                          <Button icon={<BellOutlined />} block>
                            Notification Settings
                          </Button>
                          <Button icon={<SecurityScanOutlined />} block>
                            Security Settings
                          </Button>
                          <Button danger icon={<LogoutOutlined />} block onClick={handleLogout}>
                            Logout
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                )
              }
            ]}
          />
        </Card>
      </div>
  )
}

export default Settings




