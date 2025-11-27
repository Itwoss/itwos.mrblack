const express = require('express')
const NotificationService = require('../services/notificationService')
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth')
const { validatePagination } = require('../middleware/validation')

const router = express.Router()

// Get user notifications
router.get('/', authenticateToken, requireUser, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const User = require('../models/User')
    const userId = req.user._id
    
    // Fetch notifications from both sources
    // 1. From Notification collection (payment, prebook, etc.)
    let notificationCollectionNotifications = []
    let notificationCollectionTotal = 0
    let notificationCollectionUnread = 0
    
    try {
      const result = await NotificationService.getUserNotifications(
        userId,
        parseInt(limit),
        skip
      )
      notificationCollectionNotifications = result.notifications || []
      notificationCollectionTotal = result.total || 0
      notificationCollectionUnread = result.unreadCount || 0
    } catch (notifError) {
      console.error('Error fetching from Notification collection:', notifError)
      // Continue with User model notifications - don't fail the request
      notificationCollectionNotifications = []
      notificationCollectionTotal = 0
      notificationCollectionUnread = 0
    }
    
    // 2. From User model's notifications array (follow requests, etc.)
    let userNotifications = []
    try {
      const user = await User.findById(userId).select('notifications')
      userNotifications = user?.notifications || []
    } catch (userError) {
      console.error('Error fetching User model notifications:', userError)
      // Continue without User model notifications
      userNotifications = []
    }
    
    // Get all user IDs from notifications that need to be populated
    const userIdsToPopulate = [...new Set(
      userNotifications
        .map(notif => notif.from)
        .filter(id => id && id.toString)
    )]
    
    // Populate user details for 'from' field
    const usersMap = {}
    if (userIdsToPopulate.length > 0) {
      const users = await User.find({ _id: { $in: userIdsToPopulate } })
        .select('name email avatarUrl username')
      users.forEach(user => {
        usersMap[user._id.toString()] = {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          username: user.username
        }
      })
    }
    
    // Format User model notifications to match Notification model format
    const formattedUserNotifications = userNotifications.map((notif, index) => {
      // Ensure createdAt is a Date object
      let createdAt = notif.createdAt
      if (!createdAt) {
        createdAt = new Date()
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt)
      }
      
      // Get user details for 'from' field
      const fromUserId = notif.from?.toString() || notif.from
      const fromUser = fromUserId ? usersMap[fromUserId] : null
      
      return {
        _id: notif._id || `user_notif_${index}`,
        userId: userId,
        type: notif.type || 'general',
        title: notif.type === 'follow_request' ? 'Follow Request' : 
               notif.type === 'follow' ? 'New Follower' :
               notif.type === 'follow_accepted' ? 'Follow Request Accepted' : 'Notification',
        message: notif.message || 'You have a new notification',
        read: notif.isRead !== undefined ? notif.isRead : (notif.read || false),
        readAt: notif.readAt || null,
        createdAt: createdAt,
        data: notif.metadata || {},
        from: fromUser || notif.from || null,
        source: 'user_model' // Mark as coming from User model
      }
    })
    
    console.log('📬 Formatted User notifications:', {
      count: formattedUserNotifications.length,
      sample: formattedUserNotifications[0] || null,
      types: formattedUserNotifications.map(n => n.type)
    })
    
    // Merge and sort by createdAt (newest first)
    const allNotifications = [
      ...notificationCollectionNotifications.map(n => {
        const notifObj = n.toObject ? n.toObject() : n
        return {
          ...notifObj,
          source: 'notification_collection',
          read: notifObj.read !== undefined ? notifObj.read : false
        }
      }),
      ...formattedUserNotifications
    ].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateB - dateA
    })
    
    // Paginate merged results
    const paginatedNotifications = allNotifications.slice(skip, skip + parseInt(limit))
    const totalNotifications = allNotifications.length
    const unreadNotifications = allNotifications.filter(n => {
      const isRead = n.read !== undefined ? n.read : (n.isRead !== undefined ? n.isRead : false)
      return !isRead
    }).length
    
    // Ensure all notifications have required fields
    const finalNotifications = paginatedNotifications.map((notif, index) => ({
      _id: notif._id || `notif_${index}`,
      userId: notif.userId || userId,
      type: notif.type || 'general',
      title: notif.title || notif.message || 'Notification',
      message: notif.message || notif.title || 'You have a new notification',
      read: notif.read !== undefined ? notif.read : (notif.isRead !== undefined ? notif.isRead : false),
      readAt: notif.readAt || null,
      createdAt: notif.createdAt || new Date(),
      data: notif.data || notif.metadata || {},
      from: notif.from || null,
      source: notif.source || 'unknown'
    }))
    
    console.log('📬 Notifications fetched:', {
      userId: userId.toString(),
      notificationCollection: notificationCollectionNotifications.length,
      userModel: formattedUserNotifications.length,
      total: totalNotifications,
      unread: unreadNotifications,
      paginated: paginatedNotifications.length,
      finalNotifications: finalNotifications.length,
      sampleNotification: finalNotifications[0] || null,
      requestQuery: req.query
    })

    res.json({
      success: true,
      data: {
        notifications: finalNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalNotifications,
          pages: Math.ceil(totalNotifications / parseInt(limit))
        },
        unreadCount: unreadNotifications
      }
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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

// Get unread count
router.get('/unread-count', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id
    
    // Count from Notification collection
    const Notification = require('../models/Notification')
    const notificationCollectionUnread = await Notification.countDocuments({ 
      userId, 
      read: false 
    })
    
    // Count from User model notifications array
    const User = require('../models/User')
    const user = await User.findById(userId).select('notifications')
    const userModelUnread = user?.notifications?.filter(n => !n.isRead && !n.read).length || 0
    
    const totalUnread = notificationCollectionUnread + userModelUnread
    
    res.json({
      success: true,
      data: {
        unreadCount: totalUnread
      }
    })
  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    })
  }
})

