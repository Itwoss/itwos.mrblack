const express = require('express')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const User = require('../models/User')
const Notification = require('../models/Notification')
const bcrypt = require('bcryptjs')

const router = express.Router()

console.log('🔧 AdminUsers routes loaded successfully')

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      q,
      role,
      status
    } = req.query

    const skip = (page - 1) * limit
    const limitNum = parseInt(limit)

    // Build query
    let query = {}
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }
    
    if (role) {
      query.role = role
    }
    
    if (status) {
      query.isActive = status === 'active'
    }

    // Get users
    const users = await User.find(query)
      .select('-passwordHash')
      .sort(sort)
      .limit(limitNum)
      .skip(skip)
      .lean()

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    })
  }
})

// Get user by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    })
  }
})

// Update user
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true }
    ).select('-passwordHash')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    })
  }
})

// Delete user
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    })
  }
})

// Get user statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const onlineUsers = await User.countDocuments({ isOnline: true })
    const offlineUsers = await User.countDocuments({ isOnline: false })
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } })
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const last30DaysUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    
    const totalSpent = await User.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalSpent', 0] } } } }
    ])
    
    const topSpenders = await User.find({ totalSpent: { $gt: 0 } })
      .select('name email totalSpent avatarUrl')
      .sort({ totalSpent: -1 })
      .limit(5)

    res.json({
      success: true,
      data: {
        totalUsers,
        onlineUsers,
        offlineUsers,
        newUsersToday,
        last30DaysUsers,
        totalSpent: totalSpent[0]?.total || 0,
        topSpenders
      }
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    })
  }
})

// Create new user
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, bio, permissions } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: role || 'user',
      phone,
      bio,
      permissions: permissions || ['read'],
      publicKey: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      isOnline: false,
      lastSeen: new Date()
    })

    await user.save()

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    })
  }
})

// Update user status (online/offline)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isOnline } = req.body
    const userId = req.params.id

    const user = await User.findByIdAndUpdate(
      userId,
      { isOnline, lastSeen: new Date() },
      { new: true }
    ).select('-passwordHash -publicKey')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user,
      message: `User ${isOnline ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    console.error('Error updating user status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    })
  }
})

// Terminate user
router.post('/:id/terminate', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔧 Termination route hit:', req.params.id)
  try {
    const { terminationType, terminationDate, delayDays } = req.body
    const userId = req.params.id

    console.log('🔄 Backend: Processing termination request')
    console.log('📋 User ID:', userId)
    console.log('📋 Termination Type:', terminationType)
    console.log('📋 Termination Date:', terminationDate)
    console.log('📋 Delay Days:', delayDays)

    const user = await User.findById(userId)
    if (!user) {
      console.log('❌ User not found:', userId)
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log('✅ User found:', user.name, user.email)

    // Handle different termination types
    if (terminationType === 'immediate') {
      // Immediate termination - deactivate user immediately
      user.isActive = false
      user.terminationStatus = 'terminated'
      user.terminationType = 'immediate'
      user.terminationDate = new Date()
      user.isOnline = false
      
      await user.save()
      console.log('✅ User terminated immediately')
      
      // Send immediate termination notification
      const notification = new Notification({
        userId: user._id,
        type: 'admin_action',
        title: 'Account Terminated',
        message: 'Your account has been terminated immediately. Contact support if you believe this is an error.',
        read: false,
        priority: 'high'
      })
      await notification.save()
      
      res.json({
        success: true,
        message: 'User terminated immediately',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            terminationStatus: 'terminated',
            terminationType: 'immediate'
          }
        }
      })
    } else {
      // Delayed termination
      const scheduledDate = new Date(terminationDate)
      
      user.terminationStatus = 'pending'
      user.terminationType = terminationType
      user.terminationDate = scheduledDate
      user.isActive = true // Keep active until termination date
      
      await user.save()
      console.log('✅ User termination scheduled for:', scheduledDate)
      
      // Send scheduled termination notification
      const notification = new Notification({
        userId: user._id,
        type: 'admin_action',
        title: 'Account Termination Scheduled',
        message: `Your account has been scheduled for termination on ${scheduledDate.toLocaleDateString()}. You can continue using the platform until then.`,
        read: false,
        priority: 'high'
      })
      await notification.save()
      
      res.json({
        success: true,
        message: `User termination scheduled for ${terminationType}`,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            terminationStatus: 'pending',
            terminationType: terminationType,
            terminationDate: scheduledDate
          }
        }
      })
    }
  } catch (error) {
    console.error('❌ Error terminating user:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to terminate user',
      error: error.message
    })
  }
})

module.exports = router
