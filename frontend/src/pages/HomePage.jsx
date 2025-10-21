import React from 'react'
import { Button, Card, Row, Col, Typography, Space, Statistic, List, Avatar } from 'antd'
import { Link } from 'react-router-dom'
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  MessageOutlined,
  RocketOutlined,
  StarOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons'
import ProductList from './Products/ProductList'

const { Title, Paragraph } = Typography

const HomePage = () => {
  const features = [
    {
      icon: <ShoppingCartOutlined style={{ fontSize: '3rem', color: '#1890ff' }} />,
      title: 'E-Commerce',
      description: 'Complete user management, payments with Razorpay, and order tracking.',
      color: '#1890ff'
    },
    {
      icon: <MessageOutlined style={{ fontSize: '3rem', color: '#52c41a' }} />,
      title: 'E2E Chat',
      description: 'End-to-end encrypted messaging with real-time communication.',
      color: '#52c41a'
    },
    {
      icon: <UserOutlined style={{ fontSize: '3rem', color: '#fa8c16' }} />,
      title: 'User Management',
      description: 'Complete user profiles, authentication, and admin dashboards.',
      color: '#fa8c16'
    },
    {
      icon: <RocketOutlined style={{ fontSize: '3rem', color: '#eb2f96' }} />,
      title: 'Real-time',
      description: 'Live sessions, notifications, and real-time updates.',
      color: '#eb2f96'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO, TechCorp',
      content: 'ITWOS AI transformed our business operations completely!',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
    {
      name: 'Mike Chen',
      role: 'CTO, StartupXYZ',
      content: 'The E2E chat feature is incredible. Our team communication improved 300%.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
    },
    {
      name: 'Emily Davis',
      role: 'User Manager, InnovateCo',
      content: 'Best platform we\'ve ever used. Highly recommend!',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'
    }
  ]

  return (
    <div style={{ background: '#f5f5f5' }}>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.1
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
          <Title level={1} style={{ color: 'white', marginBottom: '1rem', fontSize: '3rem' }}>
            🚀 ITWOS AI Platform
          </Title>
          <Paragraph style={{ color: 'white', fontSize: '1.3rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            Your Complete Full-Stack Business Solution with AI-powered features, real-time communication, and secure payments.
          </Paragraph>
          <Space size="large" wrap>
            <Link to="/login">
              <Button type="primary" size="large" icon={<UserOutlined />}>
                Get Started
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="large" style={{ background: 'white', color: '#667eea' }}>
                View Dashboard
              </Button>
            </Link>
          </Space>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ padding: '3rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Row gutter={[24, 24]}>
            <Col xs={12} sm={6}>
              <Statistic title="Active Users" value={1128} prefix={<UserOutlined />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Users Active" value={9320} prefix={<UserOutlined />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Messages Sent" value={15680} prefix={<MessageOutlined />} />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic title="Success Rate" value={99.9} suffix="%" prefix={<CheckCircleOutlined />} />
            </Col>
          </Row>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '3rem' }}>
          🎯 Platform Features
        </Title>
        
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card 
                hoverable 
                style={{ 
                  textAlign: 'center', 
                  height: '100%',
                  border: `2px solid ${feature.color}20`,
                  borderRadius: '12px'
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  {feature.icon}
                </div>
                <Title level={4} style={{ color: feature.color }}>
                  {feature.title}
                </Title>
                <Paragraph style={{ marginBottom: '1rem' }}>
                  {feature.description}
                </Paragraph>
                <Button type="link" style={{ color: feature.color }}>
                  Learn More <ArrowRightOutlined />
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Testimonials Section */}
      <div style={{ padding: '4rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            💬 What Our Users Say
          </Title>
          
          <Row gutter={[24, 24]}>
            {testimonials.map((testimonial, index) => (
              <Col xs={24} md={8} key={index}>
                <Card style={{ height: '100%', borderRadius: '12px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <Avatar size={64} src={testimonial.avatar} />
                    <Title level={5} style={{ margin: '8px 0 4px' }}>
                      {testimonial.name}
                    </Title>
                    <Paragraph style={{ color: '#666', margin: 0 }}>
                      {testimonial.role}
                    </Paragraph>
                  </div>
                  <Paragraph style={{ fontStyle: 'italic', textAlign: 'center' }}>
                    "{testimonial.content}"
                  </Paragraph>
                  <div style={{ textAlign: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                      <StarOutlined key={i} style={{ color: '#faad14' }} />
                    ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Products Section */}
      <div style={{ padding: '4rem 2rem', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Title level={2}>Featured Products</Title>
            <Paragraph style={{ fontSize: '1.1rem', color: '#666' }}>
              Discover amazing products and services from our community
            </Paragraph>
          </div>
          <ProductList />
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #001529 0%, #1890ff 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Title level={2} style={{ color: 'white', marginBottom: '1rem' }}>
            Ready to Transform Your Business?
          </Title>
          <Paragraph style={{ color: 'white', fontSize: '1.2rem', marginBottom: '2rem' }}>
            Join thousands of users who trust our platform. Start your free trial today!
          </Paragraph>
          <Space size="large" wrap>
            <Link to="/register">
              <Button type="primary" size="large" style={{ background: 'white', color: '#001529' }}>
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="large" style={{ background: 'transparent', color: 'white', border: '2px solid white' }}>
                Contact Sales
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button size="large" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>
                Admin Access
              </Button>
            </Link>
          </Space>
        </div>
      </div>

    </div>
  )
}

export default HomePage