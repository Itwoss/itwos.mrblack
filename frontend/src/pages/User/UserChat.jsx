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
  Divider,
  Image,
  Dropdown,
  Popover
} from 'antd'
import { 
  SendOutlined,
  UserOutlined, 
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  BgColorsOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useAuth } from "../../contexts/AuthContextOptimized"
import api from '../../services/api'
import { threadsAPI, usersListAPI } from '../../services/api'
import { getUserAvatarUrl, getUserInitials } from '../../utils/avatarUtils'
import { io } from 'socket.io-client'
import ChatInputWithMedia from '../../components/ChatInputWithMedia'

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
  const [chatTheme, setChatTheme] = useState(() => {
    // Load theme from localStorage or default to theme 1
    const savedTheme = localStorage.getItem('chatTheme')
    return savedTheme ? parseInt(savedTheme) : 1
  })
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editText, setEditText] = useState('')
  const [hoveredMessageId, setHoveredMessageId] = useState(null)

  // iOS Messages Style Themes
  const chatThemes = {
    1: {
      name: 'Default Blue iMessage',
      background: 'linear-gradient(180deg, #E8F4F8 0%, #F5F5F5 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.7)',
      ownMessageBg: 'linear-gradient(180deg, #0A84FF 0%, #147BFF 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#F2F2F7',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#0A84FF'
    },
    2: {
      name: 'Mint Green Soft Blur',
      background: 'linear-gradient(180deg, #E8F8F5 0%, #F0F9F7 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.75)',
      ownMessageBg: 'linear-gradient(180deg, #00C896 0%, #00B584 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#F2F7F5',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#00C896'
    },
    3: {
      name: 'Purple Lavender Gradient',
      background: 'linear-gradient(180deg, #F5F0FF 0%, #FAF5FF 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.7)',
      ownMessageBg: 'linear-gradient(180deg, #AF52DE 0%, #9B4DD6 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#F7F2FF',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#AF52DE'
    },
    4: {
      name: 'Midnight Black OLED',
      background: 'linear-gradient(180deg, #000000 0%, #1C1C1E 100%)',
      blurOverlay: 'rgba(0, 0, 0, 0.6)',
      ownMessageBg: 'linear-gradient(180deg, #0A84FF 0%, #147BFF 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(44, 44, 46, 0.95)',
      otherMessageText: '#FFFFFF',
      sidebarBg: '#1C1C1E',
      headerBg: 'rgba(28, 28, 30, 0.9)',
      inputBg: 'rgba(44, 44, 46, 0.9)',
      accentColor: '#0A84FF'
    },
    5: {
      name: 'Rose Pink Soft Gradient',
      background: 'linear-gradient(180deg, #FFF0F5 0%, #FFF5F8 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.75)',
      ownMessageBg: 'linear-gradient(180deg, #FF2D55 0%, #FF1744 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#FFF5F8',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#FF2D55'
    },
    6: {
      name: 'Ocean Teal Glass',
      background: 'linear-gradient(180deg, #E0F7FA 0%, #F0FDFF 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.7)',
      ownMessageBg: 'linear-gradient(180deg, #00BCD4 0%, #00ACC1 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#F0FDFF',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#00BCD4'
    },
    7: {
      name: 'Warm Beige Minimal',
      background: 'linear-gradient(180deg, #FAF8F3 0%, #F5F3ED 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.8)',
      ownMessageBg: 'linear-gradient(180deg, #D4A574 0%, #C8965A 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#F5F3ED',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#D4A574'
    },
    8: {
      name: 'Silver Frost Blur',
      background: 'linear-gradient(180deg, #F5F5F7 0%, #E8E8ED 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.8)',
      ownMessageBg: 'linear-gradient(180deg, #8E8E93 0%, #7A7A7F 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#E8E8ED',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#8E8E93'
    },
    9: {
      name: 'Sunset Orange/Pink',
      background: 'linear-gradient(180deg, #FFF5E6 0%, #FFE8D6 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.7)',
      ownMessageBg: 'linear-gradient(180deg, #FF9500 0%, #FF8C00 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#FFE8D6',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#FF9500'
    },
    10: {
      name: 'Space Gray Professional',
      background: 'linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%)',
      blurOverlay: 'rgba(255, 255, 255, 0.75)',
      ownMessageBg: 'linear-gradient(180deg, #48484A 0%, #3A3A3C 100%)',
      ownMessageText: '#FFFFFF',
      otherMessageBg: 'rgba(255, 255, 255, 0.95)',
      otherMessageText: '#000000',
      sidebarBg: '#E5E5EA',
      headerBg: 'rgba(255, 255, 255, 0.8)',
      inputBg: 'rgba(255, 255, 255, 0.9)',
      accentColor: '#48484A'
    }
  }

  const currentTheme = chatThemes[chatTheme] || chatThemes[1]

  const handleThemeChange = (themeId) => {
    setChatTheme(themeId)
    localStorage.setItem('chatTheme', themeId.toString())
    message.success(`Theme changed to ${chatThemes[themeId].name}`)
  }
  
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
    if (selectedRoom && isAuthenticated && currentUser) {
      loadMessages(selectedRoom._id)
    }
  }, [selectedRoom, isAuthenticated, currentUser])

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

    // Listen for message edited
    socket.on('message_edited', (data) => {
      const { threadId, messageId, message: updatedMessage } = data
      if (selectedRoom && selectedRoom._id === threadId) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, ...updatedMessage } : msg
        ))
      }
    })

    // Listen for message deleted
    socket.on('message_deleted', (data) => {
      const { threadId, messageId } = data
      if (selectedRoom && selectedRoom._id === threadId) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId))
      }
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
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err)
    }
  }

  const handleEditMessage = (msg) => {
    if (msg.messageType !== 'text') {
      message.warning('Only text messages can be edited')
      return
    }
    setEditingMessageId(msg._id)
    setEditText(msg.text || msg.ciphertext || msg.message || '')
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !selectedRoom || !editText.trim()) return

    try {
      const response = await threadsAPI.editMessage(selectedRoom._id, editingMessageId, {
        text: editText.trim()
      })

      if (response.data.success) {
        setMessages(prev => prev.map(msg => 
          msg._id === editingMessageId 
            ? { ...msg, text: editText.trim(), ciphertext: editText.trim(), isEdited: true, editedAt: new Date() }
            : msg
        ))
        setEditingMessageId(null)
        setEditText('')
        message.success('Message edited')
      } else {
        message.error(response.data.message || 'Failed to edit message')
      }
    } catch (error) {
      console.error('Error editing message:', error)
      message.error(error.response?.data?.message || 'Failed to edit message')
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleDeleteMessage = async (messageId) => {
    if (!selectedRoom || !messageId) return

    Modal.confirm({
      title: 'Unsend message?',
      content: 'This message will be removed for everyone.',
      okText: 'Unsend',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await threadsAPI.deleteMessage(selectedRoom._id, messageId)

          if (response.data.success) {
            setMessages(prev => prev.filter(msg => msg._id !== messageId))
            message.success('Message unsent')
          } else {
            message.error(response.data.message || 'Failed to delete message')
          }
        } catch (error) {
          console.error('Error deleting message:', error)
          message.error(error.response?.data?.message || 'Failed to delete message')
        }
      }
    })
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
      // Don't pass userId - let backend use authenticated user's ID
      const threadsResponse = await threadsAPI.getThreads({})
      
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
      console.error('❌ Error loading chat rooms:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      })
      
      if (error.response?.status === 401) {
        console.log('Authentication error in chat')
        message.error('Please login again')
        return
      }
      
      if (error.response?.status === 403) {
        console.log('Access denied')
        message.error('Access denied')
        return
      }
      
      setRooms([])
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
        message.error(error.response?.data?.message || 'Failed to load conversations')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (roomId) => {
    if (!isAuthenticated || !currentUser || !roomId) {
      console.log('Not authenticated or no roomId, skipping messages API call')
      return
    }
    
    try {
      console.log('📨 Loading messages for room:', roomId)
      // Use threads API for messages
      const response = await threadsAPI.getMessages(roomId, { page: 1, limit: 100 })
      
      if (response.data.success) {
        const messagesList = response.data.messages || []
        console.log(`✅ Loaded ${messagesList.length} messages`)
        // Reverse to show oldest first (or adjust based on your preference)
        setMessages(messagesList.reverse())
        // Scroll to bottom after messages load
        setTimeout(() => scrollToBottom(), 100)
      } else {
        console.warn('⚠️ API returned success=false:', response.data)
        setMessages([])
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        roomId: roomId
      })
      
      if (error.response?.status === 401) {
        console.log('Authentication error loading messages')
        message.error('Please login again')
        return
      }
      
      if (error.response?.status === 403) {
        console.log('Access denied for this thread')
        message.error('You do not have access to this conversation')
        return
      }
      
      if (error.response?.status === 404) {
        console.log('Thread not found')
        message.error('Conversation not found')
        return
      }
      
      setMessages([])
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
        message.error(error.response?.data?.message || 'Failed to load messages')
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

  const handleSendMessage = async (payload) => {
    if (!selectedRoom) return

    // Handle different message types from ChatInputWithMedia
    let messageData = {}
    
    if (payload.type === 'text') {
      if (!payload.text?.trim()) return
      messageData = {
        text: payload.text.trim(),
        messageType: 'text'
      }
    } else if (payload.type === 'sticker') {
      messageData = {
        text: payload.sticker,
        messageType: 'sticker'
      }
    } else if (payload.type === 'image') {
      if (!payload.file) return
      // Upload image first, then send message with image URL
      try {
        const formData = new FormData()
        formData.append('image', payload.file)
        
        const uploadResponse = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        if (uploadResponse.data.success) {
          messageData = {
            text: payload.text || '',
            messageType: 'image',
            imageUrl: uploadResponse.data.url || uploadResponse.data.data?.url
          }
        } else {
          message.error('Failed to upload image')
          return
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError)
        message.error('Failed to upload image')
        return
      }
    } else if (payload.type === 'audio') {
      if (!payload.file) return
      // Upload audio first, then send message with audio URL
      try {
        console.log('📤 Uploading audio file:', {
          fileName: payload.file.name,
          fileSize: payload.file.size,
          fileType: payload.file.type,
          title: payload.title,
          note: payload.note
        })
        
        const formData = new FormData()
        formData.append('audio', payload.file)
        if (payload.title) formData.append('title', payload.title)
        if (payload.note) formData.append('note', payload.note)
        
        // Don't set Content-Type header - let axios set it automatically with boundary
        const uploadResponse = await api.post('/upload/audio', formData)
        
        console.log('📤 Audio upload response:', uploadResponse.data)
        
        if (uploadResponse.data.success) {
          const audioUrl = uploadResponse.data.url || uploadResponse.data.data?.url
          if (!audioUrl) {
            console.error('❌ No audio URL in response:', uploadResponse.data)
            message.error('Upload succeeded but no URL returned')
            return
          }
          
          messageData = {
            text: payload.note || '',
            messageType: 'audio',
            audioUrl: audioUrl,
            audioTitle: payload.title,
            audioDuration: payload.duration
          }
        } else {
          const errorMsg = uploadResponse.data.message || 'Failed to upload audio'
          console.error('❌ Audio upload failed:', errorMsg)
          message.error(errorMsg)
          return
        }
      } catch (uploadError) {
        console.error('❌ Audio upload error:', uploadError)
        console.error('❌ Error details:', {
          message: uploadError.message,
          response: uploadError.response?.data,
          status: uploadError.response?.status,
          statusText: uploadError.response?.statusText
        })
        
        let errorMsg = 'Failed to upload audio'
        if (uploadError.response?.status === 413) {
          errorMsg = 'Audio file too large. Maximum size is 10MB.'
        } else if (uploadError.response?.status === 400) {
          errorMsg = uploadError.response?.data?.message || 'Invalid audio file'
        } else if (uploadError.response?.status === 401) {
          errorMsg = 'Authentication required. Please login again.'
        } else if (uploadError.response?.data?.message) {
          errorMsg = uploadError.response.data.message
        } else if (uploadError.message) {
          errorMsg = uploadError.message
        }
        
        message.error(errorMsg)
        return
      }
    } else {
      // Fallback to text message
      if (!newMessage.trim()) return
      messageData = {
        text: newMessage.trim(),
        messageType: 'text'
      }
    }

    setSending(true)
    
    try {
      console.log('Sending message:', {
        threadId: selectedRoom._id,
        ...messageData
      })

      // Use threads API to send message
      const response = await threadsAPI.sendMessage(selectedRoom._id, messageData)

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
        @keyframes bubblePop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .ios-message-bubble {
          animation: bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .ios-typing-dot {
          animation: bounce 1.4s infinite ease-in-out;
        }
        .ios-typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .ios-typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        .ios-typing-dot:nth-child(3) {
          animation-delay: 0s;
        }
      `}</style>
      <div style={{ 
        display: 'flex',
        height: 'calc(100vh - 80px)',
        background: '#fff',
        overflow: 'hidden'
      }}>
      {/* iOS Style Left Sidebar - Conversations List */}
      <div style={{
        width: '350px',
        borderRight: '0.5px solid rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        background: currentTheme.sidebarBg,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)'
      }}>
        {/* iOS Style Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: currentTheme.sidebarBg,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}>
          <Text strong style={{ fontSize: '16px' }}>{currentUser?.name || 'Messages'}</Text>
          <Button 
            type="text"
            icon={<PlusOutlined />}
            onClick={() => setCreateRoomModal(true)}
            style={{ padding: '4px 8px' }}
          />
        </div>

        {/* iOS Style Search */}
        <div style={{ padding: '8px 12px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#8E8E93' }} />}
            placeholder="Search"
            value={conversationSearch}
            onChange={(e) => setConversationSearch(e.target.value)}
            style={{
              borderRadius: '10px',
              background: 'rgba(142, 142, 147, 0.12)',
              border: 'none',
              fontSize: '15px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
              height: '36px'
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
                    background: isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.15s ease-out',
                    borderBottom: '0.5px solid rgba(0,0,0,0.05)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
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

      {/* Right Side - iOS Style Chat Messages */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: currentTheme.background,
        overflow: 'hidden'
      }}>
        {/* iOS Style Blur overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: currentTheme.blurOverlay,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        {selectedRoom ? (
          <>
            {/* iOS Style Chat Header */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '0.5px solid rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: currentTheme.headerBg,
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              position: 'relative',
              zIndex: 10
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
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
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
                <Popover
                  content={
                    <div style={{ width: '240px', maxHeight: '400px', overflowY: 'auto' }}>
                      <div style={{ 
                        marginBottom: '12px', 
                        fontWeight: 600, 
                        fontSize: '15px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
                      }}>
                        Choose Theme
                      </div>
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {Object.keys(chatThemes).map((themeId) => (
                          <Button
                            key={themeId}
                            type={chatTheme === parseInt(themeId) ? 'primary' : 'default'}
                            block
                            onClick={() => handleThemeChange(parseInt(themeId))}
                            style={{
                              height: '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: chatTheme === parseInt(themeId) 
                                ? chatThemes[themeId].ownMessageBg 
                                : 'transparent',
                              border: chatTheme === parseInt(themeId) 
                                ? 'none' 
                                : '0.5px solid rgba(0,0,0,0.1)',
                              borderRadius: '10px',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                              fontSize: '15px',
                              fontWeight: chatTheme === parseInt(themeId) ? 600 : 400,
                              color: chatTheme === parseInt(themeId) ? '#fff' : '#000',
                              transition: 'all 0.2s ease-out'
                            }}
                          >
                            <span>{chatThemes[themeId].name}</span>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: chatThemes[themeId].background,
                                border: '0.5px solid rgba(0,0,0,0.1)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                            />
                          </Button>
                        ))}
                      </Space>
                    </div>
                  }
                  title={null}
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button
                    type="text"
                    icon={<BgColorsOutlined />}
                    style={{ padding: '4px 8px' }}
                  />
                </Popover>
              </div>
              <Button 
                type="text"
                icon={<MoreOutlined />}
                style={{ padding: '4px' }}
              />
            </div>

            {/* iOS Style Messages Area */}
            <div 
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                position: 'relative',
                zIndex: 1,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif'
              }}
            >
              {messages.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  opacity: 0.4
                }}>
                  <MessageOutlined style={{ fontSize: '64px', color: '#8E8E93', marginBottom: '16px' }} />
                  <Text type="secondary" style={{ 
                    fontSize: '17px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                    color: '#8E8E93'
                  }}>
                    No messages yet
                  </Text>
                  <Text type="secondary" style={{ 
                    fontSize: '15px', 
                    marginTop: '8px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                    color: '#8E8E93'
                  }}>
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
                        gap: '6px',
                        marginBottom: showAvatar ? '12px' : '1px',
                        paddingLeft: isOwnMessage ? '60px' : '0',
                        paddingRight: isOwnMessage ? '0' : '60px',
                        position: 'relative'
                      }}
                      onMouseEnter={() => isOwnMessage && !msg.isDeleted && setHoveredMessageId(msg._id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
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
                        maxWidth: '75%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        minWidth: '50px'
                      }}>
                        <div
                          className="ios-message-bubble"
                          style={{
                            background: isOwnMessage 
                              ? currentTheme.ownMessageBg 
                              : currentTheme.otherMessageBg,
                            color: isOwnMessage 
                              ? currentTheme.ownMessageText 
                              : currentTheme.otherMessageText,
                            padding: '10px 16px',
                            borderRadius: isOwnMessage ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                            boxShadow: isOwnMessage 
                              ? '0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)' 
                              : '0 1px 2px rgba(0,0,0,0.08)',
                            wordWrap: 'break-word',
                            fontSize: '17px',
                            lineHeight: '1.35',
                            maxWidth: '100%',
                            backdropFilter: isOwnMessage ? 'none' : 'blur(20px) saturate(180%)',
                            WebkitBackdropFilter: isOwnMessage ? 'none' : 'blur(20px) saturate(180%)',
                            border: isOwnMessage ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                            fontWeight: 400,
                            transition: 'transform 0.2s ease-out'
                          }}
                        >
                          {/* Show deleted message indicator */}
                          {msg.isDeleted ? (
                            <div style={{ 
                              fontSize: '15px', 
                              opacity: 0.5, 
                              fontStyle: 'italic',
                              color: isOwnMessage ? '#fff' : '#8E8E93'
                            }}>
                              This message was unsent
                            </div>
                          ) : editingMessageId === msg._id ? (
                            /* Text content - Show edit input if editing */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <Input.TextArea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                autoFocus
                                autoSize={{ minRows: 1, maxRows: 6 }}
                                onPressEnter={(e) => {
                                  if (e.shiftKey) return
                                  e.preventDefault()
                                  handleSaveEdit()
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  fontSize: '17px',
                                  lineHeight: '1.35',
                                  color: isOwnMessage ? '#fff' : '#262626',
                                  resize: 'none'
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <Button
                                  size="small"
                                  icon={<CloseOutlined />}
                                  onClick={handleCancelEdit}
                                  style={{ fontSize: '13px', height: '28px' }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckOutlined />}
                                  onClick={handleSaveEdit}
                                  style={{ fontSize: '13px', height: '28px' }}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Sticker */}
                              {msg.messageType === 'sticker' && (
                                <div style={{ fontSize: '48px', textAlign: 'center' }}>
                                  {msg.text || msg.message}
                                </div>
                              )}
                              
                              {/* Image */}
                              {msg.messageType === 'image' && msg.imageUrl && (
                                <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                                  <Image
                                    src={
                                      msg.imageUrl.startsWith('http') 
                                        ? msg.imageUrl 
                                        : `${api.defaults.baseURL.replace('/api', '')}${msg.imageUrl}`
                                    }
                                    alt="Shared image"
                                    style={{
                                      maxWidth: '280px',
                                      maxHeight: '280px',
                                      borderRadius: '12px',
                                      objectFit: 'cover',
                                      display: 'block'
                                    }}
                                    preview={{
                                      mask: 'View'
                                    }}
                                  />
                                </div>
                              )}
                              
                              {/* Audio */}
                              {msg.messageType === 'audio' && msg.audioUrl && (
                                <div style={{ 
                                  marginBottom: msg.text ? '8px' : '0', 
                                  minWidth: '200px',
                                  maxWidth: '280px'
                                }}>
                                  <audio
                                    controls
                                    controlsList="nodownload"
                                    preload="metadata"
                                    style={{
                                      width: '100%',
                                      height: '36px',
                                      outline: 'none',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    <source 
                                      src={
                                        msg.audioUrl.startsWith('http') 
                                          ? msg.audioUrl 
                                          : `${api.defaults.baseURL.replace('/api', '')}${msg.audioUrl}`
                                      } 
                                      type="audio/wav"
                                    />
                                    <source 
                                      src={
                                        msg.audioUrl.startsWith('http') 
                                          ? msg.audioUrl 
                                          : `${api.defaults.baseURL.replace('/api', '')}${msg.audioUrl}`
                                      } 
                                      type="audio/wave"
                                    />
                                    <source 
                                      src={
                                        msg.audioUrl.startsWith('http') 
                                          ? msg.audioUrl 
                                          : `${api.defaults.baseURL.replace('/api', '')}${msg.audioUrl}`
                                      } 
                                      type="audio/mpeg"
                                    />
                                    Your browser does not support the audio element.
                                  </audio>
                                  {msg.audioTitle && (
                                    <div style={{ 
                                      fontSize: '12px', 
                                      opacity: 0.9, 
                                      marginTop: '4px',
                                      fontWeight: 500,
                                      color: isOwnMessage ? '#fff' : '#262626'
                                    }}>
                                      {msg.audioTitle}
                                    </div>
                                  )}
                                  {msg.audioDuration && (
                                    <div style={{ 
                                      fontSize: '11px', 
                                      opacity: 0.7, 
                                      marginTop: '2px',
                                      color: isOwnMessage ? '#fff' : '#666'
                                    }}>
                                      {Math.floor(msg.audioDuration)}s
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Text content */}
                              {(msg.text || msg.ciphertext || msg.message) && 
                               msg.messageType !== 'sticker' && (
                                <div>
                                  {msg.text || msg.ciphertext || msg.message}
                                  {msg.isEdited && (
                                    <span style={{ 
                                      fontSize: '12px', 
                                      opacity: 0.7, 
                                      marginLeft: '6px',
                                      fontStyle: 'italic'
                                    }}>
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {/* Edit/Unsend Menu - Show on hover for own messages */}
                        {isOwnMessage && !msg.isDeleted && hoveredMessageId === msg._id && editingMessageId !== msg._id && (
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'edit',
                                  label: 'Edit',
                                  icon: <EditOutlined />,
                                  onClick: () => handleEditMessage(msg),
                                  disabled: msg.messageType !== 'text'
                                },
                                {
                                  key: 'unsend',
                                  label: 'Unsend',
                                  icon: <DeleteOutlined />,
                                  danger: true,
                                  onClick: () => handleDeleteMessage(msg._id)
                                }
                              ]
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <Button
                              type="text"
                              icon={<MoreOutlined />}
                              size="small"
                              style={{
                                padding: '4px',
                                minWidth: '24px',
                                height: '24px',
                                opacity: 0.7
                              }}
                            />
                          </Dropdown>
                        )}
                        {(index === messages.length - 1 || 
                          (messages[index + 1] && 
                           (messages[index + 1].sender?._id?.toString() !== senderId?.toString()))) && (
                          <Text 
                            type="secondary" 
                            style={{ 
                              fontSize: '11px',
                              marginTop: '2px',
                              padding: '0 4px',
                              color: '#8E8E93',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                              fontWeight: 400,
                              letterSpacing: '-0.01em'
                            }}
                          >
                            {formatMessageTimeFull(msg.createdAt)}
                            {isOwnMessage && (
                              <span style={{ marginLeft: '4px', opacity: 0.6 }}>
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
              
              {/* iOS Style Typing Indicator */}
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
                    background: currentTheme.otherMessageBg,
                    padding: '12px 16px',
                    borderRadius: '22px 22px 22px 4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '0.5px solid rgba(0,0,0,0.08)'
                  }}>
                    <div className="ios-typing-dot" style={{
                      width: '8px',
                      height: '8px',
                      background: '#8E8E93',
                      borderRadius: '50%'
                    }} />
                    <div className="ios-typing-dot" style={{
                      width: '8px',
                      height: '8px',
                      background: '#8E8E93',
                      borderRadius: '50%'
                    }} />
                    <div className="ios-typing-dot" style={{
                      width: '8px',
                      height: '8px',
                      background: '#8E8E93',
                      borderRadius: '50%'
                    }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* iOS Style Message Input */}
            <div style={{
              padding: '8px 16px',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
              background: currentTheme.inputBg,
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderTop: '0.5px solid rgba(0,0,0,0.1)',
              position: 'relative',
              zIndex: 10
            }}>
              <ChatInputWithMedia
                onSend={handleSendMessage}
                disabled={sending || !selectedRoom}
                  placeholder="Message..."
                theme={currentTheme}
              />
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: currentTheme.background,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: currentTheme.blurOverlay,
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              pointerEvents: 'none',
              zIndex: 0
            }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', opacity: 0.6 }}>
              <MessageOutlined style={{ fontSize: '96px', color: '#8E8E93', marginBottom: '24px' }} />
              <Text strong style={{ 
                fontSize: '22px', 
                marginBottom: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                color: '#000',
                display: 'block'
              }}>
              Your Messages
            </Text>
              <Text type="secondary" style={{ 
                fontSize: '15px', 
                marginBottom: '24px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                color: '#8E8E93',
                display: 'block'
              }}>
              Send private photos and messages to a friend or group.
            </Text>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateRoomModal(true)}
              size="large"
              style={{
                  borderRadius: '20px',
                  height: '44px',
                  padding: '0 24px',
                  fontSize: '17px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
                  fontWeight: 600,
                  background: currentTheme.accentColor || '#0A84FF',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              Send Message
            </Button>
            </div>
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
