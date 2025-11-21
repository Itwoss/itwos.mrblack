const express = require('express');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  1: { months: 1, price: 1, name: '1 Month', description: 'Perfect for trying out - Special ₹1 offer!' },
  2: { months: 2, price: 179, name: '2 Months', description: 'Get 2 months of verification' },
  3: { months: 3, price: 249, name: '3 Months', description: 'Get 3 months of verification' },
  4: { months: 4, price: 329, name: '4 Months', description: 'Get 4 months of verification' },
  5: { months: 5, price: 399, name: '5 Months', description: 'Get 5 months of verification' },
  6: { months: 6, price: 499, name: '6 Months', description: 'Get 6 months of verification - Best Value' }
};

// Initialize Razorpay
let razorpay = null;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

// Debug Razorpay configuration
console.log('🔧 Subscription Razorpay Configuration:');
console.log('RAZORPAY_KEY_ID:', RAZORPAY_KEY_ID ? 'Set' : 'Missing');
console.log('RAZORPAY_KEY_SECRET:', RAZORPAY_KEY_SECRET ? 'Set (hidden)' : 'Missing');
console.log('Environment NODE_ENV:', process.env.NODE_ENV);

// Validate Razorpay configuration
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ Razorpay configuration missing for subscriptions!');
  console.error('Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET in your .env file');
  console.error('Current values:');
  console.error('- RAZORPAY_KEY_ID:', RAZORPAY_KEY_ID || 'Missing');
  console.error('- RAZORPAY_KEY_SECRET:', RAZORPAY_KEY_SECRET ? 'Set (hidden)' : 'Missing');
} else {
  try {
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully for subscriptions');
    console.log('Key ID:', RAZORPAY_KEY_ID);
  } catch (error) {
    console.error('❌ Failed to create Razorpay instance for subscriptions:', error.message);
    razorpay = null;
  }
}

