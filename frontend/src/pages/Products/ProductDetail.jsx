import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Image, 
  Avatar, 
  Rate, 
  Breadcrumb, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Checkbox,
  message, 
  Spin,
  Alert,
  Statistic,
  Tooltip,
  App
} from 'antd'
import { 
  ShareAltOutlined,
  HeartOutlined,
  EyeOutlined,
  UserOutlined,
  DollarOutlined,
  GlobalOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import { productAPI, api } from '../../services/api'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const ProductDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading, refreshToken } = useAuth()
  const { message } = App.useApp()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [prebookModalVisible, setPrebookModalVisible] = useState(false)
  const [prebookLoading, setPrebookLoading] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [prebookData, setPrebookData] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [form] = Form.useForm()

  // Format phone number for Razorpay
  const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // If it starts with 91, keep it as is
    if (digits.startsWith('91') && digits.length === 12) {
      return `+${digits}`
    }
    
    // If it's 10 digits, add +91
    if (digits.length === 10) {
      return `+91${digits}`
    }
    
    // If it's already 12 digits, add +
    if (digits.length === 12) {
      return `+${digits}`
    }
    
    // For invalid numbers, return empty string to avoid Razorpay errors
    console.warn('Invalid phone number format:', phone)
    return ''
  }

  useEffect(() => {
    // Wait for auth to finish loading before fetching product
    if (slug && !authLoading) {
      fetchProduct()
    }
  }, [slug, authLoading])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await productAPI.getProductBySlug(slug)
      
      if (response.data.success) {
        setProduct(response.data.data.product)
        // Increment visit count
        try {
          await productAPI.trackVisit(response.data.data.product._id, {
            ip: '127.0.0.1',
            userAgent: navigator.userAgent,
            referrer: document.referrer
          })
        } catch (visitError) {
          console.warn('⚠️ Failed to increment visit count:', visitError)
          // Don't fail the whole request for this
        }
      } else {
        console.error('❌ Product not found:', response.data.message)
        message.error('Product not found')
        navigate('/products')
      }
    } catch (error) {
      console.error('❌ Error fetching product:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      message.error('Failed to load product')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const handlePrebook = () => {
    if (!isAuthenticated) {
      message.warning('Please log in to prebook this product', 3)
      setTimeout(() => {
        navigate('/login')
      }, 1000)
      return
    }
    setPrebookModalVisible(true)
  }

  const handlePrebookSubmit = async (values) => {
    setPrebookLoading(true)
    try {
      // Format data according to backend expectations
      const prebookData = {
        projectType: values.projectType,
        budget: values.budget,
        timeline: parseInt(values.timeline), // Convert to number
        features: values.features || [], // Array of selected features
        notes: values.additionalRequirements || '',
        contactInfo: {
          name: values.name,
          email: values.email,
          phone: values.phone || '',
          company: values.company || '',
          preferredContact: values.preferredContact || 'email'
        }
      }
      
      const response = await productAPI.createPrebook(product._id, prebookData)
      
      if (response.data.success) {
        message.success('Prebook request created! Opening payment...')
        setPrebookModalVisible(false)
        form.resetFields()
        
        // Store prebook data and show payment modal
        const prebookData = {
          ...response.data.data,
          product: product
        }
        setPrebookData(prebookData)
        setPaymentError(null) // Clear any previous errors
        setRetryCount(0) // Reset retry count
        setPaymentModalVisible(true)
      } else {
        message.error(response.data.message || 'Failed to submit prebook request')
      }
    } catch (error) {
      console.error('❌ Error submitting prebook:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      message.error('Failed to submit prebook request. Please try again.')
    } finally {
      setPrebookLoading(false)
    }
  }

  const showPrebookConfirmation = () => {
    message.success({
      content: 'Prebook request submitted! We\'ll contact you soon.',
      duration: 5
    })
  }

  const handlePayment = async () => {
    if (!isAuthenticated) {
      message.error('Please login to proceed with payment')
      navigate('/login')
      return
    }

    setPaymentLoading(true)
    setPaymentError(null) // Clear any previous errors

    // Try to refresh token before payment
    try {
      if (refreshToken && typeof refreshToken === 'function') {
        const refreshResult = await refreshToken()
        if (!refreshResult.success) {
          console.warn('Token refresh failed, proceeding with current token')
        }
      } else {
        console.warn('refreshToken function not available, proceeding with current token')
      }
    } catch (error) {
      console.warn('Token refresh error:', error)
    }
    
    // Format phone number for Razorpay
    const formattedPhone = formatPhoneNumber(prebookData?.contactInfo?.phone || user?.phone || '')
    
    try {
      // Load Razorpay script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = async () => {
        try {
          // Validate prebook data
          if (!prebookData || !prebookData._id) {
            throw new Error('Prebook data is missing. Please try creating the prebook request again.')
          }

          // Get fresh token
          const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
          if (!token) {
            throw new Error('No authentication token found. Please login again.')
          }

          // First create the order with backend
          const orderResponse = await fetch('http://localhost:7000/api/payments/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              prebookId: prebookData?._id,
              amount: 100 // ₹1 in paise
            })
          })

          // Handle 401 specifically
          if (orderResponse.status === 401) {
            console.error('❌ Token expired during payment order creation')
            
            // Try to refresh token and retry once
            try {
              if (refreshToken && typeof refreshToken === 'function') {
                const refreshResult = await refreshToken()
                if (refreshResult.success) {
                  
                  // Retry the order creation with new token
                  const retryOrderResponse = await fetch('http://localhost:7000/api/payments/create-order', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${refreshResult.accessToken}`
                    },
                    body: JSON.stringify({
                      prebookId: prebookData._id,
                      amount: 100 // ₹1 in paise
                    })
                  })

                  if (retryOrderResponse.ok) {
                    const retryOrderData = await retryOrderResponse.json()
                    if (retryOrderData.success) {
                      // Continue with the successful order
                      const options = {
                        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_RUuZIGTpYBor0z',
                        amount: retryOrderData.data.amount,
                        currency: retryOrderData.data.currency,
                        name: 'ITWOS AI',
                        description: `Prebook Fee for ${prebookData?.product?.title || 'Product'}`,
                        image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzE4OTBmZiIvPgo8dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JVDwvdGV4dD4KPC9zdmc+',
                        order_id: retryOrderData.data.order_id,
                        handler: async function (response) {
                          try {
                            const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
                            if (!token) {
                              throw new Error('No authentication token found. Please login again.')
                            }

                            const verifyResponse = await fetch('http://localhost:7000/api/payments/verify', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                prebookId: prebookData._id
                              })
                            })

                            if (verifyResponse.status === 401) {
                              console.error('❌ Token expired during payment verification')
                              message.error('Your session has expired. Please login again.')
                              setPaymentLoading(false)
                              return
                            }

                            const result = await verifyResponse.json()
                            
                            if (result.success) {
                              message.success('Payment successful! Your prebook has been confirmed.')
                              setPaymentModalVisible(false)
                              navigate('/user/prebooks', { 
                                state: { 
                                  message: 'Prebook confirmed successfully!',
                                  type: 'success'
                                }
                              })
                            } else {
                              console.error('Payment verification failed:', result)
                              message.error(result.message || 'Payment verification failed. Please contact support.')
                            }
                          } catch (error) {
                            console.error('Payment verification error:', error)
                            let errorMessage = 'Payment verification failed. Please try again or contact support.'
                            
                            if (error.response?.status === 400) {
                              errorMessage = error.response.data?.message || 'Payment verification failed'
                              setPaymentError(`${errorMessage}. Please try again or contact support.`)
                            } else if (error.response?.status === 401) {
                              errorMessage = 'Authentication failed. Please login again and try.'
                              setPaymentError(errorMessage)
                            } else if (error.response?.status === 404) {
                              errorMessage = 'Prebook not found. Please try creating a new prebook.'
                              setPaymentError(errorMessage)
                            } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
                              errorMessage = 'Network error. Please check your internet connection and try again.'
                              setPaymentError(errorMessage)
                            } else {
                              setPaymentError(errorMessage)
                            }
                            
                            message.error(errorMessage)
                            setPaymentLoading(false)
                          }
                        },
                        prefill: {
                          name: user?.name || prebookData?.contactInfo?.name || '',
                          email: user?.email || prebookData?.contactInfo?.email || '',
                          contact: formatPhoneNumber(prebookData?.contactInfo?.phone || user?.phone || '') || undefined
                        },
                        notes: {
                          address: 'ITWOS AI Office',
                          prebook_id: prebookData?._id
                        },
                        theme: {
                          color: '#1890ff'
                        },
                        upi: {
                          flow: 'collect',
                          vpa: 'itwosai@paytm'
                        },
                        customer: {
                          name: user?.name || prebookData?.contactInfo?.name || '',
                          email: user?.email || prebookData?.contactInfo?.email || '',
                          contact: formatPhoneNumber(prebookData?.contactInfo?.phone || user?.phone || '') || undefined
                        },
                        retry: {
                          enabled: true,
                          max_count: 3
                        }
                      }

                      const rzp = new window.Razorpay(options)
                      
                      rzp.on('payment.failed', function (response) {
                        console.error('Payment failed:', response.error)
                        const errorMsg = `Payment failed: ${response.error.description || 'Unknown error'}. Please try again.`
                        setPaymentError(errorMsg)
                        message.error(errorMsg)
                        setPaymentLoading(false)
                      })
                      
                      rzp.on('payment.cancel', function (response) {
                        setPaymentError(null)
                        message.warning('Payment was cancelled. You can try again anytime.')
                        setPaymentLoading(false)
                      })
                      
                      rzp.open()
                      return
                    }
                  }
                }
              } else {
                console.warn('refreshToken function not available for retry')
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
            }
            
            setPaymentError('Your session has expired. Please login again and try the payment.')
            message.error('Session expired. Please login again.')
            setPaymentLoading(false)
            return
          }

          if (!orderResponse.ok) {
            throw new Error(`HTTP ${orderResponse.status}: ${orderResponse.statusText}`)
          }

          const orderData = await orderResponse.json()
          
          if (!orderData.success) {
            throw new Error(orderData.message || 'Failed to create payment order')
          }

          const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_RUuZIGTpYBor0z', // Your live Razorpay key
            amount: orderData.data.amount,
            currency: orderData.data.currency,
            name: 'ITWOS AI',
            description: `Prebook Fee for ${prebookData?.product?.title || 'Product'}`,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzE4OTBmZiIvPgo8dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JVDwvdGV4dD4KPC9zdmc+',
            order_id: orderData.data.order_id,
            handler: async function (response) {
            try {
              // Get fresh token for verification
              const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
              if (!token) {
                throw new Error('No authentication token found. Please login again.')
              }

              // Verify payment with backend
              const verifyResponse = await fetch('http://localhost:7000/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  prebookId: prebookData._id
                })
              })

              // Handle 401 specifically
              if (verifyResponse.status === 401) {
                console.error('❌ Token expired during payment verification')
                message.error('Your session has expired. Please login again.')
                setPaymentLoading(false)
                return
              }

              const result = await verifyResponse.json()
              
              if (result.success) {
                message.success('Payment successful! Your prebook has been confirmed.')
                setPaymentModalVisible(false)
                navigate('/user/prebooks', { 
                  state: { 
                    message: 'Prebook confirmed successfully!',
                    type: 'success'
                  }
                })
              } else {
                console.error('Payment verification failed:', result)
                message.error(result.message || 'Payment verification failed. Please contact support.')
              }
            } catch (error) {
              console.error('Payment verification error:', error)
              
              // Handle specific error types
              let errorMessage = 'Payment verification failed. Please try again or contact support.'
              
              if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Payment verification failed'
                setPaymentError(`${errorMessage}. Please try again or contact support.`)
              } else if (error.response?.status === 401) {
                errorMessage = 'Authentication failed. Please login again and try.'
                setPaymentError(errorMessage)
              } else if (error.response?.status === 404) {
                errorMessage = 'Prebook not found. Please try creating a new prebook.'
                setPaymentError(errorMessage)
              } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
                errorMessage = 'Network error. Please check your internet connection and try again.'
                setPaymentError(errorMessage)
              } else {
                setPaymentError(errorMessage)
              }
              
              message.error(errorMessage)
              setPaymentLoading(false)
            }
          },
          prefill: {
            name: user?.name || prebookData?.contactInfo?.name || '',
            email: user?.email || prebookData?.contactInfo?.email || '',
            contact: formatPhoneNumber(prebookData?.contactInfo?.phone || user?.phone || '') || undefined
          },
          notes: {
            address: 'ITWOS AI Office',
            prebook_id: prebookData?._id
          },
          theme: {
            color: '#1890ff'
          },
          // Add UPI configuration
          upi: {
            flow: 'collect',
            vpa: 'itwosai@paytm' // You can change this to your UPI ID
          },
          // Disable customer validation to avoid 400 errors
          customer: {
            name: user?.name || prebookData?.contactInfo?.name || '',
            email: user?.email || prebookData?.contactInfo?.email || '',
            contact: formatPhoneNumber(prebookData?.contactInfo?.phone || user?.phone || '') || undefined
          },
          // Add retry configuration
          retry: {
            enabled: true,
            max_count: 3
          }
        }

        const rzp = new window.Razorpay(options)
        
        // Add error handling for Razorpay
        rzp.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error)
          const errorMsg = `Payment failed: ${response.error.description || 'Unknown error'}. Please try again.`
          setPaymentError(errorMsg)
          message.error(errorMsg)
          setPaymentLoading(false)
        })
        
        rzp.on('payment.cancel', function (response) {
          console.log('Payment cancelled:', response)
          setPaymentError(null) // Clear any previous errors
          message.warning('Payment was cancelled. You can try again anytime.')
          setPaymentLoading(false)
        })
        
          rzp.open()
        } catch (orderError) {
          console.error('Order creation error:', orderError)
          message.error('Failed to create payment order. Please try again.')
          setPaymentLoading(false)
        }
      }
      script.onerror = () => {
        message.error('Failed to load payment gateway. Please try again.')
        setPaymentLoading(false)
      }
      document.body.appendChild(script)
    } catch (error) {
      console.error('Payment error:', error)
      message.error('Payment failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: product.descriptionAuto,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      message.success('Link copied to clipboard!')
    }
  }

  const handleSave = () => {
    // TODO: Implement save to favorites
    message.success('Product saved to favorites!')
  }

  // Show loading while auth is being determined or product is being fetched
  if (authLoading || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', marginLeft: '16px' }}>
          {authLoading ? 'Loading...' : 'Loading product...'}
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={2}>Product Not Found</Title>
        <Button type="primary" onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <App>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          { title: <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Home</span> },
          { title: <span onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>Products</span> },
          { title: product.title }
        ]}
      />

      {/* Desktop Layout */}
      <Row gutter={[24, 24]} style={{ display: window.innerWidth >= 768 ? 'flex' : 'none' }}>
        {/* Left Column - Narrow */}
        <Col xs={24} md={8}>
          <Card style={{ marginBottom: '16px' }}>
            {product.thumbnailUrl ? (
              <Image
                src={`http://localhost:7000${product.thumbnailUrl}`}
                onError={(e) => {
                  e.target.src = '/placeholder-image.svg'
                }}
                alt={product.title}
                style={{ width: '100%', borderRadius: '8px' }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3YODp+9aX7l4xGq9wB4e6B1QKiu9CknTAcXU9UCFJYCH2fAACUI2BuXJFSAYpO0WakQICBxVn8GIC9S34BGyAbJQ8HqkyMwmI2gBZxJAiHA+wW7SDx2BuHQkDo7mDDIIBWj+7G1pC5mNjBZAKqss8QwQrNvzqSTAPRrFElPNYQ2gApi0lTuJUHt6aA2YlGQ9haC+dX1Cew1HEwUGJ9MwJnCrqS60S8HA4JKJYGdSUSALpJ3OsFB7M4cBwJjeQrR4gBGB7w=="
              />
            ) : (
              <Avatar size={200} icon={<GlobalOutlined />} style={{ width: '100%', height: '200px' }} />
            )}
          </Card>

          {/* Analytics */}
          <Card title="Analytics" style={{ marginBottom: '16px' }}>
            <Statistic
              title="Visits (Last 30 days)"
              value={product.totalVisits || 0}
              prefix={<EyeOutlined />}
            />
          </Card>

          {/* Website Details */}
          <Card title="Website Details" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Platform:</Text>
                <br />
                <Text>{product.platform || 'Web'}</Text>
              </div>
              <div>
                <Text strong>Features:</Text>
                <br />
                {product.features?.map((feature, index) => (
                  <Tag key={index} style={{ margin: '2px' }}>{feature}</Tag>
                )) || <Text type="secondary">No features listed</Text>}
              </div>
            </Space>
          </Card>

          {/* Developer */}
          <Card title="Developer" style={{ marginBottom: '16px' }}>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <div>
                <Text strong>{product.developerName}</Text>
                <br />
                <Text type="secondary">Developer</Text>
              </div>
            </Space>
          </Card>

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              icon={<ShareAltOutlined />} 
              onClick={handleShare}
              style={{ width: '100%' }}
            >
              Share
            </Button>
            <Button 
              icon={<HeartOutlined />} 
              onClick={handleSave}
              style={{ width: '100%' }}
            >
              Save
            </Button>
          </Space>
        </Col>

        {/* Right Column - Main */}
        <Col xs={24} md={16}>
          <Card>
            {/* Title */}
            <Title level={1} style={{ marginBottom: '16px' }}>
              {product.title}
            </Title>

            {/* Tags */}
            <Space wrap style={{ marginBottom: '16px' }}>
              {product.tags?.map(tag => (
                <Tag key={tag} color="blue">{tag}</Tag>
              ))}
            </Space>

            {/* Reviews Summary */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16} align="middle">
                <Col>
                  <Rate disabled value={product.averageRating || 0} />
                </Col>
                <Col>
                  <Text>({product.reviewsCount || 0} reviews)</Text>
                </Col>
                <Col>
                  <Text type="secondary">
                    {product.totalVisits || 0} views
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={4}>Description</Title>
              <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
                {product.descriptionAuto || product.descriptionManual || 'No description available.'}
              </Paragraph>
            </div>

            {/* Price and Prebook */}
            <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Row gutter={16} align="middle" justify="space-between">
                <Col>
                  <Space direction="vertical" size="small">
                    <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>
                      ${product.price} {product.currency || 'USD'}
                    </Text>
                    <Text type="secondary">Starting price</Text>
                  </Space>
                </Col>
                <Col>
                  <Button 
                    type="primary" 
                    size="large"
                    onClick={handlePrebook}
                    style={{ 
                      background: '#52c41a', 
                      borderColor: '#52c41a',
                      height: '50px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    Prebook Now
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* Product Path */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
              <Text type="secondary">
                Product URL: <LinkOutlined /> {window.location.href}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Mobile Layout - Stacked with thumbnail first, then content and prebook CTA pinned */}
      <div style={{ display: window.innerWidth < 768 ? 'block' : 'none' }}>
        {/* Thumbnail first */}
        <Card style={{ marginBottom: '16px' }}>
          {product.thumbnailUrl ? (
            <Image
              src={`http://localhost:7000${product.thumbnailUrl}`}
              onError={(e) => {
                e.target.src = '/placeholder-image.svg'
              }}
              alt={product.title}
              style={{ width: '100%', borderRadius: '8px' }}
            />
          ) : (
            <Avatar size={200} icon={<GlobalOutlined />} style={{ width: '100%', height: '200px' }} />
          )}
        </Card>

        <Card>
          <Title level={1}>{product.title}</Title>
          
          {/* Tags */}
          <Space wrap style={{ marginBottom: '16px' }}>
            {product.tags?.map(tag => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
          </Space>

          {/* Reviews Summary */}
          <Card size="small" style={{ marginBottom: '16px' }}>
            <Row gutter={16} align="middle">
              <Col>
                <Rate disabled value={product.averageRating || 0} />
              </Col>
              <Col>
                <Text>({product.reviewsCount || 0} reviews)</Text>
              </Col>
              <Col>
                <Text type="secondary">
                  {product.totalVisits || 0} views
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Full Description */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={4}>Description</Title>
            <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
              {product.descriptionAuto || product.descriptionManual || 'No description available.'}
            </Paragraph>
          </div>

          <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f', marginBottom: '16px' }}>
            <Row gutter={16} align="middle" justify="space-between">
              <Col>
                <Text strong style={{ fontSize: '24px', color: '#52c41a' }}>
                  ${product.price} {product.currency || 'USD'}
                </Text>
              </Col>
              <Col>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={handlePrebook}
                  style={{ 
                    background: '#52c41a', 
                    borderColor: '#52c41a',
                    height: '50px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Prebook Now
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Share and Save Buttons */}
          <Space style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              Share
            </Button>
            <Button icon={<HeartOutlined />} onClick={handleSave}>
              Save
            </Button>
          </Space>

          {/* Product Path/URL Display */}
          <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
            <Text type="secondary">
              <strong>Product URL:</strong> {window.location.href}
            </Text>
          </div>
        </Card>

        {/* Pinned Prebook Button for Mobile */}
        <div style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          background: 'white', 
          padding: '16px', 
          borderTop: '1px solid #d9d9d9',
          zIndex: 1000,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
        }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space direction="vertical" size="small">
                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                  ${product.price} {product.currency || 'USD'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Starting price
                </Text>
              </Space>
            </Col>
            <Col>
              <Button 
                type="primary" 
                size="large"
                onClick={handlePrebook}
                style={{ 
                  background: '#52c41a', 
                  borderColor: '#52c41a',
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  minWidth: '120px'
                }}
              >
                Prebook Now
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      {/* Prebook Modal */}
      <Modal
        title="Prebook Request"
        open={prebookModalVisible}
        onCancel={() => setPrebookModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePrebookSubmit}
        >
          <Row gutter={24}>
            {/* Left Side - Project Questions */}
            <Col xs={24} md={12}>
              <Title level={4}>Project Details</Title>
              
              <Form.Item
                name="projectType"
                label="What type of website/app do you want?"
                rules={[{ required: true, message: 'Please select project type' }]}
              >
                <Select placeholder="Select project type">
                  <Option value="website">Website</Option>
                  <Option value="web-app">Web Application</Option>
                  <Option value="mobile-app">Mobile Application</Option>
                  <Option value="ecommerce">E-commerce Store</Option>
                  <Option value="landing-page">Landing Page</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="features"
                label="What features do you need?"
                rules={[{ required: true, message: 'Please select at least one feature' }]}
              >
                <Checkbox.Group>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Checkbox value="responsive-design">Responsive Design</Checkbox>
                    <Checkbox value="seo-optimization">SEO Optimization</Checkbox>
                    <Checkbox value="user-authentication">User Authentication</Checkbox>
                    <Checkbox value="payment-integration">Payment Integration</Checkbox>
                    <Checkbox value="admin-dashboard">Admin Dashboard</Checkbox>
                    <Checkbox value="mobile-app">Mobile App</Checkbox>
                  </div>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item
                name="budget"
                label="How much do you want to spend?"
                rules={[{ required: true, message: 'Please select budget range' }]}
              >
                <Select placeholder="Select budget range">
                  <Option value="under-5k">Under $5,000</Option>
                  <Option value="5k-10k">$5,000 - $10,000</Option>
                  <Option value="10k-25k">$10,000 - $25,000</Option>
                  <Option value="25k-50k">$25,000 - $50,000</Option>
                  <Option value="50k-100k">$50,000 - $100,000</Option>
                  <Option value="100k-plus">$100,000+</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="timeline"
                label="How many days until you want the full website?"
                rules={[{ required: true, message: 'Please enter timeline in days' }]}
              >
                <Input 
                  type="number" 
                  placeholder="Enter number of days (e.g., 30)"
                  min="1"
                  max="365"
                />
              </Form.Item>

              <Form.Item
                name="additionalRequirements"
                label="Additional requirements"
              >
                <TextArea 
                  rows={3} 
                  placeholder="Any additional requirements or notes..."
                />
              </Form.Item>
            </Col>

            {/* Right Side - Contact Information */}
            <Col xs={24} md={12}>
              <Title level={4}>Contact Information</Title>
              
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
                initialValue={user?.name}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
                initialValue={user?.email}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone"
                rules={[
                  { required: true, message: 'Please enter your phone number' },
                  { 
                    pattern: /^(\+91|91|0)?[6-9]\d{9}$/, 
                    message: 'Please enter a valid Indian phone number' 
                  }
                ]}
                initialValue={user?.phone}
              >
                <Input placeholder="Enter 10-digit phone number" />
              </Form.Item>

              <Form.Item
                name="company"
                label="Company (Optional)"
                initialValue={user?.company}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="preferredContact"
                label="Preferred contact method"
                rules={[{ required: true, message: 'Please select preferred contact method' }]}
              >
                <Select placeholder="Select contact method">
                  <Option value="email">Email</Option>
                  <Option value="phone">Phone</Option>
                  <Option value="whatsapp">WhatsApp</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Submit Button */}
          <Row>
            <Col span={24} style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button 
                type="primary" 
                size="large"
                htmlType="submit"
                loading={prebookLoading}
                style={{ 
                  background: '#52c41a', 
                  borderColor: '#52c41a',
                  width: '200px',
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Send Prebook Request
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        title="Complete Payment"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={600}
        centered
      >
        {prebookData && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={3}>Prebook Payment</Title>
              <Paragraph type="secondary">
                Complete your payment to confirm your prebook request
              </Paragraph>
            </div>

            <Card style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Image
                    src={prebookData.product?.thumbnailUrl || '/placeholder.jpg'}
                    alt={prebookData.product?.title}
                    style={{ width: '100%', borderRadius: '8px' }}
                    fallback="/placeholder.jpg"
                  />
                </Col>
                <Col xs={24} sm={16}>
                  <Title level={4}>{prebookData.product?.title}</Title>
                  <Paragraph>
                    <Text strong>Project Type: </Text>
                    <Tag color="blue">{prebookData.projectType}</Tag>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>Budget: </Text>
                    <Tag color="green">{prebookData.budget}</Tag>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>Timeline: </Text>
                    <Tag color="orange">{prebookData.timeline} days</Tag>
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <Title level={4} style={{ color: '#52c41a', margin: 0 }}>Prebook Fee</Title>
                  <Text type="secondary">Secure your project slot</Text>
                </div>
                <Title level={2} style={{ color: '#52c41a', margin: 0 }}>₹1</Title>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <Text strong>What you get:</Text>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Priority project slot</li>
                  <li>Direct communication with our team</li>
                  <li>Project timeline guarantee</li>
                  <li>Free consultation call</li>
                  <li>Detailed project proposal</li>
                </ul>
              </div>

              {paymentError && (
                <Alert
                  message="Payment Error"
                  description={
                    paymentError.includes('phone') || paymentError.includes('contact') 
                      ? 'Invalid phone number format. Please update your phone number in the prebook form and try again.'
                      : paymentError
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: '16px' }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => {
                        setPaymentError(null)
                        setRetryCount(prev => prev + 1)
                        handlePayment()
                      }}
                      disabled={paymentLoading}
                    >
                      Retry
                    </Button>
                  }
                />
              )}

              <Alert
                message="Secure Payment"
                description="Your payment is processed securely through Razorpay. We use industry-standard encryption to protect your data."
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Button
                type="primary"
                size="large"
                block
                loading={paymentLoading}
                onClick={handlePayment}
                style={{ 
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {paymentLoading ? 'Processing...' : 'Pay ₹1 & Confirm Prebook'}
              </Button>

              {retryCount > 0 && (
                <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: '8px' }}>
                  Retry attempt: {retryCount}
                </Text>
              )}

              <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginTop: '8px' }}>
                🔒 Secure payment powered by Razorpay
              </Text>
            </Card>
          </div>
        )}
      </Modal>
      </div>
    </App>
  )
}

export default ProductDetail
