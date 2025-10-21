const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
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

// Make io available to routes
app.set('io', io)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)
  console.log('🔌 Client origin:', socket.handshake.headers.origin)
  console.log('🔌 Client user-agent:', socket.handshake.headers['user-agent'])

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

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason)
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
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
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

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.header('Access-Control-Allow-Credentials', 'true')
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

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/users', require('./src/routes/users'))
app.use('/api/products', require('./src/routes/products'))
app.use('/api/payments', require('./src/routes/payments'))
app.use('/api/prebook', require('./src/routes/prebook'))
app.use('/api/upload', require('./src/routes/upload'))
app.use('/api/notifications', require('./src/routes/notifications'))

// Admin routes
app.use('/api/admin', require('./src/routes/admin'))
app.use('/api/admin/auth', require('./src/routes/adminAuth'))
app.use('/api/admin/users', require('./src/routes/adminUsers'))
app.use('/api/admin/orders', require('./src/routes/adminOrders'))
app.use('/api/admin/products', require('./src/routes/adminProducts'))

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
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

const PORT = process.env.PORT || 7000

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io/`)
})
