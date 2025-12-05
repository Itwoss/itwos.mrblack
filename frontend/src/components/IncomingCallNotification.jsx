import React, { useEffect, useState } from 'react';
import { Modal, Button, Space, Avatar, Typography } from 'antd';
import { PhoneOutlined, VideoCameraOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getUserAvatarUrl, getUserInitials } from '../utils/avatarUtils';

const { Title, Text } = Typography;

const IncomingCallNotification = ({ call, onAccept, onReject, onClose }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [ringing, setRinging] = useState(true);

  useEffect(() => {
    if (call) {
      setVisible(true);
      setRinging(true);
      
      // Auto-reject after 30 seconds if not answered
      const timeout = setTimeout(() => {
        if (visible) {
          handleReject();
        }
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [call]);

  const handleAccept = () => {
    setVisible(false);
    setRinging(false);
    if (call.callType === 'video') {
      navigate(`/video-call/${call.callerId}`);
    } else {
      navigate(`/audio-call/${call.callerId}`);
    }
    if (onAccept) onAccept(call);
  };

  const handleReject = () => {
    setVisible(false);
    setRinging(false);
    if (onReject) onReject(call);
    if (onClose) onClose();
  };

  if (!call || !visible) return null;

  return (
    <Modal
      open={visible}
      closable={false}
      footer={null}
      centered
      width={400}
      styles={{ mask: { background: 'rgba(0, 0, 0, 0.7)' } }}
      style={{ top: 20 }}
    >
      <div style={{
        textAlign: 'center',
        padding: '24px'
      }}>
        {/* Caller Avatar */}
        <div style={{ marginBottom: '24px' }}>
          <Avatar
            src={call.callerAvatar ? getUserAvatarUrl({ avatarUrl: call.callerAvatar }) : null}
            icon={<UserOutlined />}
            size={100}
            style={{
              border: '4px solid #3b82f6',
              boxShadow: ringing ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
              animation: ringing ? 'pulse 1.5s infinite' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {call.callerName ? getUserInitials(call.callerName) : 'U'}
          </Avatar>
        </div>

        {/* Caller Info */}
        <Title level={4} style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
          {call.callerName || 'Unknown User'}
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '32px' }}>
          {call.callType === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call'}
        </Text>

        {/* Call Controls */}
        <Space size="large">
          <Button
            type="primary"
            danger
            shape="circle"
            size="large"
            icon={<CloseOutlined />}
            onClick={handleReject}
            style={{
              width: '56px',
              height: '56px',
              fontSize: '24px',
              background: '#ff4d4f',
              borderColor: '#ff4d4f'
            }}
          />
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={call.callType === 'video' ? <VideoCameraOutlined /> : <PhoneOutlined />}
            onClick={handleAccept}
            style={{
              width: '56px',
              height: '56px',
              fontSize: '24px',
              background: '#22c55e',
              borderColor: '#22c55e'
            }}
          />
        </Space>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }
      `}</style>
    </Modal>
  );
};

export default IncomingCallNotification;

