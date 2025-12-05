import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Typography, Space, Badge, Row, Col, Statistic, Empty, Spin, message } from 'antd'
import { EyeOutlined, DownloadOutlined, ShoppingCartOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import api, { userAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const UserPurchases = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user && user._id) {
      loadPurchases()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user?._id])

  const loadPurchases = async () => {
    if (!user || !user._id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
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
        const isPrebook = record.isPrebook || record.type === 'prebook'
        return (
          <div>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
              {product.title || (isSubscription ? `Verified Badge - ${record.planMonths} Month${record.planMonths > 1 ? 's' : ''}` : 'Unknown Product')}
              {isSubscription && (
                <Tag color="#3b82f6" style={{ fontSize: '11px', padding: '0 6px', height: '20px', lineHeight: '20px', margin: 0, background: '#eff6ff', border: '1px solid #3b82f6', color: '#3b82f6' }}>
                  Subscription
                </Tag>
              )}
              {isPrebook && (
                <Tag color="#22c55e" style={{ fontSize: '11px', padding: '0 6px', height: '20px', lineHeight: '20px', margin: 0, background: '#f0fdf4', border: '1px solid #22c55e', color: '#22c55e' }}>
                  Prebook
                </Tag>
              )}
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
              Order #{record.razorpayOrderId || record._id}
            </div>
            {isSubscription && record.expiryDate && (
              <div style={{ color: '#3b82f6', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>
                {record.status === 'cancelled' ? 'Cancelled: ' : 'Expires: '}{formatDateTime(record.cancelledAt || record.expiryDate)}
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: 'Price',
      key: 'amount',
      render: (_, record) => (
        <Text style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          {formatCurrency(record.amount, record.currency)}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          paid: { color: '#22c55e', bg: '#f0fdf4', text: 'Completed' },
          completed: { color: '#22c55e', bg: '#f0fdf4', text: 'Completed' },
          created: { color: '#f59e0b', bg: '#fffbeb', text: 'Pending' },
          pending: { color: '#f59e0b', bg: '#fffbeb', text: 'Pending' },
          failed: { color: '#ef4444', bg: '#fef2f2', text: 'Failed' },
          cancelled: { color: '#ef4444', bg: '#fef2f2', text: 'Cancelled' },
          refunded: { color: '#3b82f6', bg: '#eff6ff', text: 'Refunded' }
        }
        const statusInfo = statusMap[status] || { color: '#64748b', bg: '#f1f5f9', text: status }
        return (
          <Tag 
            style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              height: '22px', 
              lineHeight: '18px',
              background: statusInfo.bg,
              border: `1px solid ${statusInfo.color}`,
              color: statusInfo.color,
              margin: 0
            }}
          >
            {statusInfo.text.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Purchase Date',
      key: 'date',
      render: (_, record) => (
        <Text style={{ fontSize: '12px', color: '#64748b' }}>
          {formatDateTime(record.createdAt)}
        </Text>
      )
    },
    {
      title: 'Expiry Date',
      key: 'expiryDate',
      render: (_, record) => {
        if (record.isSubscription || record.type === 'subscription') {
          if (record.status === 'cancelled') {
            return (
              <div>
                <div style={{ fontWeight: 500, fontSize: '12px', color: '#1e293b' }}>
                  {record.cancelledAt ? formatDateTime(record.cancelledAt) : '-'}
                </div>
                <Tag color="#ef4444" style={{ marginTop: '4px', fontSize: '11px', background: '#fef2f2', border: '1px solid #ef4444', color: '#ef4444' }}>Cancelled</Tag>
              </div>
            );
          }
          return record.expiryDate ? (
            <div>
              <div style={{ fontWeight: 500, fontSize: '12px', color: '#1e293b' }}>
                {formatDateTime(record.expiryDate)}
              </div>
              {new Date(record.expiryDate) < new Date() && (
                <Tag style={{ marginTop: '4px', fontSize: '11px', background: '#fef2f2', border: '1px solid #ef4444', color: '#ef4444' }}>Expired</Tag>
              )}
              {record.expiryDate && new Date(record.expiryDate) > new Date() && (
                <Tag style={{ marginTop: '4px', fontSize: '11px', background: '#f0fdf4', border: '1px solid #22c55e', color: '#22c55e' }}>Active</Tag>
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
      render: (method) => (
        <Text style={{ fontSize: '12px', color: '#64748b' }}>
          {method ? method.toUpperCase() : '-'}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const productId = record.product?._id || record.product
        const isPaid = record.status === 'paid' || record.status === 'completed'
        const isSubscription = record.isSubscription || record.type === 'subscription'
        const isPrebook = record.isPrebook || record.type === 'prebook'
        
        return (
          <Space size="small">
            {isPrebook && record.prebookId && (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => navigate(`/prebooks`)}
                style={{ fontSize: '12px', padding: '0 4px', height: '24px' }}
              >
                View
              </Button>
            )}
            {productId && productId !== 'verified-badge' && !isPrebook && (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => handleViewProduct(productId)}
                style={{ fontSize: '12px', padding: '0 4px', height: '24px' }}
              >
                View
              </Button>
            )}
            {isSubscription && (
              <Button 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => navigate('/dashboard/products')}
                style={{ fontSize: '12px', padding: '0 4px', height: '24px' }}
              >
                Details
              </Button>
            )}
            {isPaid && !isSubscription && !isPrebook && (
              <Button 
                type="link" 
                icon={<DownloadOutlined />}
                onClick={() => message.info('Download feature coming soon')}
                style={{ fontSize: '12px', padding: '0 4px', height: '24px' }}
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
      <div style={{ textAlign: 'center', padding: '40px', background: '#f5f7fa', minHeight: '100vh' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: '16px', color: '#64748b', fontSize: '13px' }}>
          Loading your purchases...
        </Paragraph>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
          🛒 My Purchases
        </Title>
        <Text style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Track your orders and download your purchases
        </Text>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={8}>
          <Card
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            styles={{ body: { padding: '12px' } }}
          >
            <Statistic
              title={<span style={{ fontSize: '11px', color: '#64748b' }}>Total Purchases</span>}
              value={purchases.length}
              valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}
              prefix={<ShoppingCartOutlined style={{ fontSize: '18px', color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            styles={{ body: { padding: '12px' } }}
          >
            <Statistic
              title={<span style={{ fontSize: '11px', color: '#64748b' }}>Completed</span>}
              value={completedPurchases.length}
              valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}
              prefix={<CheckCircleOutlined style={{ fontSize: '18px', color: '#22c55e' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            styles={{ body: { padding: '12px' } }}
          >
            <Statistic
              title={<span style={{ fontSize: '11px', color: '#64748b' }}>Total Spent</span>}
              value={totalSpent.toLocaleString('en-IN')}
              valueStyle={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}
              prefix={<DollarOutlined style={{ fontSize: '18px', color: '#f59e0b' }} />}
              suffix="₹"
            />
          </Card>
        </Col>
      </Row>

      {/* Purchases Table */}
      {purchases.length > 0 ? (
        <Card
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          styles={{ body: { padding: '12px' } }}
        >
          <style>{`
            .ant-table-tbody > tr:hover > td {
              background: #f8fafc !important;
            }
            .ant-table-tbody > tr > td {
              border-bottom: 1px solid #e2e8f0;
            }
          `}</style>
          <Table
            columns={columns}
            dataSource={purchases}
            rowKey={(record) => record._id || record.razorpayOrderId || record.id}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => (
                <Text style={{ fontSize: '12px', color: '#64748b' }}>
                  Total {total} purchases
                </Text>
              ),
              size: 'small'
            }}
            size="small"
            style={{
              fontSize: '12px'
            }}
          />
        </Card>
      ) : (
        <Card
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          styles={{ body: { padding: '40px' } }}
        >
          <Empty
            description={
              <div>
                <Title level={5} style={{ color: '#64748b', marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>
                  No purchases yet
                </Title>
                <Paragraph style={{ color: '#64748b', fontSize: '12px', margin: '8px 0 0 0' }}>
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
