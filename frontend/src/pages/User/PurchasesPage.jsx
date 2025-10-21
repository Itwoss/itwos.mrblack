import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Statistic, Row, Col } from 'antd'
import { EyeOutlined, DownloadOutlined, StarOutlined } from '@ant-design/icons'
import DashboardLayout from '../../components/DashboardLayout'

const { Title } = Typography

const PurchasesPage = () => {
  const [purchases] = useState([
    {
      key: '1',
      product: 'React Development Course',
      price: '$99',
      status: 'completed',
      date: '2024-01-15',
      progress: 100,
      rating: 5
    },
    {
      key: '2',
      product: 'Node.js Masterclass',
      price: '$79',
      status: 'in-progress',
      date: '2024-01-14',
      progress: 65,
      rating: 4
    },
    {
      key: '3',
      product: 'AI Toolkit Pro',
      price: '$199',
      status: 'pending',
      date: '2024-01-13',
      progress: 0,
      rating: 0
    }
  ])

  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => <span style={{ color: '#52c41a' }}>{price}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'completed': 'green',
          'in-progress': 'blue',
          'pending': 'orange'
        }
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>
      }
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => (
        <div style={{ width: 100 }}>
          <div style={{ 
            width: `${progress}%`, 
            height: 8, 
            backgroundColor: progress === 100 ? '#52c41a' : '#1890ff',
            borderRadius: 4
          }} />
          <span style={{ fontSize: '12px' }}>{progress}%</span>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span>{rating}/5</span>
        </Space>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>View</Button>
          {record.status === 'completed' && (
            <Button size="small" icon={<DownloadOutlined />}>Download</Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <DashboardLayout>
      <div>
        <Title level={2} style={{ marginBottom: '2rem' }}>My Purchases</Title>
        
        <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Total Purchases" value={12} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Completed" value={8} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="In Progress" value={3} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Total Spent" value="$1,240" />
            </Card>
          </Col>
        </Row>

        <Card title="Purchase History">
          <Table 
            dataSource={purchases} 
            columns={columns}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default PurchasesPage
