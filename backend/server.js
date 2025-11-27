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

  // Handle user room joining (for notifications)
  socket.on('join-user-room', async (userId) => {
    if (userId) {
      currentUserId = userId
      socket.join(`user:${userId}`)
      console.log(`🔌 Client ${socket.id} joined user room: user:${userId}`)
      socket.emit('user-room-joined', { userId, success: true })
      
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
      'http://127.0.0.1:3000',
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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io/`)
})
