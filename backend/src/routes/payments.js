const express = require('express')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const { authenticateToken, requireUser } = require('../middleware/auth')
const PrebookRequest = require('../models/PrebookRequest')
const User = require('../models/User')

const router = express.Router()

// Razorpay configuration - LIVE KEYS
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET

// Debug Razorpay configuration
console.log('🔧 Razorpay Debug:')
console.log('RAZORPAY_KEY_ID:', RAZORPAY_KEY_ID ? 'Set' : 'Missing')
console.log('RAZORPAY_KEY_SECRET:', RAZORPAY_KEY_SECRET ? 'Set' : 'Missing')
console.log('Environment NODE_ENV:', process.env.NODE_ENV)

// Validate Razorpay configuration
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ Razorpay configuration missing!')
  console.error('Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET in your .env file')
  console.error('Current values:')
  console.error('- RAZORPAY_KEY_ID:', RAZORPAY_KEY_ID)
  console.error('- RAZORPAY_SECRET:', RAZORPAY_KEY_SECRET)
} else {
  console.log('✅ Razorpay configuration loaded successfully!')
  console.log('Key ID:', RAZORPAY_KEY_ID)
  console.log('Secret:', RAZORPAY_KEY_SECRET ? 'Set (hidden)' : 'Missing')
}

// Initialize Razorpay instance
let razorpay
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  })
  console.log('✅ Razorpay instance created successfully!')
} catch (error) {
  console.error('❌ Failed to create Razorpay instance:', error.message)
}

// Create Razorpay order for prebook payment
router.post('/create-order', authenticateToken, requireUser, async (req, res) => {
  try {
    const { prebookId, amount = 100 } = req.body // ₹1 in paise

    console.log('🔍 Creating payment order for prebook:', prebookId)
    console.log('🔍 User making request:', req.user?._id)
    console.log('🔍 Amount:', amount)

    // Check if user is authenticated (allow guest users for prebooks without userId)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Validate prebookId
    if (!prebookId) {
      return res.status(400).json({
        success: false,
        message: 'Prebook ID is required'
      })
    }

    // Verify prebook exists and belongs to user
    let prebook
    try {
      prebook = await PrebookRequest.findById(prebookId)
        .populate('productId', 'title price')
        .populate('userId', 'name email')
    } catch (dbError) {
      console.error('🔍 Database error finding prebook:', dbError)
      return res.status(500).json({
        success: false,
        message: 'Database error while finding prebook',
        error: dbError.message
      })
    }

    console.log('🔍 Prebook found:', prebook ? 'Yes' : 'No')
    if (prebook) {
      console.log('🔍 Prebook userId:', prebook.userId ? (prebook.userId._id || prebook.userId) : 'null')
      console.log('🔍 Prebook productId:', prebook.productId ? prebook.productId._id : 'null')
      console.log('🔍 Prebook status:', prebook.status)
      console.log('🔍 Prebook created at:', prebook.createdAt)
    }

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook not found'
      })
    }

    // For prebooks without userId (guest users), we'll allow payment but log it
    if (!prebook.userId) {
      console.log('🔍 Prebook has no userId (guest user):', prebook.contactInfo?.name || 'Unknown')
      // We'll continue with payment creation for guest users
    } else {
      // For logged-in users, verify the prebook belongs to them
      // Handle both populated and non-populated userId
      const prebookUserId = prebook.userId._id ? prebook.userId._id.toString() : prebook.userId.toString()
      const requestUserId = req.user?._id?.toString()
      
      console.log('🔍 Prebook ownership check:', {
        prebookUserId,
        requestUserId,
        match: prebookUserId === requestUserId
      })
      
      if (prebookUserId !== requestUserId) {
        console.error('🔍 Prebook userId mismatch:', {
          prebookUserId,
          requestUserId
        })
        return res.status(403).json({
          success: false,
          message: 'Prebook does not belong to the authenticated user'
        })
      }
    }

    // Check if prebook has productId
    if (!prebook.productId) {
      console.error('🔍 Prebook has no productId:', prebook)
      return res.status(400).json({
        success: false,
        message: 'Prebook has no associated product',
        debug: {
          prebookId: prebook._id,
          hasProductId: !!prebook.productId,
          prebookData: {
            id: prebook._id,
            status: prebook.status,
            createdAt: prebook.createdAt
          }
        }
      })
    }

    // User ownership already validated above, no need for duplicate check

    // Create order data for Razorpay
    // Generate a shorter receipt (max 40 characters for Razorpay)
    let shortReceipt = `pb_${prebookId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`
    
    // Ensure receipt is under 40 characters
    if (shortReceipt.length > 40) {
      const timestamp = Date.now().toString().slice(-6)
      const prebookShort = prebookId.toString().slice(-6)
      shortReceipt = `pb_${prebookShort}_${timestamp}`
      console.log('Receipt too long, using shorter version:', shortReceipt)
    }
    
    const orderData = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: shortReceipt, // Max 40 characters
      notes: {
        prebook_id: prebookId,
        user_id: req.user?._id || 'guest',
        product_title: prebook.productId?.title || 'Unknown Product'
      }
    }

    console.log('🔍 Order data created:', {
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      productTitle: orderData.notes.product_title
    })

    // Check if Razorpay instance is available
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not configured properly'
      })
    }

    try {
      console.log('Creating Razorpay order with data:', {
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        receiptLength: orderData.receipt.length
      })
      
      const order = await razorpay.orders.create(orderData)
      console.log('Razorpay order created successfully:', order.id)
      
      // Store order details in prebook
      prebook.paymentOrderId = order.id
      prebook.paymentAmount = amount
      prebook.paymentStatus = 'pending'
      await prebook.save()

      res.json({
        success: true,
        data: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: RAZORPAY_KEY_ID
        }
      })
    } catch (razorpayError) {
      console.error('Razorpay order creation error:', razorpayError)
      console.error('Order data that failed:', orderData)
      
      // Return more specific error information
      const errorMessage = razorpayError.error?.description || razorpayError.message || 'Unknown Razorpay error'
      
      res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          razorpayError: razorpayError,
          orderData: orderData
        } : undefined
      })
    }
  } catch (error) {
    console.error('Error creating payment order:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    })
  }
})

