import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Divider, 
  Alert, 
  Spin, 
  Image,
  List,
  Badge,
  App
} from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  DollarOutlined, 
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  TagOutlined,
  ArrowLeftOutlined,
  CreditCardOutlined,
  LockOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContextOptimized'

const { Title, Paragraph, Text } = Typography

const PrebookPreview = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [prebookData, setPrebookData] = useState(null)

  useEffect(() => {
    // Get prebook data from location state or localStorage
    const data = location.state?.prebookData || JSON.parse(localStorage.getItem('prebookData') || 'null')
    if (data) {
      setPrebookData(data)
    } else {
      message.error('No prebook data found. Please try again.')
      navigate('/products')
    }
  }, [location.state, navigate, message])

  const handlePayment = async () => {
    if (!isAuthenticated) {
      message.error('Please login to proceed with payment')
      navigate('/login')
      return
    }

    setPaymentLoading(true)
    try {
      // Load Razorpay script
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = async () => {
        try {
          // First create the order with backend
          const orderResponse = await fetch('http://localhost:7000/api/payments/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              prebookId: prebookData._id,
              amount: 100 // ₹1 in paise
            })
          })

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
              // Verify payment with backend
              const verifyResponse = await fetch('http://localhost:7000/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  prebookId: prebookData._id
                })
              })

              const result = await verifyResponse.json()
              
              if (result.success) {
                message.success('Payment successful! Your prebook has been confirmed.')
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
              message.error('Network error during payment verification. Please try again.')
            }
          },
          prefill: {
            name: user?.name || prebookData?.contactInfo?.name || '',
            email: user?.email || prebookData?.contactInfo?.email || '',
            contact: prebookData?.contactInfo?.phone || ''
          },
          notes: {
            address: 'ITWOS AI Office',
            prebook_id: prebookData?._id
          },
          theme: {
            color: '#1890ff'
          }
        }

          const rzp = new window.Razorpay(options)
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

  const handleBack = () => {
    navigate(-1)
  }

  if (!prebookData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <App>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            style={{ marginBottom: '16px' }}
          >
            Back
          </Button>
          <Title level={2}>Prebook Preview & Payment</Title>
          <Paragraph type="secondary">
            Review your prebook details and complete payment to confirm your request.
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {/* Product Details */}
          <Col xs={24} lg={16}>
            <Card title="Product Details" style={{ marginBottom: '24px' }}>
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
                    <Text strong>Price: </Text>
                    <Text style={{ fontSize: '18px', color: '#1890ff' }}>
                      ₹{prebookData.product?.price || 'N/A'}
                    </Text>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>Description: </Text>
                    {prebookData.product?.description || 'No description available'}
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            {/* Project Requirements */}
            <Card title="Project Requirements">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Project Type:</Text>
                      <br />
                      <Tag color="blue">{prebookData.projectType}</Tag>
                    </div>
                    <div>
                      <Text strong>Budget Range:</Text>
                      <br />
                      <Tag color="green">{prebookData.budget}</Tag>
                    </div>
                    <div>
                      <Text strong>Timeline:</Text>
                      <br />
                      <Tag color="orange">{prebookData.timeline} days</Tag>
                    </div>
                  </Space>
                </Col>
                <Col xs={24} sm={12}>
                  <div>
                    <Text strong>Requested Features:</Text>
                    <br />
                    <div style={{ marginTop: '8px' }}>
                      {prebookData.features?.map((feature, index) => (
                        <Tag key={index} color="purple" style={{ margin: '2px' }}>
                          {feature}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  {prebookData.notes && (
                    <div style={{ marginTop: '16px' }}>
                      <Text strong>Additional Notes:</Text>
                      <br />
                      <Text type="secondary">{prebookData.notes}</Text>
                    </div>
                  )}
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Payment Section */}
          <Col xs={24} lg={8}>
            <Card 
              title="Payment Summary" 
              style={{ position: 'sticky', top: '24px' }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Prebook Fee */}
                <div style={{ 
                  background: '#f6ffed', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #b7eb8f'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ color: '#52c41a' }}>Prebook Fee</Text>
                      <br />
                      <Text type="secondary">Secure your project slot</Text>
                    </div>
                    <Text style={{ fontSize: '20px', color: '#52c41a', fontWeight: 'bold' }}>
                      ₹1
                    </Text>
                  </div>
                </div>

                {/* Payment Benefits */}
                <div>
                  <Title level={5}>What you get:</Title>
                  <List
                    size="small"
                    dataSource={[
                      'Priority project slot',
                      'Direct communication with our team',
                      'Project timeline guarantee',
                      'Free consultation call',
                      'Detailed project proposal'
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                        {item}
                      </List.Item>
                    )}
                  />
                </div>

                {/* Security Notice */}
                <Alert
                  message="Secure Payment"
                  description="Your payment is processed securely through Razorpay. We use industry-standard encryption to protect your data."
                  type="info"
                  icon={<LockOutlined />}
                  showIcon
                />

                {/* Payment Button */}
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={paymentLoading}
                  onClick={handlePayment}
                  icon={<CreditCardOutlined />}
                  style={{ 
                    height: '50px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {paymentLoading ? 'Processing...' : 'Pay ₹1 & Confirm Prebook'}
                </Button>

                <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                  <LockOutlined /> Secure payment powered by Razorpay
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Contact Information */}
        <Card title="Contact Information" style={{ marginTop: '24px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Space>
                <UserOutlined />
                <div>
                  <Text strong>Name</Text>
                  <br />
                  <Text>{prebookData.contactInfo?.name || 'N/A'}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <Space>
                <MailOutlined />
                <div>
                  <Text strong>Email</Text>
                  <br />
                  <Text>{prebookData.contactInfo?.email || 'N/A'}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={8}>
              <Space>
                <PhoneOutlined />
                <div>
                  <Text strong>Phone</Text>
                  <br />
                  <Text>{prebookData.contactInfo?.phone || 'N/A'}</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>
    </App>
  )
}

export default PrebookPreview
