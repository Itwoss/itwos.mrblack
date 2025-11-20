import React, { useState, useEffect, useRef } from 'react'
import { 
  Input, 
  Button, 
  Avatar, 
  Typography, 
  Space, 
  message, 
  Spin,
  Empty,
  Badge,
  Modal,
  Tag,
  Divider
} from 'antd'
import { 
  SendOutlined,
  UserOutlined, 
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  CheckOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import { threadsAPI, usersListAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { io } from 'socket.io-client'

const { Text } = Typography
const { TextArea } = Input

const UserChat = () => {
  const { user: currentUser, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [createRoomModal, setCreateRoomModal] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [conversationSearch, setConversationSearch] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [typingUsers, setTypingUsers] = useState({}) // { threadId: [userId1, userId2] }
  const [onlineUsers, setOnlineUsers] = useState({}) // { userId: true/false }
  const [userLastSeen, setUserLastSeen] = useState({}) // { userId: timestamp }
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const typingDebounceRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    
    const initializeChat = async () => {
      if (!isMounted || initialized) return
      
      try {
        if (isAuthenticated && currentUser) {
          console.log('UserChat: Loading messages...')
          await loadChatRooms()
          if (isMounted) {
            setInitialized(true)
          }
        } else {
          console.log('User not authenticated, clearing chat data')
          if (isMounted) {
            setRooms([])
            setMessages([])
            setSelectedRoom(null)
            setInitialized(true)
          }
        }
      } catch (error) {
        console.error('Error in UserChat useEffect:', error)
        if (isMounted) {
          setError('Failed to initialize chat')
          setRooms([])
          setInitialized(true)
        }
      }
    }
    
    initializeChat()
    
    return () => {
      isMounted = false
    }
  }, [isAuthenticated, currentUser, initialized])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom._id)
    }
  }, [selectedRoom])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Socket.IO setup for real-time messaging
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:7000'
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token')

    if (!token) {
      console.warn('No token found for Socket.IO connection')
      return
    }

    console.log('🔌 Connecting to Socket.IO for messaging...')
    
    // Initialize Socket.IO connection
    socketRef.current = io(serverUrl, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token,
        userId: currentUser._id,
        userRole: currentUser.role
      }
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected for messaging:', socket.id)
      
      // Join all thread rooms the user is part of
      rooms.forEach(room => {
        socket.emit('join-room', room._id)
        console.log('🔌 Joined thread room:', room._id)
      })
    })

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error)
    })

    // Listen for new messages
    socket.on('new_message', (data) => {
      console.log('📨 New message received via Socket.IO:', data)
      
      const { threadId, message: newMsg } = data

      // Stop typing indicator when message is received
      if (selectedRoom && selectedRoom._id === threadId) {
        setTypingUsers(prev => ({
          ...prev,
          [threadId]: []
        }))
      }

      // Update messages if this is the selected room
      if (selectedRoom && selectedRoom._id === threadId) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => msg._id === newMsg._id)
          if (exists) return prev
          
          return [...prev, {
            ...newMsg,
            sender: newMsg.sender || { _id: newMsg.sender, name: 'Unknown' }
          }]
        })
      }

      // Update rooms list to show new message preview and sort by latest
      setRooms(prev => {
        const updated = prev.map(room => {
          if (room._id === threadId) {
            return {
              ...room,
              lastMessageAt: newMsg.createdAt,
              lastMessageText: newMsg.text || newMsg.ciphertext || newMsg.message || ''
            }
          }
          return room
        })
        
        // Sort by lastMessageAt (most recent first)
        return updated.sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || a.createdAt || 0)
          const dateB = new Date(b.lastMessageAt || b.createdAt || 0)
          return dateB - dateA
        })
      })

      // Scroll to bottom if message is in current conversation
      if (selectedRoom && selectedRoom._id === threadId) {
        setTimeout(() => scrollToBottom(), 100)
      }
    })

    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      const { threadId, userId, isTyping } = data
      
      setTypingUsers(prev => {
        const current = prev[threadId] || []
        if (isTyping) {
          // Add user if not already in list
          if (!current.includes(userId)) {
            return {
              ...prev,
              [threadId]: [...current, userId]
            }
          }
        } else {
          // Remove user from typing list
          return {
            ...prev,
            [threadId]: current.filter(id => id !== userId)
          }
        }
        return prev
      })
    })

    // Listen for online/offline status
    socket.on('user_online', (data) => {
      const { userId } = data
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: true
      }))
    })

    socket.on('user_offline', (data) => {
      const { userId } = data
      setOnlineUsers(prev => ({
        ...prev,
        [userId]: false
      }))
      // Update last seen
      setUserLastSeen(prev => ({
        ...prev,
        [userId]: new Date()
      }))
    })

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 Disconnecting Socket.IO...')
        socket.disconnect()
      }
    }
  }, [isAuthenticated, currentUser, selectedRoom])

  // Join rooms when rooms list changes
  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return

    const socket = socketRef.current
    
    // Join all thread rooms
    rooms.forEach(room => {
      socket.emit('join-room', room._id)
      console.log('🔌 Joined thread room:', room._id)
    })
  }, [rooms])

  // Join/leave thread room when selected room changes
  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return

    const socket = socketRef.current

    // Leave previous room
    if (selectedRoom) {
      // Join new thread room
      socket.emit('join-room', selectedRoom._id)
      console.log('🔌 Joined thread room:', selectedRoom._id)
    }

    return () => {
      // Leave room when component unmounts or room changes
      if (selectedRoom && socket) {
        socket.emit('leave-room', selectedRoom._id)
        console.log('🔌 Left thread room:', selectedRoom._id)
      }
    }
  }, [selectedRoom])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatRooms = async () => {
    if (!isAuthenticated || !currentUser) {
      console.log('Not authenticated, skipping API call')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Load only threads (direct messages only - Instagram style)
      const threadsResponse = await threadsAPI.getThreads({ userId: currentUser._id })
      
      const allRooms = []
      
      // Only add direct message threads (1-on-1 chats)
      if (threadsResponse.data.success) {
        const threads = threadsResponse.data.threads || []
        // Filter to only 1-on-1 chats (not groups)
        const directMessageThreads = threads
          .filter(thread => !thread.isGroup && thread.participants?.length === 2)
          .map(thread => ({
            ...thread,
            _id: thread._id,
            participants: thread.participants || [],
            isGroup: false,
            lastMessageAt: thread.lastMessageAt || thread.createdAt
          }))
        allRooms.push(...directMessageThreads)
      }
      
      // Sort by lastMessageAt (most recent first)
      allRooms.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || a.createdAt || 0)
        const dateB = new Date(b.lastMessageAt || b.createdAt || 0)
        return dateB - dateA
      })
      
      setRooms(allRooms)
      
      // Only set selected room if we don't have one and there are rooms available
      if (allRooms.length > 0 && !selectedRoom) {
        setSelectedRoom(allRooms[0])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      
      if (error.response?.status === 401) {
        console.log('Authentication error in chat')
        return
      }
      
      setRooms([])
      if (error.code !== 'ERR_NETWORK') {
        message.error('Failed to load messages')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (roomId) => {
    if (!isAuthenticated || !currentUser) {
      console.log('Not authenticated, skipping messages API call')
      return
    }
    
    try {
      // Use threads API for messages
      const response = await threadsAPI.getMessages(roomId, { page: 1, limit: 100 })
      if (response.data.success) {
        const messagesList = response.data.messages || []
        // Reverse to show oldest first (or adjust based on your preference)
        setMessages(messagesList.reverse())
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      
      if (error.response?.status === 401) {
        console.log('Authentication error loading messages')
        return
      }
      
      setMessages([])
      if (error.code !== 'ERR_NETWORK') {
        message.error('Failed to load messages')
      }
    }
  }

  const loadAvailableUsers = async (query = '') => {
    try {
      let response
      try {
        response = await usersListAPI.getUsers({ 
          search: query, 
          limit: 20,
          excludeSelf: true 
        })
      } catch (err) {
        response = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=20`)
      }
      
      if (response.data.success) {
        const users = response.data.users || []
        const filteredUsers = users.filter(u => 
          u._id !== currentUser._id && 
          !selectedParticipants.includes(u._id)
        )
        setAvailableUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setAvailableUsers([])
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return

    const messageText = newMessage.trim()
    setSending(true)
    
    try {
      console.log('Sending message:', {
        threadId: selectedRoom._id,
        text: messageText,
        messageType: 'text'
      })

      // Use threads API to send message
      const response = await threadsAPI.sendMessage(selectedRoom._id, {
        text: messageText,
        messageType: 'text'
      })

      console.log('Send message response:', response.data)

      if (response.data.success) {
        setNewMessage('')
        // Don't reload messages - Socket.IO will handle real-time update
        // But reload rooms to update last message preview
        await loadChatRooms()
        
        // The message will appear via Socket.IO new_message event
        // But if Socket.IO fails, we can add it optimistically
        const newMsg = response.data.data || response.data.message
        if (newMsg) {
          setMessages(prev => {
            const exists = prev.some(msg => msg._id === newMsg._id)
            if (exists) return prev
            return [...prev, {
              ...newMsg,
              sender: newMsg.sender || { _id: currentUser._id, name: currentUser.name }
            }]
          })
          setTimeout(() => scrollToBottom(), 100)
        }
      } else {
        message.error(response.data.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        threadId: selectedRoom?._id
      })
      
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to send message. Please check your connection.'
      message.error(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const handleCreateRoom = async () => {
    if (selectedParticipants.length === 0) {
      message.error('Please select a user to message')
      return
    }

    if (selectedParticipants.length > 1) {
      message.error('You can only message one person at a time')
      return
    }

    try {
      const response = await threadsAPI.createThread(selectedParticipants)

      if (response.data.success) {
        message.success('Message started successfully')
        setCreateRoomModal(false)
        setSelectedParticipants([])
        setSearchQuery('')
        setAvailableUsers([])
        loadChatRooms()
        
        if (response.data.thread) {
          setSelectedRoom(response.data.thread)
        }
      }
    } catch (error) {
      console.error('Error starting message:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        selectedParticipants: selectedParticipants
      })
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start message. Please check your connection.'
      message.error(errorMessage)
    }
  }

  const getRoomDisplayName = (room) => {
    const otherParticipant = room.participants?.find(p => 
      (p._id || p)?.toString() !== currentUser._id?.toString()
    )
    return otherParticipant ? (otherParticipant.name || 'Unknown User') : 'Direct Message'
  }

  const getRoomAvatar = (room) => {
    const otherParticipant = room.participants?.find(p => 
      (p._id || p)?.toString() !== currentUser._id?.toString()
    )
    return otherParticipant ? (otherParticipant.avatarUrl || otherParticipant.profilePic) : null
  }

  const getOtherParticipant = (room) => {
    return room.participants?.find(p => 
      (p._id || p)?.toString() !== currentUser._id?.toString()
    )
  }

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`
    } else if (diffHours < 24) {
      return `${diffHours}h`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const formatMessageTimeFull = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatActiveStatus = (userId) => {
    if (!userId) return null
    
    const isOnline = onlineUsers[userId] || false
    const lastSeen = userLastSeen[userId]
    
    if (isOnline) {
      return 'Active now'
    }
    
    if (lastSeen) {
      const now = new Date()
      const seen = new Date(lastSeen)
      const diffMinutes = Math.floor((now - seen) / (1000 * 60))
      
      if (diffMinutes < 1) {
        return 'Active now'
      } else if (diffMinutes < 60) {
        return `Active ${diffMinutes}m ago`
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60)
        return `Active ${hours}h ago`
      } else {
        const days = Math.floor(diffMinutes / 1440)
        return `Active ${days}d ago`
      }
    }
    
    return null
  }

  const getOtherParticipantStatus = (room) => {
    const otherParticipant = getOtherParticipant(room)
    if (!otherParticipant) return null
    
    const userId = otherParticipant._id?.toString() || otherParticipant.toString()
    return {
      isOnline: onlineUsers[userId] || false,
      activeStatus: formatActiveStatus(userId)
    }
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedRoom || !socketRef.current) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Emit typing start
    socketRef.current.emit('typing_start', {
      threadId: selectedRoom._id,
      userId: currentUser._id
    })

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing_stop', {
          threadId: selectedRoom._id,
          userId: currentUser._id
        })
      }
    }, 3000)
  }

  // Filter conversations based on search
  const filteredRooms = rooms.filter(room => {
    if (!conversationSearch.trim()) return true
    const otherParticipant = getOtherParticipant(room)
    const searchLower = conversationSearch.toLowerCase()
    return (
      otherParticipant?.name?.toLowerCase().includes(searchLower) ||
      otherParticipant?.email?.toLowerCase().includes(searchLower) ||
      room.lastMessageText?.toLowerCase().includes(searchLower)
    )
  })

  if (!initialized || (loading && rooms.length === 0)) {
    return (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#fafafa'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
      <div style={{ 
        display: 'flex',
        height: 'calc(100vh - 80px)',
        background: '#fff',
        overflow: 'hidden'
      }}>
      {/* Left Sidebar - Conversations List (Instagram Style) */}
      <div style={{
        width: '350px',
        borderRight: '1px solid #dbdbdb',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #dbdbdb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text strong style={{ fontSize: '16px' }}>{currentUser?.name || 'Messages'}</Text>
          <Button 
            type="text"
            icon={<PlusOutlined />}
            onClick={() => setCreateRoomModal(true)}
            style={{ padding: '4px 8px' }}
          />
        </div>

        {/* Search */}
        <div style={{ padding: '8px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#8e8e8e' }} />}
            placeholder="Search"
            value={conversationSearch}
            onChange={(e) => setConversationSearch(e.target.value)}
            style={{
              borderRadius: '8px',
              background: '#fafafa',
              border: 'none'
            }}
          />
        </div>

        {/* Conversations List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Spin />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <MessageOutlined style={{ fontSize: '48px', color: '#dbdbdb', marginBottom: '16px' }} />
              <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                {conversationSearch ? 'No conversations found' : 'No messages yet'}
              </Text>
              {!conversationSearch && (
                <Button 
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateRoomModal(true)}
                >
                  Start New Message
                </Button>
              )}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const otherParticipant = getOtherParticipant(room)
              const isSelected = selectedRoom?._id === room._id
              
              return (
                <div
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isSelected ? '#fafafa' : '#fff',
                    borderLeft: isSelected ? '2px solid #262626' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #fafafa'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#fafafa'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#fff'
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={getRoomAvatar(room)}
                      icon={<UserOutlined />}
                      size={56}
                    >
                      {otherParticipant ? getUserInitials(otherParticipant.name) : 'U'}
                    </Avatar>
                    {(() => {
                      const userId = otherParticipant?._id?.toString() || otherParticipant?.toString()
                      const isOnline = onlineUsers[userId] || false
                      return isOnline && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '14px',
                          height: '14px',
                          background: '#0095f6',
                          border: '2px solid #fff',
                          borderRadius: '50%'
                        }} />
                      )
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getRoomDisplayName(room)}
                        </Text>
                        {(() => {
                          const status = getOtherParticipantStatus(room)
                          return status?.activeStatus && (
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                              {status.activeStatus}
                            </Text>
                          )
                        })()}
                      </div>
                      {room.lastMessageAt && (
                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px', flexShrink: 0 }}>
                          {formatMessageTime(room.lastMessageAt)}
                        </Text>
                      )}
                    </div>
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: '14px',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {room.lastMessageText || 'No messages yet'}
                    </Text>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Side - Chat Messages (Instagram Style) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff'
      }}>
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #dbdbdb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#fff'
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar
                  src={getRoomAvatar(selectedRoom)}
                  icon={<UserOutlined />}
                  size={32}
                >
                  {getOtherParticipant(selectedRoom) ? getUserInitials(getOtherParticipant(selectedRoom).name) : 'U'}
                </Avatar>
                {(() => {
                  const otherParticipant = getOtherParticipant(selectedRoom)
                  const userId = otherParticipant?._id?.toString() || otherParticipant?.toString()
                  const isOnline = onlineUsers[userId] || false
                  return isOnline && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '10px',
                      height: '10px',
                      background: '#0095f6',
                      border: '2px solid #fff',
                      borderRadius: '50%'
                    }} />
                  )
                })()}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '14px', display: 'block' }}>
                  {getRoomDisplayName(selectedRoom)}
                </Text>
                {(() => {
                  const status = getOtherParticipantStatus(selectedRoom)
                  return status?.activeStatus && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {status.activeStatus}
                    </Text>
                  )
                })()}
              </div>
              <Button 
                type="text"
                icon={<MoreOutlined />}
                style={{ padding: '4px' }}
              />
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {messages.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <MessageOutlined style={{ fontSize: '64px', color: '#dbdbdb', marginBottom: '16px' }} />
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    No messages yet
                  </Text>
                  <Text type="secondary" style={{ fontSize: '14px', marginTop: '4px' }}>
                    Send a message to get started
                  </Text>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const senderId = msg.sender?._id || (typeof msg.sender === 'object' ? msg.sender?._id : msg.sender)
                  const isOwnMessage = senderId?.toString() === currentUser._id?.toString()
                  const prevMsg = messages[index - 1]
                  const prevSenderId = prevMsg?.sender?._id || (typeof prevMsg?.sender === 'object' ? prevMsg?.sender?._id : prevMsg?.sender)
                  const showAvatar = !isOwnMessage && (!prevMsg || prevSenderId?.toString() !== senderId?.toString())
                  
                  return (
                    <div
                      key={msg._id || index}
                      style={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        gap: '8px',
                        marginBottom: showAvatar ? '8px' : '2px'
                      }}
                    >
                      {!isOwnMessage && (
                        <Avatar
                          src={msg.sender?.avatarUrl || msg.sender?.profilePic}
                          icon={<UserOutlined />}
                          size={28}
                          style={{ 
                            flexShrink: 0,
                            visibility: showAvatar ? 'visible' : 'hidden'
                          }}
                        >
                          {msg.sender ? getUserInitials(msg.sender.name) : 'U'}
                        </Avatar>
                      )}
                      <div style={{
                        maxWidth: '65%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                      }}>
                        <div
                          style={{
                            background: isOwnMessage ? '#0095f6' : '#fff',
                            color: isOwnMessage ? '#fff' : '#262626',
                            padding: '8px 12px',
                            borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordWrap: 'break-word',
                            fontSize: '14px',
                            lineHeight: '1.4'
                          }}
                        >
                          {msg.text || msg.ciphertext || msg.message || ''}
                        </div>
                        {(index === messages.length - 1 || 
                          (messages[index + 1] && 
                           (messages[index + 1].sender?._id?.toString() !== senderId?.toString()))) && (
                          <Text 
                            type="secondary" 
                            style={{ 
                              fontSize: '11px',
                              marginTop: '4px',
                              padding: '0 4px',
                              color: '#8e8e8e'
                            }}
                          >
                            {formatMessageTimeFull(msg.createdAt)}
                            {isOwnMessage && (
                              <span style={{ marginLeft: '4px' }}>
                                <CheckCircleOutlined style={{ fontSize: '10px' }} />
                              </span>
                            )}
                          </Text>
                        )}
                      </div>
                      {isOwnMessage && (
                        <Avatar
                          src={currentUser?.avatarUrl || currentUser?.profilePic}
                          icon={<UserOutlined />}
                          size={28}
                          style={{ flexShrink: 0 }}
                        >
                          {getUserInitials(currentUser?.name)}
                        </Avatar>
                      )}
                    </div>
                  )
                })
              )}
              
              {/* Typing Indicator */}
              {selectedRoom && typingUsers[selectedRoom._id] && typingUsers[selectedRoom._id].length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Avatar
                    size={28}
                    style={{ flexShrink: 0 }}
                  >
                    <UserOutlined />
                  </Avatar>
                  <div style={{
                    background: '#fff',
                    padding: '8px 12px',
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '3px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#8e8e8e',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite'
                      }} />
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#8e8e8e',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite 0.2s'
                      }} />
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: '#8e8e8e',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite 0.4s'
                      }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #dbdbdb',
              background: '#fff'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                background: '#fafafa',
                borderRadius: '22px',
                padding: '8px 12px',
                border: '1px solid #dbdbdb'
              }}>
                <TextArea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    // Trigger typing indicator
                    handleTyping()
                  }}
                  placeholder="Message..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault()
                      if (newMessage.trim()) {
                        handleSendMessage()
                      }
                    }
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    boxShadow: 'none',
                    resize: 'none',
                    fontSize: '14px',
                    padding: 0
                  }}
                />
                <Button 
                  type="text"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sending}
                  disabled={!newMessage.trim()}
                  style={{
                    flexShrink: 0,
                    color: newMessage.trim() ? '#0095f6' : '#c7c7c7',
                    padding: '4px 8px'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: '#fafafa'
          }}>
            <MessageOutlined style={{ fontSize: '96px', color: '#dbdbdb', marginBottom: '24px' }} />
            <Text strong style={{ fontSize: '22px', marginBottom: '8px' }}>
              Your Messages
            </Text>
            <Text type="secondary" style={{ fontSize: '14px', marginBottom: '24px' }}>
              Send private photos and messages to a friend or group.
            </Text>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateRoomModal(true)}
              size="large"
              style={{
                borderRadius: '4px',
                height: '32px',
                padding: '0 16px'
              }}
            >
              Send Message
            </Button>
          </div>
        )}
      </div>

      {/* New Message Modal */}
      <Modal
        title="New Message"
        open={createRoomModal}
        onCancel={() => {
          setCreateRoomModal(false)
          setSelectedParticipants([])
          setSearchQuery('')
          setAvailableUsers([])
        }}
        onOk={handleCreateRoom}
        okText="Chat"
        cancelText="Cancel"
        width={500}
        okButtonProps={{
          disabled: selectedParticipants.length !== 1
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Send message to:</Text>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  loadAvailableUsers(e.target.value)
                }}
                style={{ flex: 1 }}
              />
            </div>

            {availableUsers.length > 0 && (
              <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                {availableUsers.map(user => (
                  <div
                    key={user._id}
                    onClick={() => {
                      if (!selectedParticipants.includes(user._id)) {
                        setSelectedParticipants([user._id])
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      background: selectedParticipants.includes(user._id) ? '#f0f0f0' : 'transparent',
                      marginBottom: '4px'
                    }}
                  >
                    <Avatar src={getUserAvatarUrl(user)} icon={<UserOutlined />} size={44}>
                      {getUserInitials(user.name)}
                    </Avatar>
                    <div style={{ marginLeft: '12px', flex: 1 }}>
                      <Text strong style={{ fontSize: '14px', display: 'block' }}>
                        {user.name}
                      </Text>
                      {user.username && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          @{user.username}
                        </Text>
                      )}
                    </div>
                    {selectedParticipants.includes(user._id) && (
                      <CheckCircleOutlined style={{ color: '#0095f6', fontSize: '20px' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedParticipants.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  To:
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedParticipants.map(participantId => {
                    const user = availableUsers.find(u => u._id === participantId)
                    return user ? (
                      <Tag
                        key={participantId}
                        closable
                        onClose={() => setSelectedParticipants(prev => 
                          prev.filter(id => id !== participantId)
                        )}
                        color="blue"
                        style={{ margin: 0, padding: '4px 12px', fontSize: '14px' }}
                      >
                        <Avatar src={getUserAvatarUrl(user)} icon={<UserOutlined />} size={16} style={{ marginRight: '6px' }}>
                          {getUserInitials(user.name)}
                        </Avatar>
                        {user.name}
                      </Tag>
                    ) : (
                      <Tag key={participantId} color="default">Loading...</Tag>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Space>
      </Modal>
      </div>
    </>
  )
}

export default UserChat
