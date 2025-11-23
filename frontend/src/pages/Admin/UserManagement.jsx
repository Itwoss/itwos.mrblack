import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Typography, Row, Col, Statistic, Input, Select, Modal, Form, Avatar, Badge, Switch, message, Tabs, Descriptions, Timeline, Progress, Tooltip, Popconfirm, Drawer, Divider, Alert } from 'antd'
import { 
  UserOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  FilterOutlined,
  PlusOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  MailOutlined,
  PhoneOutlined,
  DollarOutlined,
  CalendarOutlined,
  LockOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  BellOutlined,
  HistoryOutlined,
  TrophyOutlined,
  StarOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContextOptimized"
import DashboardLayout from '../../components/DashboardLayout'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
const { Search } = Input
const { Option } = Select

const UserManagement = () => {
  console.log('🔄 UserManagement: Component mounting...')
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [terminateModalVisible, setTerminateModalVisible] = useState(false)
  const [addUserModalVisible, setAddUserModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [addUserForm] = Form.useForm()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    blockedUsers: 0,
    onlineUsers: 0,
    offlineUsers: 0,
    last30DaysUsers: 0,
    totalSpent: 0,
    topSpenders: []
  })

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      console.log('🔄 UserManagement: Loading users...')
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('🔄 UserManagement: Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔄 UserManagement: API Response:', data)
        setUsers(data.data?.users || [])
        console.log('✅ UserManagement: Fetched real users:', data.data?.users?.length || 0)
        console.log('✅ UserManagement: Users data:', data.data?.users)
      } else {
        console.error('❌ UserManagement: Failed to fetch users:', response.status)
        const errorText = await response.text()
        console.error('❌ UserManagement: Error response:', errorText)
        setUsers([])
      }
    } catch (error) {
      console.error('❌ UserManagement: Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      console.log('🔄 UserManagement: Loading stats...')
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:7000/api/admin/users?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const users = data.data?.users || []
        const today = new Date().toDateString()
        
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const newStats = {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isOnline).length,
          newUsersToday: users.filter(u => new Date(u.createdAt).toDateString() === today).length,
          blockedUsers: users.filter(u => !u.isOnline).length,
          onlineUsers: users.filter(u => u.isOnline).length,
          offlineUsers: users.filter(u => !u.isOnline).length,
          last30DaysUsers: users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length,
          totalSpent: users.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
          topSpenders: users
            .filter(u => (u.totalSpent || 0) > 0)
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
            .slice(0, 5)
        }
        
        setStats(newStats)
        console.log('✅ UserManagement: Fetched real stats:', newStats)
      } else {
        console.error('❌ UserManagement: Failed to fetch stats:', response.status)
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          newUsersToday: 0,
          blockedUsers: 0
        })
      }
    } catch (error) {
      console.error('❌ UserManagement: Failed to fetch stats:', error)
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        blockedUsers: 0
      })
    }
  }

  const handleViewUser = (user) => {
    setViewingUser(user)
    setViewModalVisible(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    form.setFieldsValue({
      ...user,
      permissions: user.permissions || ['read', 'write']
    })
    setModalVisible(true)
  }

  const handleTerminateUser = (user) => {
    setEditingUser(user)
    setTerminateModalVisible(true)
  }

  const handleAddUser = () => {
    setAddUserModalVisible(true)
    addUserForm.resetFields()
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:7000/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`
        },
        body: JSON.stringify({ isOnline: !currentStatus })
      })

      if (response.ok) {
        message.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        fetchUsers()
        fetchStats()
      } else {
        message.error('Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      message.error('Failed to update user status')
    }
  }

  const handleTerminateUserConfirm = async (userId, terminationType) => {
    try {
      console.log('🔄 Terminating user:', userId, 'Type:', terminationType)
      
      // Calculate termination date based on type
      let terminationDate = new Date()
      let delayDays = 0
      
      switch (terminationType) {
        case 'immediate':
          delayDays = 0
          break
        case '1month':
          delayDays = 30
          break
        case '3months':
          delayDays = 90
          break
        default:
          delayDays = 0
      }
      
      terminationDate.setDate(terminationDate.getDate() + delayDays)
      
      const requestBody = {
        terminationType,
        terminationDate: terminationDate.toISOString(),
        delayDays
      }
      
      console.log('📤 Termination request:', requestBody)
      
      const response = await fetch(`http://localhost:7000/api/admin/users/${userId}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 Termination response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Termination successful:', result)
        
        const successMessage = terminationType === 'immediate' 
          ? 'User terminated immediately' 
          : `User termination scheduled for ${terminationType}`
          
        message.success(successMessage)
        setTerminateModalVisible(false)
        setEditingUser(null)
        fetchUsers()
        fetchStats()
      } else {
        const errorData = await response.json()
        console.error('❌ Termination failed:', errorData)
        message.error(errorData.message || 'Failed to terminate user')
      }
    } catch (error) {
      console.error('❌ Error terminating user:', error)
      message.error('Failed to terminate user: ' + error.message)
    }
  }

  const handleAddUserSubmit = async (values) => {
    try {
      const response = await fetch('http://localhost:7000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`
        },
        body: JSON.stringify(values)
      })

      if (response.ok) {
        message.success('User created successfully')
        setAddUserModalVisible(false)
        addUserForm.resetFields()
        fetchUsers()
        fetchStats()
      } else {
        message.error('Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      message.error('Failed to create user')
    }
  }

  const handleDeleteUser = (userId) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
      content: 'This action cannot be undone.',
      onOk: () => {
        setUsers(prev => prev.filter(u => u._id !== userId))
        message.success('User deleted successfully')
      }
    })
  }

  const handleStatusChange = (userId, status) => {
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, status } : u))
    message.success(`User ${status === 'active' ? 'activated' : 'blocked'} successfully`)
  }

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        setUsers(prev => prev.map(u => u._id === editingUser._id ? { ...u, ...values } : u))
        message.success('User updated successfully')
      } else {
        const newUser = {
          _id: Date.now().toString(),
          ...values,
          joinDate: new Date().toISOString().split('T')[0],
          lastActive: 'Just now',
          purchases: 0,
          totalSpent: 0
        }
        setUsers(prev => [...prev, newUser])
        message.success('User created successfully')
      }
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save user')
    }
  }

  const columns = [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar src={getUserAvatarUrl(record)} icon={<UserOutlined />}>
            {getUserInitials(record.name)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = AdminDesignSystem.colors.primary
        if (role === 'admin') color = AdminDesignSystem.colors.error
        if (role === 'superadmin') color = AdminDesignSystem.colors.secondary
        
        return (
          <Tag 
            color={color}
            style={{
              borderRadius: AdminDesignSystem.borderRadius.sm,
            }}
          >
            {role === 'superadmin' ? 'SUPER ADMIN' : role.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: 'Status',
      dataIndex: 'isOnline',
      key: 'status',
      render: (isOnline, record) => {
        // Check for termination status first
        if (record.terminationStatus === 'terminated') {
          return <Tag color="red">TERMINATED</Tag>
        } else if (record.terminationStatus === 'pending') {
          return <Tag color="orange">PENDING TERMINATION</Tag>
        } else if (record.isActive === false) {
          return <Tag color="gray">INACTIVE</Tag>
        } else {
          return (
            <Tag 
              color={isOnline ? AdminDesignSystem.colors.success : AdminDesignSystem.colors.text.secondary}
              style={{
                borderRadius: AdminDesignSystem.borderRadius.sm,
              }}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Tag>
          )
        }
      }
    },
    {
      title: 'Purchases',
      dataIndex: 'purchases',
      key: 'purchases',
      render: (purchases) => `${purchases?.length || 0} items`
    },
    {
      title: 'Total Spent',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (amount) => (
        <strong style={{ color: AdminDesignSystem.colors.success }}>
          {formatCurrency(amount || 0)}
        </strong>
      )
    },
    {
      title: 'Last Active',
      dataIndex: 'lastSeen',
      key: 'lastActive',
      render: (lastSeen) => lastSeen ? new Date(lastSeen).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_, record) => {
        const isTerminated = record.terminationStatus === 'terminated'
        const isPendingTermination = record.terminationStatus === 'pending'
        
        return (
          <Space wrap>
            <Tooltip title="View Details">
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewUser(record)} />
            </Tooltip>
            
            {!isTerminated && (
              <Tooltip title="Edit User">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)} />
              </Tooltip>
            )}
            
            {!isTerminated && !isPendingTermination && (
              <Tooltip title={record.isOnline ? 'Set Offline' : 'Set Online'}>
                <Button 
                  size="small" 
                  type={record.isOnline ? 'default' : 'primary'}
                  icon={record.isOnline ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => handleStatusToggle(record._id, record.isOnline)}
                />
              </Tooltip>
            )}
            
            {!isTerminated && !isPendingTermination && (
              <Tooltip title="Terminate User">
                <Button 
                  size="small" 
                  danger 
                  icon={<UserDeleteOutlined />} 
                  onClick={() => handleTerminateUser(record)} 
                />
              </Tooltip>
            )}
            
            {isPendingTermination && (
              <Tooltip title="Termination Scheduled">
                <Button 
                  size="small" 
                  disabled 
                  icon={<ClockCircleOutlined />}
                >
                  Scheduled
                </Button>
              </Tooltip>
            )}
            
            {isTerminated && (
              <Tooltip title="User Terminated">
                <Button 
                  size="small" 
                  disabled 
                  icon={<UserDeleteOutlined />}
                >
                  Terminated
                </Button>
              </Tooltip>
            )}
            
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user permanently?"
              onConfirm={() => handleDeleteUser(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete Permanently">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  // Debug logging
  console.log('🔄 UserManagement: Component render - users:', users.length, 'loading:', loading, 'stats:', stats)

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount / 100) // Backend stores in paise
  }

  return (
    <DashboardLayout userRole="admin">
      <div style={{
        padding: AdminDesignSystem.layout.content.padding,
        background: AdminDesignSystem.colors.background,
        minHeight: '100vh',
        fontFamily: AdminDesignSystem.typography.fontFamily,
      }}>
        {/* Header */}
        <div style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Title 
            level={2} 
            style={{ 
              marginBottom: AdminDesignSystem.spacing.sm,
              color: AdminDesignSystem.colors.text.primary,
              fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
              fontSize: AdminDesignSystem.typography.fontSize.h2,
            }}
          >
            <TeamOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
            User Management
          </Title>
          <Paragraph style={{ 
            color: AdminDesignSystem.colors.text.secondary,
            fontSize: AdminDesignSystem.typography.fontSize.body,
          }}>
            Manage users, roles, and permissions across your platform.
          </Paragraph>
        </div>

        {/* Enhanced Statistics Dashboard */}
        <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]} style={{ marginBottom: AdminDesignSystem.spacing.xl }}>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Total Users
                  </Text>
                }
                value={stats.totalUsers}
                prefix={<TeamOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Online Users
                  </Text>
                }
                value={stats.onlineUsers}
                prefix={<CheckCircleOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Offline Users
                  </Text>
                }
                value={stats.offlineUsers}
                prefix={<StopOutlined style={{ color: AdminDesignSystem.colors.text.secondary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.secondary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Last 30 Days
                  </Text>
                }
                value={stats.last30DaysUsers}
                prefix={<CalendarOutlined style={{ color: AdminDesignSystem.colors.primary }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.text.primary,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    Total Spent
                  </Text>
                }
                value={formatCurrency(stats.totalSpent || 0)}
                prefix={<DollarOutlined style={{ color: AdminDesignSystem.colors.success }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.success,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Card
              hoverable
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                border: `1px solid ${AdminDesignSystem.colors.card.border}`,
                boxShadow: AdminDesignSystem.shadows.md,
                background: AdminDesignSystem.colors.card.background,
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: AdminDesignSystem.colors.text.secondary, fontSize: AdminDesignSystem.typography.fontSize.small }}>
                    New Today
                  </Text>
                }
                value={stats.newUsersToday}
                prefix={<ClockCircleOutlined style={{ color: AdminDesignSystem.colors.warning }} />}
                valueStyle={{ 
                  color: AdminDesignSystem.colors.warning,
                  fontSize: AdminDesignSystem.typography.fontSize.h3,
                  fontWeight: AdminDesignSystem.typography.fontWeight.semibold,
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Top Spenders */}
        {stats.topSpenders && stats.topSpenders.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
            <Col span={24}>
              <Card title={<><TrophyOutlined /> Top Spenders</>} hoverable>
                <Row gutter={[16, 16]}>
                  {stats.topSpenders.map((spender, index) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={spender._id}>
                      <Card 
                        size="small" 
                        hoverable
                        onClick={() => handleViewUser(spender)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space>
                            <Avatar src={getUserAvatarUrl(spender)} icon={<UserOutlined />}>
                              {getUserInitials(spender.name)}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{spender.name}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{spender.email}</div>
                            </div>
                          </Space>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
                              ${(spender.totalSpent || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Rank #{index + 1}
                            </div>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {/* Enhanced Users Table */}
        <Card 
          title={
            <Space>
              <TeamOutlined style={{ color: AdminDesignSystem.colors.primary }} />
              <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
                Users Management
              </Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Search
                placeholder="Search users..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Status</Option>
                <Option value="online">Online</Option>
                <Option value="offline">Offline</Option>
              </Select>
              <Select
                placeholder="Filter by role"
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Roles</Option>
                <Option value="user">User</Option>
                <Option value="admin">Admin</Option>
                <Option value="superadmin">Super Admin</Option>
              </Select>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={handleAddUser}
                style={{
                  borderRadius: AdminDesignSystem.borderRadius.md,
                  backgroundColor: AdminDesignSystem.colors.primary,
                  borderColor: AdminDesignSystem.colors.primary,
                }}
              >
                Add User
              </Button>
            </Space>
          }
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Table
            columns={columns}
            dataSource={users}
            loading={loading}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true
            }}
          />
        </Card>

        {/* Edit User Modal */}
        <Modal
          title={editingUser ? 'Edit User' : 'Add User'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter name' }]}
                >
                  <Input placeholder="Enter full name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, message: 'Please enter email' }]}
                >
                  <Input type="email" placeholder="Enter email" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="country"
                  label="Country"
                >
                  <Input placeholder="Enter country" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="role"
                  label="Role"
                  rules={[{ required: true, message: 'Please select role' }]}
                >
                  <Select placeholder="Select role">
                    <Option value="user">User</Option>
                    <Option value="admin">Admin</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select placeholder="Select status">
                    <Option value="active">Active</Option>
                    <Option value="inactive">Inactive</Option>
                    <Option value="blocked">Blocked</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingUser ? 'Update User' : 'Add User'}
                </Button>
                <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* User Details View Modal */}
        <Modal
          title={
            <Space>
              <UserOutlined />
              User Details
            </Space>
          }
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>
              Close
            </Button>,
            <Button key="edit" type="primary" onClick={() => {
              setViewModalVisible(false)
              handleEditUser(viewingUser)
            }}>
              Edit User
            </Button>
          ]}
          width={800}
        >
          {viewingUser && (
            <Tabs defaultActiveKey="basic">
              <Tabs.TabPane tab="Basic Info" key="basic">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Name" span={2}>
                    <Space>
                      <Avatar src={getUserAvatarUrl(viewingUser)} icon={<UserOutlined />}>
                        {getUserInitials(viewingUser.name)}
                      </Avatar>
                      {viewingUser.name}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">{viewingUser.email}</Descriptions.Item>
                  <Descriptions.Item label="Role">
                    <Tag color={
                      viewingUser.role === 'admin' ? 'red' : 
                      viewingUser.role === 'superadmin' ? 'purple' : 'blue'
                    }>
                      {viewingUser.role === 'superadmin' ? 'SUPER ADMIN' : viewingUser.role.toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={viewingUser.isOnline ? 'green' : 'orange'}>
                      {viewingUser.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Active">
                    {viewingUser.lastSeen ? new Date(viewingUser.lastSeen).toLocaleString() : 'Never'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created At" span={2}>
                    {new Date(viewingUser.createdAt).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Tabs.TabPane>
              
              <Tabs.TabPane tab="Activity" key="activity">
                <Timeline>
                  <Timeline.Item color="green">
                    <Space>
                      <CheckCircleOutlined />
                      <span>User registered</span>
                      <Tag>{new Date(viewingUser.createdAt).toLocaleDateString()}</Tag>
                    </Space>
                  </Timeline.Item>
                  <Timeline.Item color="blue">
                    <Space>
                      <ClockCircleOutlined />
                      <span>Last seen</span>
                      <Tag>{viewingUser.lastSeen ? new Date(viewingUser.lastSeen).toLocaleDateString() : 'Never'}</Tag>
                    </Space>
                  </Timeline.Item>
                  <Timeline.Item color="orange">
                    <Space>
                      <DollarOutlined />
                      <span>Total spent: ${(viewingUser.totalSpent || 0).toLocaleString()}</span>
                    </Space>
                  </Timeline.Item>
                </Timeline>
              </Tabs.TabPane>
              
              <Tabs.TabPane tab="Permissions" key="permissions">
                <Alert
                  message="User Permissions"
                  description="Manage user access and permissions"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Form layout="vertical">
                  <Form.Item label="Role Permissions">
                    <Select defaultValue={viewingUser.role} style={{ width: '100%' }}>
                      <Option value="user">User</Option>
                      <Option value="admin">Admin</Option>
                      <Option value="superadmin">Super Admin</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Access Level">
                    <Select defaultValue="standard" style={{ width: '100%' }}>
                      <Option value="basic">Basic Access</Option>
                      <Option value="standard">Standard Access</Option>
                      <Option value="premium">Premium Access</Option>
                      <Option value="enterprise">Enterprise Access</Option>
                    </Select>
                  </Form.Item>
                </Form>
              </Tabs.TabPane>
            </Tabs>
          )}
        </Modal>

        {/* Enhanced User Termination Modal */}
        <Modal
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              Terminate User
            </Space>
          }
          open={terminateModalVisible}
          onCancel={() => {
            setTerminateModalVisible(false)
            setEditingUser(null)
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setTerminateModalVisible(false)
              setEditingUser(null)
            }}>
              Cancel
            </Button>
          ]}
          width={600}
          centered
        >
          {editingUser && (
            <div>
              <Alert
                message="Account Termination Warning"
                description={
                  <div>
                    <p>You are about to terminate the account for:</p>
                    <p><strong>{editingUser.name}</strong> ({editingUser.email})</p>
                    <p>Choose the termination type below:</p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
              
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    hoverable 
                    onClick={() => handleTerminateUserConfirm(editingUser._id, 'immediate')}
                    style={{ 
                      border: '2px solid #ff4d4f',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                      <UserDeleteOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Immediate</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Delete account immediately</div>
                      <Tag color="red">INSTANT</Tag>
                    </Space>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    hoverable 
                    onClick={() => handleTerminateUserConfirm(editingUser._id, '1month')}
                    style={{ 
                      border: '2px solid #fa8c16',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                      <CalendarOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>1 Month</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Delete account after 1 month</div>
                      <Tag color="orange">30 DAYS</Tag>
                    </Space>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    hoverable 
                    onClick={() => handleTerminateUserConfirm(editingUser._id, '3months')}
                    style={{ 
                      border: '2px solid #722ed1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                      <CalendarOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>3 Months</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Delete account after 3 months</div>
                      <Tag color="purple">90 DAYS</Tag>
                    </Space>
                  </Card>
                </Col>
              </Row>
              
              <Divider />
              
              <Alert
                message="Important Notice"
                description="The user will receive a notification about their account termination. For delayed terminations, they will have access until the scheduled date."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </div>
          )}
        </Modal>

        {/* Add User Modal */}
        <Modal
          title={
            <Space>
              <UserAddOutlined />
              Add New User
            </Space>
          }
          open={addUserModalVisible}
          onCancel={() => setAddUserModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            form={addUserForm}
            layout="vertical"
            onFinish={handleAddUserSubmit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter name' }]}
                >
                  <Input placeholder="Enter full name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ required: true, message: 'Please enter email' }]}
                >
                  <Input type="email" placeholder="Enter email" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Please enter password' }]}
                >
                  <Input.Password placeholder="Enter password" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="role"
                  label="Role"
                  rules={[{ required: true, message: 'Please select role' }]}
                >
                  <Select placeholder="Select role">
                    <Option value="user">User</Option>
                    <Option value="admin">Admin</Option>
                    <Option value="superadmin">Super Admin</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="bio"
                  label="Bio"
                >
                  <Input.TextArea placeholder="Enter bio" rows={3} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="permissions"
              label="Permissions"
            >
              <Select mode="multiple" placeholder="Select permissions">
                <Option value="read">Read</Option>
                <Option value="write">Write</Option>
                <Option value="delete">Delete</Option>
                <Option value="admin">Admin Access</Option>
                <Option value="superadmin">Super Admin Access</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Create User
                </Button>
                <Button onClick={() => setAddUserModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default UserManagement




