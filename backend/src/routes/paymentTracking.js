const express = require('express');
const PaymentTracking = require('../models/PaymentTracking');
const User = require('../models/User');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/payment-tracking - Get payment tracking records (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentType, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { deletedAt: null }; // Only show non-deleted records
    if (status) {
      query.status = status;
    }
    if (paymentType) {
      query.paymentType = paymentType;
    }

    // Get payment tracking records with user details
    let paymentRecords = await PaymentTracking.find(query)
      .populate('userId', 'name username email avatarUrl profilePic')
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // If search query, filter by user name or email
    if (search) {
      const searchLower = search.toLowerCase();
      paymentRecords = paymentRecords.filter(record => {
        const user = record.userId;
        if (!user) return false;
        return (
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          (record.razorpayPaymentId && record.razorpayPaymentId.toLowerCase().includes(searchLower)) ||
          (record.razorpayOrderId && record.razorpayOrderId.toLowerCase().includes(searchLower))
        );
      });
    }

    // Get total count
    const total = await PaymentTracking.countDocuments(query);

    // Format response
    const formattedRecords = paymentRecords.map(record => ({
      _id: record._id,
      userId: record.userId?._id,
      userName: record.paymentDetails?.userName || record.userId?.name || 'Unknown User',
      username: record.paymentDetails?.username || record.userId?.username || '',
      userEmail: record.paymentDetails?.userEmail || record.userId?.email || '',
      userAvatar: record.paymentDetails?.userAvatar || record.userId?.avatarUrl || record.userId?.profilePic || '',
      subscriptionId: record.subscriptionId?._id,
      purchaseId: record.purchaseId?._id,
      paymentType: record.paymentType,
      amount: record.amount,
      currency: record.currency || 'INR',
      razorpayPaymentId: record.razorpayPaymentId,
      razorpayOrderId: record.razorpayOrderId,
      paymentMethod: record.paymentMethod,
      status: record.status,
      planMonths: record.planMonths,
      expiryDate: record.expiryDate,
      deletionRequested: record.deletionRequested,
      deletionConfirmationCount: record.deletionConfirmationCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));

    res.json({
      success: true,
      payments: formattedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: search ? formattedRecords.length : total,
        pages: Math.ceil((search ? formattedRecords.length : total) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payment tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/payment-tracking/my-payments - Get current user's payment records
router.get('/my-payments', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await PaymentTracking.find({ 
      userId: userId,
      deletedAt: null
    })
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PaymentTracking.countDocuments({ 
      userId: userId,
      deletedAt: null
    });

    res.json({
      success: true,
      payments: payments.map(p => p.getPublicData()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/payment-tracking/:id/request-deletion - Request deletion (step 1)
router.post('/:id/request-deletion', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user._id.toString();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';

    const payment = await PaymentTracking.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    if (payment.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Payment record is already deleted'
      });
    }

    await payment.requestDeletion(userId, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Deletion requested. 2 more confirmations required.',
      deletionConfirmationCount: payment.deletionConfirmationCount
    });
  } catch (error) {
    console.error('Request deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/payment-tracking/:id/confirm-deletion - Confirm deletion (step 2 and 3)
router.post('/:id/confirm-deletion', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user._id.toString();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';

    const payment = await PaymentTracking.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    if (!payment.deletionRequested) {
      return res.status(400).json({
        success: false,
        message: 'Deletion not requested. Please request deletion first.'
      });
    }

    if (payment.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Payment record is already deleted'
      });
    }

    await payment.confirmDeletion(userId, ipAddress, userAgent);

    const isDeleted = payment.deletionConfirmationCount >= 3;

    res.json({
      success: true,
      message: isDeleted 
        ? 'Payment record deleted successfully after 3 confirmations.'
        : `Deletion confirmed. ${3 - payment.deletionConfirmationCount} more confirmation(s) required.`,
      deletionConfirmationCount: payment.deletionConfirmationCount,
      deleted: isDeleted
    });
  } catch (error) {
    console.error('Confirm deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/payment-tracking/:id/cancel-deletion - Cancel deletion request
router.post('/:id/cancel-deletion', authenticateToken, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const paymentId = req.params.id;

    const payment = await PaymentTracking.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    await payment.cancelDeletion();

    res.json({
      success: true,
      message: 'Deletion request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

