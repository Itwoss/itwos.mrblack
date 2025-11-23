import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Image, 
  Avatar, 
  Typography, 
  Input, 
  Select, 
  Row, 
  Col, 
  Statistic, 
  App,
  Modal, 
  Form, 
  Switch,
  Popconfirm,
  Badge,
  Tooltip,
  Divider,
  Descriptions,
  Tabs,
  List,
  Rate,
  Progress,
  Alert,
  Drawer,
  Dropdown,
  Menu,
  Spin,
  Empty
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FilterOutlined,
  ReloadOutlined,
  GlobalOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  MoreOutlined,
  SettingOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  StarOutlined,
  HeartOutlined,
  BookOutlined,
  TagsOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  MessageOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import { productAPI } from '../../services/api'
import AdminDesignSystem from '../../styles/admin-design-system'
import './Products.css'

const { Title, Text, Paragraph } = Typography
const { Search } = Input
const { Option } = Select
const { TabPane } = Tabs

const ProductsEnhanced = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true) // Start with true for initial load
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trendingFilter, setTrendingFilter] = useState('all')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [form] = Form.useForm()

  // Statistics
  const [stats, setStats] = useState({
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    trendingProducts: 0,
    previewSavedProducts: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    // Debounce the fetch to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchProducts()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [pagination.current, pagination.pageSize])

  // Also fetch when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      console.log('Admin authenticated, fetching products...')
      // Debounce this call too
      const timeoutId = setTimeout(() => {
        fetchProducts()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isAuthenticated, user])

  const fetchProducts = async () => {
    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('Products fetch already in progress, skipping...')
      return
    }
    
    setLoading(true)
    setError(null) // Clear previous errors
    try {
      // Check authentication status - prioritize admin token
      const adminToken = localStorage.getItem('adminToken') || localStorage.getItem('accessToken') || localStorage.getItem('token')
      const adminUser = localStorage.getItem('adminUser')
      
      console.log('Fetching admin products...', {
        isAuthenticated,
        userRole: user?.role,
        hasToken: !!adminToken,
        hasAdminUser: !!adminUser,
        tokenLength: adminToken?.length || 0,
        pagination: pagination.current,
        pageSize: pagination.pageSize
      })

      // Verify admin authentication before making request
      if (!adminToken) {
        console.error('No admin token found - redirecting to login')
        message.error('Authentication required. Please log in as admin.')
        navigate('/admin/login')
        setLoading(false)
        return
      }

      // Check if user is admin
      if (!isAuthenticated || user?.role !== 'admin') {
        // Try to use stored admin user data
        if (adminUser) {
          try {
          const adminData = JSON.parse(adminUser)
          if (adminData.role === 'admin') {
            console.log('Found admin user in localStorage, proceeding with admin API call')
            } else {
              console.warn('Stored user is not admin, redirecting to login')
              navigate('/admin/login')
              setLoading(false)
              return
            }
          } catch (e) {
            console.error('Error parsing admin user:', e)
            navigate('/admin/login')
            setLoading(false)
            return
          }
        } else {
          console.warn('No admin authentication found - redirecting to login')
          message.error('Admin authentication required.')
          navigate('/admin/login')
          setLoading(false)
          return
        }
      }

      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && searchText.trim() !== '' && { q: searchText.trim() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(trendingFilter !== 'all' && { trending: trendingFilter === 'true' })
      }

      console.log('Admin products params:', params)

      const response = await productAPI.getAdminProducts(params)
      console.log('Admin products response:', response.data)
      
      if (response.data.success) {
        console.log('✅ Admin products API call successful!')
        // Backend returns: { success: true, data: { products: [], pagination: {} } }
        const productsList = response.data.data?.products || []
        const paginationData = response.data.data?.pagination || {}
        
        if (!productsList || productsList.length === 0) {
          console.warn('No products returned from API')
        }
        
        setProducts(productsList)
        setPagination(prev => ({
          ...prev,
          total: paginationData.total || productsList.length
        }))
        
        // Calculate statistics from all products (not just current page)
        // Note: These stats are for current page only, consider fetching total stats separately
        const published = productsList.filter(p => p.status === 'published').length
        const draft = productsList.filter(p => p.status === 'draft').length
        const trending = productsList.filter(p => p.trending).length
        const previewSaved = productsList.filter(p => p.previewSaved).length
        const revenue = productsList.reduce((sum, p) => sum + (p.price || 0), 0)
        
        setStats({
          totalProducts: paginationData.total || productsList.length,
          publishedProducts: published,
          draftProducts: draft,
          trendingProducts: trending,
          previewSavedProducts: previewSaved,
          totalRevenue: revenue
        })
        console.log('Products fetched successfully:', productsList.length, 'items')
      } else {
        console.error('Admin products API returned unsuccessful response:', response.data)
        const errorMsg = response.data.message || 'Failed to fetch products. Please try again.'
        setError(errorMsg)
        message.error(errorMsg)
        setProducts([])
        setStats({
          totalProducts: 0,
          publishedProducts: 0,
          draftProducts: 0,
          trendingProducts: 0,
          previewSavedProducts: 0,
          totalRevenue: 0
        })
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to fetch products')
      console.error('Error fetching products:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error message:', error.message)
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.error('Authentication failed (401) - clearing tokens and redirecting')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('token')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('user')
        localStorage.removeItem('adminUser')
        message.error('Authentication failed. Please log in again.')
        navigate('/admin/login')
      } else if (error.response?.status === 403) {
        console.error('Access denied (403) - Admin privileges required')
        message.error('Access denied. Admin privileges required.')
        navigate('/admin/login')
      } else if (error.response?.status === 500) {
        console.error('Server error (500):', error.response?.data)
        message.error('Server error. Please try again later or contact support.')
      } else if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR' || !error.response) {
        console.error('Network error:', {
          code: error.code,
          message: error.message,
          url: error.config?.url,
          baseURL: error.config?.baseURL
        })
        message.error('Network error. Please check your connection and ensure the backend server is running at http://localhost:7000')
      } else {
        console.error('Unknown error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        message.error(`Unable to fetch products: ${error.response?.data?.message || error.message || 'Unknown error'}`)
      }
      
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value) => {
    setSearchText(value)
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchProducts()
  }

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'status') {
      setStatusFilter(value)
    } else if (filterType === 'trending') {
      setTrendingFilter(value)
    }
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchProducts()
  }

  const handleTableChange = (pagination) => {
    setPagination(pagination)
  }

  const handlePreview = (product) => {
    setPreviewProduct(product)
    setPreviewModalVisible(true)
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    form.setFieldsValue({
      title: product.title,
      price: product.price,
      status: product.status,
      trending: product.trending,
      developerName: product.developerName
    })
    setEditModalVisible(true)
  }

  const handleDuplicate = async (product) => {
    try {
      const duplicateData = {
        ...product,
        title: `${product.title} (Copy)`,
        slug: `${product.slug}-copy-${Date.now()}`,
        status: 'draft'
      }
      
      const response = await productAPI.createProduct(duplicateData)
      if (response.data.success) {
        message.success('Product duplicated successfully!')
        fetchProducts()
      } else {
        message.error(response.data.message || 'Failed to duplicate product')
      }
    } catch (error) {
      console.error('Error duplicating product:', error)
      message.error('Failed to duplicate product. Please try again.')
    }
  }

  const handleUpdateProduct = async (values) => {
    try {
      console.log('Updating product:', editingProduct._id, values)
      const response = await productAPI.updateProduct(editingProduct._id, values)
      console.log('Update response:', response.data)
      
      if (response.data.success) {
        message.success('Product updated successfully!')
        setEditModalVisible(false)
        fetchProducts()
      } else {
        console.error('Update failed:', response.data.message)
        message.error(response.data.message || 'Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      if (error.response?.data?.message) {
        message.error(`Failed to update product: ${error.response.data.message}`)
      } else if (error.response?.data?.errors) {
        message.error(`Validation error: ${error.response.data.errors.join(', ')}`)
      } else {
        message.error('Failed to update product. Please try again.')
      }
    }
  }

  const handleDelete = async (productId) => {
    try {
      console.log('🗑️ Deleting product:', productId)
      console.log('🗑️ API URL:', import.meta.env.VITE_API_URL || 'http://localhost:7000/api')
      console.log('🗑️ Full URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:7000/api'}/admin/products/${productId}`)
      
      const response = await productAPI.deleteProduct(productId)
      console.log('🗑️ Delete response:', response)
      
      if (response.data.success) {
        message.success('Product deleted successfully!')
        fetchProducts()
      } else {
        message.error(response.data.message || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      console.error('Error details:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error URL:', error.config?.url)
      message.error('Failed to delete product. Please try again.')
    }
  }

  const handleBulkDelete = async () => {
    try {
      const deletePromises = selectedRowKeys.map(id => productAPI.deleteProduct(id))
      await Promise.all(deletePromises)
      message.success(`${selectedRowKeys.length} products deleted successfully!`)
      setSelectedRowKeys([])
      fetchProducts()
    } catch (error) {
      console.error('Error deleting products:', error)
      message.error('Failed to delete selected products. Please try again.')
    }
  }

  const handleRefreshProducts = async () => {
    console.log('Refreshing products...')
    try {
      // Check authentication first
      if (!isAuthenticated || user?.role !== 'admin') {
        message.error('Please log in as admin to refresh products.')
        return
      }
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      if (!token) {
        message.error('Please log in to access admin features.')
        navigate('/admin/login')
        return
      }
      
      await fetchProducts()
      message.success('Products refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing products:', error)
      message.error('Failed to refresh products. Please try again.')
    }
  }

  const handleSaveAsPreview = async (product) => {
    try {
      console.log('Saving product as preview:', product.title)
      
      // Check authentication
      if (!isAuthenticated || user?.role !== 'admin') {
        message.error('Please log in as admin to save products.')
        return
      }
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      if (!token) {
        message.error('Please log in to access admin features.')
        navigate('/admin/login')
        return
      }

      // Update product status to 'draft' (preview)
      const response = await fetch(`http://localhost:7000/api/admin/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'draft',
          previewSaved: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        message.success('Product saved as preview successfully!')
        // Refresh the products list
        await fetchProducts()
      } else {
        message.error(data.message || 'Failed to save product as preview.')
      }
    } catch (error) {
      console.error('Error saving product as preview:', error)
      message.error('Failed to save product as preview. Please try again.')
    }
  }

  const handlePublish = async (product) => {
    try {
      console.log('Publishing product:', product.title)
      
      // Check authentication
      if (!isAuthenticated || user?.role !== 'admin') {
        message.error('Please log in as admin to publish products.')
        return
      }
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token')
      if (!token) {
        message.error('Please log in to access admin features.')
        navigate('/admin/login')
        return
      }

      // Update product status to 'published' and send notifications
      const response = await fetch(`http://localhost:7000/api/admin/products/${product._id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'published',
          notifyUsers: true,
          notifyAdmins: true
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        message.success('Product published successfully! Notifications sent to users and admins.')
        // Refresh the products list
        await fetchProducts()
      } else {
        message.error(data.message || 'Failed to publish product.')
      }
    } catch (error) {
      console.error('Error publishing product:', error)
      message.error('Failed to publish product. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'published': 'green',
      'draft': 'orange',
      'archived': 'red'
    }
    // Handle non-string status values
    const statusString = String(status || 'unknown')
    return colors[statusString] || 'default'
  }

  const getStatusIcon = (status) => {
    const icons = {
      'published': <CheckCircleOutlined />,
      'draft': <ClockCircleOutlined />,
      'archived': <ExclamationCircleOutlined />
    }
    // Handle non-string status values
    const statusString = String(status || 'unknown')
    return icons[statusString] || <ClockCircleOutlined />
  }

  const getActionMenu = (product) => [
    {
      key: 'preview',
      icon: <EyeOutlined />,
      label: 'Preview',
      onClick: () => handlePreview(product)
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(product)
    },
    {
      key: 'savePreview',
      icon: <ClockCircleOutlined />,
      label: 'Save as Preview',
      onClick: () => handleSaveAsPreview(product)
    },
    {
      key: 'publish',
      icon: <CheckCircleOutlined />,
      label: 'Publish Product',
      onClick: () => handlePublish(product)
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => handleDuplicate(product)
    },
    {
      key: 'view',
      icon: <GlobalOutlined />,
      label: 'View Live',
      onClick: () => window.open(`/product/${product.slug}`, '_blank')
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(product._id)
    }
  ]

  const columns = [
    {
      title: 'Product',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flexShrink: 0 }}>
            {record.thumbnailUrl ? (
              <Image
                src={`http://localhost:7000${record.thumbnailUrl}`}
                alt={text}
                width={64}
                height={64}
                style={{ 
                  borderRadius: '12px',
                  objectFit: 'cover',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3YODp+9aX7l4xGq9wB4e6B1QKiu9CknTAcXU9UCFJYCH2fAACUI2BuXJFSAYpO0WakQICBxVn8GIC9S34BGyAbJQ8HqkyMwmI2gBZxJAiHA+wW7SDx2BuHQkDo7mDDIIBWj+7G1pC5mNjBZAKqss8QwQrNvzqSTAPRrFElPNYQ2gApi0lTuJUHt6aA2YlGQ9haC+dX1Cew1HEwUGJ9MwJnCrqS60S8HA4JKJYGdSUSALpJ3OsFB7M4cBwJjeQrR4gBGB7w=="
              />
            ) : (
              <Avatar 
                size={64} 
                icon={<ShoppingCartOutlined />} 
                style={{ 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '15px', 
              marginBottom: '6px',
              color: '#1f2937',
              lineHeight: '1.4'
            }}>
              {text}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#6b7280', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <UserOutlined style={{ fontSize: '12px' }} />
              by {record.developerName || 'Unknown'}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#9ca3af',
              marginBottom: '8px'
            }}>
              {record.websiteUrl ? (
                <a 
                  href={record.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <LinkOutlined style={{ fontSize: '11px' }} />
                  Visit Website
                </a>
              ) : (
                <span style={{ color: '#9ca3af' }}>No website</span>
              )}
            </div>
            <div>
              {record.tags && record.tags.length > 0 && (
                <Space size="small" wrap>
                  {record.tags.slice(0, 3).map(tag => (
                    <Tag 
                      key={tag} 
                      size="small" 
                      color="blue"
                      style={{ 
                        borderRadius: '4px',
                        fontSize: '11px',
                        padding: '2px 6px'
                      }}
                    >
                      {tag}
                    </Tag>
                  ))}
                  {record.tags.length > 3 && (
                    <Tag 
                      size="small" 
                      color="default"
                      style={{ 
                        borderRadius: '4px',
                        fontSize: '11px',
                        padding: '2px 6px'
                      }}
                    >
                      +{record.tags.length - 3}
                    </Tag>
                  )}
                </Space>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Tag 
            color={getStatusColor(status)} 
            icon={getStatusIcon(status)}
            style={{ 
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              padding: '4px 8px',
              border: 'none'
            }}
          >
            {String(status || 'unknown').toUpperCase()}
          </Tag>
          {record.previewSaved && (
            <Tag 
              color="blue" 
              icon={<ClockCircleOutlined />} 
              size="small"
              style={{ 
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '500',
                padding: '2px 6px',
                border: 'none'
              }}
            >
              PREVIEW SAVED
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#059669',
            marginBottom: '2px'
          }}>
            ${price}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {record.currency || 'USD'}
          </div>
        </div>
      )
    },
    {
      title: 'Trending',
      dataIndex: 'trending',
      key: 'trending',
      width: 100,
      render: (trending) => (
        <div style={{ textAlign: 'center' }}>
          {trending ? (
            <Tag 
              color="red" 
              icon={<FireOutlined />}
              style={{ 
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                color: 'white'
              }}
            >
              TRENDING
            </Tag>
          ) : (
            <Tag 
              style={{ 
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#6b7280'
              }}
            >
              Normal
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Views',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      width: 80,
      render: (visits) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <EyeOutlined style={{ color: '#6b7280', fontSize: '14px' }} />
          <Text style={{ 
            fontWeight: '600', 
            color: '#374151',
            fontSize: '13px'
          }}>
            {visits || 0}
          </Text>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'averageRating',
      key: 'averageRating',
      width: 120,
      render: (rating, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '4px' }}>
            <Rate 
              disabled 
              value={rating || 0} 
              style={{ fontSize: '14px' }}
              allowHalf
            />
          </div>
          <Text style={{ 
            fontSize: '11px', 
            color: '#6b7280',
            fontWeight: '500'
          }}>
            ({record.reviewsCount || 0} reviews)
          </Text>
        </div>
      )
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '500',
            color: '#374151',
            marginBottom: '2px'
          }}>
            {new Date(date).toLocaleDateString()}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            fontWeight: '400'
          }}>
            {new Date(date).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '4px'
        }}>
          <Tooltip title="Preview Product">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
              style={{ 
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#374151'
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Product">
            <Button 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ 
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                background: '#3b82f6',
                color: 'white'
              }}
            />
          </Tooltip>
          <Dropdown menu={{ items: getActionMenu(record) }} trigger={['click']}>
            <Button 
              size="small" 
              icon={<MoreOutlined />}
              style={{ 
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#6b7280'
              }}
            />
          </Dropdown>
        </div>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      name: record.title,
    }),
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={2}>Access Denied</Title>
          <Text>Please login as an admin to access this page.</Text>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && !loading && products.length === 0) {
    return (
      <DashboardLayout userRole="admin">
        <div style={{ 
          padding: AdminDesignSystem.layout.content.padding, 
          background: AdminDesignSystem.colors.background, 
          minHeight: '100vh',
        }}>
          <Alert
            message="Error Loading Products"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={fetchProducts} loading={loading}>
                Retry
              </Button>
            }
            style={{ marginBottom: AdminDesignSystem.spacing.lg }}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <App>
      <DashboardLayout userRole="admin">
      <div style={{ 
        padding: AdminDesignSystem.layout.content.padding, 
        background: AdminDesignSystem.colors.background, 
        minHeight: '100vh',
        maxWidth: '100%',
        overflow: 'hidden',
        fontFamily: AdminDesignSystem.typography.fontFamily,
      }}>
        {/* Header Section */}
        <div style={{ 
          marginBottom: AdminDesignSystem.spacing.xl,
          background: AdminDesignSystem.colors.card.background,
          padding: AdminDesignSystem.spacing.lg,
          borderRadius: AdminDesignSystem.borderRadius.md,
          boxShadow: AdminDesignSystem.shadows.md,
          border: `1px solid ${AdminDesignSystem.colors.card.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: AdminDesignSystem.spacing.md }}>
            <div>
              <Title 
                level={2} 
                style={{ 
                  margin: 0, 
                  color: AdminDesignSystem.colors.text.primary,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                  fontSize: AdminDesignSystem.typography.fontSize.h2,
                }}
              >
                <ShoppingCartOutlined style={{ marginRight: AdminDesignSystem.spacing.md, color: AdminDesignSystem.colors.primary }} />
                Products Management
              </Title>
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: AdminDesignSystem.typography.fontSize.body, 
                  marginTop: AdminDesignSystem.spacing.sm, 
                  display: 'block',
                  color: AdminDesignSystem.colors.text.secondary,
                }}
              >
                Manage your product catalog, view analytics, and track performance
              </Text>
            </div>
            <div>
              <Button 
                type="primary" 
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate('/admin/products/new')}
                style={{ 
                  borderRadius: AdminDesignSystem.borderRadius.md,
                  height: '40px',
                  paddingLeft: AdminDesignSystem.spacing.lg,
                  paddingRight: AdminDesignSystem.spacing.lg,
                  fontWeight: AdminDesignSystem.typography.fontWeight.medium,
                  backgroundColor: AdminDesignSystem.colors.primary,
                  borderColor: AdminDesignSystem.colors.primary,
                }}
              >
                Add New Product
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Total Products
                  </Text>
                }
                value={stats.totalProducts}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<ShoppingCartOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Published
                  </Text>
                }
                value={stats.publishedProducts}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Draft
                  </Text>
                }
                value={stats.draftProducts}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.warning, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Preview Saved
                  </Text>
                }
                value={stats.previewSavedProducts}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Trending
                  </Text>
                }
                value={stats.trendingProducts}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.error, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<FireOutlined style={{ color: AdminDesignSystem.colors.error }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Card 
              style={{ 
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
              styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Revenue
                  </Text>
                }
                value={stats.totalRevenue}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success, 
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
                prefix={<DollarOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters and Actions */}
        <Card 
          style={{ 
            marginBottom: AdminDesignSystem.spacing.xl,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
          styles={{ body: { padding: AdminDesignSystem.spacing.lg } }}
        >
          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} align="middle">
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ marginBottom: AdminDesignSystem.spacing.sm }}>
                <Text 
                  strong 
                  style={{ 
                    color: AdminDesignSystem.colors.text.primary, 
                    fontSize: AdminDesignSystem.typography.fontSize.small,
                    fontWeight: AdminDesignSystem.typography.fontWeight.medium,
                  }}
                >
                  Search Products
                </Text>
              </div>
              <Search
                placeholder="Search by title, developer, or tags..."
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
                size="large"
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ marginBottom: AdminDesignSystem.spacing.sm }}>
                <Text 
                  strong 
                  style={{ 
                    color: AdminDesignSystem.colors.text.primary, 
                    fontSize: AdminDesignSystem.typography.fontSize.small,
                    fontWeight: AdminDesignSystem.typography.fontWeight.medium,
                  }}
                >
                  Status Filter
                </Text>
              </div>
              <Select
                placeholder="All Status"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={(value) => handleFilterChange('status', value)}
                size="large"
              >
                <Option value="all">All Status</Option>
                <Option value="published">Published</Option>
                <Option value="draft">Draft</Option>
                <Option value="archived">Archived</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <div style={{ marginBottom: AdminDesignSystem.spacing.sm }}>
                <Text 
                  strong 
                  style={{ 
                    color: AdminDesignSystem.colors.text.primary, 
                    fontSize: AdminDesignSystem.typography.fontSize.small,
                    fontWeight: AdminDesignSystem.typography.fontWeight.medium,
                  }}
                >
                  Trending Filter
                </Text>
              </div>
              <Select
                placeholder="All Products"
                style={{ width: '100%' }}
                value={trendingFilter}
                onChange={(value) => handleFilterChange('trending', value)}
                size="large"
              >
                <Option value="all">All Products</Option>
                <Option value="true">Trending</Option>
                <Option value="false">Normal</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div style={{ marginBottom: AdminDesignSystem.spacing.sm }}>
                <Text 
                  strong 
                  style={{ 
                    color: AdminDesignSystem.colors.text.primary, 
                    fontSize: AdminDesignSystem.typography.fontSize.small,
                    fontWeight: AdminDesignSystem.typography.fontWeight.medium,
                  }}
                >
                  Actions
                </Text>
              </div>
              <Space wrap>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshProducts}
                  loading={loading}
                  size="large"
                  style={{ borderRadius: AdminDesignSystem.borderRadius.md }}
                >
                  Refresh
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} selected products?`}
                    onConfirm={handleBulkDelete}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button 
                      danger 
                      icon={<DeleteOutlined />}
                      size="large"
                      style={{ 
                        borderRadius: AdminDesignSystem.borderRadius.md,
                        backgroundColor: AdminDesignSystem.colors.error,
                        borderColor: AdminDesignSystem.colors.error,
                      }}
                    >
                      Delete ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Products Table */}
        <Card 
          style={{ 
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            overflow: 'hidden',
            background: AdminDesignSystem.colors.card.background,
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ 
            padding: AdminDesignSystem.spacing.lg, 
            borderBottom: `1px solid ${AdminDesignSystem.colors.card.border}`,
            background: AdminDesignSystem.colors.sidebar.background,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title 
                  level={4} 
                  style={{ 
                    margin: 0, 
                    color: AdminDesignSystem.colors.text.primary,
                    fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                  }}
                >
                  Products List
                </Title>
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: AdminDesignSystem.typography.fontSize.small,
                    color: AdminDesignSystem.colors.text.secondary,
                  }}
                >
                  {products.length} products found
                </Text>
              </div>
              <div>
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: AdminDesignSystem.typography.fontSize.tiny,
                    color: AdminDesignSystem.colors.text.secondary,
                  }}
                >
                  Select products to perform bulk actions
                </Text>
              </div>
            </div>
          </div>
          {error && products.length > 0 && (
            <Alert
              message="Warning"
              description={error}
              type="warning"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: AdminDesignSystem.spacing.md }}
            />
          )}
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={products}
            loading={loading}
            rowKey="_id"
            locale={{
              emptyText: loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: AdminDesignSystem.spacing.md, color: AdminDesignSystem.colors.text.secondary }}>
                    Loading products...
                  </div>
                </div>
              ) : (
                <Empty
                  description={
                    <span style={{ color: AdminDesignSystem.colors.text.secondary }}>
                      No products found. Try adjusting your filters or add a new product.
                    </span>
                  }
                />
              )
            }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} products`,
              style: { padding: '16px 24px' }
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            style={{ 
              background: 'white'
            }}
            rowClassName={(record, index) => 
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
          />
        </Card>

        {/* Product Preview Modal */}
        <Drawer
          title="Product Preview"
          placement="right"
          width={600}
          open={previewModalVisible}
          onClose={() => setPreviewModalVisible(false)}
        >
          {previewProduct && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {previewProduct.thumbnailUrl ? (
                  <Image
                    src={`http://localhost:7000${previewProduct.thumbnailUrl}`}
                    alt={previewProduct.title}
                    width={200}
                    height={150}
                    style={{ borderRadius: '8px' }}
                  />
                ) : (
                  <Avatar size={200} icon={<ShoppingCartOutlined />} />
                )}
              </div>
              
              <Tabs defaultActiveKey="details">
                <TabPane tab="Details" key="details">
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Title">{previewProduct.title}</Descriptions.Item>
                    <Descriptions.Item label="Developer">{previewProduct.developerName}</Descriptions.Item>
                    <Descriptions.Item label="Price">${previewProduct.price} {previewProduct.currency}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={getStatusColor(previewProduct.status)}>
                        {String(previewProduct.status || 'unknown').toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Trending">
                      {previewProduct.trending ? (
                        <Tag color="red" icon={<FireOutlined />}>TRENDING</Tag>
                      ) : (
                        <Tag>Normal</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Views">{previewProduct.totalVisits || 0}</Descriptions.Item>
                    <Descriptions.Item label="Rating">
                      <Rate disabled value={previewProduct.averageRating || 0} />
                      <Text>({previewProduct.reviewsCount || 0} reviews)</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {new Date(previewProduct.createdAt).toLocaleDateString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Updated">
                      {new Date(previewProduct.updatedAt).toLocaleDateString()}
                    </Descriptions.Item>
                  </Descriptions>
                </TabPane>
                
                <TabPane tab="Description" key="description">
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5}>Auto Description</Title>
                    <Paragraph>{previewProduct.descriptionAuto || 'No auto description available.'}</Paragraph>
                  </div>
                  <div>
                    <Title level={5}>Manual Description</Title>
                    <Paragraph>{previewProduct.descriptionManual || 'No manual description available.'}</Paragraph>
                  </div>
                </TabPane>
                
                <TabPane tab="Tags & Categories" key="tags">
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5}>Tags</Title>
                    <Space wrap>
                      {previewProduct.tags?.map(tag => (
                        <Tag key={tag} color="blue">{tag}</Tag>
                      )) || <Text type="secondary">No tags</Text>}
                    </Space>
                  </div>
                  <div>
                    <Title level={5}>Categories</Title>
                    <Space wrap>
                      {previewProduct.categories?.map(category => (
                        <Tag key={category} color="green">{category}</Tag>
                      )) || <Text type="secondary">No categories</Text>}
                    </Space>
                  </div>
                </TabPane>
                
                <TabPane tab="Tech Stack" key="tech">
                  <Space wrap>
                    {previewProduct.techStack?.map(tech => (
                      <Tag key={tech} color="purple">{tech}</Tag>
                    )) || <Text type="secondary">No tech stack specified</Text>}
                  </Space>
                </TabPane>
              </Tabs>
              
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => {
                      setPreviewModalVisible(false)
                      handleEdit(previewProduct)
                    }}
                  >
                    Edit Product
                  </Button>
                  <Button 
                    icon={<GlobalOutlined />}
                    onClick={() => window.open(`/product/${previewProduct.slug}`, '_blank')}
                  >
                    View Live
                  </Button>
                  <Button 
                    icon={<CopyOutlined />}
                    onClick={() => {
                      setPreviewModalVisible(false)
                      handleDuplicate(previewProduct)
                    }}
                  >
                    Duplicate
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </Drawer>

        {/* Edit Modal */}
        <Modal
          title="Edit Product"
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProduct}
          >
            <Form.Item
              name="title"
              label="Product Title"
              rules={[{ required: true, message: 'Please enter product title' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="price"
              label="Price"
              rules={[{ required: true, message: 'Please enter price' }]}
            >
              <Input type="number" prefix="$" />
            </Form.Item>
            
            <Form.Item
              name="developerName"
              label="Developer Name"
              rules={[{ required: true, message: 'Please enter developer name' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select>
                <Option value="draft">Draft</Option>
                <Option value="published">Published</Option>
                <Option value="archived">Archived</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="trending"
              label="Trending"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setEditModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Update Product
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
    </App>
  )
}

export default ProductsEnhanced
