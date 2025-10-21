const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
  });
}

// Create order
const createOrder = async (amount, currency = 'INR', receipt = null) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    
    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      }
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order'
    };
  }
};

// Verify payment signature
const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;
    
    return {
      success: isAuthentic,
      message: isAuthentic ? 'Payment verified' : 'Payment verification failed'
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error.message || 'Payment verification failed'
    };
  }
};

// Get payment details
const getPaymentDetails = async (paymentId) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    
    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        description: payment.description,
        created_at: payment.created_at,
        captured: payment.captured,
        email: payment.email,
        contact: payment.contact,
        notes: payment.notes
      }
    };
  } catch (error) {
    console.error('Get payment details error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch payment details'
    };
  }
};

// Refund payment
const refundPayment = async (paymentId, amount = null, notes = null) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const refundOptions = {
      payment_id: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to paise
      notes: notes || 'Refund processed'
    };

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    
    return {
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        notes: refund.notes,
        created_at: refund.created_at
      }
    };
  } catch (error) {
    console.error('Refund error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process refund'
    };
  }
};

// Get order details
const getOrderDetails = async (orderId) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const order = await razorpay.orders.fetch(orderId);
    
    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at,
        paid_amount: order.amount_paid
      }
    };
  } catch (error) {
    console.error('Get order details error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order details'
    };
  }
};

// Get all payments for an order
const getOrderPayments = async (orderId) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const payments = await razorpay.orders.fetchPayments(orderId);
    
    return {
      success: true,
      payments: payments.items.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        created_at: payment.created_at,
        captured: payment.captured
      }))
    };
  } catch (error) {
    console.error('Get order payments error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch order payments'
    };
  }
};

// Create customer
const createCustomer = async (customerData) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const customer = await razorpay.customers.create({
      name: customerData.name,
      email: customerData.email,
      contact: customerData.phone,
      notes: customerData.notes || {}
    });
    
    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        created_at: customer.created_at
      }
    };
  } catch (error) {
    console.error('Create customer error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create customer'
    };
  }
};

// Get customer details
const getCustomerDetails = async (customerId) => {
  if (!razorpay) {
    return {
      success: false,
      error: 'Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.'
    };
  }
  
  try {
    const customer = await razorpay.customers.fetch(customerId);
    
    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        contact: customer.contact,
        created_at: customer.created_at
      }
    };
  } catch (error) {
    console.error('Get customer details error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch customer details'
    };
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentDetails,
  refundPayment,
  getOrderDetails,
  getOrderPayments,
  createCustomer,
  getCustomerDetails
};
