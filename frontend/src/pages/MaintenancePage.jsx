import React, { useState, useEffect } from 'react'
import { Result, Spin, Typography } from 'antd'
import { 
  ToolOutlined, 
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { publicApi } from '../services/api'

const { Title, Paragraph } = Typography

const MaintenancePage = () => {
  const [loading, setLoading] = useState(true)
  const [siteName, setSiteName] = useState('ITWOS AI Platform')
  const [siteDescription, setSiteDescription] = useState('We are currently performing scheduled maintenance')

  useEffect(() => {
    checkMaintenanceStatus()
    // Check every 5 seconds for faster response when admin disables maintenance
    const interval = setInterval(checkMaintenanceStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkMaintenanceStatus = async () => {
    try {
      // Use public API endpoint that bypasses maintenance mode
      const response = await publicApi.get('/settings/maintenance-status')
      
      if (response.data.success) {
        setSiteName(response.data.data?.siteName || 'ITWOS AI Platform')
        setSiteDescription(response.data.data?.siteDescription || 'We are currently performing scheduled maintenance')
        
        // If maintenance mode is disabled, reload the page
        if (!response.data.data?.maintenanceMode) {
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        background: '#fff',
        borderRadius: '16px',
        padding: '48px 32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <Result
          icon={
            <div style={{
              fontSize: '80px',
              color: '#667eea',
              marginBottom: '24px'
            }}>
              <ToolOutlined />
            </div>
          }
          title={
            <Title level={2} style={{ 
              marginBottom: '16px',
              fontSize: 'clamp(24px, 5vw, 32px)',
              color: '#1a1a1a'
            }}>
              Under Maintenance
            </Title>
          }
          subTitle={
            <div>
              <Paragraph style={{ 
                fontSize: 'clamp(14px, 3vw, 18px)',
                color: '#666',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}>
                {siteDescription}
              </Paragraph>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#999',
                fontSize: '14px',
                marginTop: '32px'
              }}>
                <ClockCircleOutlined />
                <span>We'll be back shortly</span>
              </div>
            </div>
          }
          extra={
            <div style={{ marginTop: '32px' }}>
              <button
                onClick={checkMaintenanceStatus}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#fff',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#5568d3'
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#667eea'
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
              >
                <ReloadOutlined />
                Check Again
              </button>
            </div>
          }
        />
        
        {/* Site Name */}
        <div style={{
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: '1px solid #e8e8e8'
        }}>
          <Title level={4} style={{ 
            color: '#999',
            fontSize: 'clamp(16px, 3vw, 20px)',
            fontWeight: 'normal',
            margin: 0
          }}>
            {siteName}
          </Title>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePage

