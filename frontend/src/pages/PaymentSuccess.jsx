import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircleOutlined, ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Card, Row, Col, Typography, Divider, Space, Tag, Spin } from 'antd'

const { Title, Text, Paragraph } = Typography

const PaymentSuccess = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [prebookData, setPrebookData] = useState(null)
  
  const prebookId = searchParams.get('prebookId')
  const paymentId = searchParams.get('paymentId')
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (prebookId) {
      fetchPrebookDetails()
    } else {
      setLoading(false)
    }
  }, [prebookId])

  const fetchPrebookDetails = async () => {
    try {
      const response = await fetch(`http://localhost:7000/api/prebook/${prebookId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPrebookData(data.data)
      }
    } catch (error) {
      console.error('Error fetching prebook details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDashboard = () => {
    navigate('/dashboard')
  }

  const handleViewPrebooks = () => {
    navigate('/dashboard?tab=prebooks')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            opacity: 1,
            transform: 'translateY(0)',
            transition: 'all 0.6s ease'
          }}
        >
          <Card 
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: 'none'
            }}
          >
            {/* Success Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div
                style={{
                  transform: 'scale(1)',
                  transition: 'all 0.3s ease',
                  animation: 'pulse 2s infinite'
                }}
              >
                <CheckCircleOutlined 
                  style={{ 
                    fontSize: '80px', 
                    color: '#52c41a',
                    marginBottom: '16px'
                  }} 
                />
              </div>
              
              <Title level={1} style={{ color: '#52c41a', marginBottom: '8px' }}>
                Payment Successful! 🎉
              </Title>
              
              <Paragraph style={{ fontSize: '18px', color: '#666' }}>
                Your prebook request has been submitted and payment has been processed successfully.
              </Paragraph>
            </div>

            {/* Payment Details */}
            <Card 
              title="Payment Details" 
              style={{ marginBottom: '24px' }}
              headStyle={{ backgroundColor: '#f8f9fa' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Text strong>Payment ID:</Text>
                  <br />
                  <Text code>{paymentId || 'N/A'}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong>Order ID:</Text>
                  <br />
                  <Text code>{orderId || 'N/A'}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong>Amount Paid:</Text>
                  <br />
                  <Text style={{ fontSize: '18px', color: '#52c41a' }}>
                    ₹{prebookData?.paymentAmount ? (prebookData.paymentAmount / 100).toFixed(2) : '1.00'}
                  </Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag color="green">Completed</Tag>
                </Col>
              </Row>
            </Card>

            {/* Prebook Details */}
            {prebookData && (
              <Card 
                title="Prebook Request Details" 
                style={{ marginBottom: '24px' }}
                headStyle={{ backgroundColor: '#f8f9fa' }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Text strong>Product:</Text>
                    <br />
                    <Text>{prebookData.productId?.title || 'N/A'}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>Request Date:</Text>
                    <br />
                    <Text>{new Date(prebookData.createdAt).toLocaleDateString()}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>Your Name:</Text>
                    <br />
                    <Text>{prebookData.userId?.name || 'N/A'}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>Email:</Text>
                    <br />
                    <Text>{prebookData.userId?.email || 'N/A'}</Text>
                  </Col>
                  <Col xs={24}>
                    <Text strong>Message:</Text>
                    <br />
                    <Text>{prebookData.message || 'No additional message'}</Text>
                  </Col>
                </Row>
              </Card>
            )}

            {/* Next Steps */}
            <Card 
              title="What's Next?" 
              style={{ marginBottom: '24px' }}
              headStyle={{ backgroundColor: '#e6f7ff' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>1. Review Process:</Text>
                  <br />
                  <Text>Your prebook request is now under admin review. You'll be notified once it's approved.</Text>
                </div>
                <div>
                  <Text strong>2. Dashboard Access:</Text>
                  <br />
                  <Text>You can view your prebook requests and payment history in your dashboard.</Text>
                </div>
                <div>
                  <Text strong>3. Notifications:</Text>
                  <br />
                  <Text>You'll receive real-time notifications about your prebook status updates.</Text>
                </div>
              </Space>
            </Card>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button 
                  type="primary" 
                  size="large"
                  icon={<EyeOutlined />}
                  onClick={handleViewDashboard}
                  style={{ 
                    borderRadius: '8px',
                    height: '48px',
                    paddingLeft: '24px',
                    paddingRight: '24px'
                  }}
                >
                  View Dashboard
                </Button>
                
                <Button 
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/')}
                  style={{ 
                    borderRadius: '8px',
                    height: '48px',
                    paddingLeft: '24px',
                    paddingRight: '24px'
                  }}
                >
                  Back to Home
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess
