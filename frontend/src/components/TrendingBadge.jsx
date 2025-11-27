import React from 'react';
import { Badge, Tooltip } from 'antd';
import { FireOutlined } from '@ant-design/icons';

/**
 * TrendingBadge Component
 * Displays a fire icon badge when a post is trending
 * Shows ranking position if available
 */
const TrendingBadge = ({ 
  trendingStatus, 
  trendingRank, 
  trendingScore,
  placement = 'top',
  showRank = true 
}) => {
  if (!trendingStatus) {
    return null;
  }

  const badgeContent = (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px',
      padding: '2px 8px',
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
      borderRadius: '12px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
    }}>
      <FireOutlined style={{ fontSize: '14px' }} />
      <span>Trending</span>
      {showRank && trendingRank && (
        <span style={{ 
          marginLeft: '4px',
          background: 'rgba(255, 255, 255, 0.3)',
          padding: '0 6px',
          borderRadius: '8px',
          fontSize: '11px'
        }}>
          #{trendingRank}
        </span>
      )}
    </div>
  );

  const tooltipText = trendingRank 
    ? `Trending #${trendingRank} - Score: ${trendingScore?.toFixed(1) || 'N/A'}`
    : `This post is trending! Score: ${trendingScore?.toFixed(1) || 'N/A'}`;

  return (
    <Tooltip title={tooltipText} placement={placement}>
      {badgeContent}
    </Tooltip>
  );
};

export default TrendingBadge;

