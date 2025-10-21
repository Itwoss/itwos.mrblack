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
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token')
      
      // Fetch users
      const usersResponse = await fetch('http://localhost:7000/api/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Fetch prebooks
      const prebooksResponse = await fetch('http://localhost:7000/api/prebook/admin/all?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (usersResponse.ok && prebooksResponse.ok) {
        const usersData = await usersResponse.json()
        const prebooksData = await prebooksResponse.json()
        
        console.log('Users response:', usersData)
        console.log('Prebooks response:', prebooksData)
        
        const fetchedUsers = usersData.users || []
        const fetchedPrebooks = prebooksData.data?.prebooks || []
        
        setUsers(fetchedUsers)
        
        // Create activities from prebooks
        const userActivities = fetchedPrebooks.map(prebook => ({
          id: prebook._id,
          type: 'prebook',
          user: {
            name: prebook.contactInfo?.name || 'Unknown',
            email: prebook.contactInfo?.email || 'No email'
          },
          product: prebook.productId || { title: 'Custom Project' },
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
        }))
        
        // Sort by date (newest first)
        userActivities.sort((a, b) => new Date(b.date) - new Date(a.date))
        setActivities(userActivities)
        
        // Calculate stats
        const totalUsers = fetchedUsers.length
        const activeUsers = fetchedUsers.filter(u => u.lastLoginAt).length
        const totalPrebooks = fetchedPrebooks.length
        const totalPayments = fetchedPrebooks.filter(p => p.paymentStatus === 'completed').length
        
        setStats({
          totalUsers,
          activeUsers,
          totalPrebooks,
          totalPayments
        })
      } else {
        console.error('API responses not ok:', {
          usersStatus: usersResponse.status,
          prebooksStatus: prebooksResponse.status,
          usersText: await usersResponse.text(),
          prebooksText: await prebooksResponse.text()
        })
        messageApi.error('Failed to fetch user activities')
      }
    } catch (error) {
      console.error('Error fetching user activities:', error)
      messageApi.error('Network error')
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
      render: (_, record) => (
        record.amount ? (
          <Text strong style={{ color: '#52c41a' }}>₹{((record.amount || 0) / 100).toFixed(2)}</Text>
        ) : (
          <Text type="secondary">N/A</Text>
        )
      )
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
          Monitor all user activities, prebook requests, and payment transactions
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
              title="Paid Prebooks"
              value={stats.totalPayments}
              prefix={<DollarOutlined />}
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
                      <Title level={5}>Project Details:</Title>
                      <p><strong>Project Type:</strong> {selectedUser.details.projectType || 'N/A'}</p>
                      <p><strong>Budget:</strong> {selectedUser.details.budget || 'N/A'}</p>
                      <p><strong>Timeline:</strong> {selectedUser.details.timeline || 'N/A'} days</p>
                      <p><strong>Features:</strong> {selectedUser.details.features?.join(', ') || 'N/A'}</p>
                      <p><strong>Notes:</strong> {selectedUser.details.notes || 'N/A'}</p>
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
