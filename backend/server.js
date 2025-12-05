const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const fs = require('fs')
const { createServer } = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = express()
const server = createServer(app)

// Socket.IO configuration - more permissive for development
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins in development
      console.log('Socket.IO CORS: Allowing origin:', origin)
      callback(null, true)
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // Allow Engine.IO v3 clients
})

// Make io available to routes and globally for services
app.set('io', io)
global.io = io // Also set globally for services to access

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('🔌 Client connected:', socket.id)
  console.log('🔌 Client origin:', socket.handshake.headers.origin)
  console.log('🔌 Client user-agent:', socket.handshake.headers['user-agent'])

  let currentUserId = null

  // Track active calls per user (userId -> call data)
  // In production, use Redis or database for persistence
  const activeCalls = new Map()

  // Track global chat presence (userId -> socketId)
  // In production, use Redis for better scalability
  const globalChatPresence = new Map()

  // Handle user room joining (for notifications)
  socket.on('join-user-room', async (userId) => {
    if (userId) {
      currentUserId = userId
      const roomName = `user:${userId}`
      socket.join(roomName)
      
      // Verify room membership
      const rooms = Array.from(socket.rooms)
      const isInRoom = rooms.includes(roomName)
      
      console.log(`🔌 Client ${socket.id} joined user room: ${roomName}`)
      console.log(`🔌 Client ${socket.id} rooms:`, rooms)
      console.log(`🔌 Client ${socket.id} is in room ${roomName}:`, isInRoom)
      
      socket.emit('user-room-joined', { userId, success: true, room: roomName, isInRoom })
      
      // Update user online status
      const User = require('./src/models/User')
      const mongoose = require('mongoose')
      
      // Check if userId is a valid MongoDB ObjectId
      let userQuery
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userQuery = { _id: userId }
      } else {
        // If not a valid ObjectId, try to find by googleId or other identifier
        userQuery = { googleId: userId }
      }
      
      await User.findOneAndUpdate(userQuery, {
        isOnline: true,
        lastSeen: new Date()
      })
      
      // Notify other users that this user is now online
      socket.broadcast.emit('user_online', { userId })
    }
  })

  // Handle room joining
  socket.on('join-room', (room) => {
    socket.join(room)
    console.log(`🔌 Client ${socket.id} joined room: ${room}`)
    
    // Send confirmation
    socket.emit('room-joined', { room, success: true })
  })

  // Handle room leaving
  socket.on('leave-room', (room) => {
    socket.leave(room)
    console.log(`🔌 Client ${socket.id} left room: ${room}`)
  })

  // Handle authentication
  socket.on('authenticate', (data) => {
    console.log('🔌 Authentication attempt:', data)
    socket.emit('authenticated', { success: true, userId: data.userId })
  })

  // Handle ping/pong for connection testing
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() })
  })

  // ========== GLOBAL CHAT HANDLERS ==========

  // Handle joining global chat
  socket.on('join-global-chat', async (data) => {
    const userId = data.userId || currentUserId
    if (!userId) return

    // Join global chat room
    socket.join('global-chat')
    
    // Track presence
    globalChatPresence.set(userId, {
      socketId: socket.id,
      joinedAt: new Date(),
      lastSeen: new Date()
    })

    // Get user info
    const User = require('./src/models/User')
    const user = await User.findById(userId).select('name username avatarUrl')
    
    // Broadcast user joined
    const userCount = globalChatPresence.size
    io.to('global-chat').emit('user-joined', {
      userId,
      username: user?.name || user?.username || 'User',
      userCount
    })

    // Send current user count to the new user
    socket.emit('user-count-update', {
      userCount,
      activeUsers: Array.from(globalChatPresence.keys()).slice(0, 20) // First 20 for preview
    })

    console.log(`💬 User ${userId} joined global chat. Total: ${userCount}`)
  })

  // Handle leaving global chat
  socket.on('leave-global-chat', (data) => {
    const userId = data.userId || currentUserId
    if (!userId) return

    socket.leave('global-chat')
    globalChatPresence.delete(userId)

    const userCount = globalChatPresence.size
    io.to('global-chat').emit('user-left', {
      userId,
      userCount
    })

    console.log(`💬 User ${userId} left global chat. Total: ${userCount}`)
  })

  // Handle typing indicator
  socket.on('global-chat-typing', (data) => {
    const userId = data.userId || currentUserId
    if (!userId) return

    socket.to('global-chat').emit('user-typing', {
      userId,
      username: data.username || 'User'
    })
  })

  // Handle stop typing
  socket.on('global-chat-stop-typing', (data) => {
    const userId = data.userId || currentUserId
    if (!userId) return

    socket.to('global-chat').emit('user-stopped-typing', {
      userId
    })
  })

  // Broadcast user count periodically (every 10 seconds)
  setInterval(() => {
    const userCount = globalChatPresence.size
    io.to('global-chat').emit('user-count-update', {
      userCount,
      timestamp: new Date()
    })
  }, 10000)

  // ========== CALL SIGNALING HANDLERS ==========
  
  // Handle call initiation
  socket.on('call-initiate', async (data) => {
    const { to, callType, callerId, callerName, callerAvatar } = data
    console.log(`📞 Call initiated: ${callerId} -> ${to} (${callType})`)
    
    // Check if receiver is already in a call
    if (activeCalls.has(to)) {
      const activeCall = activeCalls.get(to)
      console.log(`📞 User ${to} is busy (already in call with ${activeCall.callerId})`)
      
      // Notify caller that receiver is busy
      io.to(`user:${callerId}`).emit('call-busy', {
        receiverId: to,
        message: 'User is on another call',
        timestamp: new Date()
      })
      
      return // Don't send incoming-call event
    }
    
    // Mark receiver as in call (tentative - will be confirmed on accept)
    const callId = `${callerId}-${Date.now()}`
    activeCalls.set(to, {
      callId,
      callerId,
      receiverId: to,
      callType,
      status: 'ringing',
      startedAt: new Date()
    })
    
    // Store call ID in socket for later reference
    socket.currentCallId = callId
    socket.currentCallReceiverId = to
    
    // Emit to receiver's user room
    io.to(`user:${to}`).emit('incoming-call', {
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
      timestamp: new Date()
    })
  })

  // Handle call offer (WebRTC)
  socket.on('call-offer', (data) => {
    const { to, offer, callType } = data
    console.log(`📞 Call offer sent to: ${to}`)
    io.to(`user:${to}`).emit('call-offer', {
      from: currentUserId || socket.id,
      offer,
      callType
    })
  })

  // Handle call answer (WebRTC)
  socket.on('call-answer', (data) => {
    const { to, answer } = data
    console.log(`📞 Call answer sent to: ${to}`)
    io.to(`user:${to}`).emit('call-answer', {
      from: currentUserId || socket.id,
      answer
    })
  })

  // Handle ICE candidates (WebRTC)
  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data
    io.to(`user:${to}`).emit('ice-candidate', {
      from: currentUserId || socket.id,
      candidate
    })
  })

  // Handle call acceptance
  socket.on('call-accept', (data) => {
    const { to, callId } = data
    const receiverId = currentUserId || socket.id
    console.log(`📞 Call accepted: ${callId} by ${receiverId}, notifying caller ${to}`)
    
    // Update call status to active
    if (activeCalls.has(receiverId)) {
      const call = activeCalls.get(receiverId)
      call.status = 'active'
      call.acceptedAt = new Date()
      activeCalls.set(receiverId, call)
      
      // Also track caller's side
      activeCalls.set(to, {
        ...call,
        receiverId: to,
        callerId: receiverId
      })
    }
    
    // IMPORTANT: Only notify the caller (to), NOT the receiver
    // The receiver already knows they accepted the call
    // This prevents any potential incoming-call events from being sent
    io.to(`user:${to}`).emit('call-accepted', {
      from: receiverId,
      callId,
      receiverId: receiverId,
      timestamp: new Date()
    })
    
    // Also notify the receiver (accepter) that call is active
    // But this is just for state synchronization, not for showing popup
    socket.emit('call-accepted', {
      from: receiverId,
      callId,
      receiverId: receiverId,
      timestamp: new Date()
    })
  })

  // Handle call rejection
  socket.on('call-reject', (data) => {
    const { to, callId } = data
    const receiverId = currentUserId || socket.id
    console.log(`📞 Call rejected: ${callId} by ${receiverId}`)
    
    // Remove from active calls
    activeCalls.delete(receiverId)
    
    io.to(`user:${to}`).emit('call-rejected', {
      from: receiverId,
      callId
    })
  })

  // Handle call end
  socket.on('call-end', (data) => {
    const { to } = data
    const userId = currentUserId || socket.id
    console.log(`📞 Call ended by ${userId}`)
    
    // Remove from active calls for both users
    activeCalls.delete(userId)
    activeCalls.delete(to)
    
    // Clear socket call references
    if (socket.currentCallId) {
      delete socket.currentCallId
    }
    if (socket.currentCallReceiverId) {
      delete socket.currentCallReceiverId
    }
    
    // Notify other party
    io.to(`user:${to}`).emit('call-ended', {
      from: userId
    })
  })

  // Real-time messaging handlers
  socket.on('send_message', async (data) => {
    try {
      const { threadId, senderId, text, ciphertext, iv, messageType = 'text' } = data
      
      if (!threadId || !senderId) {
        socket.emit('message_error', { error: 'threadId and senderId are required' })
        return
      }
      
      const ChatRoom = require('./src/models/ChatRoom')
      const Message = require('./src/models/Message')
      
      // Check if user has access to this thread
      const thread = await ChatRoom.findById(threadId)
      if (!thread || !thread.isParticipant(senderId)) {
        socket.emit('message_error', { error: 'Access denied' })
        return
      }
      
      // Create message
      const message = new Message({
        chatRoom: threadId,
        sender: senderId,
        text: text || '',
        ciphertext: ciphertext || text || '',
        iv: iv || '',
        messageType: messageType,
        status: 'sent'
      })
      
      await message.save()
      
      // Update thread's last message
      thread.lastMessage = message._id
      thread.lastMessageAt = message.createdAt
      thread.lastMessageText = text || ''
      await thread.save()
      
      // Increment unread counts for all participants except sender
      const otherParticipants = thread.participants.filter(
        p => p.toString() !== senderId
      )
      
      for (const participantId of otherParticipants) {
        await thread.incrementUnread(participantId)
      }
      
      // Populate sender
      await message.populate('sender', 'name username email avatarUrl profilePic')
      
      // Emit to all participants in the thread
      io.to(threadId).emit('new_message', {
        threadId: threadId,
        message: {
          ...message.toObject(),
          isRead: false
        }
      })
    } catch (error) {
      console.error('Send message via socket error:', error)
      socket.emit('message_error', { error: error.message })
    }
  })

  // Handle read receipts
  socket.on('mark_read', async (data) => {
    try {
      const { threadId, userId, messageIds } = data
      
      if (!threadId || !userId) {
        socket.emit('read_error', { error: 'threadId and userId are required' })
        return
      }
      
      const ChatRoom = require('./src/models/ChatRoom')
      const Message = require('./src/models/Message')
      
      // Check if user has access to this thread
      const thread = await ChatRoom.findById(threadId)
      if (!thread || !thread.isParticipant(userId)) {
        socket.emit('read_error', { error: 'Access denied' })
        return
      }
      
      // Mark messages as read
      if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
        await Message.updateMany(
          { 
            _id: { $in: messageIds },
            chatRoom: threadId,
            'readBy.userId': { $ne: userId }
          },
          { $push: { readBy: { userId: userId, readAt: new Date() } } }
        )
      } else {
        // Mark all unread messages in thread as read
        await Message.updateMany(
          {
            chatRoom: threadId,
            sender: { $ne: userId },
            'readBy.userId': { $ne: userId }
          },
          { $push: { readBy: { userId: userId, readAt: new Date() } } }
        )
      }
      
      // Reset unread count for this thread
      await thread.resetUnread(userId)
      
      // Emit read receipt to other participants
      io.to(threadId).emit('messages_read', {
        threadId: threadId,
        userId: userId,
        messageIds: messageIds || null
      })
    } catch (error) {
      console.error('Mark read via socket error:', error)
      socket.emit('read_error', { error: error.message })
    }
  })

  // Handle typing indicators
  socket.on('typing_start', async (data) => {
    const { threadId, userId } = data
    if (threadId && userId) {
      // Emit to all participants except the sender
      socket.to(threadId).emit('user_typing', {
        threadId,
        userId,
        isTyping: true
      })
    }
  })

  socket.on('typing_stop', async (data) => {
    const { threadId, userId } = data
    if (threadId && userId) {
      // Emit to all participants except the sender
      socket.to(threadId).emit('user_typing', {
        threadId,
        userId,
        isTyping: false
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason)
    
    // Clean up global chat presence
    if (currentUserId && globalChatPresence.has(currentUserId)) {
      globalChatPresence.delete(currentUserId)
      const userCount = globalChatPresence.size
      io.to('global-chat').emit('user-left', {
        userId: currentUserId,
        userCount
      })
      console.log(`💬 User ${currentUserId} disconnected from global chat. Total: ${userCount}`)
    }
    
    // Clean up active calls if user disconnects during a call
    if (currentUserId && activeCalls.has(currentUserId)) {
      const call = activeCalls.get(currentUserId)
      console.log(`📞 Cleaning up active call for disconnected user: ${currentUserId}`)
      
      // Notify other party that call ended
      if (call.callerId === currentUserId) {
        io.to(`user:${call.receiverId}`).emit('call-ended', {
          from: currentUserId,
          reason: 'User disconnected'
        })
      } else {
        io.to(`user:${call.callerId}`).emit('call-ended', {
          from: currentUserId,
          reason: 'User disconnected'
        })
      }
      
      // Remove from active calls
      activeCalls.delete(currentUserId)
      if (call.callerId !== currentUserId) {
        activeCalls.delete(call.callerId)
      }
    }
    
    // Update user offline status
    if (currentUserId) {
      const User = require('./src/models/User')
      // Check if currentUserId is a valid MongoDB ObjectId
      let userQueryForDisconnect
      if (mongoose.Types.ObjectId.isValid(currentUserId)) {
        userQueryForDisconnect = { _id: currentUserId }
      } else {
        userQueryForDisconnect = { googleId: currentUserId }
      }
      
      await User.findOneAndUpdate(userQueryForDisconnect, {
        isOnline: false,
        lastSeen: new Date()
      })
      
      // Notify other users that this user is now offline
      socket.broadcast.emit('user_offline', { userId: currentUserId })
    }
  })

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('🔌 Socket error:', error)
  })
})

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}))

