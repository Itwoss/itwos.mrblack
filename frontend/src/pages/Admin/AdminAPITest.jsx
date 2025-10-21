import React, { useState, useEffect } from 'react'
import { Card, Typography, Button, Space, Alert, Spin } from 'antd'
import axios from 'axios'

const { Title, Paragraph, Text } = Typography

const AdminAPITest = () => {
  const [apiStatus, setApiStatus] = useState('testing')
  const [apiData, setApiData] = useState(null)
  const [error, setError] = useState(null)

  const testAPI = async () => {
    setApiStatus('testing')
    setError(null)
    
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('adminToken')
      
      if (!token) {
        setError('No authentication token found')
        setApiStatus('error')
        return
      }

      console.log('Testing API with token:', token.substring(0, 20) + '...')
      
      const response = await axios.get('http://localhost:7000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('API Response:', response.data)
      setApiData(response.data)
      setApiStatus('success')
    } catch (err) {
      console.error('API Test Error:', err)
      setError(err.response?.data?.message || err.message || 'Unknown error')
      setApiStatus('error')
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <Card>
        <Title level={2}>Admin API Test</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>API Status:</Text>
            <br />
            {apiStatus === 'testing' && <Spin />}
            {apiStatus === 'success' && <Text style={{ color: 'green' }}>✅ API Working</Text>}
            {apiStatus === 'error' && <Text style={{ color: 'red' }}>❌ API Error</Text>}
          </div>

          {error && (
            <Alert
              message="API Error"
              description={error}
              type="error"
              showIcon
            />
          )}

          {apiData && (
            <div>
              <Text strong>API Response Data:</Text>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '1rem', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}

          <Space>
            <Button type="primary" onClick={testAPI}>
              Test API Again
            </Button>
            <Button onClick={() => window.location.href = '/admin/dashboard'}>
              Go to Dashboard
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

export default AdminAPITest
