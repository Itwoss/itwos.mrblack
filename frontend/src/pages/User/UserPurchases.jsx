import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Typography, Space, Badge, Row, Col, Statistic, Empty, Spin, message } from 'antd'
import { EyeOutlined, DownloadOutlined, StarOutlined, MessageOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import api, { userAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

const UserPurchases = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadPurchases()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  const loadPurchases = async () => {
    if (!user || !user._id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Use the user ID endpoint: /users/:id/purchases
      const response = await api.get(`/users/${user._id}/purchases`)
      
      if (response.data.success) {
        const purchasesData = response.data.purchases || response.data.data || []
        setPurchases(purchasesData)
      } else {
        setPurchases([])
      }
    } catch (error) {
      console.error('Error loading purchases:', error)
      setPurchases([])
      // Don't show error message if it's just no purchases
      if (error.response?.status !== 404) {
        message.error('Failed to load purchases')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleViewProduct = (productId) => {
    if (productId) {
      navigate(`/products/${productId}`)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return '-'
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
    return `${symbol}${amount.toLocaleString('en-IN')}`
  }

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        const product = record.product || {}
        const isSubscription = record.isSubscription || record.type === 'subscription'
        return (
          <div>
            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {product.title || (isSubscription ? `Verified Badge - ${record.planMonths} Month${record.planMonths > 1 ? 's' : ''}` : 'Unknown Product')}
              {isSubscription && (
                <Tag color="blue" style={{ fontSize: '11px', padding: '0 6px', height: '20px', lineHeight: '20px' }}>
                  Subscription
                </Tag>
              )}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              Order #{record.razorpayOrderId || record._id}
            </div>
            {isSubscription && record.expiryDate && (
              <div style={{ color: '#1890ff', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                Expires: {formatDateTime(record.expiryDate)}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Price',
      key: 'amount',
      render: (_, record) => formatCurrency(record.amount, record.currency)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          paid: { color: 'green', text: 'Completed' },
          completed: { color: 'green', text: 'Completed' },
          created: { color: 'orange', text: 'Pending' },
          pending: { color: 'orange', text: 'Pending' },
          failed: { color: 'red', text: 'Failed' },
          cancelled: { color: 'red', text: 'Cancelled' },
          refunded: { color: 'blue', text: 'Refunded' }
        }
        const statusInfo = statusMap[status] || { color: 'default', text: status }
        return <Tag color={statusInfo.color}>{statusInfo.text.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Purchase Date',
      key: 'date',
      render: (_, record) => formatDateTime(record.createdAt)
    },
    {
      title: 'Expiry Date',
      key: 'expiryDate',
      render: (_, record) => {
        if (record.isSubscription || record.type === 'subscription') {
          return record.expiryDate ? (
            <div>
              <div style={{ fontWeight: 500 }}>
                {formatDateTime(record.expiryDate)}
              </div>
              {new Date(record.expiryDate) < new Date() && (
                <Tag color="red" style={{ marginTop: '4px', fontSize: '11px' }}>Expired</Tag>
              )}
              {record.expiryDate && new Date(record.expiryDate) > new Date() && (
                <Tag color="green" style={{ marginTop: '4px', fontSize: '11px' }}>Active</Tag>
              )}
            </div>
          ) : '-'
        }
        return '-'
      }
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => method ? method.toUpperCase() : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const productId = record.product?._id || record.product
        const isPaid = record.status === 'paid' || record.status === 'completed'
        const isSubscription = record.isSubscription || record.type === 'subscription'
        
        return (
          <Space>
            {productId && productId !== 'verified-badge' && (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => handleViewProduct(productId)}
              >
                View
              </Button>
            )}
            {isSubscription && (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => navigate('/dashboard/products')}
              >
                View Details
              </Button>
            )}
            {isPaid && !isSubscription && (
              <Button 
                type="link" 
                icon={<DownloadOutlined />}
                onClick={() => message.info('Download feature coming soon')}
              >
                Download
              </Button>
            )}
          </Space>
        )
      }
    }
  ]

  const completedPurchases = purchases.filter(p => p.status === 'paid' || p.status === 'completed')
  const pendingPurchases = purchases.filter(p => p.status === 'created' || p.status === 'pending')
  const totalSpent = completedPurchases.reduce((sum, p) => sum + (p.amount || 0), 0)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: '1rem', color: '#666' }}>
          Loading your purchases...
        </Paragraph>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Title level={2}>🛒 My Purchases</Title>
        <Paragraph>Track your orders and download your purchases.</Paragraph>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Total Purchases" value={purchases.length} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Completed" value={completedPurchases.length} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="Total Spent" 
              value={totalSpent.toLocaleString('en-IN')} 
              prefix="₹"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {purchases.length > 0 ? (
        <Card>
          <Table 
            columns={columns} 
            dataSource={purchases}
            rowKey={(record) => record._id || record.razorpayOrderId || record.id}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} purchases`
            }}
          />
        </Card>
      ) : (
        <Card>
          <Empty
            description={
              <div>
                <Title level={4} style={{ color: '#999', marginTop: '1rem' }}>
                  No purchases yet
                </Title>
                <Paragraph style={{ color: '#999' }}>
                  Your purchase history will appear here once you make a purchase.
                </Paragraph>
              </div>
            }
          />
        </Card>
      )}
    </div>
  )
}

export default UserPurchases