// CORS configuration - more permissive for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5175',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5174',
      // Allow network access from mobile devices
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/192\.168\.\d+\.\d+:5174$/,
      /^http:\/\/192\.168\.\d+\.\d+:5175$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:5173$/,
      'http://127.0.0.1:3000',
      'http://192.168.31.132:5173',
      'http://192.168.31.132:5175',
      'http://192.168.31.132:5174',
      'http://192.168.31.132:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('CORS: Allowing origin:', origin)
      callback(null, true) // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
}))

// Rate limiting completely removed as requested
console.log('🔓 Rate limiting completely disabled')

// Handle preflight requests - must be before routes
app.options('*', (req, res) => {
  const origin = req.headers.origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
  } else {
    res.header('Access-Control-Allow-Origin', '*')
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Max-Age', '86400') // 24 hours
  res.sendStatus(200)
})

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/itwos-ai', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err))

// Custom middleware to handle avatar files with fallback
app.use('/uploads/avatars', (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  
  const filePath = path.join(__dirname, 'uploads', 'avatars', path.basename(req.path))
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    // File exists, serve it normally
    return express.static(path.join(__dirname, 'uploads', 'avatars'))(req, res, next)
  } else {
    // File doesn't exist - serve a transparent 1x1 PNG to prevent 404 errors
    // This prevents console errors while allowing Avatar component to show fallback
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    res.header('Content-Type', 'image/png')
    res.header('Content-Length', transparentPng.length)
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.send(transparentPng)
  }
})