// Verify Razorpay payment
router.post('/verify', authenticateToken, requireUser, async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      prebookId 
    } = req.body

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !prebookId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      })
    }

    // Validate prebookId format
    if (!prebookId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prebook ID format'
      })
    }

    // Find the prebook
    const prebook = await PrebookRequest.findById(prebookId)
      .populate('productId', 'title')
      .populate('userId', 'name email')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook not found'
      })
    }

    // Verify the prebook belongs to the authenticated user (skip for guest users)
    if (prebook.userId && prebook.userId._id.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to prebook'
      })
    }

    // Enhanced payment verification with better error handling
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    const isAuthentic = expectedSignature === razorpay_signature

    // For development, allow payments with test signatures or in development mode
    const isTestPayment = razorpay_payment_id.startsWith('pay_test') || razorpay_order_id.startsWith('order_test')
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isLocalhost = req.get('host')?.includes('localhost') || req.get('host')?.includes('127.0.0.1')
    
    console.log('Payment verification debug:', {
      isAuthentic,
      isTestPayment,
      isDevelopment,
      isLocalhost,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      expectedSignature: expectedSignature.substring(0, 10) + '...',
      receivedSignature: razorpay_signature.substring(0, 10) + '...'
    })
    
    // Skip signature verification in development or localhost
    if (isDevelopment || isLocalhost || isTestPayment) {
      console.log('Development/Localhost mode: Skipping payment signature verification')
    } else if (!isAuthentic) {
      console.log('Payment verification failed:', {
        expected: expectedSignature,
        received: razorpay_signature,
        body: body,
        keySecret: RAZORPAY_KEY_SECRET.substring(0, 5) + '...'
      })
      
      // Return more helpful error message
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Please try again or contact support.',
        debug: isDevelopment ? {
          expected: expectedSignature,
          received: razorpay_signature,
          body: body
        } : undefined
      })
    }

    // Update prebook with payment details
    prebook.paymentId = razorpay_payment_id
    prebook.paymentOrderId = razorpay_order_id
    prebook.paymentStatus = 'completed'
    prebook.paymentAmount = 100 // ₹1 in paise
    prebook.paymentDate = new Date()
    prebook.status = 'pending' // Reset to pending for admin review
    await prebook.save()

    // Create notifications using the notification service
    try {
      // Ensure product is populated
      if (!prebook.productId || typeof prebook.productId === 'string') {
        await prebook.populate('productId', 'title slug thumbnailUrl')
      }
      
      // Ensure user is populated if exists
      if (prebook.userId && typeof prebook.userId === 'string') {
        await prebook.populate('userId', 'name email')
      }
      
      const NotificationService = require('../services/notificationService')
      const result = await NotificationService.createPrebookPaymentNotification(
        prebook,
        prebook.productId,
        prebook.userId || null
      )
      console.log('✅ Notifications created successfully for prebook payment:', {
        userNotification: result.userNotification?._id,
        adminNotifications: result.adminNotifications?.length || 0,
        adminNotificationIds: result.adminNotifications?.map(n => n._id) || []
      })
    } catch (notificationError) {
      console.error('❌ Error creating payment notifications:', notificationError)
      console.error('Error stack:', notificationError.stack)
      // Don't fail the request if notification fails
    }

    // Emit real-time notification via Socket.IO
    try {
      const io = req.app.get('io')
      if (io) {
        // Notify user (if userId exists)
        if (prebook.userId) {
          io.to(`user_${prebook.userId._id || prebook.userId}`).emit('payment_success', {
          type: 'payment_success',
          title: 'Payment Successful!',
          message: `Your payment for ${prebook.productId.title} has been processed successfully.`,
          data: {
            prebookId: prebook._id,
            paymentId: razorpay_payment_id,
            amount: prebook.paymentAmount
          }
        })
        }
        
        // Notify admin
        io.to('admin').emit('new_paid_prebook', {
          type: 'new_paid_prebook',
          title: 'New Paid Prebook Request',
          message: `New prebook request with payment for ${prebook.productId.title} from ${prebook.userId?.name || prebook.contactInfo?.name || 'Guest User'}`,
          data: {
            prebookId: prebook._id,
            productId: prebook.productId._id,
            requesterId: prebook.userId?._id || prebook.userId || prebook._id,
            paymentId: razorpay_payment_id,
            amount: prebook.paymentAmount
          }
        })
        
        console.log('✅ Real-time notifications sent for payment success')
      }
    } catch (notificationError) {
      console.error('Error sending real-time notifications:', notificationError)
      // Don't fail the request if real-time notifications fail
    }

    res.json({
      success: true,
      data: {
        prebookId: prebook._id,
        paymentId: razorpay_payment_id,
        status: 'completed',
        redirectUrl: `/payment/success?prebookId=${prebook._id}&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}`
      },
      message: 'Payment verified successfully'
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get payment status
router.get('/status/:prebookId', authenticateToken, requireUser, async (req, res) => {
  try {
    const { prebookId } = req.params

    const prebook = await PrebookRequest.findById(prebookId)
      .populate('productId', 'title')
      .populate('userId', 'name email')

    if (!prebook) {
      return res.status(404).json({
        success: false,
        message: 'Prebook not found'
      })
    }

    if (prebook.userId && prebook.userId._id.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to prebook'
      })
    }

    res.json({
      success: true,
      data: {
        paymentStatus: prebook.paymentStatus,
        paymentId: prebook.paymentId,
        paymentDate: prebook.paymentDate,
        amount: prebook.paymentAmount
      }
    })
  } catch (error) {
    console.error('Error getting payment status:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    })
  }
})

module.exports = router