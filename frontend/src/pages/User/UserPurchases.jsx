import React, { useState } from 'react'
import { Card, Table, Tag, Button, Typography, Space, Badge, Row, Col, Statistic } from 'antd'
import { EyeOutlined, DownloadOutlined, StarOutlined, MessageOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

const UserPurchases = () => {
  const [purchases] = useState([
    {
      id: 'PUR-001',
      product: 'E-commerce Website Template',
      price: 999,
      status: 'completed',
      date: '2024-01-15',
      rating: 5,
      review: 'Excellent template!',
      downloadUrl: '#'
    },
    {
      id: 'PUR-002',
      product: 'Portfolio Website Template',
      price: 599,
      status: 'completed',
      date: '2024-01-10',
      rating: 4,
      review: 'Great design!',
      downloadUrl: '#'
    },
    {
      id: 'PUR-003',
      product: 'Blog Website Template',
      price: 399,
      status: 'pending',
      date: '2024-01-20',
      rating: null,
      review: null,
      downloadUrl: null
    }
  ])

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>Order #{record.id}</div>
        </div>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          completed: 'green',
          pending: 'orange',
          cancelled: 'red'
        }
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating ? <StarOutlined style={{ color: '#faad14' }} /> : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />}>View</Button>
          {record.status === 'completed' && (
            <Button type="link" icon={<DownloadOutlined />}>Download</Button>
          )}
          {record.status === 'completed' && !record.rating && (
            <Button type="link" icon={<StarOutlined />}>Review</Button>
          )}
        </Space>
      )
    }
  ]

  const completedPurchases = purchases.filter(p => p.status === 'completed')
  const pendingPurchases = purchases.filter(p => p.status === 'pending')
  const totalSpent = completedPurchases.reduce((sum, p) => sum + p.price, 0)

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
            <Statistic title="Total Spent" value={totalSpent} prefix="$" />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table 
          columns={columns} 
          dataSource={purchases}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default UserPurchases