// GET /api/subscriptions/plans - Get available subscription plans
router.get('/plans', (req, res) => {
  try {
    const plans = Object.keys(SUBSCRIPTION_PLANS).map(key => {
      const plan = SUBSCRIPTION_PLANS[key];
      return {
        id: parseInt(key),
        months: plan.months,
        price: plan.price,
        name: plan.name,
        description: plan.description || `Get ${plan.months} month${plan.months > 1 ? 's' : ''} of verification`
      };
    });

    res.json({
      success: true,
      plans: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/subscriptions/create-order - Create Razorpay order for subscription
router.post('/create-order', authenticateToken, requireUser, async (req, res) => {
  try {
    const { planMonths } = req.body;
    const userId = req.user._id.toString();

    // Validate plan
    if (!planMonths || !SUBSCRIPTION_PLANS[planMonths]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan. Please select a valid plan.'
      });
    }

    const plan = SUBSCRIPTION_PLANS[planMonths];
    const amount = plan.price; // Amount in INR

    // Check if user already has an active subscription
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    });

    if (activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please wait for it to expire or cancel it first.',
        existingSubscription: activeSubscription.getPublicData()
      });
    }

    // Initialize Razorpay if not already done (re-check in case env vars loaded late)
    if (!razorpay) {
      // Try to re-initialize
      const currentKeyId = process.env.RAZORPAY_KEY_ID;
      const currentKeySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (currentKeyId && currentKeySecret) {
        try {
          razorpay = new Razorpay({
            key_id: currentKeyId,
            key_secret: currentKeySecret
          });
          console.log('✅ Razorpay re-initialized successfully');
        } catch (error) {
          console.error('❌ Failed to re-initialize Razorpay:', error.message);
        }
      }
      
      if (!razorpay) {
        console.error('❌ Razorpay not initialized. Check environment variables:');
        console.error('RAZORPAY_KEY_ID:', currentKeyId ? 'Set' : 'Missing');
        console.error('RAZORPAY_KEY_SECRET:', currentKeySecret ? 'Set' : 'Missing');
        return res.status(500).json({
          success: false,
          message: 'Payment service not configured properly. Please contact support or check Razorpay configuration.',
          error: process.env.NODE_ENV === 'development' ? 'Razorpay keys not found in environment variables' : undefined
        });
      }
    }

    // Create Razorpay order
    // Ensure receipt is not too long (Razorpay limit is 40 characters)
    const receipt = `sub_${userId}_${Date.now()}`.substring(0, 40);
    
    const orderData = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: userId,
        planMonths: planMonths.toString(),
        planName: plan.name
      }
    };

    console.log('🔍 Creating Razorpay subscription order with data:', {
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      planMonths: planMonths,
      planName: plan.name
    });

    try {
      const order = await razorpay.orders.create(orderData);
      console.log('✅ Razorpay subscription order created successfully:', order.id);

      res.json({
        success: true,
        data: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key: RAZORPAY_KEY_ID,
          planMonths: planMonths,
          planName: plan.name,
          price: amount
        }
      });
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation error:', razorpayError);
      console.error('Order data that failed:', orderData);
      console.error('Full error:', JSON.stringify(razorpayError, null, 2));
      
      // Return more specific error information
      const errorMessage = razorpayError.error?.description || razorpayError.message || 'Unknown Razorpay error';
      
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription order',
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          razorpayError: razorpayError.error || razorpayError,
          orderData: orderData,
          razorpayInitialized: !!razorpay
        } : undefined
      });
      return;
    }
  } catch (error) {
    console.error('❌ Create subscription order error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      debug: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// POST /api/subscriptions/verify - Verify payment and create subscription
router.post('/verify', authenticateToken, requireUser, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planMonths
    } = req.body;

    const userId = req.user._id.toString();

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planMonths) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }

    // Validate plan
    if (!SUBSCRIPTION_PLANS[planMonths]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    const plan = SUBSCRIPTION_PLANS[planMonths];

    // Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestPayment = razorpay_payment_id.startsWith('pay_test') || razorpay_order_id.startsWith('order_test');
    const isLocalhost = req.get('host')?.includes('localhost') || req.get('host')?.includes('127.0.0.1');

    // Skip signature verification in development/localhost/test mode
    if (!isDevelopment && !isLocalhost && !isTestPayment && !isAuthentic) {
      console.error('Payment verification failed:', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: razorpay_signature.substring(0, 10) + '...'
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Please try again or contact support.'
      });
    }

    // Calculate expiry date
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + planMonths);

    // Create subscription
    const subscription = new Subscription({
      userId: userId,
      planMonths: planMonths,
      price: plan.price,
      currency: 'INR',
      startDate: startDate,
      expiryDate: expiryDate,
      status: 'active',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paymentMethod: 'card' // Default payment method
    });

    await subscription.save();
    
    // Debug log to verify payment details are saved
    console.log('✅ Subscription created with payment details:', {
      _id: subscription._id,
      userId: userId,
      paymentId: subscription.paymentId,
      razorpayOrderId: subscription.razorpayOrderId,
      razorpayPaymentId: subscription.razorpayPaymentId,
      price: subscription.price,
      planMonths: subscription.planMonths
    });

    // Update user verification status
    const user = await User.findById(userId);
    if (user) {
      // Always ensure isVerified is true when subscription is active
      user.isVerified = true;
      
      // If user already has a later expiry date, keep the later one
      if (user.verifiedTill && user.verifiedTill > expiryDate) {
        // Keep existing expiry date but ensure isVerified is true
        console.log('User already has a later expiry date, keeping it but ensuring isVerified is true');
      } else {
        user.verifiedTill = expiryDate;
      }
      
      await user.save();
      console.log('✅ User verification updated:', {
        userId: userId,
        isVerified: user.isVerified,
        verifiedTill: user.verifiedTill
      });
    }

    // Create Payment Tracking record
    try {
      const PaymentTracking = require('../models/PaymentTracking');
      const paymentTracking = new PaymentTracking({
        userId: userId,
        subscriptionId: subscription._id,
        paymentType: 'subscription',
        amount: plan.price,
        currency: 'INR',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: 'card',
        status: 'completed',
        planMonths: planMonths,
        expiryDate: expiryDate,
        paymentDetails: {
          userName: user.name,
          userEmail: user.email,
          username: user.username,
          userAvatar: user.avatarUrl || user.profilePic
        }
      });
      await paymentTracking.save();
      console.log('✅ Payment tracking record created:', paymentTracking._id);
    } catch (trackingError) {
      console.error('❌ Error creating payment tracking:', trackingError);
      // Don't fail the request if tracking fails
    }

    // Create notifications for user and admin
    try {
      const Notification = require('../models/Notification');
      const NotificationService = require('../services/notificationService');
      
      // User notification
      await NotificationService.createUserNotification(
        userId,
        'subscription_purchase',
        '✅ Verified Badge Subscription Purchased!',
        `Your ${planMonths}-month Verified Badge subscription has been activated successfully. Payment ID: ${razorpay_payment_id.substring(0, 12)}...`,
        {
          subscriptionId: subscription._id,
          planMonths: planMonths,
          price: plan.price,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          expiryDate: expiryDate
        },
        'high'
      );

      // Admin notifications
      await NotificationService.createAdminNotification(
        'subscription_purchase',
        '💰 New Verified Badge Subscription Purchase',
        `${user.name} (${user.email}) purchased a ${planMonths}-month Verified Badge subscription for ₹${plan.price}`,
        {
          subscriptionId: subscription._id,
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          username: user.username,
          userAvatar: user.avatarUrl || user.profilePic,
          planMonths: planMonths,
          price: plan.price,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          expiryDate: expiryDate
        },
        'high'
      );

      // Emit Socket.IO notifications
      const io = req.app.get('io');
      if (io) {
        // Notify user
        io.to(`user_${userId}`).emit('subscription_purchased', {
          type: 'subscription_purchase',
          title: '✅ Verified Badge Subscription Purchased!',
          message: `Your ${planMonths}-month Verified Badge subscription has been activated successfully.`,
          data: {
            subscriptionId: subscription._id,
            planMonths: planMonths,
            price: plan.price,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            expiryDate: expiryDate
          }
        });

        // Notify admins
        io.to('admin').emit('new_subscription_purchase', {
          type: 'subscription_purchase',
          title: '💰 New Verified Badge Subscription Purchase',
          message: `${user.name} purchased a ${planMonths}-month Verified Badge subscription`,
          data: {
            subscriptionId: subscription._id,
            userId: userId,
            userName: user.name,
            userEmail: user.email,
            planMonths: planMonths,
            price: plan.price,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
          }
        });
      }

      console.log('✅ Notifications created for subscription purchase');
    } catch (notificationError) {
      console.error('❌ Error creating notifications:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: subscription.getPublicData(),
      paymentDetails: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: plan.price,
        currency: 'INR',
        planMonths: planMonths,
        expiryDate: expiryDate,
        purchaseDate: new Date()
      },
      user: {
        isVerified: user.isVerified,
        verifiedTill: user.verifiedTill
      }
    });
  } catch (error) {
    console.error('Verify subscription payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/subscriptions/my-subscriptions - Get current user's subscriptions
router.get('/my-subscriptions', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const subscriptions = await Subscription.find({ userId: userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions: subscriptions.map(sub => sub.getPublicData())
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

// GET /api/subscriptions/current - Get current active subscription
router.get('/current', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    }).sort({ expiryDate: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription found'
      });
    }

    res.json({
      success: true,
      subscription: subscription.getPublicData()
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

