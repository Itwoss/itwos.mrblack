import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  message, 
  Space,
  Divider,
  Alert
} from 'antd'
import { 
  SettingOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  MailOutlined,
  BellOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import AdminDesignSystem from '../../styles/admin-design-system'

const { Title, Paragraph, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const AdminSettings = () => {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'ITWOS AI Platform',
    siteDescription: 'A comprehensive full-stack platform',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    chatEnabled: true,
    maxFileSize: 10,
    allowedFileTypes: ['jpg', 'png', 'pdf', 'doc'],
    emailSettings: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: ''
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // In a real app, this would fetch from the API
      // const response = await api.get('/admin/settings')
      // setSettings(response.data.settings)
      console.log('Loading settings...')
    } catch (error) {
      console.error('Error loading settings:', error)
      message.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values) => {
    setLoading(true)
    try {
      // In a real app, this would save to the API
      // await api.put('/admin/settings', values)
      console.log('Saving settings:', values)
      message.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      message.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
    message.info('Settings reset to default values')
  }

  return (
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
          <SettingOutlined style={{ marginRight: AdminDesignSystem.spacing.sm, color: AdminDesignSystem.colors.primary }} />
          System Settings
        </Title>
        <Paragraph style={{ 
          fontSize: AdminDesignSystem.typography.fontSize.body,
          color: AdminDesignSystem.colors.text.secondary,
        }}>
          Configure platform settings and preferences
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onFinish={handleSave}
        style={{ maxWidth: '800px' }}
      >
        {/* General Settings */}
        <Card 
          title={
            <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
              General Settings
            </Text>
          }
          style={{ 
            marginBottom: AdminDesignSystem.spacing.lg,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="siteName"
                label="Site Name"
                rules={[{ required: true, message: 'Please enter site name' }]}
              >
                <Input placeholder="Enter site name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="siteDescription"
                label="Site Description"
                rules={[{ required: true, message: 'Please enter site description' }]}
              >
                <Input placeholder="Enter site description" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="maintenanceMode"
                label="Maintenance Mode"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="registrationEnabled"
                label="Allow Registration"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Feature Settings */}
        <Card 
          title={
            <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
              Feature Settings
            </Text>
          }
          style={{ 
            marginBottom: AdminDesignSystem.spacing.lg,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="emailNotifications"
                label="Email Notifications"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="chatEnabled"
                label="Chat System"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="maxFileSize"
                label="Max File Size (MB)"
                rules={[{ required: true, message: 'Please enter max file size' }]}
              >
                <Input type="number" min={1} max={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="allowedFileTypes"
                label="Allowed File Types"
              >
                <Select
                  mode="multiple"
                  placeholder="Select file types"
                  style={{ width: '100%' }}
                >
                  <Option value="jpg">JPG</Option>
                  <Option value="png">PNG</Option>
                  <Option value="pdf">PDF</Option>
                  <Option value="doc">DOC</Option>
                  <Option value="docx">DOCX</Option>
                  <Option value="txt">TXT</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Email Settings */}
        <Card 
          title={
            <Text strong style={{ color: AdminDesignSystem.colors.text.primary }}>
              Email Configuration
            </Text>
          }
          style={{ 
            marginBottom: AdminDesignSystem.spacing.lg,
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Alert
            message="Email Configuration"
            description="Configure SMTP settings for sending emails"
            type="info"
            showIcon
            style={{ marginBottom: AdminDesignSystem.spacing.md }}
          />
          
          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emailSettings', 'smtpHost']}
                label="SMTP Host"
              >
                <Input placeholder="smtp.gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emailSettings', 'smtpPort']}
                label="SMTP Port"
              >
                <Input type="number" placeholder="587" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[AdminDesignSystem.spacing.md, AdminDesignSystem.spacing.md]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emailSettings', 'smtpUser']}
                label="SMTP Username"
              >
                <Input placeholder="your-email@gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['emailSettings', 'smtpPassword']}
                label="SMTP Password"
              >
                <Input.Password placeholder="Your email password" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Action Buttons */}
        <Card
          style={{
            borderRadius: AdminDesignSystem.borderRadius.md,
            border: `1px solid ${AdminDesignSystem.colors.card.border}`,
            boxShadow: AdminDesignSystem.shadows.md,
            background: AdminDesignSystem.colors.card.background,
          }}
        >
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
                backgroundColor: AdminDesignSystem.colors.primary,
                borderColor: AdminDesignSystem.colors.primary,
              }}
            >
              Save Settings
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleReset}
              style={{
                borderRadius: AdminDesignSystem.borderRadius.md,
              }}
            >
              Reset
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  )
}

export default AdminSettings