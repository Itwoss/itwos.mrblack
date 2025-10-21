import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Alert, Steps, Row, Col, Divider } from 'antd';
import { MailOutlined, PhoneOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const navigate = useNavigate();

  const handleCheckUser = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:7000/api/password-reset/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: values.email })
      });

      const data = await response.json();
      
      if (data.success) {
        setUserData({
          email: values.email,
          exists: data.data.exists,
          hasPhone: data.data.hasPhone
        });
        setStep(1);
      } else {
        // Show error
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:7000/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          method: values.method
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep(2);
      } else {
        alert(data.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting reset:', error);
      alert('Failed to send verification code. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values) => {
    setLoading(true);
    try {
      console.log('🔄 Frontend: Verifying OTP...');
      console.log('📧 Email:', userData.email);
      console.log('🔢 OTP:', values.otp);
      
      const response = await fetch('http://localhost:7000/api/password-reset/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          otp: values.otp
        })
      });

      console.log('📥 Frontend: Response status:', response.status);
      console.log('📥 Frontend: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Frontend: Error response:', errorData);
        alert(`Error: ${errorData.message || 'Failed to verify OTP'}`);
        return;
      }

      const data = await response.json();
      console.log('📥 Frontend: Response data:', data);
      
      if (data.success) {
        setResetToken(data.data.resetToken);
        setStep(3);
      } else {
        alert(data.message || 'Failed to verify OTP');
      }
    } catch (error) {
      console.error('❌ Frontend: Error verifying OTP:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:7000/api/password-reset/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resetToken: resetToken,
          newPassword: values.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep(4);
      } else {
        // Show error
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Form
            form={form}
            onFinish={handleCheckUser}
            layout="vertical"
            size="large"
          >
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              Forgot Password?
            </Title>
            <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
              Enter your email address and we'll help you reset your password
            </Paragraph>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter your email address"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                Continue
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          </Form>
        );

      case 1:
        return (
          <div>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              Choose Reset Method
            </Title>
            <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
              How would you like to receive your verification code?
            </Paragraph>

            <Form
              form={form}
              onFinish={handleRequestReset}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="method"
                rules={[{ required: true, message: 'Please select a method' }]}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Card
                      hoverable
                      onClick={() => form.setFieldsValue({ method: 'email' })}
                      style={{
                        border: form.getFieldValue('method') === 'email' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        cursor: 'pointer'
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                        <MailOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                        <Title level={4}>Email</Title>
                        <Text type="secondary">Send code to {userData.email}</Text>
                      </Space>
                    </Card>
                  </Col>
                  
                  {userData.hasPhone && (
                    <Col xs={24} sm={12}>
                      <Card
                        hoverable
                        onClick={() => form.setFieldsValue({ method: 'phone' })}
                        style={{
                          border: form.getFieldValue('method') === 'phone' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                          cursor: 'pointer'
                        }}
                      >
                        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                          <PhoneOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                          <Title level={4}>Phone</Title>
                          <Text type="secondary">Send code via SMS</Text>
                        </Space>
                      </Card>
                    </Col>
                  )}
                </Row>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Send Verification Code
                </Button>
              </Form.Item>
            </Form>
          </div>
        );

      case 2:
        return (
          <div>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              Enter Verification Code
            </Title>
            <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
              We've sent a 6-digit code to your {userData.method === 'email' ? 'email' : 'phone'}
            </Paragraph>

            <Form
              form={form}
              onFinish={handleVerifyOTP}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="otp"
                label="Verification Code"
                rules={[
                  { required: true, message: 'Please enter the verification code' },
                  { len: 6, message: 'Code must be 6 digits' }
                ]}
              >
                <Input
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Verify Code
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Button type="link">
                  Resend Code
                </Button>
              </div>
            </Form>
          </div>
        );

      case 3:
        return (
          <div>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              Create New Password
            </Title>
            <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
              Enter your new password below
            </Paragraph>

            <Form
              form={form}
              onFinish={handleResetPassword}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter new password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm new password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </div>
        );

      case 4:
        return (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: 24 }} />
            <Title level={2} style={{ marginBottom: 16 }}>
              Password Reset Successful!
            </Title>
            <Paragraph style={{ marginBottom: 32 }}>
              Your password has been successfully reset. You can now log in with your new password.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 500,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <Steps current={step} style={{ marginBottom: 32 }}>
          <Step title="Email" />
          <Step title="Method" />
          <Step title="Verify" />
          <Step title="Reset" />
          <Step title="Complete" />
        </Steps>

        {renderStepContent()}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;