// Mark notification as read
router.patch('/:id/read', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id
    
    // Try Notification collection first
    const Notification = require('../models/Notification')
    let notification = await Notification.findOne({ _id: id, userId })
    
    if (notification) {
      notification.read = true
      notification.readAt = new Date()
      await notification.save()
      
      return res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      })
    }
    
    // Try User model notifications array
    const User = require('../models/User')
    const user = await User.findById(userId)
    if (user && user.notifications) {
      const userNotification = user.notifications.id(id)
      if (userNotification) {
        userNotification.isRead = true
        userNotification.read = true
        userNotification.readAt = new Date()
        await user.save()
        
        return res.json({
          success: true,
          message: 'Notification marked as read',
          data: {
            _id: userNotification._id,
            read: true,
            readAt: userNotification.readAt
          }
        })
      }
    }
    
    res.status(404).json({
      success: false,
      message: 'Notification not found'
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
router.patch('/mark-all-read', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id
    
    // Mark all in Notification collection
    const Notification = require('../models/Notification')
    await Notification.updateMany(
      { userId, read: false },
      { 
        read: true, 
        readAt: new Date() 
      }
    )
    
    // Mark all in User model notifications array
    const User = require('../models/User')
    const user = await User.findById(userId)
    if (user && user.notifications) {
      user.notifications.forEach(notif => {
        if (!notif.isRead && !notif.read) {
          notif.isRead = true
          notif.read = true
          notif.readAt = new Date()
        }
      })
      await user.save()
    }
    
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
    
    // Build query for admin notifications - MUST filter by current admin's userId
    const query = { 
      userId: req.user._id, // Only get notifications for the current admin
      type: { $in: ['prebook_payment', 'admin_action', 'system_announcement', 'prebook_request'] } 
    }
    if (type) {
      query.type = type
    }
    
    console.log('🔔 Admin notifications query:', {
      adminId: req.user._id,
      query: query,
      page: page,
      limit: limit
    })
    
    const Notification = require('../models/Notification')
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email')

    const total = await Notification.countDocuments(query)
    const unreadCount = await Notification.countDocuments({ 
      ...query, 
      read: false 
    })
    
    console.log('🔔 Admin notifications found:', {
      count: notifications.length,
      total: total,
      unreadCount: unreadCount,
      sampleNotification: notifications[0] || null
    })

    const responseData = {
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
    }
    
    console.log('🔔 Sending admin notifications response:', {
      success: responseData.success,
      notificationsCount: responseData.data.notifications.length,
      unreadCount: responseData.data.unreadCount,
      hasPagination: !!responseData.data.pagination
    })

    res.json(responseData)
  } catch (error) {
    console.error('Get admin notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get admin notifications',
      error: error.message
    })
  }
})

// Create test notification (for development - users can test their own notifications)
router.post('/test', authenticateToken, requireUser, async (req, res) => {
  try {
    const { type = 'general', title, message } = req.body
    
    const notification = await NotificationService.createUserNotification(
      req.user._id,
      type,
      title || 'Test Notification',
      message || 'This is a test notification to verify the system is working.',
      { test: true, timestamp: new Date().toISOString() },
      'normal'
    )
    
    console.log('✅ Test notification created:', {
      userId: req.user._id.toString(),
      notificationId: notification._id,
      type: notification.type
    })
    
    res.json({
      success: true,
      message: 'Test notification created successfully',
      data: {
        notification: notification
      }
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