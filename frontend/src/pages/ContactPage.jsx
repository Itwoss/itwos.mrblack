import React from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

const ContactPage = () => {
  const onFinish = (values) => {
    message.success('Message sent successfully!')
  }

  return (
    <div style={{ padding: '2rem', background: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={2}>Contact Us</Title>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Title level={3}>Get in Touch</Title>
              <Paragraph>
                <MailOutlined /> Email: contact@itwos.ai<br/>
                <PhoneOutlined /> Phone: +1 (555) 123-4567<br/>
                <EnvironmentOutlined /> Address: 123 Tech Street, Silicon Valley
              </Paragraph>
            </Col>
            <Col xs={24} lg={12}>
              <Form onFinish={onFinish} layout="vertical">
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="message" label="Message" rules={[{ required: true }]}>
                  <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    Send Message
                  </Button>
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  )
}

export default ContactPage