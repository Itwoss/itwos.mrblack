import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { message } from 'antd';
import analyticsService from '../services/analyticsService';

/**
 * Custom hook for managing WebRTC calls
 * Handles call signaling, peer connections, and media streams
 */
const useCallManager = (userId, callType, receiverId, onCallEnd) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const onCallEndRef = useRef(onCallEnd);
  const isCleaningUpRef = useRef(false);
  
  // Update ref when onCallEnd changes
  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // WebRTC configuration with TURN server support
  const getRTCConfig = () => {
    const iceServers = [
      // STUN servers (for NAT discovery)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];

    // Add TURN servers if configured (from environment variables)
    const turnServerUrl = import.meta.env.VITE_TURN_SERVER_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnServerUrl && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnServerUrl,
        username: turnUsername,
        credential: turnCredential
      });
      console.log('📞 TURN server configured');
    } else {
      console.log('📞 Using STUN servers only (TURN not configured)');
    }

    return {
      iceServers,
      iceCandidatePoolSize: 10 // Pre-gather ICE candidates for faster connection
    };
  };

  const rtcConfig = getRTCConfig();

  // Connection timeout handling
  const CONNECTION_TIMEOUT = 30000; // 30 seconds
  const connectionTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userId || !receiverId) return;
    
    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected && peerConnectionRef.current) {
        const state = peerConnectionRef.current.connectionState;
        if (state !== 'connected' && state !== 'connecting') {
          console.log('📞 Connection timeout');
          message.error('Call connection timeout. Please try again.');
          endCall();
        }
      }
    }, CONNECTION_TIMEOUT);

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [userId, receiverId, isConnected]);

  useEffect(() => {
    if (!userId || !receiverId) return;

    // Initialize Socket.IO connection
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000';
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    socketRef.current = io(serverUrl, {
      transports: ['polling', 'websocket'],
      auth: { token, userId }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('📞 Call Socket connected');
      initializeCall();
    });

    socket.on('call-offer', async (data) => {
      if (data.from === receiverId) {
        await handleOffer(data.offer);
      }
    });

    socket.on('call-answer', async (data) => {
      if (data.from === receiverId) {
        await handleAnswer(data.answer);
      }
    });

    socket.on('ice-candidate', async (data) => {
      if (data.from === receiverId && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('call-rejected', (data) => {
      if (data.from === receiverId) {
        console.log('Call rejected by receiver');
        endCall();
      }
    });

    socket.on('call-ended', (data) => {
      if (data.from === receiverId) {
        console.log('Call ended by other party');
        endCall();
      }
    });

    return () => {
      // Prevent multiple cleanup calls
      if (isCleaningUpRef.current) return;
      isCleaningUpRef.current = true;
      
      // Cleanup without calling onCallEnd to avoid recursion
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [userId, receiverId, callType]);

  const initializeCall = async () => {
    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('📞 Media devices not available');
        throw new Error('Media devices not supported in this browser');
      }

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (permissionError) {
        // Handle permission denial gracefully
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          // Log as info, not error (this is expected user behavior)
          console.info('📞 User denied microphone/camera permission - call will continue in receive-only mode');
          // Show user-friendly message
          message.warning('Microphone/camera access denied. You can still receive the call, but won\'t be able to send audio/video.');
          // Continue without local stream - user can still receive
          stream = null;
          setLocalStream(null);
        } else {
          // Log actual errors
          console.error('📞 Error accessing media devices:', permissionError);
          throw permissionError; // Re-throw other errors
        }
      }

      // Attach to video/audio elements (only if we have a stream)
      if (stream) {
        if (callType === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true; // Mute local audio to prevent feedback
        }
      }

      // Create peer connection (always, even without local stream)
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks to peer connection (only if we have a stream)
      if (stream) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setRemoteStream(remoteStream);
        
        if (callType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            to: receiverId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes with reconnection logic
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('📞 Connection state:', state);
        setIsConnected(state === 'connected');
        
        if (state === 'failed') {
          console.log('📞 Connection failed, attempting to reconnect...');
          attemptReconnect();
        } else if (state === 'disconnected') {
          // Wait a bit before considering it failed
          setTimeout(() => {
            if (peerConnectionRef.current?.connectionState === 'disconnected') {
              console.log('📞 Connection still disconnected, attempting reconnect...');
              attemptReconnect();
            }
          }, 2000);
        }
      };

      // Create and send offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      socketRef.current.emit('call-offer', {
        to: receiverId,
        callType,
        offer: offer
      });

      // Track call start
      analyticsService.trackCallStart(callType, receiverId, `/${callType}-call/${receiverId}`);
    } catch (error) {
      console.error('Error initializing call:', error);
      // Only end call if it's a critical error (not permission denial)
      if (error.name !== 'NotAllowedError' && error.name !== 'PermissionDeniedError') {
        endCall();
      } else {
        // For permission errors, just log and continue without local stream
        console.warn('📞 Call continuing without local media stream due to permission denial');
      }
    }
  };

  const handleOffer = async (offer) => {
    try {
      if (!peerConnectionRef.current) {
        await initializeCall();
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socketRef.current.emit('call-answer', {
        to: receiverId,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  // Reconnection logic for failed connections
  const attemptReconnect = async () => {
    if (!peerConnectionRef.current || !socketRef.current) return;
    
    try {
      // Try to restart ICE
      if (peerConnectionRef.current.connectionState === 'failed') {
        console.log('📞 Attempting ICE restart...');
        await peerConnectionRef.current.restartIce();
      } else {
        // If restartIce doesn't work, try creating new offer/answer
        console.log('📞 Attempting to re-establish connection...');
        // This would require re-initiating the call flow
        // For now, we'll just end the call and let user retry
        message.error('Connection lost. Please try calling again.');
        endCall();
      }
    } catch (error) {
      console.error('📞 Reconnection failed:', error);
      message.error('Connection failed. Please try calling again.');
      endCall();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      // For mobile devices, this might need additional handling
      remoteAudioRef.current.volume = isSpeakerEnabled ? 0.5 : 1.0;
      setIsSpeakerEnabled(!isSpeakerEnabled);
    }
  };

  const endCall = useCallback(() => {
    // Prevent multiple calls
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear streams
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localAudioRef.current) localAudioRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsConnected(false);

    // Notify other party
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('call-end', { to: receiverId });
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Track call end (call this last to avoid recursion)
    // Use ref to avoid dependency issues
    if (onCallEndRef.current) {
      // Use setTimeout to break potential call stack
      setTimeout(() => {
        onCallEndRef.current?.();
      }, 0);
    }
  }, [receiverId]);

  return {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    endCall,
    localVideoRef,
    remoteVideoRef,
    localAudioRef,
    remoteAudioRef
  };
};

export default useCallManager;

