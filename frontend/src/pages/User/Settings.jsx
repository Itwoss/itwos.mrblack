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
  LogoutOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import ImageEditor from '../../components/ImageEditor'

const { Title, Paragraph, Text } = Typography
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
  const [uploading, setUploading] = useState(false)
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
  const [isPrivate, setIsPrivate] = useState(false)
  const [isActiveStatusVisible, setIsActiveStatusVisible] = useState(true)
  const [imageEditorVisible, setImageEditorVisible] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState(null)

  // Debug: Log when component renders
  useEffect(() => {
    console.log('🔍 Settings: Component rendered, isActiveStatusVisible:', isActiveStatusVisible)
  }, [isActiveStatusVisible])

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
      setIsPrivate(user.isPrivate || false)
    }
  }, [user])

  // Debug: Log when profileData changes (only in development)
  useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      console.log('🖼️ Settings: profileData changed:', profileData)
    }
  }, [profileData])

  // Update form only when user data initially loads (not on every profileData change)
  // This prevents overwriting user input while typing
  useEffect(() => {
    if (user && profileForm) {
      const initialValues = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        website: user.website || '',
        bio: user.bio || ''
      }
      
      // Only set initial values if form is empty or user ID changed
      const currentValues = profileForm.getFieldsValue()
      const isFormEmpty = !currentValues.name && !currentValues.email
      
      if (isFormEmpty || currentValues.name !== initialValues.name) {
        profileForm.setFieldsValue(initialValues)
      }
    }
  }, [user?._id, profileForm]) // Only update when user ID changes

  // Fetch user profile data from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && user._id) {
        try {
          if (import.meta.env.MODE === 'development') {
            console.log('📝 Settings: Fetching user profile from backend')
          }
          const response = await api.get('/users/me')
          
          // Check if response and data exist
          if (response && response.data && response.data.success && response.data.data) {
            const userData = response.data.data
            
            // Safely get avatar URL with fallbacks
            const avatarUrl = (userData && (userData.avatarUrl || userData.avatar)) || ''
            const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
              ? `http://localhost:7000${avatarUrl}` 
              : avatarUrl
            
            const newProfileData = {
              name: (userData && userData.name) || '',
              email: (userData && userData.email) || '',
              phone: (userData && userData.phone) || '',
              avatar: fullAvatarUrl,
              bio: (userData && userData.bio) || '',
              location: (userData && userData.location) || '',
              website: (userData && userData.website) || ''
            }
            
            if (import.meta.env.MODE === 'development') {
              console.log('📝 Settings: Setting real user profile data:', newProfileData)
            }
            setProfileData(newProfileData)
            
            // Set active status visibility from user data (default to true if not set)
            const activeStatus = userData && userData.activeStatusVisible !== false
            setIsActiveStatusVisible(activeStatus)
            
            // Also update user context immediately
            if (updateUser) {
              updateUser({ activeStatusVisible: activeStatus })
            }
          } else {
            // Fallback to user data from context if API response is invalid
            console.warn('📝 Settings: Invalid API response, using user context data')
            if (user) {
              const avatarUrl = user.avatarUrl || user.avatar || ''
              const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
                ? `http://localhost:7000${avatarUrl}` 
                : avatarUrl
              
              setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                avatar: fullAvatarUrl,
                bio: user.bio || '',
                location: user.location || '',
                website: user.website || ''
              })
              
              if (user.activeStatusVisible !== undefined) {
                setIsActiveStatusVisible(user.activeStatusVisible !== false)
              }
            }
          }
        } catch (error) {
          // Don't treat aborted requests as errors (they're cancelled intentionally)
          if (error.code === 'ECONNABORTED' || error.message === 'Request aborted' || error.name === 'CanceledError') {
            console.log('📝 Settings: Request was cancelled (this is normal):', error.message)
            // Don't log as error or show error state for cancelled requests
            return
          }
          
          console.error('📝 Settings: Error fetching user profile:', error)
          
          // Fallback to user data from context on error
          if (user) {
            console.log('📝 Settings: Using user context data as fallback')
            const avatarUrl = user.avatarUrl || user.avatar || ''
            const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
              ? `http://localhost:7000${avatarUrl}` 
              : avatarUrl
            
            setProfileData({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              avatar: fullAvatarUrl,
              bio: user.bio || '',
              location: user.location || '',
              website: user.website || ''
            })
            
            if (user.activeStatusVisible !== undefined) {
              setIsActiveStatusVisible(user.activeStatusVisible !== false)
            }
          }
        }
      }
    }
    
    fetchUserProfile()
  }, [user, updateUser])

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
      
      // Clean up values - remove empty strings and convert to null/undefined
      const cleanedValues = {}
      Object.keys(values).forEach(key => {
        const value = values[key]
        // Skip email as it shouldn't be updated via profile update
        if (key === 'email') return
        
        // Convert empty strings to null for optional fields
        if (value === '' || value === null || value === undefined) {
          // Only include if it's a field that can be cleared (like avatarUrl, bio, etc.)
          if (['avatarUrl', 'bio', 'phone', 'location', 'website', 'company', 'jobTitle'].includes(key)) {
            cleanedValues[key] = null
          }
        } else {
          cleanedValues[key] = value
        }
      })
      
      console.log('📝 Settings: Cleaned values being sent:', cleanedValues)
      
      const response = await api.put('/users/me', cleanedValues)
      console.log('📝 Settings: Profile update response:', response.data)
      
      if (response.data.success) {
        setProfileData(prev => ({ ...prev, ...cleanedValues }))
        
        // Update user context
        if (user && updateUser) {
          const updatedUser = { ...user, ...cleanedValues }
          updateUser(updatedUser)
          console.log('📝 Settings: Updated user context:', updatedUser)
        }
        
        message.success('Profile updated successfully')
      } else {
        message.error(response.data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('📝 Settings: Profile update error:', error)
      console.error('📝 Settings: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      
      if (error.response?.status === 401) {
        message.error('Authentication failed. Please login again.')
      } else if (error.response?.status === 403) {
        message.error('Access denied. You do not have permission to update this profile.')
      } else if (error.response?.status === 400) {
        // Handle validation errors
        const errorData = error.response.data
        if (errorData?.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(err => err.message || err.msg || err.msg).join(', ')
          message.error(`Validation failed: ${errorMessages}`)
        } else {
          message.error(errorData?.message || 'Invalid data provided. Please check your input.')
        }
      } else if (error.response?.status === 404) {
        message.error('User not found. Please login again.')
      } else if (error.response?.status === 500) {
        message.error('Server error. Please try again later.')
      } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message.error('Cannot connect to server. Please check your connection.')
      } else {
        const errorMsg = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.'
        message.error(errorMsg)
      }
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

  const handleImageSelect = (file) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      message.error('You can only upload image files!')
      return false
    }
    
    // Check file size (5MB limit)
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!')
      return false
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setSelectedImageFile(file)
    setSelectedImagePreview(previewUrl)
    setImageEditorVisible(true)
    
    return false // Prevent default upload
  }

  const handleImageEditorSave = async (editedFile, previewUrl) => {
    try {
      setImageEditorVisible(false)
      setUploading(true)
      
      // Upload the edited image
      const formData = new FormData()
      formData.append('avatar', editedFile)
      
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
      if (!token) {
        throw new Error('Authentication required. Please login again.')
      }
      
      const response = await fetch('http://localhost:7000/api/upload/avatar', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        const uploadedUrl = data.url || data.data?.url
        const fullAvatarUrl = uploadedUrl.startsWith('http') 
          ? uploadedUrl 
          : `http://localhost:7000${uploadedUrl}`
        
        // Update profileData immediately for instant display
        setProfileData(prev => ({ ...prev, avatar: fullAvatarUrl }))
        
        // Save avatar URL to backend
        const updateResponse = await api.put('/users/me', { avatarUrl: fullAvatarUrl })
        
        if (updateResponse.data.success) {
          message.success('Avatar updated successfully')
          
          // Update the user context to persist the change
          if (user && updateUser) {
            const updatedUser = { ...user, avatarUrl: fullAvatarUrl }
            updateUser(updatedUser)
          }
        } else {
          message.error(updateResponse.data.message || 'Failed to save avatar to profile')
        }
      } else {
        throw new Error(data.message || 'Upload failed')
      }
    } catch (error) {
      console.error('❌ Failed to upload edited avatar:', error)
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload avatar'
      message.error(errorMsg)
    } finally {
      setUploading(false)
      // Clean up preview URL
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview)
      }
      setSelectedImageFile(null)
      setSelectedImagePreview(null)
    }
  }

  const handleImageEditorCancel = () => {
    setImageEditorVisible(false)
    // Clean up preview URL
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview)
    }
    setSelectedImageFile(null)
    setSelectedImagePreview(null)
  }

  const handleAvatarUpload = async (info) => {
    // Legacy handler - kept for backward compatibility
    console.log('Avatar upload info:', info)
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
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img
                                key={`avatar-${profileData.avatar}`}
                                src={profileData.avatar}
                                alt="User Avatar"
                                style={{
                                  width: 120,
                                  height: 120,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginBottom: 16,
                                  display: 'block',
                                  border: '2px solid #f0f0f0',
                                  backgroundColor: '#f5f5f5'
                                }}
                                onError={(e) => {
                                  console.log('🖼️ Image load error:', e)
                                  e.target.style.display = 'none'
                                  const errorDiv = document.createElement('div')
                                  errorDiv.innerHTML = '❌ Image failed to load'
                                  errorDiv.style.cssText = 'color: red; font-size: 12px; text-align: center;'
                                  e.target.parentNode.appendChild(errorDiv)
                                }}
                                crossOrigin="anonymous"
                              />
                              <div style={{ marginTop: '8px' }}>
                                <Button 
                                  icon={<EditOutlined />} 
                                  type="primary"
                                  onClick={async () => {
                                    try {
                                      // Fetch the existing image
                                      const response = await fetch(profileData.avatar, { mode: 'cors' })
                                      if (!response.ok) {
                                        throw new Error('Failed to load image')
                                      }
                                      const blob = await response.blob()
                                      const file = new File([blob], 'current-avatar.jpg', { type: blob.type })
                                      const previewUrl = URL.createObjectURL(file)
                                      setSelectedImageFile(file)
                                      setSelectedImagePreview(previewUrl)
                                      setImageEditorVisible(true)
                                    } catch (error) {
                                      console.error('Error loading existing avatar:', error)
                                      message.error('Failed to load image for editing')
                                    }
                                  }}
                                  loading={uploading}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <Avatar 
                                size={120} 
                                icon={<UserOutlined />}
                                style={{ marginBottom: 16 }}
                              />
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                No avatar set
                              </div>
                            </div>
                          )}
                          <div style={{ marginTop: profileData.avatar ? '8px' : '0' }}>
                            <Upload
                              name="avatar"
                              listType="picture-card"
                              showUploadList={false}
                              beforeUpload={handleImageSelect}
                              accept="image/*"
                            >
                              <Button icon={<CameraOutlined />} loading={uploading}>
                                {uploading ? 'Uploading...' : profileData.avatar ? 'Change' : 'Upload Avatar'}
                              </Button>
                            </Upload>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                              {profileData.avatar ? 'Click to upload a new image' : 'Click to select and edit your profile image'}
                            </div>
                          </div>
                          
                          {/* Image Editor Modal */}
                          <ImageEditor
                            visible={imageEditorVisible}
                            imageSrc={selectedImagePreview}
                            onCancel={handleImageEditorCancel}
                            onSave={handleImageEditorSave}
                            aspect={1}
                            circularCrop={true}
                          />
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
                              >
                                <Input 
                                  prefix={<MailOutlined />} 
                                  placeholder="Enter your email" 
                                  disabled
                                  style={{ cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                                />
                              </Form.Item>
                              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '-16px', marginBottom: '16px' }}>
                                Email cannot be changed here. Contact support to change your email.
                              </Text>
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

                          <Divider />

                          <Form.Item
                            label={
                              <Space>
                                <LockOutlined />
                                <span>Account Privacy</span>
                              </Space>
                            }
                            help={
                              isPrivate 
                                ? "Your profile is private. Users need to request to follow you to see your content."
                                : "Your profile is public. Anyone can see your content."
                            }
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Switch
                                checked={isPrivate}
                                onChange={async (checked) => {
                                  setIsPrivate(checked)
                                  try {
                                    const response = await api.put('/users/me', { isPrivate: checked })
                                    if (response.data.success) {
                                      message.success(checked ? 'Account set to private' : 'Account set to public')
                                      if (updateUser) {
                                        updateUser({ ...user, isPrivate: checked })
                                      }
                                    } else {
                                      message.error('Failed to update privacy settings')
                                      setIsPrivate(!checked) // Revert on error
                                    }
                                  } catch (error) {
                                    console.error('Privacy update error:', error)
                                    message.error('Failed to update privacy settings')
                                    setIsPrivate(!checked) // Revert on error
                                  }
                                }}
                                checkedChildren="Private"
                                unCheckedChildren="Public"
                              />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {isPrivate 
                                  ? "🔒 Only approved followers can see your posts and profile details"
                                  : "🌐 Everyone can see your profile and posts"}
                              </Text>
                            </Space>
                          </Form.Item>

                          <Divider />

                          <Form.Item
                            label={
                              <Space>
                                <CheckCircleOutlined />
                                <span>Activity Status</span>
                              </Space>
                            }
                            help="Control whether others can see when you're online"
                          >
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                backgroundColor: '#fafafa',
                                borderRadius: '6px',
                                border: '1px solid #e8e8e8'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <Text strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                                    Show Active Status
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '12px', color: '#666' }}>
                                    {isActiveStatusVisible 
                                      ? 'Others can see when you\'re online' 
                                      : 'Your activity status is hidden'}
                                  </Text>
                                </div>
                              <Switch
                                checked={isActiveStatusVisible}
                                onChange={async (checked) => {
                                  // Update UI immediately (0 delay)
                                  setIsActiveStatusVisible(checked)
                                  
                                  // Update user context immediately
                                  if (updateUser) {
                                    updateUser({ activeStatusVisible: checked })
                                  }
                                  
                                  // Save to backend (async, no blocking)
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
                                }}
                                checkedChildren="ON"
                                unCheckedChildren="OFF"
                                style={{ minWidth: '50px', marginLeft: '16px' }}
                              />
                              </div>
                            </Space>
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
                  <div style={{ width: '100%' }}>
                    {/* Activity Status Toggle - Prominent at Top */}
                    <div style={{
                      backgroundColor: '#e6f7ff',
                      border: '3px solid #1890ff',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '24px',
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
                      width: '100%',
                      display: 'block'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            marginBottom: '8px'
                          }}>
                            <CheckCircleOutlined style={{
                              color: isActiveStatusVisible ? '#52c41a' : '#999',
                              fontSize: '24px',
                              fontWeight: 'bold'
                            }} />
                            <Text strong style={{ fontSize: '18px', fontWeight: '700', color: '#1890ff' }}>
                              Show Active Status
                            </Text>
                            <Tag color={isActiveStatusVisible ? 'green' : 'default'} style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', padding: '4px 10px' }}>
                              {isActiveStatusVisible ? 'ON' : 'OFF'}
                            </Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: '14px', color: '#666', display: 'block', marginLeft: '36px' }}>
                            {isActiveStatusVisible 
                              ? 'Others can see when you\'re online' 
                              : 'Your activity status is hidden'}
                          </Text>
                        </div>
                        <Switch
                          checked={isActiveStatusVisible}
                          onChange={async (checked) => {
                            console.log('🔍 Toggle clicked:', checked)
                            setIsActiveStatusVisible(checked)
                            if (updateUser) {
                              updateUser({ activeStatusVisible: checked })
                            }
                            try {
                              const response = await api.put('/users/me', { activeStatusVisible: checked })
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
                              setIsActiveStatusVisible(!checked)
                              if (updateUser) {
                                updateUser({ activeStatusVisible: !checked })
                              }
                              const errorMsg = error.response?.data?.message || error.message || 'Failed to update active status'
                              message.error(errorMsg)
                            }
                          }}
                          style={{ minWidth: '60px', marginLeft: '20px' }}
                          checkedChildren="ON"
                          unCheckedChildren="OFF"
                        />
                      </div>
                    </div>

                    <Card title="Account Management" size="small" style={{ borderRadius: '8px' }}>
                      <Row gutter={[24, 24]}>
                      <Col xs={24} sm={12}>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Account Information</h4>
                        <div style={{ marginBottom: '24px' }}>
                          <p style={{ marginBottom: '8px' }}><strong>Account Type:</strong> Premium User</p>
                          <p style={{ marginBottom: '8px' }}><strong>Member Since:</strong> January 2024</p>
                          <p style={{ marginBottom: '8px' }}><strong>Last Login:</strong> Today, 10:30 AM</p>
                          <p style={{ marginBottom: '8px' }}><strong>Account Status:</strong> <Tag color="green">Active</Tag></p>
                        </div>
                        
                        <Divider style={{ margin: '24px 0' }} />
                        
                        <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#333' }}>Privacy Settings</h4>
                        
                        {/* Activity Status Toggle - Always Visible */}
                        <Card 
                          size="small"
                          style={{ 
                            borderRadius: '8px',
                            backgroundColor: '#fafafa',
                            border: '2px solid #e8e8e8',
                            marginBottom: '16px',
                            padding: '12px'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            width: '100%'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                marginBottom: '6px'
                              }}>
                                <CheckCircleOutlined style={{
                                  color: isActiveStatusVisible ? '#52c41a' : '#999',
                                  fontSize: '18px'
                                }} />
                                <Text strong style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>
                                  Show Active Status
                                </Text>
                                <Tag color={isActiveStatusVisible ? 'green' : 'default'} style={{ margin: 0, fontSize: '11px', fontWeight: 'bold' }}>
                                  {isActiveStatusVisible ? 'ON' : 'OFF'}
                                </Tag>
                              </div>
                              <Text type="secondary" style={{ fontSize: '12px', color: '#666', display: 'block', marginLeft: '26px' }}>
                                {isActiveStatusVisible 
                                  ? 'Others can see when you\'re online' 
                                  : 'Your activity status is hidden'}
                              </Text>
                            </div>
                            <Switch
                              checked={isActiveStatusVisible}
                              onChange={async (checked) => {
                                // Update UI immediately (0 delay)
                                setIsActiveStatusVisible(checked)
                                
                                // Update user context immediately
                                if (updateUser) {
                                  updateUser({ activeStatusVisible: checked })
                                }
                                
                                // Save to backend (async, no blocking)
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
                              }}
                              style={{ minWidth: '50px', marginLeft: '16px' }}
                              checkedChildren="ON"
                              unCheckedChildren="OFF"
                            />
                          </div>
                        </Card>
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
                  </div>
                )
              }
            ]}
          />
        </Card>
      </div>
  )
}

export default Settings




