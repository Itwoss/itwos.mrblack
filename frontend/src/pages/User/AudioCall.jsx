import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Typography, Avatar, message, Tooltip } from 'antd';
import { 
  PhoneOutlined, 
  CloseOutlined, 
  UserOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContextOptimized';
import { useCall } from '../../contexts/CallContext';
import analyticsService from '../../services/analyticsService';
import useCallManager from '../../hooks/useCallManager';
import api from '../../services/api';
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils';
import UserLayout from '../../components/UserLayout';

const { Title, Text } = Typography;

const AudioCall = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const callContext = useCall();
  const initiateCall = callContext?.initiateCall;
  const outgoingCall = callContext?.outgoingCall;
  const activeCall = callContext?.activeCall;
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [callStatus, setCallStatus] = useState('ringing'); // connecting, ringing, active, ended
  const callStartTime = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const endCallManagerRef = useRef(null);

  // Define handleCallEnd before using it
  const handleCallEnd = useCallback(() => {
    setCallStatus('ended');
    if (endCallManagerRef.current) {
      endCallManagerRef.current();
    }
    if (callStartTime.current) {
      const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      analyticsService.trackCallEnd('audio', userId, duration, `/audio-call/${userId}`);
    }
    navigate('/chat');
  }, [userId, navigate]);

  // Use call manager hook
  const {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isSpeakerEnabled,
    toggleMute,
    toggleSpeaker,
    endCall: endCallManager,
    localAudioRef,
    remoteAudioRef
  } = useCallManager(currentUser?._id, 'audio', userId, handleCallEnd);

  // Store endCallManager in ref to avoid circular dependency
  useEffect(() => {
    endCallManagerRef.current = endCallManager;
  }, [endCallManager]);

  // Fetch receiver info
  const fetchReceiverInfo = useCallback(async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      if (response.data.success || response.data.user) {
        setReceiverInfo(response.data.user || response.data);
      }
    } catch (error) {
      console.error('Error fetching receiver info:', error);
    }
  }, [userId]);

  // Listen for busy state
  useEffect(() => {
    const socket = callContext?.socket;
    if (!socket) return;

    const handleBusy = (data) => {
      console.log('📞 Call busy:', data);
      setCallStatus('busy');
      message.error(data.message || 'User is on another call');
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    };

    socket.on('call-busy', handleBusy);

    return () => {
      socket.off('call-busy', handleBusy);
    };
  }, [callContext?.socket, navigate]);

  // Initialize call effect
  useEffect(() => {
    if (!userId) {
      message.error('Invalid call');
      navigate('/chat');
      return;
    }

    // Set initial status to ringing (will show immediately)
    setCallStatus('ringing');
    
    // Track call start
    callStartTime.current = Date.now();
    analyticsService.trackCallStart('audio', userId, `/audio-call/${userId}`);

    // Fetch receiver info
    fetchReceiverInfo();

    // Initiate call
    if (initiateCall) {
      initiateCall(userId, 'audio');
    }

    return () => {
      // Track call end on unmount
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
        analyticsService.trackCallEnd('audio', userId, duration, `/audio-call/${userId}`);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId to prevent infinite loops

  // Call timer effect
  useEffect(() => {
    if (!callStartTime.current) return;

    const timer = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update call status based on connection and call state
  useEffect(() => {
    if (activeCall) {
      // Call was accepted
      setCallStatus('active');
      if (!callStartTime.current) {
        callStartTime.current = Date.now();
      }
    } else if (outgoingCall) {
      // We initiated the call, show ringing
      setCallStatus('ringing');
    } else if (isConnected) {
      // WebRTC connection established
      setCallStatus('active');
      if (!callStartTime.current) {
        callStartTime.current = Date.now();
      }
    } else if (localStream) {
      // Local stream ready but not connected yet
      setCallStatus('ringing');
    }
  }, [isConnected, localStream, activeCall, outgoingCall]);


  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <UserLayout>
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative'
      }}>
        {/* User Avatar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '60px'
        }}>
          <Avatar
            src={receiverInfo ? getUserAvatarUrl(receiverInfo) : null}
            icon={<UserOutlined />}
            size={120}
            style={{
              border: '4px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {receiverInfo ? getUserInitials(receiverInfo.name) : 'U'}
          </Avatar>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: '8px' }}>
              {receiverInfo?.name || 'User'}
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', display: 'block' }}>
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'active' && formatDuration(callDuration)}
              {callStatus === 'busy' && 'User is busy'}
              {callStatus === 'ended' && 'Call Ended'}
            </Text>
          </div>
        </div>

        {/* Audio Visualization (Placeholder) */}
        <div style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: isConnected 
            ? 'rgba(34, 197, 94, 0.2)' 
            : 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '60px',
          border: `2px solid ${isConnected ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
          animation: callStatus === 'ringing' ? 'pulse 2s infinite' : 'none'
        }}>
          <PhoneOutlined style={{ fontSize: '64px', color: '#fff' }} />
        </div>

        {/* Hidden Audio Elements */}
        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

        {/* Call Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          alignItems: 'center'
        }}>
          <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
            <Button
              type={isMuted ? 'default' : 'primary'}
              shape="circle"
              size="large"
              icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={toggleMute}
              style={{
                width: '56px',
                height: '56px',
                fontSize: '20px',
                background: isMuted ? '#fff' : '#3b82f6',
                borderColor: isMuted ? '#d9d9d9' : '#3b82f6'
              }}
            />
          </Tooltip>
          <Tooltip title={isSpeakerEnabled ? 'Speaker off' : 'Speaker on'}>
            <Button
              type={isSpeakerEnabled ? 'primary' : 'default'}
              shape="circle"
              size="large"
              icon={<SoundOutlined />}
              onClick={toggleSpeaker}
              style={{
                width: '56px',
                height: '56px',
                fontSize: '20px',
                background: isSpeakerEnabled ? '#22c55e' : '#fff',
                borderColor: isSpeakerEnabled ? '#22c55e' : '#d9d9d9'
              }}
            />
          </Tooltip>
          <Button
            type="primary"
            danger
            shape="circle"
            size="large"
            icon={<CloseOutlined />}
            onClick={handleCallEnd}
            style={{
              width: '64px',
              height: '64px',
              fontSize: '24px',
              background: '#ff4d4f',
              borderColor: '#ff4d4f',
              boxShadow: '0 4px 12px rgba(255, 77, 79, 0.4)'
            }}
          />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}</style>
      </div>
    </UserLayout>
  );
};

export default AudioCall;