// Custom middleware to handle image files with fallback
app.use('/uploads/images', (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  
  const filePath = path.join(__dirname, 'uploads', 'images', path.basename(req.path))
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    // File exists, serve it normally
    return express.static(path.join(__dirname, 'uploads', 'images'))(req, res, next)
  } else {
    // File doesn't exist - serve a transparent 1x1 PNG to prevent 404 errors
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    res.header('Content-Type', 'image/png')
    res.header('Content-Length', transparentPng.length)
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.send(transparentPng)
  }
})

// Custom middleware to handle audio files with fallback
// Serve audio downloads (converted MP3 files)
app.use('/uploads/audio-downloads', (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  
  const filePath = path.join(__dirname, 'uploads', 'audio-downloads', req.path)
  
  if (fs.existsSync(filePath)) {
    // Set proper content type for MP3 files
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`)
    }
    return express.static(path.join(__dirname, 'uploads', 'audio-downloads'))(req, res, next)
  } else {
    res.status(404).json({
      success: false,
      error: 'Audio file not found'
    })
  }
})

app.use('/uploads/audio', (req, res, next) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  res.header('Accept-Ranges', 'bytes')
  
  const filePath = path.join(__dirname, 'uploads', 'audio', path.basename(req.path))
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    // File exists, serve it normally with proper content type
    const ext = path.extname(req.path).toLowerCase()
    if (ext === '.wav' || ext === '.wave') {
      res.header('Content-Type', 'audio/wav')
    } else if (ext === '.mp3') {
      res.header('Content-Type', 'audio/mpeg')
    } else if (ext === '.ogg') {
      res.header('Content-Type', 'audio/ogg')
    } else if (ext === '.m4a') {
      res.header('Content-Type', 'audio/mp4')
    } else {
      res.header('Content-Type', 'audio/wav')
    }
    return express.static(path.join(__dirname, 'uploads', 'audio'))(req, res, next)
  } else {
    // File doesn't exist - serve a minimal silent WAV file (1 second of silence)
    // This is a valid minimal WAV file (44 bytes)
    const silentWav = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size - 8 (36 bytes)
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // fmt chunk size (16)
      0x01, 0x00,             // Audio format (PCM)
      0x01, 0x00,             // Number of channels (1 = mono)
      0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // Byte rate (88200)
      0x02, 0x00,             // Block align (2)
      0x10, 0x00,             // Bits per sample (16)
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x00, 0x00, 0x00  // Data chunk size (0 = empty/silent)
    ])
    res.header('Content-Type', 'audio/wav')
    res.header('Content-Length', silentWav.length)
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    return res.send(silentWav)
  }
})

// Serve other static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, 'uploads'), {
  // Allow fallthrough to handle missing files
  fallthrough: true
}))

// Handle 404 for missing upload files gracefully (non-avatar files)
app.use('/uploads', (req, res) => {
  // For other files, return JSON error
  res.status(404).json({
    success: false,
    message: 'File not found',
    path: req.path
  })
})

// Public API routes (must be before maintenance mode check)
// Settings route must be registered BEFORE maintenance middleware
const settingsRouter = require('./src/routes/settings')
app.use('/api/settings', settingsRouter) // Maintenance status endpoint
console.log('✅ Settings route registered: /api/settings')

// Maintenance mode middleware - must be after settings route but before other routes
const { checkMaintenanceMode } = require('./src/middleware/maintenance')
app.use((req, res, next) => {
  // Allow settings/maintenance-status endpoint to bypass maintenance check
  // Check both req.path and req.originalUrl to handle different Express path matching
  const path = req.path || req.originalUrl || req.url
  if (path.startsWith('/api/settings')) {
    return next()
  }
  // Apply maintenance mode check to all other routes
  checkMaintenanceMode(req, res, next)
})

// Routes
app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/users', require('./src/routes/users'))
app.use('/api/users-list', require('./src/routes/usersList')) // New endpoint for listing all users
app.use('/api/products', require('./src/routes/products'))
app.use('/api/payments', require('./src/routes/payments'))
app.use('/api/prebook', require('./src/routes/prebook'))
app.use('/api/upload', require('./src/routes/upload'))
app.use('/api/notifications', require('./src/routes/notifications'))
app.use('/api/follow', require('./src/routes/followNew')) // New follow/unfollow endpoints
app.use('/api/threads', require('./src/routes/threads')) // Thread and messaging endpoints
app.use('/api/subscriptions', require('./src/routes/subscriptions')) // Subscription endpoints
app.use('/api/payment-tracking', require('./src/routes/paymentTracking')) // Payment tracking endpoints
app.use('/api/posts', require('./src/routes/posts')) // Post endpoints
app.use('/api/feed', require('./src/routes/feed')) // Feed endpoints (fan-out)
app.use('/api/explore', require('./src/routes/explore')) // Explore/trending endpoints
app.use('/api/banners', require('./src/routes/banners')) // Banner system endpoints
app.use('/api/analytics', require('./src/routes/analytics')) // Analytics tracking endpoints (public)
app.use('/api/admin/analytics', require('./src/routes/adminAnalytics')) // Admin analytics endpoints
app.use('/api/global-chat', require('./src/routes/globalChat')) // Global chat endpoints
app.use('/api/admin/global-chat', require('./src/routes/adminGlobalChat')) // Admin global chat moderation
app.use('/api/audio', require('./src/routes/audioDownloader')) // Audio downloader endpoints

// Admin routes - More specific routes first
app.use('/api/admin/posts', require('./src/routes/adminPosts'))
app.use('/api/admin/auth', require('./src/routes/adminAuth'))
app.use('/api/admin/users', require('./src/routes/adminUsers'))
app.use('/api/admin/orders', require('./src/routes/adminOrders'))
app.use('/api/admin/products', require('./src/routes/adminProducts'))
app.use('/api/admin/trending', require('./src/routes/trending'))
app.use('/api/admin', require('./src/routes/admin'))
// app.use('/api/admin', require('./src/routes/testUsers')) // Commented out - test route

// Initialize subscription cron job
const { startSubscriptionCron } = require('./src/services/subscriptionCron');
startSubscriptionCron();

// Initialize trending score update cron job
const { startTrendingCron } = require('./src/services/trendingCron');
const { initializeCache } = require('./src/services/trendingCache');

// Initialize trending cache service
initializeCache().catch(err => {
  console.error('Error initializing trending cache:', err);
});

// Start trending cron job
startTrendingCron();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    socketIO: 'enabled'
  })
})

// Socket.IO test endpoint
app.get('/api/socket-test', (req, res) => {
  res.json({
    success: true,
    message: 'Socket.IO test endpoint',
    socketIO: 'available',
    timestamp: new Date().toISOString()
  })
})

// Rate limiting completely removed - no bypass needed

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  })
  res.status(404).json({
    success: false,
    message: 'Route not found',
    method: req.method,
    path: req.path
  })
})

const PORT = process.env.PORT || 7000

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os')
  const networkInterfaces = os.networkInterfaces()
  let localIP = 'localhost'
  
  // Find local IP address
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName]
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address
        break
      }
    }
    if (localIP !== 'localhost') break
  }
  
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔗 API Base URL (Local): http://localhost:${PORT}/api`)
  console.log(`🔗 API Base URL (Network): http://${localIP}:${PORT}/api`)
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io/`)
  console.log(`📱 Mobile Access: http://${localIP}:${PORT}/api`)
})
