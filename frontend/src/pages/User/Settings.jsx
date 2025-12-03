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
            const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'
            const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
              ? `${apiBaseUrl}${avatarUrl}` 
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
    <div style={{ 
      background: '#f5f7fa', 
      minHeight: '100vh',
      padding: '16px'
    }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <SettingOutlined style={{ fontSize: '18px', color: '#3b82f6' }} />
            <Title level={2} style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600,
              color: '#1e293b'
            }}>
              Settings
            </Title>
          </div>
          <Text style={{ fontSize: '12px', color: '#64748b' }}>
            Manage your account settings, security preferences, and notifications.
          </Text>
        </div>

        {/* Settings Tabs */}
        <Card style={{ 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          background: '#fff'
        }}>
          <Tabs 
            defaultActiveKey="profile"
            size="small"
            style={{ minHeight: '500px' }}
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
                  <Row gutter={[12, 12]}>
                    <Col xs={24} lg={8}>
                      <Card 
                        title={
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Profile Picture
                          </Text>
                        }
                        style={{ 
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#fff'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          {profileData.avatar ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <img
                                key={`avatar-${profileData.avatar}`}
                                src={profileData.avatar}
                                alt="User Avatar"
                                style={{
                                  width: 96,
                                  height: 96,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginBottom: '12px',
                                  display: 'block',
                                  border: '2px solid #e2e8f0',
                                  backgroundColor: '#f8fafc'
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
                                  size="small"
                                  onClick={async () => {
                                    try {
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
                                  style={{
                                    background: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    height: '28px',
                                    padding: '0 12px'
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center' }}>
                              <Avatar 
                                size={96} 
                                icon={<UserOutlined />}
                                style={{ marginBottom: '12px' }}
                              />
                              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
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
                              <Button 
                                icon={<CameraOutlined />} 
                                loading={uploading}
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
                                {uploading ? 'Uploading...' : profileData.avatar ? 'Change' : 'Upload Avatar'}
                              </Button>
                            </Upload>
                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
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
                      <Card 
                        title={
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Profile Information
                          </Text>
                        }
                        style={{ 
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#fff'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Form
                          form={profileForm}
                          layout="vertical"
                          initialValues={profileData}
                          onFinish={handleProfileUpdate}
                        >
                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item
                                name="name"
                                label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Full Name</Text>}
                                rules={[{ required: true, message: 'Please enter your name' }]}
                              >
                                <Input 
                                  prefix={<UserOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                                  placeholder="Enter your name"
                                  size="small"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="email"
                                label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Email</Text>}
                              >
                                <Input 
                                  prefix={<MailOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                                  placeholder="Enter your email" 
                                  disabled
                                  size="small"
                                  style={{ cursor: 'not-allowed', backgroundColor: '#f8fafc' }}
                                />
                              </Form.Item>
                              <Text style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '-12px', marginBottom: '12px' }}>
                                Email cannot be changed here. Contact support to change your email.
                              </Text>
                            </Col>
                          </Row>

                          <Row gutter={12}>
                            <Col span={12}>
                              <Form.Item
                                name="phone"
                                label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Phone</Text>}
                              >
                                <Input 
                                  prefix={<PhoneOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                                  placeholder="Enter your phone"
                                  size="small"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="location"
                                label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Location</Text>}
                              >
                                <Input placeholder="Enter your location" size="small" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Form.Item
                            name="website"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Website</Text>}
                          >
                            <Input 
                              prefix={<GlobalOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                              placeholder="Enter your website"
                              size="small"
                            />
                          </Form.Item>

                          <Form.Item
                            name="bio"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Bio</Text>}
                          >
                            <TextArea rows={3} placeholder="Tell us about yourself" size="small" />
                          </Form.Item>

                          <Divider style={{ margin: '12px 0' }} />

                          <Form.Item
                            label={
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LockOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                                <Text style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>
                                  Account Privacy
                                </Text>
                              </div>
                            }
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px',
                              background: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <div style={{ flex: 1 }}>
                                <Text style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                  {isPrivate 
                                    ? "🔒 Only approved followers can see your posts"
                                    : "🌐 Everyone can see your profile and posts"}
                                </Text>
                              </div>
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
                                      setIsPrivate(!checked)
                                    }
                                  } catch (error) {
                                    console.error('Privacy update error:', error)
                                    message.error('Failed to update privacy settings')
                                    setIsPrivate(!checked)
                                  }
                                }}
                                size="small"
                                checkedChildren="Private"
                                unCheckedChildren="Public"
                              />
                            </div>
                          </Form.Item>

                          <Divider style={{ margin: '12px 0' }} />

                          <Form.Item
                            label={
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircleOutlined style={{ fontSize: '14px', color: '#64748b' }} />
                                <Text style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500 }}>
                                  Activity Status
                                </Text>
                              </div>
                            }
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px',
                              background: isActiveStatusVisible ? '#f0fdf4' : '#f8fafc',
                              borderRadius: '6px',
                              border: `1px solid ${isActiveStatusVisible ? '#22c55e' : '#e2e8f0'}`
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <Text style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                                    Show Active Status
                                  </Text>
                                  <Tag 
                                    color={isActiveStatusVisible ? '#22c55e' : 'default'} 
                                    style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}
                                  >
                                    {isActiveStatusVisible ? 'ON' : 'OFF'}
                                  </Tag>
                                </div>
                                <Text style={{ fontSize: '11px', color: '#64748b' }}>
                                  {isActiveStatusVisible 
                                    ? 'Others can see when you\'re online' 
                                    : 'Your activity status is hidden'}
                                </Text>
                              </div>
                              <Switch
                                checked={isActiveStatusVisible}
                                onChange={async (checked) => {
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
                                }}
                                size="small"
                                checkedChildren="ON"
                                unCheckedChildren="OFF"
                              />
                            </div>
                          </Form.Item>

                          <Form.Item>
                            <Button 
                              type="primary" 
                              htmlType="submit" 
                              loading={profileLoading} 
                              icon={<SaveOutlined />}
                              size="small"
                              style={{
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0 16px'
                              }}
                            >
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
                  <Row gutter={[12, 12]}>
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Change Password
                          </Text>
                        }
                        style={{ 
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#fff'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Form
                          form={securityForm}
                          layout="vertical"
                          onFinish={handlePasswordChange}
                        >
                          <Form.Item
                            name="currentPassword"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Current Password</Text>}
                            rules={[{ required: true, message: 'Please enter current password' }]}
                          >
                            <Input.Password 
                              prefix={<LockOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                              placeholder="Enter current password"
                              size="small"
                            />
                          </Form.Item>

                          <Form.Item
                            name="newPassword"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>New Password</Text>}
                            rules={[{ required: true, message: 'Please enter new password' }]}
                          >
                            <Input.Password 
                              prefix={<LockOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                              placeholder="Enter new password"
                              size="small"
                            />
                          </Form.Item>

                          <Form.Item
                            name="confirmPassword"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Confirm New Password</Text>}
                            rules={[{ required: true, message: 'Please confirm new password' }]}
                          >
                            <Input.Password 
                              prefix={<LockOutlined style={{ color: '#64748b', fontSize: '14px' }} />} 
                              placeholder="Confirm new password"
                              size="small"
                            />
                          </Form.Item>

                          <Form.Item>
                            <Button 
                              type="primary" 
                              htmlType="submit" 
                              loading={loading} 
                              icon={<LockOutlined />}
                              size="small"
                              style={{
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0 16px'
                              }}
                            >
                              Change Password
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card 
                        title={
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            Security Settings
                          </Text>
                        }
                        style={{ 
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#fff'
                        }}
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Form
                          form={securityForm}
                          layout="vertical"
                          initialValues={securitySettings}
                          onFinish={handleSecurityUpdate}
                        >
                          <Form.Item
                            name="twoFactorAuth"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Two-Factor Authentication</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="loginNotifications"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Login Notifications</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="sessionTimeout"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Session Timeout (minutes)</Text>}
                          >
                            <Input type="number" placeholder="30" size="small" />
                          </Form.Item>

                          <Form.Item
                            name="passwordExpiry"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Password Expiry (days)</Text>}
                          >
                            <Input type="number" placeholder="90" size="small" />
                          </Form.Item>

                          <Form.Item>
                            <Button 
                              type="primary" 
                              htmlType="submit" 
                              loading={loading} 
                              icon={<SecurityScanOutlined />}
                              size="small"
                              style={{
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px',
                                padding: '0 16px'
                              }}
                            >
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
                  <Card 
                    title={
                      <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        Notification Preferences
                      </Text>
                    }
                    style={{ 
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#fff'
                    }}
                    bodyStyle={{ padding: '12px' }}
                  >
                    <Form
                      form={notificationForm}
                      layout="vertical"
                      initialValues={notificationSettings}
                      onFinish={handleNotificationUpdate}
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12}>
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                            Email Notifications
                          </Text>
                          <Form.Item
                            name="emailNotifications"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Email Notifications</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="marketingEmails"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Marketing Emails</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="orderUpdates"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Order Updates</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="priceAlerts"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Price Alerts</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                            Other Notifications
                          </Text>
                          <Form.Item
                            name="pushNotifications"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Push Notifications</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="smsNotifications"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>SMS Notifications</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="newProducts"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>New Products</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>

                          <Form.Item
                            name="securityAlerts"
                            label={<Text style={{ fontSize: '12px', color: '#1e293b' }}>Security Alerts</Text>}
                            valuePropName="checked"
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Divider style={{ margin: '12px 0' }} />

                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit" 
                          loading={loading} 
                          icon={<BellOutlined />}
                          size="small"
                          style={{
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            height: '32px',
                            padding: '0 16px'
                          }}
                        >
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
                    <Card 
                      title={
                        <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          Account Management
                        </Text>
                      }
                      style={{ 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#fff'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12}>
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                            Account Information
                          </Text>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <Text style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Account Type:</Text>
                              <Text style={{ fontSize: '12px', color: '#1e293b' }}>Premium User</Text>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <Text style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Member Since:</Text>
                              <Text style={{ fontSize: '12px', color: '#1e293b' }}>January 2024</Text>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <Text style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Last Login:</Text>
                              <Text style={{ fontSize: '12px', color: '#1e293b' }}>Today, 10:30 AM</Text>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <Text style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Account Status:</Text>
                              <Tag color="#22c55e" style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}>Active</Tag>
                            </div>
                          </div>
                          
                          <Divider style={{ margin: '12px 0' }} />
                          
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                            Activity Status
                          </Text>
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: isActiveStatusVisible ? '#f0fdf4' : '#f8fafc',
                            borderRadius: '6px',
                            border: `1px solid ${isActiveStatusVisible ? '#22c55e' : '#e2e8f0'}`
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <CheckCircleOutlined style={{
                                  color: isActiveStatusVisible ? '#22c55e' : '#94a3b8',
                                  fontSize: '14px'
                                }} />
                                <Text style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                                  Show Active Status
                                </Text>
                                <Tag 
                                  color={isActiveStatusVisible ? '#22c55e' : 'default'} 
                                  style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}
                                >
                                  {isActiveStatusVisible ? 'ON' : 'OFF'}
                                </Tag>
                              </div>
                              <Text style={{ fontSize: '11px', color: '#64748b', display: 'block', marginLeft: '20px' }}>
                                {isActiveStatusVisible 
                                  ? 'Others can see when you\'re online' 
                                  : 'Your activity status is hidden'}
                              </Text>
                            </div>
                            <Switch
                              checked={isActiveStatusVisible}
                              onChange={async (checked) => {
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
                              }}
                              size="small"
                              checkedChildren="ON"
                              unCheckedChildren="OFF"
                            />
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '12px' }}>
                            Quick Actions
                          </Text>
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Button 
                              icon={<EditOutlined />} 
                              block
                              size="small"
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px'
                              }}
                            >
                              Edit Profile
                            </Button>
                            <Button 
                              icon={<BellOutlined />} 
                              block
                              size="small"
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px'
                              }}
                            >
                              Notification Settings
                            </Button>
                            <Button 
                              icon={<SecurityScanOutlined />} 
                              block
                              size="small"
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px'
                              }}
                            >
                              Security Settings
                            </Button>
                            <Button 
                              danger 
                              icon={<LogoutOutlined />} 
                              block 
                              onClick={handleLogout}
                              size="small"
                              style={{
                                borderRadius: '6px',
                                fontSize: '12px',
                                height: '32px'
                              }}
                            >
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




