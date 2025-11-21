import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Spin, Empty, Row, Col, Statistic, App, Timeline, Avatar, message, Modal } from 'antd'
import { 
  UserOutlined, 
  EyeOutlined, 
  BookOutlined, 
  DollarOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  HeartOutlined
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContextOptimized'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const UserActivities = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { message: messageApi } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPrebooks: 0,
    totalPayments: 0
  })
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetailModalVisible, setUserDetailModalVisible] = useState(false)

  const fetchUserActivities = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('accessToken')
      
      // Fetch users, prebooks, and purchases in parallel
      const [usersResponse, prebooksResponse, purchasesResponse] = await Promise.all([
        fetch('http://localhost:7000/api/admin/users?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:7000/api/prebook/admin/all?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:7000/api/admin/orders?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      const allActivities = []
      let fetchedUsers = []
      
      // Process users data
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        fetchedUsers = usersData.users || usersData.data?.users || []
        setUsers(fetchedUsers)
        
        // Create login activities from users
        fetchedUsers.forEach(user => {
          if (user.lastLoginAt) {
            allActivities.push({
              id: `login-${user._id}-${user.lastLoginAt}`,
              type: 'login',
              user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl || user.profilePic
              },
              product: null,
              action: 'User logged in',
              status: 'completed',
              paymentStatus: null,
              amount: null,
              date: user.lastLoginAt,
              details: {
                loginMethod: user.googleId ? 'Google' : 'Email',
                lastSeen: user.lastSeen
              }
            })
          }
        })
      }
      
      // Process prebooks data
      if (prebooksResponse.ok) {
        const prebooksData = await prebooksResponse.json()
        const fetchedPrebooks = prebooksData.data?.prebooks || prebooksData.prebooks || []
        
        fetchedPrebooks.forEach(prebook => {
          allActivities.push({
            id: `prebook-${prebook._id}`,
            type: 'prebook',
            user: {
              _id: prebook.userId?._id || prebook.userId,
              name: prebook.contactInfo?.name || prebook.userId?.name || 'Unknown',
              email: prebook.contactInfo?.email || prebook.userId?.email || 'No email',
              avatarUrl: prebook.userId?.avatarUrl || prebook.userId?.profilePic
            },
            product: prebook.productId || { title: 'Custom Project', _id: null },
            action: 'Created prebook request',
            status: prebook.status,
            paymentStatus: prebook.paymentStatus,
            amount: prebook.paymentAmount,
            date: prebook.createdAt,
            details: {
              projectType: prebook.projectType,
              budget: prebook.budget,
              timeline: prebook.timeline,
              features: prebook.features,
              notes: prebook.notes,
              contactInfo: prebook.contactInfo
            }
          })
        })
      }
      
      // Process purchases/orders data
      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json()
        const fetchedPurchases = purchasesData.data?.purchases || purchasesData.purchases || purchasesData.data?.orders || purchasesData.orders || []
        
        fetchedPurchases.forEach(purchase => {
          const buyer = purchase.buyer || purchase.userId || {}
          const product = purchase.product || purchase.productId || {}
          
          // Handle buyer - could be ObjectId or populated object
          const buyerId = buyer._id || buyer
          const buyerName = buyer.name || 'Unknown User'
          const buyerEmail = buyer.email || 'No email'
          const buyerAvatar = buyer.avatarUrl || buyer.profilePic
          
          // Handle product - could be ObjectId or populated object
          const productId = product._id || product
          const productTitle = product.title || 'Product Deleted'
          
          allActivities.push({
            id: `purchase-${purchase._id}`,
            type: 'purchase',
            user: {
              _id: buyerId,
              name: buyerName,
              email: buyerEmail,
              avatarUrl: buyerAvatar
            },
            product: {
              _id: productId,
              title: productTitle,
              price: product.price,
              thumbnailUrl: product.thumbnailUrl || product.images?.[0]
            },
            action: 'Purchased product',
            status: purchase.status === 'paid' ? 'completed' : purchase.status,
            paymentStatus: purchase.status === 'paid' ? 'completed' : purchase.status,
            amount: purchase.amount,
            date: purchase.createdAt,
            details: {
              razorpayOrderId: purchase.razorpayOrderId,
              razorpayPaymentId: purchase.razorpayPaymentId,
              paymentMethod: purchase.paymentMethod,
              currency: purchase.currency || 'INR'
            }
          })
        })
      }
      
      // Sort all activities by date (newest first)
      allActivities.sort((a, b) => new Date(b.date) - new Date(a.date))
      setActivities(allActivities)
      
      // Calculate stats
      const totalUsers = fetchedUsers.length
      const activeUsers = fetchedUsers.filter(u => u.lastLoginAt).length
      const totalPrebooks = allActivities.filter(a => a.type === 'prebook').length
      const totalPurchases = allActivities.filter(a => a.type === 'purchase').length
      const totalPayments = allActivities.filter(a => 
        (a.type === 'prebook' && a.paymentStatus === 'completed') || 
        (a.type === 'purchase' && (a.status === 'paid' || a.status === 'completed'))
      ).length
      
      setStats({
        totalUsers,
        activeUsers,
        totalPrebooks,
        totalPayments: totalPayments
      })
      
    } catch (error) {
      console.error('Error fetching user activities:', error)
      messageApi.error('Failed to fetch user activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchUserActivities()
    } else if (!authLoading && !isAuthenticated) {
      navigate('/admin/login')
    }
  }, [isAuthenticated, user, authLoading, navigate])

  const handleViewUser = (record) => {
    setSelectedUser(record)
    setUserDetailModalVisible(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green'
      case 'accepted': return 'green'
      case 'pending': return 'orange'
      case 'rejected': return 'red'
      case 'failed': return 'red'
      default: return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />
      case 'accepted': return <CheckCircleOutlined />
      case 'pending': return <ClockCircleOutlined />
      case 'rejected': return <ClockCircleOutlined />
      default: return <ClockCircleOutlined />
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'prebook': return <BookOutlined />
      case 'purchase': return <ShoppingOutlined />
      case 'payment': return <DollarOutlined />
      case 'login': return <UserOutlined />
      default: return <ClockCircleOutlined />
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={getUserAvatarUrl(record.user)} 
            icon={<UserOutlined />}
            style={{ marginRight: '8px' }}
          >
            {getUserInitials(record.user?.name)}
          </Avatar>
          <div>
            <Text strong>{record.user?.name || 'Unknown User'}</Text>
            <br />
            <Text type="secondary">{record.user?.email || 'N/A'}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Activity',
      key: 'activity',
      render: (_, record) => (
        <div>
          <Space>
            {getActivityIcon(record.type)}
            <Text strong>{record.action}</Text>
          </Space>
          <br />
          <Text type="secondary">{record.product?.title || 'Product Deleted'}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <div>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status?.toUpperCase() || 'PENDING'}
          </Tag>
          {record.paymentStatus && (
            <div style={{ marginTop: '4px' }}>
              <Tag color={record.paymentStatus === 'completed' ? 'green' : 'orange'}>
                Payment: {record.paymentStatus?.toUpperCase()}
              </Tag>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => {
        if (!record.amount) return <Text type="secondary">N/A</Text>
        
        // Handle amount - could be in paise (divide by 100) or already in rupees
        const amount = record.amount > 10000 ? record.amount / 100 : record.amount
        const currency = record.details?.currency || 'INR'
        const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
        
        return (
          <Text strong style={{ color: '#52c41a' }}>
            {symbol}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )
      }
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(record)}
          >
            View User
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>User Activities</Title>
        <Paragraph type="secondary">
          Monitor all user activities including logins, purchases, and prebook requests
        </Paragraph>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Prebooks"
              value={stats.totalPrebooks}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Purchases"
              value={stats.totalPayments}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Activities Table */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Recent Activities</Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchUserActivities}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
        
        {activities.length > 0 ? (
          <Table
            columns={columns}
            dataSource={activities}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} activities`
            }}
            scroll={{ x: 800 }}
          />
        ) : (
          <Empty 
            description="No activities found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* User Detail Modal */}
      <Modal
        title="User Details"
        open={userDetailModalVisible}
        onCancel={() => setUserDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedUser && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="User Information" size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={8}>
                      <Avatar 
                        size={64} 
                        src={getUserAvatarUrl(selectedUser.user)} 
                        icon={<UserOutlined />}
                      >
                        {getUserInitials(selectedUser.user?.name)}
                      </Avatar>
                    </Col>
                    <Col span={16}>
                      <p><strong>Name:</strong> {selectedUser.user?.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedUser.user?.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedUser.user?.phone || 'N/A'}</p>
                      <p><strong>Role:</strong> {selectedUser.user?.role || 'user'}</p>
                      <p><strong>Status:</strong> 
                        <Tag color={selectedUser.user?.isActive ? 'green' : 'red'}>
                          {selectedUser.user?.isActive ? 'Active' : 'Inactive'}
                        </Tag>
                      </p>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
            
            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col span={24}>
                <Card title="Activity Details" size="small">
                  <p><strong>Activity:</strong> {selectedUser.action}</p>
                  <p><strong>Product:</strong> {selectedUser.product?.title || 'Product Deleted'}</p>
                  <p><strong>Status:</strong> 
                    <Tag color={getStatusColor(selectedUser.status)}>
                      {selectedUser.status?.toUpperCase()}
                    </Tag>
                  </p>
                  <p><strong>Date:</strong> {new Date(selectedUser.date).toLocaleString()}</p>
                  
                  {selectedUser.details && (
                    <div style={{ marginTop: '16px' }}>
                      {selectedUser.type === 'prebook' && (
                        <>
                          <Title level={5}>Project Details:</Title>
                          <p><strong>Project Type:</strong> {selectedUser.details.projectType || 'N/A'}</p>
                          <p><strong>Budget:</strong> {selectedUser.details.budget || 'N/A'}</p>
                          <p><strong>Timeline:</strong> {selectedUser.details.timeline || 'N/A'} days</p>
                          <p><strong>Features:</strong> {selectedUser.details.features?.join(', ') || 'N/A'}</p>
                          <p><strong>Notes:</strong> {selectedUser.details.notes || 'N/A'}</p>
                        </>
                      )}
                      {selectedUser.type === 'purchase' && (
                        <>
                          <Title level={5}>Purchase Details:</Title>
                          <p><strong>Order ID:</strong> {selectedUser.details.razorpayOrderId || 'N/A'}</p>
                          <p><strong>Payment ID:</strong> {selectedUser.details.razorpayPaymentId || 'N/A'}</p>
                          <p><strong>Payment Method:</strong> {selectedUser.details.paymentMethod?.toUpperCase() || 'N/A'}</p>
                          <p><strong>Currency:</strong> {selectedUser.details.currency || 'INR'}</p>
                        </>
                      )}
                      {selectedUser.type === 'login' && (
                        <>
                          <Title level={5}>Login Details:</Title>
                          <p><strong>Login Method:</strong> {selectedUser.details.loginMethod || 'Email'}</p>
                          <p><strong>Last Seen:</strong> {selectedUser.details.lastSeen ? new Date(selectedUser.details.lastSeen).toLocaleString() : 'N/A'}</p>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default UserActivities
