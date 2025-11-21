const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Subscription = require('../models/Subscription');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');
const { sendNotificationEmail, sendBulkEmails } = require('../services/mailjet');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is working',
    timestamp: new Date().toISOString()
  });
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const offlineUsers = await User.countDocuments({ isOnline: false });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Product statistics
    const totalProducts = await Product.countDocuments();
    const publishedProducts = await Product.countDocuments({ published: true, isActive: true });
    const draftProducts = await Product.countDocuments({ published: false, isActive: true });
    const featuredProducts = await Product.countDocuments({ featured: true, isActive: true });
    const lowStockProducts = await Product.countDocuments({ 
      $expr: { $lt: ['$stock', 10] },
      isActive: true 
    });

    // Sales statistics
    const salesSummary = await Purchase.getSalesSummary();
    const totalOrders = await Purchase.countDocuments();
    const pendingOrders = await Purchase.countDocuments({ status: 'created' });
    console.log('📊 Admin Dashboard: Total orders:', totalOrders);
    console.log('📊 Admin Dashboard: Pending orders count:', pendingOrders);
    
    // Debug: Check all order statuses
    const allOrders = await Purchase.find({}).select('status').limit(10);
    console.log('📊 Admin Dashboard: Sample orders:', allOrders);
    const completedOrders = await Purchase.countDocuments({ status: 'paid' });
    const cancelledOrders = await Purchase.countDocuments({ status: 'cancelled' });
    
    // Revenue calculations
    const todayRevenue = await Purchase.aggregate([
      { 
        $match: { 
          status: 'paid',
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const thisMonthRevenue = await Purchase.aggregate([
      { 
        $match: { 
          status: 'paid',
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Prebook statistics
    const PrebookRequest = require('../models/PrebookRequest');
    const totalPrebooks = await PrebookRequest.countDocuments();
    const pendingPrebooks = await PrebookRequest.countDocuments({ status: 'pending' });
    const approvedPrebooks = await PrebookRequest.countDocuments({ status: 'accepted' });
    const rejectedPrebooks = await PrebookRequest.countDocuments({ status: 'rejected' });
    const paidPrebooks = await PrebookRequest.countDocuments({ status: 'paid' });
    
    const totalPaidAmount = await PrebookRequest.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$paymentAmount', 0] } } } }
    ]);

    // Recent data
    const recentUsers = await User.find()
      .select('name email avatarUrl isOnline createdAt lastSeen')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentOrders = await Purchase.find({})
      .populate('buyer', 'name email')
      .populate('product', 'title type')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPrebooks = await PrebookRequest.find()
      .populate('userId', 'name email')
      .populate('productId', 'title slug')
      .sort({ createdAt: -1 })
      .limit(5);

    // Chat statistics
    const totalChatRooms = await ChatRoom.countDocuments({ isActive: true });
    const totalMessages = await Message.countDocuments({ isDeleted: false });
    const moderatedMessages = await Message.countDocuments({ isModerated: true });

    res.json({
      success: true,
      data: {
        users: {
          totalUsers,
          onlineUsers,
          offlineUsers,
          newUsersToday,
          newUsersThisMonth,
          activeUsers,
          totalSpent: 0 // Will be calculated separately
        },
        products: {
          totalProducts,
          publishedProducts,
          draftProducts,
          featuredProducts,
          lowStockProducts
        },
        orders: {
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          totalRevenue: salesSummary[0]?.totalSales || 0,
          todayRevenue: todayRevenue[0]?.total || 0,
          thisMonthRevenue: thisMonthRevenue[0]?.total || 0
        },
        prebooks: {
          total: totalPrebooks,
          pending: pendingPrebooks,
          approved: approvedPrebooks,
          rejected: rejectedPrebooks,
          paid: paidPrebooks,
          totalPaid: (totalPaidAmount[0]?.total || 0) / 100
        },
        recent: {
          users: recentUsers,
          orders: recentOrders,
          prebooks: recentPrebooks
        },
        chat: {
          totalRooms: totalChatRooms,
          totalMessages: totalMessages,
          moderatedMessages: moderatedMessages
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, validatePagination, validateSearch, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      q,
      role,
      isEmailVerified,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    // Search query
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }

    // Filters
    if (role) query.role = role;
    if (isEmailVerified !== undefined) query.isEmailVerified = isEmailVerified === 'true';

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('-passwordHash -publicKey')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users: users.map(user => user.getFullProfile()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user by ID with full details
router.get('/users/:id', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's purchases
    const purchases = await Purchase.findByBuyer(user._id);

    // Get user's following and followers
    const following = await User.find({ _id: { $in: user.following } })
      .select('name email avatarUrl role createdAt');
    const followers = await User.find({ following: user._id })
      .select('name email avatarUrl role createdAt');

    res.json({
      success: true,
      user: {
        ...user.getFullProfile(),
        purchases: purchases.map(purchase => purchase.getPublicData()),
        following: following,
        followers: followers
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user role
router.patch('/users/:id/role', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: user.getFullProfile()
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all products (admin view)
router.get('/products', authenticateToken, requireAdmin, validatePagination, validateSearch, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = '-createdAt',
      q,
      type,
      published,
      featured,
      category
    } = req.query;

    // Build query
    const query = {};

    // Search query
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Filters
    if (type) query.type = type;
    if (published !== undefined) query.published = published === 'true';
    if (featured !== undefined) query.featured = featured === 'true';
    if (category) query.category = category.toLowerCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products: products.map(product => product.getPublicData()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get sales analytics
router.get('/analytics/sales', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = { status: 'paid' };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSales: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        };
        break;
      case 'month':
        groupStage = {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        };
        break;
      case 'year':
        groupStage = {
          _id: { year: { $year: '$createdAt' } },
          totalSales: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        };
        break;
      default:
        groupStage = {
          _id: null,
          totalSales: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$amount' }
        };
    }

    const salesData = await Purchase.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id': 1 } }
    ]);

    // Get sales by product
    const salesByProduct = await Purchase.getSalesByProduct(startDate, endDate);

    res.json({
      success: true,
      analytics: {
        salesData: salesData,
        salesByProduct: salesByProduct
      }
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sales analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get chat moderation data
router.get('/chat/moderation', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const moderatedMessages = await Message.findModerated();
    const moderatedRooms = await ChatRoom.findModerated();

    const paginatedMessages = moderatedMessages.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      moderation: {
        messages: paginatedMessages.map(message => message.getMetadata()),
        rooms: moderatedRooms.map(room => room.getFullData()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: moderatedMessages.length,
          pages: Math.ceil(moderatedMessages.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get chat moderation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat moderation data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Flag message for moderation
router.post('/chat/messages/:id/flag', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const { flag, notes } = req.body;
    const messageId = req.params.id;

    if (!['spam', 'inappropriate', 'harassment', 'other'].includes(flag)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid flag type'
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.moderationFlags.push(flag);
    message.isModerated = true;
    if (notes) message.moderatorNotes = notes;

    await message.save();

    res.json({
      success: true,
      message: 'Message flagged for moderation',
      message: message.getMetadata()
    });
  } catch (error) {
    console.error('Flag message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send notification to users
router.post('/notifications/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, subject, message, actionUrl, actionText } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs are required'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Get users
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found'
      });
    }

    // Send bulk email
    const emailResult = await sendBulkEmails(
      users.map(user => ({ name: user.name, email: user.email })),
      subject,
      message,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${message}</p>
        ${actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${actionText || 'Take Action'}</a>
          </div>
        ` : ''}
        <p>Best regards,<br>The ITWOS AI Team</p>
      </div>`
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notifications',
        error: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      sentTo: users.length,
      messageIds: emailResult.messageIds
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all verified badge subscriptions (admin)
router.get('/subscriptions', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get subscriptions with user details
    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name username email avatarUrl profilePic isVerified verifiedTill')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // If search query, filter by user name or email
    let filteredSubscriptions = subscriptions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSubscriptions = subscriptions.filter(sub => {
        const user = sub.userId;
        if (!user) return false;
        return (
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower))
        );
      });
    }

    // Get total count
    const total = await Subscription.countDocuments(query);

    // Format response
    const formattedSubscriptions = filteredSubscriptions.map(sub => {
      // Debug log to check payment details
      console.log('📋 Subscription payment details:', {
        _id: sub._id,
        paymentId: sub.paymentId,
        razorpayOrderId: sub.razorpayOrderId,
        razorpayPaymentId: sub.razorpayPaymentId,
        paymentMethod: sub.paymentMethod,
        userId: sub.userId?._id,
        userName: sub.userId?.name
      });
      
      return {
        _id: sub._id,
        userId: sub.userId?._id,
        userName: sub.userId?.name || 'Unknown User',
        username: sub.userId?.username || '',
        userEmail: sub.userId?.email || '',
        userAvatar: sub.userId?.avatarUrl || sub.userId?.profilePic || '',
        planMonths: sub.planMonths,
        price: sub.price,
        currency: sub.currency || 'INR',
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
        status: sub.status,
        paymentId: sub.paymentId || null,
        razorpayOrderId: sub.razorpayOrderId || null,
        razorpayPaymentId: sub.razorpayPaymentId || sub.paymentId || null,
        paymentMethod: sub.paymentMethod || 'card',
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        isActive: sub.isActive ? sub.isActive() : false
      };
    });

    res.json({
      success: true,
      subscriptions: formattedSubscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: search ? filteredSubscriptions.length : total,
        pages: Math.ceil((search ? filteredSubscriptions.length : total) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get system settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // This would typically come from a settings collection
    // For now, return basic system info
    res.json({
      success: true,
      settings: {
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        },
        features: {
          e2ee: true,
          payments: true,
          email: true,
          cloudinary: true
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
