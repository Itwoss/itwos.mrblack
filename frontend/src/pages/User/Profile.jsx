import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Row, 
  Col, 
  Upload, 
  message, 
  Space,
  Divider,
  Tag,
  DatePicker,
  Select,
  Spin,
  Progress,
  Modal,
  Tabs,
  Badge,
  Tooltip,
  Alert
} from 'antd'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { 
  UserOutlined, 
  EditOutlined, 
  SaveOutlined, 
  CameraOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  HeartOutlined,
  MailOutlined,
  LockOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  MinusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api, { uploadAPI } from '../../services/api'
import '../../styles/profile.css'
import '../../styles/mobile-profile.css'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const Profile = () => {
  const { user: currentUser, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [deleteForm] = Form.useForm()

  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        bio: currentUser.bio,
        location: currentUser.location,
        interests: currentUser.interests || [],
        dateOfBirth: currentUser.dateOfBirth,
        website: currentUser.website,
        company: currentUser.company,
        jobTitle: currentUser.jobTitle,
        skills: currentUser.skills || [],
        socialLinks: currentUser.socialLinks || {}
      })
      // Set avatar URL with proper fallback and debugging
      const userAvatarUrl = currentUser.avatarUrl || currentUser.avatar || ''
      setAvatarUrl(userAvatarUrl)
      console.log('Profile - Setting avatar URL:', userAvatarUrl, 'from user:', currentUser)
    }
  }, [currentUser, form])

  const handleSave = async (values) => {
    setSaving(true)
    try {
      console.log('Saving profile with values:', values) // Debug log
      console.log('Current avatarUrl:', avatarUrl) // Debug log
      
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
      
      // Handle avatarUrl separately
      if (avatarUrl && avatarUrl.trim() !== '') {
        cleanedValues.avatarUrl = avatarUrl
      } else {
        cleanedValues.avatarUrl = null
      }
      
      console.log('Cleaned values being sent:', cleanedValues)
      
      const response = await api.put('/users/me', cleanedValues)

      console.log('Profile update response:', response.data) // Debug log

      if (response.data.success) {
        message.success('Profile updated successfully!')
        setEditing(false)
        // Update user context
        if (updateUser) {
          updateUser(response.data.user)
        }
      } else {
        console.error('Profile update failed:', response.data)
        message.error(response.data.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Update profile error:', error)
      console.error('Error details:', {
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
          const errorMessages = errorData.errors.map(err => err.message || err.msg).join(', ')
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
      setSaving(false)
    }
  }

  const handleAvatarChange = async (info) => {
    console.log('Avatar change info:', info) // Debug log
    if (info.file.status === 'uploading') {
      setUploading(true)
      setUploadProgress(0)
    } else if (info.file.status === 'done') {
      setUploading(false)
      setUploadProgress(100)
      
      // Try multiple ways to get the uploaded URL
      const uploadedUrl = info.file.response?.url || 
                         info.file.response?.data?.url || 
                         (typeof info.file.response === 'string' ? info.file.response : null)
      
      console.log('Avatar change - uploaded URL:', uploadedUrl, 'Response:', info.file.response)
      
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl)
        // Update user profile with new avatar
        try {
          const response = await api.put('/users/me', { avatarUrl: uploadedUrl })
          if (response.data.success) {
            message.success('Profile picture updated successfully!')
            // Update user context with new avatar
            if (updateUser) {
              updateUser({ ...currentUser, avatarUrl: uploadedUrl })
            }
          } else {
            message.error(response.data.message || 'Failed to save profile picture')
          }
        } catch (error) {
          console.error('Failed to update profile with new avatar:', error)
          const errorMsg = error.response?.data?.message || error.message || 'Failed to save profile picture'
          message.error(errorMsg)
        }
      } else {
        console.error('No uploaded URL found in response:', info.file.response)
        message.error('Failed to get uploaded image URL. Please try again.')
      }
    } else if (info.file.status === 'error') {
      setUploading(false)
      setUploadProgress(0)
      const errorMsg = info.file.error?.message || 
                       info.file.response?.message || 
                       'Failed to upload profile picture'
      console.error('Avatar upload error:', info.file.error, info.file.response)
      message.error(errorMsg)
    }
  }

  const handleAvatarRemove = () => {
    setAvatarUrl('')
    message.success('Profile picture removed')
  }

  const uploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    showUploadList: false,
    action: 'http://localhost:7000/api/upload/avatar',
    onChange: handleAvatarChange,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        message.error('You can only upload image files!')
        return false
      }
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isLt5M) {
        message.error('Image must be smaller than 5MB!')
        return false
      }
      return true
    },
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      try {
        console.log('📤 Starting upload for file:', file.name, 'Size:', file.size) // Debug log
        const formData = new FormData()
        formData.append('avatar', file)
        
        // Simulate progress
        onProgress({ percent: 10 })
        
        const response = await uploadAPI.uploadAvatar(formData)
        console.log('📤 Upload response:', response.data) // Debug log
        
        if (response.data && response.data.success) {
          const uploadedUrl = response.data.url || response.data.data?.url
          console.log('✅ Upload successful, URL:', uploadedUrl)
          onProgress({ percent: 100 })
          // Pass the URL in the format expected by handleAvatarChange
          onSuccess({ url: uploadedUrl }, response)
        } else {
          const errorMsg = response.data?.message || 'Upload failed'
          console.error('❌ Upload failed:', errorMsg)
          onError(new Error(errorMsg))
        }
      } catch (error) {
        console.error('❌ Upload error:', error)
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
        const errorMsg = error.response?.data?.message || 
                        error.message || 
                        'Failed to upload avatar. Please check your connection and try again.'
        onError(new Error(errorMsg))
      }
    }
  }

  const handlePasswordChange = async (values) => {
    try {
      const response = await api.put('/users/me/password', values)
      if (response.data.success) {
        message.success('Password updated successfully!')
        setShowPasswordModal(false)
        passwordForm.resetFields()
      } else {
        message.error(response.data.message || 'Failed to update password')
      }
    } catch (error) {
      console.error('Password update error:', error)
      message.error('Failed to update password')
    }
  }

  const handleAccountDelete = async (values) => {
    try {
      const response = await api.delete('/users/me', { data: values })
      if (response.data.success) {
        message.success('Account deleted successfully')
        // Redirect to login or home page
        window.location.href = '/login'
      } else {
        message.error(response.data.message || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      message.error('Failed to delete account')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'profile',
      label: 'Profile Information',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          disabled={!editing}
          className="profile-form"
        >
          <div className="profile-form-row">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please input your name!' }]}
                  className="profile-form-item"
                >
                  <Input 
                    prefix={<UserOutlined />}
                    placeholder="Enter your full name"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[
                    { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number!' }
                  ]}
                  className="profile-form-item"
                >
                  <Input 
                    prefix={<PhoneOutlined />}
                    placeholder="Enter your phone number"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="profile-form-row">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="location"
                  label="Location"
                  className="profile-form-item"
                >
                  <Input 
                    prefix={<EnvironmentOutlined />}
                    placeholder="Enter your location"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="dateOfBirth"
                  label="Date of Birth"
                  className="profile-form-item"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select your date of birth"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="profile-form-row">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="company"
                  label="Company"
                  className="profile-form-item"
                >
                  <Input 
                    placeholder="Enter your company name"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="jobTitle"
                  label="Job Title"
                  className="profile-form-item"
                >
                  <Input 
                    placeholder="Enter your job title"
                    size="large"
                    className="profile-input"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item
            name="bio"
            label="Bio"
            rules={[{ max: 500, message: 'Bio must be less than 500 characters!' }]}
            className="profile-form-item"
          >
            <TextArea 
              rows={4}
              placeholder="Tell us about yourself..."
              showCount
              maxLength={500}
              size="large"
              className="profile-input"
            />
          </Form.Item>

          <Form.Item
            name="interests"
            label="Interests"
            className="profile-form-item"
          >
            <Select
              mode="multiple"
              placeholder="Select your interests"
              size="large"
              className="profile-input"
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

          <Form.Item
            name="skills"
            label="Skills"
            className="profile-form-item"
          >
            <Select
              mode="tags"
              placeholder="Add your skills"
              size="large"
              style={{ width: '100%' }}
              className="profile-input"
            />
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'security',
      label: 'Security & Privacy',
      children: (
        <div className="profile-tab-content">
          <Card title="Password Settings" className="profile-security-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Password Security"
                description="Keep your account secure by using a strong password and updating it regularly."
                type="info"
                showIcon
              />
              <Button 
                type="primary" 
                icon={<LockOutlined />}
                onClick={() => setShowPasswordModal(true)}
                size="large"
                className="profile-button"
              >
                Change Password
              </Button>
            </Space>
          </Card>

          <Card title="Account Management" className="profile-security-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Danger Zone"
                description="Once you delete your account, there is no going back. Please be certain."
                type="error"
                showIcon
              />
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => setShowDeleteModal(true)}
                size="large"
                className="profile-button"
              >
                Delete Account
              </Button>
            </Space>
          </Card>
        </div>
      )
    }
  ]

  return (
    <div className="mobile-profile-container">
      {/* Header Section */}
      <Card className="mobile-profile-header">
        <div className="mobile-profile-header-content">
          <div className="mobile-profile-avatar-container">
            <Badge 
              count={editing ? 1 : 0} 
              style={{ backgroundColor: '#52c41a' }}
            >
              <Avatar 
                size={140} 
                src={getUserAvatarUrl({ avatarUrl })} 
                icon={<UserOutlined />}
                className="mobile-profile-avatar"
                style={{ 
                  border: avatarUrl ? '3px solid #52c41a' : '3px solid #d9d9d9',
                  boxShadow: avatarUrl ? '0 4px 12px rgba(82, 196, 26, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                {getUserInitials(user?.name)}
              </Avatar>
            </Badge>
            
            {editing && (
              <div className="profile-upload-buttons">
                <Upload {...uploadProps}>
                  <Button 
                    type="primary" 
                    shape="round"
                    icon={<CameraOutlined />}
                    size="large"
                    className="profile-button"
                    loading={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </Button>
                </Upload>
                {avatarUrl && (
                  <Button 
                    danger 
                    shape="round"
                    icon={<DeleteOutlined />}
                    onClick={handleAvatarRemove}
                    size="large"
                    className="profile-button"
                  >
                    Remove
                  </Button>
                )}
                {uploading && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <Progress 
                      percent={uploadProgress} 
                      size="small" 
                      status={uploading ? 'active' : 'success'}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
          
          <Title level={2} className="profile-title">
            {currentUser?.name}
          </Title>
          <Paragraph className="profile-email">
            <MailOutlined /> {currentUser?.email}
          </Paragraph>
          
          <div className="profile-stats">
            <Tag color="blue" className="profile-stat-tag">
              <UserOutlined /> {currentUser?.followers?.length || 0} Followers
            </Tag>
            <Tag color="green" className="profile-stat-tag">
              <HeartOutlined /> {currentUser?.following?.length || 0} Following
            </Tag>
            <Tag color="purple" className="profile-stat-tag">
              <CalendarOutlined /> Member since {new Date(currentUser?.createdAt).toLocaleDateString()}
            </Tag>
          </div>
        </div>

        <div className="profile-actions">
          {editing ? (
            <Space size="large" wrap>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
                size="large"
                onClick={() => form.submit()}
                className="profile-button"
              >
                Save Changes
              </Button>
              <Button 
                onClick={() => setEditing(false)}
                size="large"
                className="profile-button"
              >
                Cancel
              </Button>
            </Space>
          ) : (
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
              size="large"
              className="profile-button"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </Card>

      {/* Main Content */}
      <Card className="profile-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="profile-tabs"
        />
      </Card>

      {/* Password Change Modal */}
      <Modal
        title="Change Password"
        open={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        footer={null}
        width={500}
        className="profile-modal"
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          className="profile-modal-form"
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: 'Please enter your current password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Enter current password"
              size="large"
              className="profile-input"
            />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Enter new password"
              size="large"
              className="profile-input"
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
              size="large"
              className="profile-input"
            />
          </Form.Item>
          
          <div className="profile-modal-actions">
            <Space>
              <Button onClick={() => setShowPasswordModal(false)} className="profile-button">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" className="profile-button">
                Update Password
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Account Delete Modal */}
      <Modal
        title="Delete Account"
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        footer={null}
        width={500}
        className="profile-modal"
      >
        <Alert
          message="Warning"
          description="This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={handleAccountDelete}
          className="profile-modal-form"
        >
          <Form.Item
            name="password"
            label="Confirm Password"
            rules={[{ required: true, message: 'Please enter your password to confirm!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
              className="profile-input"
            />
          </Form.Item>
          
          <div className="profile-modal-actions">
            <Space>
              <Button onClick={() => setShowDeleteModal(false)} className="profile-button">
                Cancel
              </Button>
              <Button danger htmlType="submit" className="profile-button">
                Delete Account
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default Profile