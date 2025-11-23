import React from 'react';
import { Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import './BannerHeader.css';

const { Title } = Typography;

const BannerHeader = ({ banner, user, height = '200px' }) => {
  if (!banner) {
    // Default banner if none equipped
    return (
      <div
        className="banner-header default-banner"
        style={{
          height,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '24px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ zIndex: 2, position: 'relative' }}>
          <Title level={2} style={{ color: '#fff', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            {user?.name || 'User'}
            {user?.isVerified && (
              <CheckCircleOutlined 
                style={{ 
                  marginLeft: '12px', 
                  fontSize: '24px',
                  color: '#1890ff'
                }} 
              />
            )}
          </Title>
          {user?.username && (
            <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '4px' }}>
              @{user.username}
            </div>
          )}
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity) => {
    const colors = {
      Common: '#95a5a6',
      Rare: '#3498db',
      Epic: '#9b59b6',
      Legendary: '#f39c12',
      Mythic: '#e74c3c'
    };
    return colors[rarity] || '#95a5a6';
  };

  const bannerStyle = {
    height,
    borderRadius: '16px',
    backgroundImage: `url(${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000'}${banner.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '24px',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
    border: `3px solid ${getRarityColor(banner.rarity)}`
  };

  // Add effect class
  const effectClass = banner.effect !== 'none' ? `banner-effect-${banner.effect}` : '';

  return (
    <div
      className={`banner-header ${effectClass}`}
      style={bannerStyle}
    >
      {/* Dark overlay for better text readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
          zIndex: 1
        }}
      />

      {/* User info */}
      <div style={{ zIndex: 2, position: 'relative' }}>
        <Title level={2} style={{ color: '#fff', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          {user?.name || 'User'}
          {user?.isVerified && (
            <CheckCircleOutlined 
              style={{ 
                marginLeft: '12px', 
                fontSize: '24px',
                color: '#1890ff',
                filter: 'drop-shadow(0 0 4px rgba(24, 144, 255, 0.8))'
              }} 
            />
          )}
        </Title>
        {user?.username && (
          <div style={{ fontSize: '16px', opacity: 0.95, marginTop: '4px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            @{user.username}
          </div>
        )}
        {user?.bio && (
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9, 
            marginTop: '8px', 
            maxWidth: '600px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            {user.bio}
          </div>
        )}
      </div>

      {/* Rarity badge */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: getRarityColor(banner.rarity),
          color: '#fff',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 2,
          textTransform: 'uppercase',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        {banner.rarity}
      </div>
    </div>
  );
};

export default BannerHeader;

