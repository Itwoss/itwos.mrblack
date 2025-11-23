const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  planMonths: {
    type: Number,
    required: [true, 'Plan months is required'],
    min: 1,
    max: 6
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'refunded'],
    default: 'active',
    index: true
  },
  paymentId: {
    type: String,
    required: [true, 'Payment ID is required']
  },
  razorpayOrderId: {
    type: String,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: {
    type: String,
    sparse: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
    default: 'card'
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  },
  refundReason: {
    type: String,
    trim: true
  },
  refundedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ expiryDate: 1, status: 1 });
subscriptionSchema.index({ paymentId: 1 });

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.expiryDate > new Date();
};

// Instance method to get public data
subscriptionSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    planMonths: this.planMonths,
    price: this.price,
    currency: this.currency,
    startDate: this.startDate,
    expiryDate: this.expiryDate,
    status: this.status,
    paymentId: this.paymentId,
    razorpayOrderId: this.razorpayOrderId,
    razorpayPaymentId: this.razorpayPaymentId,
    paymentMethod: this.paymentMethod,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Subscription', subscriptionSchema);

