import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Timeline, Badge, Progress } from 'antd'
import { 
  ShoppingCartOutlined, 
  EyeOutlined, 
  DownloadOutlined, 
  StarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  DollarOutlined,
  FileTextOutlined,
  MessageOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'

const { Title, Paragraph } = Typography
const { Search } = Input
const { Option } = Select

const MyOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalOrders: 8,
    completedOrders: 6,
    pendingOrders: 1,
    totalSpent: 4599
  })

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Mock data
      const mockOrders = [
        {
          _id: '1',
          orderId: '#ORD-001',
          product: {
            name: 'E-commerce Website Template',
            price: 999,
            thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop'
          },
          status: 'completed',
          orderDate: '2024-01-15',
          deliveryDate: '2024-01-20',
          amount: 999,
          paymentMethod: 'Credit Card',
          trackingNumber: 'TRK123456789',
          progress: 100
        },
        {
          _id: '2',
          orderId: '#ORD-002',
          product: {
            name: 'Portfolio Website Template',
            price: 599,
            thumbnail: 'https://images.unsplash.com/photo-1522199755839-e2ba9b43d813?w=100&h=100&fit=crop'
          },
          status: 'shipped',
          orderDate: '2024-01-14',
          deliveryDate: '2024-01-18',
          amount: 599,
          paymentMethod: 'PayPal',
          trackingNumber: 'TRK987654321',
          progress: 75
        },
        {
          _id: '3',
          orderId: '#ORD-003',
          product: {
            name: 'Blog Website Template',
            price: 399,
            thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=100&fit=crop'
          },
          status: 'processing',
          orderDate: '2024-01-13',
          deliveryDate: '2024-01-17',
          amount: 399,
          paymentMethod: 'Stripe',
          trackingNumber: null,
          progress: 50
        },
        {
          _id: '4',
          orderId: '#ORD-004',
          product: {
            name: 'Corporate Website Template',
            price: 799,
            thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop'
          },
          status: 'pending',
          orderDate: '2024-01-12',
          deliveryDate: '2024-01-16',
          amount: 799,
          paymentMethod: 'Credit Card',
          trackingNumber: null,
          progress: 25
        }
      ]
      setOrders(mockOrders)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setModalVisible(true)
  }

  const handleDownloadInvoice = (orderId) => {
    // Simulate download
    console.log('Downloading invoice for order:', orderId)
  }

  const handleTrackOrder = (orderId) => {
    // Simulate tracking
    console.log('Tracking order:', orderId)
  }

  const handleReviewProduct = (orderId) => {
    // Navigate to review page
    navigate(`/reviews?order=${orderId}`)
  }

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'green',
      'shipped': 'blue',
      'processing': 'orange',
      'pending': 'gray',
      'cancelled': 'red'
    }
    return colors[status] || 'default'
  }

  const getStatusIcon = (status) => {
    const icons = {
      'completed': <CheckCircleOutlined />,
      'shipped': <TruckOutlined />,
      'processing': <ClockCircleOutlined />,
      'pending': <ClockCircleOutlined />,
      'cancelled': <ClockCircleOutlined />
    }
    return icons[status] || <ClockCircleOutlined />
  }

  const columns = [
    {
      title: 'Order',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.orderDate}
          </div>
        </div>
      )
    },
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      render: (product) => (
        <Space>
          <img src={product.thumbnail} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{product.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>${product.price}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <div>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status.toUpperCase()}
          </Tag>
          <div style={{ marginTop: 4 }}>
            <Progress percent={record.progress} size="small" />
          </div>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <strong style={{ color: '#52c41a' }}>${amount}</strong>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewOrder(record)}>View</Button>
          {record.status === 'completed' && (
            <Button size="small" icon={<StarOutlined />} onClick={() => handleReviewProduct(record._id)}>Review</Button>
          )}
          {record.trackingNumber && (
            <Button size="small" icon={<TruckOutlined />} onClick={() => handleTrackOrder(record._id)}>Track</Button>
          )}
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadInvoice(record._id)}>Invoice</Button>
        </Space>
      )
    }
  ]

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Title level={2} style={{ marginBottom: '0.5rem' }}>
            🛒 My Orders
          </Title>
          <Paragraph>
            Track your orders and view order history.
          </Paragraph>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Orders"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completedOrders}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pendingOrders}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="Total Spent"
                value={stats.totalSpent}
                prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Orders Table */}
        <Card 
          title="Order History" 
          extra={
            <Space>
              <Search placeholder="Search orders..." style={{ width: 200 }} />
              <Select placeholder="Filter by status" style={{ width: 150 }}>
                <Option value="all">All Orders</Option>
                <Option value="completed">Completed</Option>
                <Option value="shipped">Shipped</Option>
                <Option value="processing">Processing</Option>
                <Option value="pending">Pending</Option>
              </Select>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={orders}
            loading={loading}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true
            }}
          />
        </Card>

        {/* Order Detail Modal */}
        <Modal
          title={`Order Details - ${selectedOrder?.orderId}`}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedOrder && (
            <div>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card title="Order Information" size="small">
                    <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
                    <p><strong>Order Date:</strong> {selectedOrder.orderDate}</p>
                    <p><strong>Status:</strong> <Tag color={getStatusColor(selectedOrder.status)}>{selectedOrder.status.toUpperCase()}</Tag></p>
                    <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                    <p><strong>Amount:</strong> ${selectedOrder.amount}</p>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Delivery Information" size="small">
                    <p><strong>Expected Delivery:</strong> {selectedOrder.deliveryDate}</p>
                    {selectedOrder.trackingNumber && (
                      <p><strong>Tracking Number:</strong> {selectedOrder.trackingNumber}</p>
                    )}
                    <p><strong>Progress:</strong></p>
                    <Progress percent={selectedOrder.progress} />
                  </Card>
                </Col>
              </Row>

              <Card title="Product Details" style={{ marginTop: 16 }}>
                <Space>
                  <img src={selectedOrder.product.thumbnail} alt={selectedOrder.product.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                  <div>
                    <h4>{selectedOrder.product.name}</h4>
                    <p><strong>Price:</strong> ${selectedOrder.product.price}</p>
                  </div>
                </Space>
              </Card>

              <Card title="Order Timeline" style={{ marginTop: 16 }}>
                <Timeline
                  items={[
                    {
                      children: `Order placed on ${selectedOrder.orderDate}`,
                      color: 'blue'
                    },
                    {
                      children: selectedOrder.status === 'completed' ? `Order completed on ${selectedOrder.deliveryDate}` : 'Order in progress',
                      color: selectedOrder.status === 'completed' ? 'green' : 'orange'
                    }
                  ]}
                />
              </Card>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setModalVisible(false)}>Close</Button>
                  <Button type="primary" icon={<DownloadOutlined />}>Download Invoice</Button>
                  {selectedOrder.status === 'completed' && (
                    <Button icon={<StarOutlined />}>Write Review</Button>
                  )}
                </Space>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default MyOrders




