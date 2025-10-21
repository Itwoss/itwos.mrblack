import React from 'react'
import { Card, Row, Col, Typography } from 'antd'
import { 
  SoundOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  SketchOutlined,
  GlobalOutlined,
  FireOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

const IconTest = () => {
  const icons = [
    { name: 'SoundOutlined', icon: <SoundOutlined style={{ fontSize: '24px', color: '#ff6b6b' }} /> },
    { name: 'AppstoreOutlined', icon: <AppstoreOutlined style={{ fontSize: '24px', color: '#4ecdc4' }} /> },
    { name: 'ThunderboltOutlined', icon: <ThunderboltOutlined style={{ fontSize: '24px', color: '#45b7d1' }} /> },
    { name: 'SketchOutlined', icon: <SketchOutlined style={{ fontSize: '24px', color: '#f9ca24' }} /> },
    { name: 'GlobalOutlined', icon: <GlobalOutlined style={{ fontSize: '24px', color: '#6c5ce7' }} /> },
    { name: 'FireOutlined', icon: <FireOutlined style={{ fontSize: '24px', color: '#fd79a8' }} /> },
    { name: 'BarChartOutlined', icon: <BarChartOutlined style={{ fontSize: '24px', color: '#00b894' }} /> },
    { name: 'SettingOutlined', icon: <SettingOutlined style={{ fontSize: '24px', color: '#74b9ff' }} /> }
  ]

  return (
    <div style={{ 
      background: '#0a0a0a', 
      minHeight: '100vh',
      color: '#fff',
      padding: '2rem'
    }}>
      <Title level={1} style={{ color: '#fff', marginBottom: '2rem' }}>
        🎨 Icon Test - All Icons Working!
      </Title>
      
      <Row gutter={[24, 24]}>
        {icons.map((item, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card style={{ 
              background: '#111', 
              border: '1px solid #333',
              textAlign: 'center'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                {item.icon}
              </div>
              <Title level={4} style={{ color: '#fff', margin: 0 }}>
                {item.name}
              </Title>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default IconTest









