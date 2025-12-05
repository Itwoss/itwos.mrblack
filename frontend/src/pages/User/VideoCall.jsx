import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Typography, Avatar, message, Tooltip } from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  CloseOutlined, 
  UserOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContextOptimized';
import { useCall } from '../../contexts/CallContext';
import analyticsService from '../../services/analyticsService';
import useCallManager from '../../hooks/useCallManager';
import api from '../../services/api';
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils';
import UserLayout from '../../components/UserLayout';

const { Title, Text } = Typography;

const VideoCall = () => {
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
  const [viewMode, setViewMode] = useState('split'); // 'split' or 'focused' (remote/local)
  const [focusedView, setFocusedView] = useState('remote'); // 'remote' or 'local'

  // Define handleCallEnd before using it
  const handleCallEnd = useCallback(() => {
    setCallStatus('ended');
    if (endCallManagerRef.current) {
      endCallManagerRef.current();
    }
    if (callStartTime.current) {
      const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      analyticsService.trackCallEnd('video', userId, duration, `/video-call/${userId}`);
    }
    navigate('/chat');
  }, [userId, navigate]);

  // Use call manager hook
  const {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall: endCallManager,
    localVideoRef,
    remoteVideoRef,
    localAudioRef,
    remoteAudioRef
  } = useCallManager(currentUser?._id, 'video', userId, handleCallEnd);

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
    analyticsService.trackCallStart('video', userId, `/video-call/${userId}`);

    // Fetch receiver info
    fetchReceiverInfo();

    // Initiate call
    if (initiateCall) {
      initiateCall(userId, 'video');
    }

    return () => {
      // Track call end on unmount
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
        analyticsService.trackCallEnd('video', userId, duration, `/video-call/${userId}`);
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

  // Toggle view mode
  const toggleViewMode = () => {
    if (viewMode === 'split') {
      setViewMode('focused');
    } else {
      setViewMode('split');
    }
  };

  // Switch focused view
  const switchFocusedView = () => {
    setFocusedView(focusedView === 'remote' ? 'local' : 'remote');
  };

  return (
    <UserLayout>
      <div style={{
        width: '100%',
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Video Container - Split Screen Layout */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: viewMode === 'split' ? 'row' : 'column',
          position: 'relative',
          background: '#000'
        }}>
          {/* Remote Video */}
          <div 
            style={{
              flex: viewMode === 'split' ? 1 : (focusedView === 'remote' ? 1 : 0.3),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a1a',
              position: 'relative',
              borderRight: viewMode === 'split' ? '2px solid #333' : 'none',
              borderBottom: viewMode === 'focused' && focusedView === 'remote' ? '2px solid #333' : 'none',
              transition: 'flex 0.3s ease',
              cursor: viewMode === 'focused' ? 'pointer' : 'default'
            }}
            onClick={viewMode === 'focused' ? switchFocusedView : undefined}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {(!remoteStream || !remoteVideoRef.current?.srcObject) && (
              <div style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                zIndex: 10
              }}>
                <Avatar
                  src={receiverInfo ? getUserAvatarUrl(receiverInfo) : null}
                  icon={<UserOutlined />}
                  size={120}
                >
                  {receiverInfo ? getUserInitials(receiverInfo.name) : 'U'}
                </Avatar>
                <Text style={{ color: '#fff', fontSize: '18px' }}>
                  {receiverInfo?.name || 'User'}
                </Text>
                <Text style={{ color: '#999', fontSize: '14px' }}>
                  {callStatus === 'connecting' && 'Connecting...'}
                  {callStatus === 'ringing' && 'Ringing...'}
                  {callStatus === 'active' && formatDuration(callDuration)}
                  {callStatus === 'busy' && 'User is busy'}
                  {callStatus === 'ended' && 'Call Ended'}
                </Text>
              </div>
            )}
            {/* Name label overlay */}
            {remoteStream && remoteVideoRef.current?.srcObject && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 12px',
                borderRadius: '8px',
                zIndex: 10
              }}>
                <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                  {receiverInfo?.name || 'User'}
                </Text>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div 
            style={{
              flex: viewMode === 'split' ? 1 : (focusedView === 'local' ? 1 : 0.3),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#2a2a2a',
              position: 'relative',
              transition: 'flex 0.3s ease',
              cursor: viewMode === 'focused' ? 'pointer' : 'default'
            }}
            onClick={viewMode === 'focused' ? switchFocusedView : undefined}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isVideoEnabled ? 'scaleX(-1)' : 'none' // Mirror local video
              }}
            />
            {(!localStream || !localVideoRef.current?.srcObject) && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#2a2a2a'
              }}>
                <Avatar
                  src={currentUser?.avatarUrl}
                  icon={<UserOutlined />}
                  size={80}
                >
                  {currentUser ? getUserInitials(currentUser.name) : 'U'}
                </Avatar>
              </div>
            )}
            {/* Name label overlay */}
            {localStream && localVideoRef.current?.srcObject && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 12px',
                borderRadius: '8px',
                zIndex: 10
              }}>
                <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                  {currentUser?.name || 'You'}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Audio Elements */}
        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

        {/* View Mode Toggle Button (Top Right) */}
        {callStatus === 'active' && (
          <Button
            type="default"
            shape="circle"
            size="large"
            icon={<VideoCameraOutlined />}
            onClick={toggleViewMode}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '48px',
              height: '48px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              zIndex: 100,
              backdropFilter: 'blur(10px)'
            }}
            title={viewMode === 'split' ? 'Switch to focused view' : 'Switch to split view'}
          />
        )}

        {/* Call Controls */}
        <div style={{
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
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
                background: isMuted ? 'rgba(255, 255, 255, 0.2)' : '#3b82f6',
                border: 'none',
                color: '#fff'
              }}
            />
          </Tooltip>
          <Tooltip title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
            <Button
              type={isVideoEnabled ? 'primary' : 'default'}
              shape="circle"
              size="large"
              icon={isVideoEnabled ? <VideoCameraOutlined /> : <StopOutlined />}
              onClick={toggleVideo}
              style={{
                width: '56px',
                height: '56px',
                fontSize: '20px',
                background: isVideoEnabled ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff'
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
                background: isSpeakerEnabled ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff'
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
              borderColor: '#ff4d4f'
            }}
          />
        </div>
      </div>
    </UserLayout>
  );
};

export default VideoCall;

