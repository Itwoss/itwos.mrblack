const express = require('express')
const NotificationService = require('../services/notificationService')
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth')
const { validatePagination } = require('../middleware/validation')

const router = express.Router()

// Get user notifications
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const result = await NotificationService.getUserNotifications(
      req.user._id,
      parseInt(limit),
      skip
    )

    res.json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / parseInt(limit))
        },
        unreadCount: result.unreadCount
      }
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    })
  }
})

// Get notification statistics
router.get('/stats', authenticateToken, requireUser, async (req, res) => {
  try {
    const stats = await NotificationService.getNotificationStats(req.user._id)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get notification stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    })
  }
})

// Mark notification as read
router.put('/:id/read', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params
    
    const notification = await NotificationService.markAsRead(id, req.user._id)
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    })
  } catch (error) {
    console.error('Mark notification as read error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    })
  }
})

// Mark all notifications as read
router.put('/read-all', authenticateToken, requireUser, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id)
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    })
  }
})

// Get admin notifications (for admin dashboard)
router.get('/admin', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Build query for admin notifications
    const query = { type: { $in: ['prebook_payment', 'admin_action', 'system_announcement'] } }
    if (type) {
      query.type = type
    }
    
    const notifications = await require('../models/Notification').find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email')

    const total = await require('../models/Notification').countDocuments(query)
    const unreadCount = await require('../models/Notification').countDocuments({ 
      ...query, 
      read: false 
    })

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        unreadCount
      }
    })
  } catch (error) {
    console.error('Get admin notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get admin notifications',
      error: error.message
    })
  }
})

// Create test notification (for development)
router.post('/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = 'general', title, message, userId } = req.body
    
    const notification = await NotificationService.createUserNotification(
      userId || req.user._id,
      type,
      title || 'Test Notification',
      message || 'This is a test notification',
      { test: true },
      'normal'
    )
    
    res.json({
      success: true,
      message: 'Test notification created',
      data: notification
    })
  } catch (error) {
    console.error('Create test notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification',
      error: error.message
    })
  }
})

module.exports = router