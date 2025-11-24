import React, { useState } from 'react';
import { Menu, Typography, Button } from 'antd';
import { 
  PictureOutlined,
  VerifiedOutlined
} from '@ant-design/icons';
import BannerStore from './BannerStore';
import VerifiedBadge from './VerifiedBadge';

const { Title } = Typography;

const Store = () => {
  const [activeTab, setActiveTab] = useState('banners'); // 'banners' or 'verified-badge'
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: 'banners',
      icon: <PictureOutlined />,
      label: 'Banners',
    },
    {
      key: 'verified-badge',
      icon: <VerifiedOutlined />,
      label: 'Verified Badge',
    },
  ];

  const handleMenuClick = ({ key }) => {
    setActiveTab(key);
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      {/* Mini Sidebar Menu */}
      <div
        style={{
          width: collapsed ? 80 : 220,
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          transition: 'width 0.2s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          padding: '20px 16px', 
          borderBottom: '1px solid #f0f0f0',
          textAlign: collapsed ? 'center' : 'left',
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          {!collapsed && (
            <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Store
            </Title>
          )}
          {collapsed && (
            <Button
              type="text"
              icon={<PictureOutlined />}
              onClick={() => setCollapsed(false)}
              style={{ fontSize: '20px' }}
            />
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems.map(item => ({
            ...item,
            label: collapsed ? null : item.label
          }))}
          onClick={handleMenuClick}
          style={{ borderRight: 0, padding: '12px 0', flex: 1 }}
          inlineCollapsed={collapsed}
        />
        {!collapsed && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
            <Button
              type="text"
              block
              onClick={() => setCollapsed(true)}
              style={{ textAlign: 'left' }}
            >
              ← Collapse
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        {activeTab === 'banners' && <BannerStore />}
        {activeTab === 'verified-badge' && <VerifiedBadge />}
      </div>
    </div>
  );
};

export default Store;

