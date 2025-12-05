import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContextOptimized';
import IncomingCallNotification from '../components/IncomingCallNotification';
import api from '../services/api';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  // Return safe default object if not in provider
  if (!context) {
    return {
      incomingCall: null,
      activeCall: null,
      outgoingCall: null,
      initiateCall: () => {},
      acceptCall: () => {},
      rejectCall: () => {},
      endCall: () => {},
      socket: null
    };
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null); // Track outgoing calls
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000';
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    if (!token) return;

    // Initialize Socket.IO for calls
    socketRef.current = io(serverUrl, {
      transports: ['polling', 'websocket'],
      auth: { token, userId: user._id }
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('📞 Call Socket connected');
      // Join user room for receiving calls
      socket.emit('join-user-room', user._id);
    });

    // Listen for incoming calls - ONLY if we're not the caller
    socket.on('incoming-call', (callData) => {
      console.log('📞 Incoming call received:', callData);
      
      // IMPORTANT: Only show incoming call if we're NOT the caller
      // The caller should never see an incoming call popup
      // Convert both to strings for comparison (handles ObjectId vs string)
      const callerIdStr = String(callData.callerId);
      const userIdStr = String(user._id);
      
      // Check 1: If we are the caller, ignore completely
      if (callerIdStr === userIdStr) {
        console.log('📞 Ignoring incoming call - we are the caller');
        return;
      }
      
      // Check 2: If we have an active outgoing call, ignore incoming call
      // This prevents the caller from seeing popup when receiver accepts
      if (outgoingCall) {
        const outgoingReceiverIdStr = String(outgoingCall.receiverId);
        // If the incoming call is from someone we're calling, ignore it
        if (callerIdStr === outgoingReceiverIdStr) {
          console.log('📞 Ignoring incoming call - we initiated this call');
          return;
        }
        // If we're already in an outgoing call, don't show another incoming call
        console.log('📞 Ignoring incoming call - we are already in an outgoing call');
        return;
      }
      
      // Check 3: If we have an active call, ignore incoming call
      if (activeCall) {
        console.log('📞 Ignoring incoming call - we are already in an active call');
        return;
      }
      
      // All checks passed - show incoming call popup
      setIncomingCall({
        ...callData,
        callId: callData.callId || `${callData.callerId}-${Date.now()}`
      });
    });

    // Listen for busy state (receiver is on another call)
    socket.on('call-busy', (data) => {
      console.log('📞 User is busy:', data);
      setOutgoingCall(null); // Clear outgoing call state
      // Show error message (will be handled by VideoCall/AudioCall components)
    });

    // Listen for call accepted
    socket.on('call-accepted', (data) => {
      console.log('📞 Call accepted:', data);
      
      // IMPORTANT: Clear incoming call FIRST to prevent popup from showing
      // This ensures the caller never sees a popup when call is accepted
      setIncomingCall(null);
      
      // Then set active call and clear outgoing call
      setActiveCall(data);
      setOutgoingCall(null);
      
      console.log('📞 Call state updated: activeCall set, incomingCall and outgoingCall cleared');
    });

    // Listen for call rejected
    socket.on('call-rejected', (data) => {
      console.log('📞 Call rejected:', data);
      setIncomingCall(null);
      setOutgoingCall(null); // Clear outgoing call state
    });

    // Listen for call ended
    socket.on('call-ended', (data) => {
      console.log('📞 Call ended:', data);
      setIncomingCall(null);
      setActiveCall(null);
      setOutgoingCall(null); // Clear outgoing call state
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, outgoingCall, activeCall]); // Add dependencies to ensure checks work correctly

  const initiateCall = (receiverId, callType) => {
    if (!socketRef.current || !user) return;

    // Fetch receiver info
    api.get(`/users/${receiverId}`)
      .then(response => {
        const receiver = response.data.user || response.data;
        
        // Set outgoing call state (caller sees this, not incoming call popup)
        setOutgoingCall({
          receiverId,
          receiverName: receiver.name || receiver.username || 'User',
          receiverAvatar: receiver.avatarUrl || receiver.avatar,
          callType,
          status: 'ringing', // Start with ringing status
          timestamp: new Date()
        });
        
        // Emit call initiation
        socketRef.current.emit('call-initiate', {
          to: receiverId,
          callType,
          callerId: user._id,
          callerName: user.name,
          callerAvatar: user.avatarUrl
        });
      })
      .catch(error => {
        console.error('Error fetching receiver info:', error);
        setOutgoingCall(null);
      });
  };

  const acceptCall = (call) => {
    if (!socketRef.current) return;

    socketRef.current.emit('call-accept', {
      to: call.callerId,
      callId: call.callId
    });

    setIncomingCall(null);
    setActiveCall(call);
    setOutgoingCall(null);
  };

  const rejectCall = (call) => {
    if (!socketRef.current) return;

    socketRef.current.emit('call-reject', {
      to: call.callerId,
      callId: call.callId
    });

    setIncomingCall(null);
    setOutgoingCall(null);
  };

  const endCall = () => {
    if (!socketRef.current) return;

    // End call whether it's active or outgoing
    if (activeCall) {
      socketRef.current.emit('call-end', {
        to: activeCall.callerId || activeCall.receiverId
      });
    } else if (outgoingCall) {
      socketRef.current.emit('call-end', {
        to: outgoingCall.receiverId
      });
    }

    setActiveCall(null);
    setIncomingCall(null);
    setOutgoingCall(null);
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        outgoingCall,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        socket: socketRef.current
      }}
    >
      {children}
      {/* Only show incoming call popup if:
          1. We have an incoming call
          2. We don't have an outgoing call (we're not the caller)
          3. We don't have an active call (we're not already in a call)
      */}
      {incomingCall && !outgoingCall && !activeCall && (
        <IncomingCallNotification
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </CallContext.Provider>
  );
};

