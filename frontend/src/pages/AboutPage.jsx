import React from 'react'
import { Card, Typography, Row, Col } from 'antd'

const { Title, Paragraph } = Typography

const AboutPage = () => {
  return (
    <div style={{ padding: '2rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={2}>About ITWOS AI</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card>
            <Title level={3}>Our Mission</Title>
            <Paragraph>
              We're building the future of web applications with cutting-edge technology 
              and user-focused design. Our platform combines the power of AI, real-time 
              communication, and modern web technologies.
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <Title level={3}>Our Technology</Title>
            <Paragraph>
              Built with React, Node.js, MongoDB, Socket.IO, and many other modern 
              technologies. We focus on security, performance, and user experience.
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AboutPage