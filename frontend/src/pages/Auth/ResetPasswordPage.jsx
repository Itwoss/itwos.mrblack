import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, message, Result } from 'antd'
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import { resetPassword, clearError } from '../../store/slices/authSlice'

const { Title, Text } = Typography

const ResetPasswordPage = () => {
  const [form] = Form.useForm()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [passwordReset, setPasswordReset] = useState(false)
  
  const { isLoading, error } = useSelector(state => state.auth)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      message.error('Invalid or missing reset token')
      navigate('/forgot-password')
    }
  }, [token, navigate])

  useEffect(() => {
    if (error) {
      message.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  const onFinish = async (values) => {
    try {
      await dispatch(resetPassword({ token, password: values.password })).unwrap()
      setPasswordReset(true)
      message.success('Password reset successful!')
    } catch (error) {
      message.error(error || 'Password reset failed')
    }
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Result
            status="success"
            title="Password Reset Successful"
            subTitle="Your password has been successfully reset. You can now sign in with your new password."
            extra={[
              <Button type="primary" key="login">
                <Link to="/login">Sign In</Link>
              </Button>
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Title level={2} className="text-3xl font-bold text-gray-900">
            Reset your password
          </Title>
          <Text className="text-gray-600">
            Enter your new password below.
          </Text>
        </div>

        <Card className="shadow-lg">
          <Form
            form={form}
            name="resetPassword"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="password"
              label="New Password"
              rules={[
                { required: true, message: 'Please input your new password!' },
                { min: 8, message: 'Password must be at least 8 characters!' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Password must contain uppercase, lowercase, number, and special character!'
                }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Passwords do not match!'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full"
                loading={isLoading}
                size="large"
              >
                Reset Password
              </Button>
            </Form.Item>

            <div className="text-center">
              <Link to="/login" className="text-blue-600 hover:text-blue-500">
                <ArrowLeftOutlined /> Back to Login
              </Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}

export default ResetPasswordPage
