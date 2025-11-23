import React, { useState } from 'react'
import { Card, Button, Input, Upload, message, Spin, Alert, Typography, Space, Tag } from 'antd'
import { UploadOutlined, InstagramOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import imageCompression from 'browser-image-compression'

const { TextArea } = Input
const { Title, Text } = Typography

const PostCreation = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [instagramUrl, setInstagramUrl] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [compressedImage, setCompressedImage] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [posting, setPosting] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [phashUploaded, setPhashUploaded] = useState(null)
  const [phashInstagram, setPhashInstagram] = useState(null)

  const handleImageUpload = async (file) => {
    try {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        message.error('Image size must be less than 2MB')
        return false
      }

      // Compress image to 400-600KB
      message.loading('Compressing image...', 0)
      
      const options = {
        maxSizeMB: 0.6, // Target 600KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg'
      }

      const compressed = await imageCompression(file, options)
      
      // Ensure compressed size is reasonable
      if (compressed.size > 700 * 1024) {
        // Further compression if needed
        const furtherCompressed = await imageCompression(compressed, {
          maxSizeMB: 0.5,
          useWebWorker: true
        })
        setCompressedImage(furtherCompressed)
      } else {
        setCompressedImage(compressed)
      }

      message.destroy()
      message.success(`Image compressed to ${(compressed.size / 1024).toFixed(0)}KB`)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(compressed)

      setImageFile(compressed)
      setVerificationResult(null)
      
      return false // Prevent default upload
    } catch (error) {
      message.destroy()
      message.error('Failed to compress image')
      console.error('Compression error:', error)
      return false
    }
  }

  const handleVerifyImages = async () => {
    if (!imageFile || !instagramUrl) {
      message.warning('Please upload an image and provide Instagram URL')
      return
    }

    if (!instagramUrl.includes('instagram.com')) {
      message.error('Please enter a valid Instagram URL')
      return
    }

    try {
      setVerifying(true)
      setVerificationResult(null)

      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('instagramUrl', instagramUrl)

      console.log('🔍 Verifying images...', {
        imageSize: imageFile.size,
        instagramUrl
      })

      const response = await api.post('/posts/verify-images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 second timeout for image processing
      })

      if (response.data?.success) {
        setVerificationResult({
          match: response.data.match,
          difference: response.data.difference,
          message: response.data.message,
          phashUploaded: response.data.phashUploaded,
          phashInstagram: response.data.phashInstagram
        })
        
        // Store hash values
        if (response.data.phashUploaded) {
          setPhashUploaded(response.data.phashUploaded)
        }
        if (response.data.phashInstagram) {
          setPhashInstagram(response.data.phashInstagram)
        }
        
        if (response.data.match) {
          message.success('Images match! You can post now.')
        } else {
          message.error(`Images don't match (difference: ${response.data.difference})`)
        }
      }
    } catch (error) {
      console.error('Verification error:', error)
      
      let errorMessage = 'Failed to verify images'
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`
        
        if (error.response.status === 404) {
          errorMessage = 'Route not found. Please make sure the backend server is running and the route is registered.'
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.'
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid request. Please check your inputs.'
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check if the backend is running.'
      } else {
        // Error setting up request
        errorMessage = error.message || 'Failed to verify images'
      }
      
      message.error(errorMessage)
      setVerificationResult({
        match: false,
        message: errorMessage
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handlePost = async () => {
    if (!imageFile || !instagramUrl || !verificationResult?.match) {
      message.warning('Please verify images match before posting')
      return
    }

    if (!phashUploaded || !phashInstagram) {
      message.warning('Hash values missing. Please verify images again.')
      return
    }

    try {
      setPosting(true)

      // Create post with stored hash values
      const postFormData = new FormData()
      postFormData.append('image', imageFile)
      postFormData.append('instagramUrl', instagramUrl)
      postFormData.append('phashUploaded', phashUploaded)
      postFormData.append('phashInstagram', phashInstagram)
      if (title.trim()) {
        postFormData.append('title', title.trim())
      }
      if (bio.trim()) {
        postFormData.append('bio', bio.trim())
      }
      if (tags.length > 0) {
        // Send tags as JSON string
        postFormData.append('tags', JSON.stringify(tags))
      }

      const response = await api.post('/posts', postFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data?.success) {
        message.success('Post created successfully!')
        navigate('/feed')
      }
    } catch (error) {
      console.error('Post creation error:', error)
      message.error(error.response?.data?.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const canPost = imageFile && instagramUrl && verificationResult?.match

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <Title level={2} style={{ marginBottom: '1.5rem' }}>
        Create Post
      </Title>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Image Upload */}
          <div>
            <Text strong>Upload Image (Max 2MB)</Text>
            <br />
            <Upload
              accept="image/*"
              beforeUpload={handleImageUpload}
              showUploadList={false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} style={{ marginTop: '8px' }}>
                Select Image
              </Button>
            </Upload>
            
            {imagePreview && (
              <div style={{ marginTop: '16px' }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '400px',
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9'
                  }} 
                />
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Compressed size: {imageFile ? `${(imageFile.size / 1024).toFixed(0)}KB` : 'N/A'}
                </Text>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <Text strong>Title (Optional)</Text>
            <br />
            <Input
              placeholder="Enter post title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              showCount
              style={{ marginTop: '8px' }}
            />
          </div>

          {/* Bio/Description Input */}
          <div>
            <Text strong>Bio/Description (Optional)</Text>
            <br />
            <TextArea
              placeholder="Write a caption or description..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              showCount
              style={{ marginTop: '8px' }}
            />
          </div>

          {/* Tags Input */}
          <div>
            <Text strong>Tags (Optional)</Text>
            <br />
            <Space.Compact style={{ width: '100%', marginTop: '8px' }}>
              <Input
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleTagInputKeyPress}
                onKeyPress={handleTagInputKeyPress}
              />
              <Button 
                icon={<PlusOutlined />} 
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </Space.Compact>
            {tags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {tags.map((tag, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    style={{ marginBottom: '4px' }}
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>

          {/* Instagram URL Input */}
          <div>
            <Text strong>Instagram Post URL</Text>
            <br />
            <Input
              placeholder="https://www.instagram.com/p/..."
              prefix={<InstagramOutlined />}
              value={instagramUrl}
              onChange={(e) => {
                setInstagramUrl(e.target.value)
                setVerificationResult(null)
              }}
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Paste the Instagram post URL containing the same image
            </Text>
          </div>

          {/* Verify Button */}
          {imageFile && instagramUrl && (
            <Button
              type="primary"
              onClick={handleVerifyImages}
              loading={verifying}
              block
            >
              {verifying ? 'Verifying Images...' : 'Verify Images Match'}
            </Button>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <Alert
              message={verificationResult.match ? 'Images Match!' : 'Images Don\'t Match'}
              description={verificationResult.message}
              type={verificationResult.match ? 'success' : 'error'}
              icon={verificationResult.match ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              showIcon
            />
          )}

          {/* Post Button */}
          {canPost && (
            <Button
              type="primary"
              size="large"
              onClick={handlePost}
              loading={posting}
              block
              style={{ marginTop: '16px' }}
            >
              {posting ? 'Posting...' : 'Post'}
            </Button>
          )}

          {!canPost && imageFile && instagramUrl && !verificationResult && (
            <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
              Click "Verify Images Match" to enable posting
            </Text>
          )}
        </Space>
      </Card>
    </div>
  )
}

export default PostCreation

