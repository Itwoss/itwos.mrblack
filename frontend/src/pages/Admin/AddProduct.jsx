import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Upload, 
  Switch, 
  InputNumber, 
  Space, 
  Typography, 
  Row, 
  Col, 
  message, 
  Alert,
  Spin,
  Tag,
  Select
} from 'antd'
import { 
  PlusOutlined, 
  UploadOutlined, 
  EyeOutlined,
  SaveOutlined,
  GlobalOutlined,
  LinkOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import { productAPI } from '../../services/api'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const AddProduct = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [tags, setTags] = useState([])
  const [categories, setCategories] = useState([])
  const [techStack, setTechStack] = useState([])
  
  // Predefined options
  const tagOptions = [
    'ecommerce', 'website', 'web-app', 'mobile-app', 'landing-page', 
    'portfolio', 'blog', 'dashboard', 'saas', 'marketplace', 'social-media',
    'education', 'healthcare', 'finance', 'travel', 'food', 'fashion',
    'technology', 'startup', 'corporate', 'nonprofit'
  ]
  
  const categoryOptions = [
    'web-development', 'mobile-development', 'e-commerce', 'landing-page',
    'portfolio', 'blog', 'dashboard', 'saas', 'marketplace', 'social-platform',
    'education-platform', 'healthcare-app', 'finance-app', 'travel-booking',
    'food-delivery', 'fashion-ecommerce', 'tech-startup', 'corporate-site',
    'nonprofit', 'entertainment', 'gaming', 'real-estate'
  ]
  
  const techStackOptions = [
    'React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Next.js', 'Nuxt.js',
    'Laravel', 'Django', 'Flask', 'Ruby on Rails', 'Spring Boot', 'ASP.NET',
    'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase', 'Supabase',
    'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'GraphQL',
    'REST API', 'Microservices', 'Serverless', 'JWT', 'OAuth', 'Stripe',
    'PayPal', 'Twilio', 'SendGrid', 'Cloudinary', 'S3', 'CDN'
  ]
  
  const developerOptions = [
    'John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 'David Wilson',
    'Lisa Brown', 'Alex Rodriguez', 'Maria Garcia', 'James Taylor', 'Anna Lee',
    'Robert Kim', 'Jennifer White', 'Michael Brown', 'Jessica Miller', 'Christopher Jones',
    'Amanda Garcia', 'Daniel Martinez', 'Ashley Anderson', 'Matthew Thomas', 'Stephanie Jackson'
  ]
  const [urlTimeout, setUrlTimeout] = useState(null)
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/admin/login')
      return
    }
  }, [isAuthenticated, user, navigate])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (urlTimeout) {
        clearTimeout(urlTimeout)
      }
    }
  }, [urlTimeout])

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }

  // Handle title change to update slug
  const handleTitleChange = (e) => {
    const title = e.target.value
    const slug = generateSlug(title)
    form.setFieldsValue({ slug })
  }

  // Handle website URL change to auto-fetch title
  const handleWebsiteUrlChange = (e) => {
    const websiteUrl = e.target.value
    
    // Clear existing timeout
    if (urlTimeout) {
      clearTimeout(urlTimeout)
    }

    // Basic URL validation
    try {
      new URL(websiteUrl)
    } catch (error) {
      return // Invalid URL, don't proceed
    }

    // Debounce the API call
    const timeout = setTimeout(async () => {
      setFetchingTitle(true)
      try {
        const response = await productAPI.generateDescription({ websiteUrl })
        if (response.data.success) {
          const { websiteTitle } = response.data.data
          if (websiteTitle && websiteTitle !== 'Untitled') {
            form.setFieldsValue({
              title: websiteTitle,
              websiteTitle: websiteTitle
            })
            // Also update slug
            const slug = generateSlug(websiteTitle)
            form.setFieldsValue({ slug })
            message.success('Title fetched automatically from website!')
          }
        }
      } catch (error) {
        console.log('Could not auto-fetch title:', error.message)
        // Don't show error message for auto-fetch failures
      } finally {
        setFetchingTitle(false)
      }
    }, 1500) // Wait 1.5 seconds after user stops typing

    setUrlTimeout(timeout)
  }

  // Generate description from website
  const handleGenerateDescription = async () => {
    const websiteUrl = form.getFieldValue('websiteUrl')
    if (!websiteUrl) {
      message.error('Please enter a website URL first')
      return
    }

    // Basic URL validation
    try {
      new URL(websiteUrl)
    } catch (error) {
      message.error('Please enter a valid URL (e.g., https://example.com)')
      return
    }

    // Check if already generating to prevent multiple calls
    if (generatingDescription) {
      message.warning('Description generation is already in progress. Please wait.')
      return
    }

    console.log('Generating description for URL:', websiteUrl)
    setGeneratingDescription(true)
    
    try {
      const response = await productAPI.generateDescription({ websiteUrl })
      console.log('Description generation response:', response.data)
      
      if (response.data.success) {
        const { websiteTitle, descriptionAuto } = response.data.data
        form.setFieldsValue({
          websiteTitle,
          descriptionAuto
        })
        message.success('Description generated successfully!')
      } else {
        message.error(response.data.message || 'Failed to generate description')
      }
    } catch (error) {
      console.error('Error generating description:', error)
      console.error('Error response:', error.response?.data)
      
      let errorMessage = 'Failed to generate description. Please try again.'
      
      if (error.response?.status === 429) {
        const retryAfter = error.response?.data?.retryAfter || 60
        errorMessage = `Too many requests. Please wait ${retryAfter} seconds before trying again.`
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. The website took too long to respond.'
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.'
      }
      
      message.error(errorMessage)
    } finally {
      setGeneratingDescription(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      // Validate required fields
      if (!values.title) {
        message.error('Product title is required')
        return
      }
      if (!values.websiteUrl) {
        message.error('Website URL is required')
        return
      }
      if (!values.developerName) {
        message.error('Developer name is required')
        return
      }
      if (!values.price) {
        message.error('Price is required')
        return
      }

      const formData = new FormData()
      
      // Add all form fields (excluding status to avoid duplicates)
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null && key !== 'status') {
          if (Array.isArray(values[key])) {
            formData.append(key, JSON.stringify(values[key]))
          } else {
            formData.append(key, values[key])
          }
        }
      })

      // Set status explicitly to avoid duplicates
      formData.append('status', 'draft')

      // Add files
      if (thumbnailFile) {
        console.log('✅ Adding thumbnail file to FormData:', {
          name: thumbnailFile.name,
          size: thumbnailFile.size,
          type: thumbnailFile.type,
          lastModified: thumbnailFile.lastModified
        })
        formData.append('thumbnail', thumbnailFile)
      } else {
        console.log('❌ No thumbnail file to add')
      }

      // Add screenshots
      if (screenshots.length > 0) {
        formData.append('screenshots', JSON.stringify(screenshots))
      }

      // Add arrays
      formData.append('tags', JSON.stringify(tags))
      formData.append('categories', JSON.stringify(categories))
      formData.append('techStack', JSON.stringify(techStack))

      console.log('Submitting product with data:', {
        title: values.title,
        websiteUrl: values.websiteUrl,
        developerName: values.developerName,
        price: values.price,
        hasThumbnail: !!thumbnailFile,
        thumbnailFile: thumbnailFile,
        screenshotsCount: screenshots.length,
        screenshots: screenshots
      })

      console.log('🚀 Submitting product to API...')
      console.log('📤 FormData being sent:', {
        hasThumbnail: formData.has('thumbnail'),
        thumbnailFile: formData.get('thumbnail'),
        formDataKeys: Array.from(formData.keys())
      })
      
      const response = await productAPI.createProduct(formData)
      console.log('📡 API Response:', response.data)
      
      if (response.data.success) {
        message.success('Product created successfully!')
        console.log('✅ Product created with data:', response.data.data)
        navigate('/admin/products')
      } else {
        console.log('❌ Product creation failed:', response.data.message)
        message.error(response.data.message || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      if (error.response?.data?.message) {
        message.error(`Failed to create product: ${error.response.data.message}`)
      } else {
        message.error('Failed to create product. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle preview save
  const handleSavePreview = async () => {
    const values = form.getFieldsValue()
    setLoading(true)
    try {
      // Validate required fields
      if (!values.title) {
        message.error('Product title is required for preview')
        return
      }
      if (!values.websiteUrl) {
        message.error('Website URL is required for preview')
        return
      }
      
      // Validate URL format
      try {
        new URL(values.websiteUrl)
      } catch (error) {
        message.error('Please enter a valid website URL')
        return
      }

      const formData = new FormData()
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null && key !== 'status') {
          formData.append(key, values[key])
        }
      })
      formData.append('previewSaved', 'true')
      formData.append('status', 'draft')
      
      // Ensure we have default values for required fields
      if (!values.price) {
        formData.append('price', '0')
      }
      if (!values.developerName) {
        formData.append('developerName', 'TBD')
      }

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }

      if (screenshots.length > 0) {
        formData.append('screenshots', JSON.stringify(screenshots))
      }

      formData.append('tags', JSON.stringify(tags))
      formData.append('categories', JSON.stringify(categories))
      formData.append('techStack', JSON.stringify(techStack))

      const response = await productAPI.createProduct(formData)
      if (response.data.success) {
        message.success('Product saved as preview!')
      } else {
        message.error(response.data.message || 'Failed to save preview')
      }
    } catch (error) {
      console.error('Error saving preview:', error)
      console.error('Error response:', error.response?.data)
      
      let errorMessage = 'Failed to save preview. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.errors) {
        errorMessage = `Validation error: ${error.response.data.errors.join(', ')}`
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.'
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.'
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid data. Please check your inputs.'
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.'
      }
      
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle publish product
  const handlePublish = async () => {
    const values = form.getFieldsValue()
    setLoading(true)
    try {
      // Validate required fields
      if (!values.title) {
        message.error('Product title is required for publishing')
        return
      }
      if (!values.websiteUrl) {
        message.error('Website URL is required for publishing')
        return
      }
      if (!values.developerName) {
        message.error('Developer name is required for publishing')
        return
      }
      if (!values.price || values.price <= 0) {
        message.error('Valid price is required for publishing')
        return
      }
      
      // Validate URL format
      try {
        new URL(values.websiteUrl)
      } catch (error) {
        message.error('Please enter a valid website URL')
        return
      }

      // Check authentication
      if (!isAuthenticated || user?.role !== 'admin') {
        message.error('You must be logged in as an admin to publish products')
        return
      }


      const formData = new FormData()
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null && key !== 'status') {
          formData.append(key, values[key])
        }
      })
      formData.append('previewSaved', 'true')
      formData.append('status', 'published')

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }

      if (screenshots.length > 0) {
        formData.append('screenshots', JSON.stringify(screenshots))
      }

      formData.append('tags', JSON.stringify(tags))
      formData.append('categories', JSON.stringify(categories))
      formData.append('techStack', JSON.stringify(techStack))


      const response = await productAPI.createProduct(formData)
      if (response.data.success) {
        message.success('Product published successfully! It will now appear on the homepage and product listing page.')
        // Navigate to products page to see the published product
        navigate('/products')
      } else {
        message.error(response.data.message || 'Failed to publish product')
      }
    } catch (error) {
      console.error('Error publishing product:', error)
      console.error('Error response:', error.response?.data)
      
      let errorMessage = 'Failed to publish product. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.errors) {
        errorMessage = `Validation error: ${error.response.data.errors.join(', ')}`
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.'
        // Redirect to login
        navigate('/login')
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.'
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid data. Please check your inputs.'
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.'
      }
      
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle thumbnail upload
  const handleThumbnailUpload = (info) => {
    const { file, fileList } = info
    
    console.log('🔍 Thumbnail upload info:', { 
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        status: file.status,
        originFileObj: !!file.originFileObj,
        rawFile: file.rawFile
      }, 
      fileList: fileList.length 
    })
    
    if (file.status === 'uploading') {
      console.log('⏳ File is uploading...')
      return
    }
    
    if (file.status === 'done' || file.status === 'removed') {
      if (file.status === 'done') {
        console.log('✅ File upload completed')
        setThumbnailFile(file.originFileObj || file)
        message.success('Thumbnail uploaded successfully')
      } else {
        console.log('🗑️ File removed')
        setThumbnailFile(null)
        message.info('Thumbnail removed')
      }
    } else if (file.status === 'error') {
      console.log('❌ File upload failed')
      message.error('Thumbnail upload failed')
    } else {
      // Handle file selection (when beforeUpload returns false)
      console.log('📁 File selected, processing...')
      
      // Try multiple ways to get the file object
      const fileObj = file.originFileObj || file.rawFile || file
      
      if (fileObj && fileObj instanceof File) {
        console.log('✅ File object found, setting thumbnail file')
        setThumbnailFile(fileObj)
        message.success('Thumbnail selected successfully')
      } else {
        console.log('⚠️ No valid file object found:', {
          originFileObj: file.originFileObj,
          rawFile: file.rawFile,
          file: file,
          isFile: file instanceof File
        })
        message.warning('File selection failed - invalid file object')
      }
    }
  }

  // Handle screenshots upload
  const handleScreenshotsUpload = (info) => {
    const { file, fileList } = info
    
    console.log('🔍 Screenshots upload info:', { 
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        status: file.status,
        originFileObj: !!file.originFileObj,
        rawFile: file.rawFile
      }, 
      fileList: fileList.length 
    })
    
    if (file.status === 'uploading') {
      console.log('⏳ Screenshot is uploading...')
      return
    }
    
    if (file.status === 'done') {
      console.log('✅ Screenshot upload completed')
      const newScreenshots = [...screenshots, file.originFileObj || file]
      setScreenshots(newScreenshots)
      message.success('Screenshot uploaded successfully')
    } else if (file.status === 'error') {
      console.log('❌ Screenshot upload failed')
      message.error('Screenshot upload failed')
    } else {
      // Handle file selection (when beforeUpload returns false)
      console.log('📁 Screenshot selected, processing...')
      
      // Try multiple ways to get the file object
      const fileObj = file.originFileObj || file.rawFile || file
      
      if (fileObj && fileObj instanceof File) {
        console.log('✅ Screenshot file object found, adding to screenshots')
        const newScreenshots = [...screenshots, fileObj]
        setScreenshots(newScreenshots)
        message.success('Screenshot selected successfully')
      } else {
        console.log('⚠️ No valid screenshot file object found:', {
          originFileObj: file.originFileObj,
          rawFile: file.rawFile,
          file: file,
          isFile: file instanceof File
        })
        message.warning('Screenshot selection failed - invalid file object')
      }
    }
  }

  // Add tag
  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  // Remove tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  // Add category
  const addCategory = (category) => {
    if (category && !categories.includes(category)) {
      setCategories([...categories, category])
    }
  }

  // Remove category
  const removeCategory = (categoryToRemove) => {
    setCategories(categories.filter(category => category !== categoryToRemove))
  }

  // Add tech stack
  const addTechStack = (tech) => {
    if (tech && !techStack.includes(tech)) {
      setTechStack([...techStack, tech])
    }
  }

  // Remove tech stack
  const removeTechStack = (techToRemove) => {
    setTechStack(techStack.filter(tech => tech !== techToRemove))
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You must be logged in as an admin to access this page.</p>
        <Button type="primary" onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    )
  }

  return (
    <DashboardLayout userRole="admin">
      <div style={{ padding: '2rem', minHeight: '100vh' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2}>Add New Product</Title>
          <Paragraph>Create a new product listing with website preview and prebook functionality.</Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            currency: 'USD',
            trending: false,
            status: 'draft'
          }}
        >
          <div style={{ 
            display: 'flex', 
            gap: '24px', 
            height: 'calc(100vh - 200px)',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            {/* Left Side - Scrollable Product Information */}
            <div style={{ 
              flex: '1', 
              overflowY: 'auto', 
              paddingRight: window.innerWidth < 768 ? '0' : '12px',
              maxHeight: window.innerWidth < 768 ? 'none' : 'calc(100vh - 200px)'
            }}>
              {/* Basic Information */}
              <Card title="Product Information" style={{ marginBottom: '1.5rem' }}>
                <Alert
                  message="Auto-Fetch Feature"
                  description="When you enter a website URL, the product title will be automatically fetched from the website's title tag. This helps speed up product creation."
                  type="info"
                  showIcon
                  style={{ marginBottom: '1rem' }}
                />
                <Form.Item
                  name="title"
                  label="Product Title"
                  rules={[{ required: true, message: 'Please enter product title' }]}
                >
                  <Input 
                    placeholder="Enter product title (or will be auto-filled from website URL)" 
                    onChange={handleTitleChange}
                    suffix={fetchingTitle ? <Spin size="small" /> : null}
                  />
                </Form.Item>

                <Form.Item
                  name="slug"
                  label="URL Slug"
                >
                  <Input placeholder="Auto-generated from title" disabled />
                </Form.Item>

                <Form.Item
                  name="websiteUrl"
                  label="Website URL"
                  rules={[
                    { required: true, message: 'Please enter website URL' },
                    { type: 'url', message: 'Please enter a valid URL' }
                  ]}
                >
                  <Input 
                    placeholder="https://example.com"
                    prefix={<GlobalOutlined />}
                    onChange={handleWebsiteUrlChange}
                  />
                </Form.Item>

                <Form.Item
                  name="websiteTitle"
                  label="Website Title"
                >
                  <Input placeholder="Auto-generated from website" />
                </Form.Item>

                <Form.Item
                  name="websiteLink"
                  label="Website Link"
                >
                  <Input 
                    placeholder="https://example.com"
                    prefix={<LinkOutlined />}
                  />
                </Form.Item>
              </Card>

              {/* Description Generation */}
              <Card title="Description" style={{ marginBottom: '1.5rem' }}>
                <Alert
                  message="Auto-generate description from website"
                  description="Click the button below to automatically scrape and generate a description from the website URL."
                  type="info"
                  showIcon
                  style={{ marginBottom: '1rem' }}
                />
                
                <Button 
                  type="primary" 
                  icon={<GlobalOutlined />}
                  onClick={handleGenerateDescription}
                  loading={generatingDescription}
                  style={{ marginBottom: '1rem' }}
                >
                  Generate Description from Website
                </Button>

                <Form.Item
                  name="descriptionAuto"
                  label="Auto-generated Description"
                >
                  <TextArea 
                    rows={6}
                    placeholder="Description will be generated automatically"
                  />
                </Form.Item>

                <Form.Item
                  name="descriptionManual"
                  label="Manual Description"
                  extra="Override auto-generated description if needed"
                >
                  <TextArea 
                    rows={6}
                    placeholder="Enter custom description"
                  />
                </Form.Item>
              </Card>

              {/* Media */}
              <Card title="Product Images" style={{ marginBottom: '1.5rem' }}>
                {thumbnailFile && (
                  <Alert
                    message="Thumbnail Selected"
                    description={`File: ${thumbnailFile.name} (${Math.round(thumbnailFile.size / 1024)}KB)`}
                    type="success"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                )}
                <Form.Item
                  name="thumbnail"
                  label="Thumbnail Image"
                  rules={[{ required: true, message: 'Please upload thumbnail' }]}
                >
                  <Upload
                    name="thumbnail"
                    listType="picture-card"
                    showUploadList={true}
                    beforeUpload={(file) => {
                      console.log('🔍 Before upload file:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        isFile: file instanceof File
                      })
                      // Don't upload immediately, just handle the file selection
                      return false
                    }}
                    onChange={handleThumbnailUpload}
                    fileList={thumbnailFile ? [{ 
                      uid: '1', 
                      name: thumbnailFile.name || 'thumbnail', 
                      status: 'done', 
                      url: URL.createObjectURL(thumbnailFile),
                      thumbUrl: URL.createObjectURL(thumbnailFile)
                    }] : []}
                    onRemove={() => {
                      console.log('🗑️ Removing thumbnail file')
                      setThumbnailFile(null)
                      return true
                    }}
                    accept="image/*"
                    maxCount={1}
                    customRequest={({ file, onSuccess }) => {
                      console.log('🔧 Custom request called with file:', file)
                      // Simulate upload success immediately
                      setTimeout(() => {
                        onSuccess('ok')
                      }, 0)
                    }}
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </Form.Item>

                {screenshots.length > 0 && (
                  <Alert
                    message="Screenshots Selected"
                    description={`${screenshots.length} screenshot(s) selected`}
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                )}
                <Form.Item
                  name="screenshots"
                  label="Screenshots"
                >
                  <Upload
                    name="screenshots"
                    listType="picture-card"
                    multiple
                    showUploadList={true}
                    beforeUpload={(file) => {
                      console.log('🔍 Before screenshots upload:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        isFile: file instanceof File
                      })
                      // Don't upload immediately, just handle the file selection
                      return false
                    }}
                    onChange={handleScreenshotsUpload}
                    fileList={screenshots.map((file, index) => ({ 
                      uid: index.toString(), 
                      name: file.name || `screenshot-${index}`, 
                      status: 'done', 
                      url: URL.createObjectURL(file),
                      thumbUrl: URL.createObjectURL(file)
                    }))}
                    onRemove={(file) => {
                      console.log('🗑️ Removing screenshot:', file.uid)
                      const fileIndex = parseInt(file.uid)
                      setScreenshots(prev => {
                        const newScreenshots = [...prev]
                        newScreenshots.splice(fileIndex, 1)
                        return newScreenshots
                      })
                      return true
                    }}
                    accept="image/*"
                    maxCount={5}
                    customRequest={({ file, onSuccess }) => {
                      console.log('🔧 Custom screenshot request called with file:', file)
                      // Simulate upload success immediately
                      setTimeout(() => {
                        onSuccess('ok')
                      }, 0)
                    }}
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </Form.Item>
              </Card>

              {/* Pricing */}
              <Card title="Pricing" style={{ marginBottom: '1.5rem' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="price"
                      label="Price"
                      rules={[{ required: true, message: 'Please enter price' }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="currency"
                      label="Currency"
                    >
                      <Select>
                        <Option value="USD">USD</Option>
                        <Option value="EUR">EUR</Option>
                        <Option value="GBP">GBP</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Tags and Categories */}
              <Card title="Tags and Categories" style={{ marginBottom: '1.5rem' }}>
                <Form.Item label="Tags">
                  <div style={{ marginBottom: '1rem' }}>
                    <Space wrap>
                      {tags.map(tag => (
                        <Tag
                          key={tag}
                          closable
                          onClose={() => removeTag(tag)}
                          color="blue"
                        >
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                  <Select
                    mode="multiple"
                    placeholder="Select tags"
                    style={{ width: '100%' }}
                    value={tags}
                    onChange={setTags}
                    options={tagOptions.map(tag => ({ label: tag, value: tag }))}
                    showSearch
                    filterOption={(input, option) =>
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>

                <Form.Item label="Categories">
                  <div style={{ marginBottom: '1rem' }}>
                    <Space wrap>
                      {categories.map(category => (
                        <Tag
                          key={category}
                          closable
                          onClose={() => removeCategory(category)}
                          color="green"
                        >
                          {category}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                  <Select
                    mode="multiple"
                    placeholder="Select categories"
                    style={{ width: '100%' }}
                    value={categories}
                    onChange={setCategories}
                    options={categoryOptions.map(category => ({ label: category, value: category }))}
                    showSearch
                    filterOption={(input, option) =>
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>

                <Form.Item label="Tech Stack">
                  <div style={{ marginBottom: '1rem' }}>
                    <Space wrap>
                      {techStack.map(tech => (
                        <Tag
                          key={tech}
                          closable
                          onClose={() => removeTechStack(tech)}
                          color="purple"
                        >
                          {tech}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                  <Select
                    mode="multiple"
                    placeholder="Select tech stack"
                    style={{ width: '100%' }}
                    value={techStack}
                    onChange={setTechStack}
                    options={techStackOptions.map(tech => ({ label: tech, value: tech }))}
                    showSearch
                    filterOption={(input, option) =>
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Card>

              {/* Developer Info */}
              <Card title="Developer Information" style={{ marginBottom: '1.5rem' }}>
                <Form.Item
                  name="developerName"
                  label="Developer Name"
                  rules={[{ required: true, message: 'Please select developer name' }]}
                >
                  <Select
                    placeholder="Select developer name"
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    options={developerOptions.map(dev => ({ label: dev, value: dev }))}
                  />
                </Form.Item>
              </Card>

              {/* Settings */}
              <Card title="Settings">
                <Form.Item
                  name="trending"
                  label="Trending"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="status"
                  label="Status"
                >
                  <Select>
                    <Option value="draft">Draft</Option>
                    <Option value="published">Published</Option>
                    <Option value="archived">Archived</Option>
                  </Select>
                </Form.Item>
              </Card>
            </div>

            {/* Right Side - Fixed Actions Panel */}
            <div style={{ 
              width: window.innerWidth < 768 ? '100%' : '350px', 
              position: window.innerWidth < 768 ? 'static' : 'sticky', 
              top: '0',
              height: 'fit-content',
              maxHeight: window.innerWidth < 768 ? 'none' : 'calc(100vh - 200px)',
              overflowY: 'auto',
              order: window.innerWidth < 768 ? '-1' : '0'
            }}>
              {/* Actions */}
              <Card title="Actions" style={{ marginBottom: '1.5rem' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="default" 
                    icon={<EyeOutlined />}
                    onClick={() => {
                      const websiteUrl = form.getFieldValue('websiteUrl')
                      if (websiteUrl) {
                        // Open in a new window with responsive dimensions
                        const newWindow = window.open(
                          websiteUrl, 
                          '_blank',
                          'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
                        )
                        if (newWindow) {
                          newWindow.focus()
                        } else {
                          message.error('Popup blocked. Please allow popups for this site.')
                        }
                      } else {
                        message.error('Please enter a website URL first')
                      }
                    }}
                    style={{ width: '100%' }}
                    block
                  >
                    Preview Website
                  </Button>
                  
                  <Button 
                    type="default" 
                    icon={<SaveOutlined />}
                    onClick={handleSavePreview}
                    loading={loading}
                    style={{ width: '100%' }}
                    block
                  >
                    Save as Preview
                  </Button>
                  
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={loading}
                    style={{ width: '100%' }}
                    block
                  >
                    Create Product (Draft)
                  </Button>
                  
                  <Button 
                    type="primary" 
                    icon={<EyeOutlined />}
                    onClick={handlePublish}
                    loading={loading}
                    style={{ 
                      width: '100%', 
                      background: '#52c41a',
                      borderColor: '#52c41a'
                    }}
                    block
                  >
                    Publish Product
                  </Button>
                </Space>
              </Card>

              {/* Status */}
              <Card title="Status">
                <Form.Item
                  name="previewSaved"
                  label="Preview Saved"
                  valuePropName="checked"
                >
                  <Switch disabled />
                </Form.Item>
                
                <Alert
                  message="Publishing"
                  description="When you publish a product, it will immediately appear on the homepage and be visible to all users."
                  type="info"
                  showIcon
                  style={{ marginTop: '1rem' }}
                />
              </Card>
            </div>
          </div>
        </Form>
      </div>
    </DashboardLayout>
  )
}

export default AddProduct
