const mongoose = require('mongoose');

const paymentTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    sparse: true
  },
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    sparse: true
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'product', 'prebook'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  razorpayPaymentId: {
    type: String,
    required: true,
    index: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    index: true
  },
  razorpaySignature: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
    default: 'card'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'completed',
    index: true
  },
  planMonths: {
    type: Number,
    sparse: true
  },
  expiryDate: {
    type: Date,
    sparse: true
  },
  paymentDetails: {
    userName: String,
    userEmail: String,
    username: String,
    userAvatar: String
  },
  // 3-step deletion fields
  deletionRequested: {
    type: Boolean,
    default: false
  },
  deletionRequestedAt: {
    type: Date,
    default: null
  },
  deletionConfirmationCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  deletionConfirmations: [{
    confirmedAt: Date,
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: String,
    userAgent: String
  }],
  deletedAt: {
    type: Date,
    default: null,
    sparse: true
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
paymentTrackingSchema.index({ userId: 1, createdAt: -1 });
paymentTrackingSchema.index({ paymentType: 1, status: 1 });
paymentTrackingSchema.index({ createdAt: -1 });
paymentTrackingSchema.index({ deletedAt: 1 });

// Query helper to exclude deleted records
paymentTrackingSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

// Instance method to request deletion
paymentTrackingSchema.methods.requestDeletion = function(userId, ipAddress, userAgent) {
  this.deletionRequested = true;
  this.deletionRequestedAt = new Date();
  this.deletionConfirmationCount = 1;
  this.deletionConfirmations.push({
    confirmedAt: new Date(),
    confirmedBy: userId,
    ipAddress: ipAddress,
    userAgent: userAgent
  });
  return this.save();
};

// Instance method to confirm deletion (step 2 and 3)
paymentTrackingSchema.methods.confirmDeletion = function(userId, ipAddress, userAgent) {
  this.deletionConfirmationCount += 1;
  this.deletionConfirmations.push({
    confirmedAt: new Date(),
    confirmedBy: userId,
    ipAddress: ipAddress,
    userAgent: userAgent
  });
  
  // If 3 confirmations reached, mark as deleted
  if (this.deletionConfirmationCount >= 3) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
  }
  
  return this.save();
};

// Instance method to cancel deletion request
paymentTrackingSchema.methods.cancelDeletion = function() {
  this.deletionRequested = false;
  this.deletionRequestedAt = null;
  this.deletionConfirmationCount = 0;
  this.deletionConfirmations = [];
  return this.save();
};

// Instance method to get public data
paymentTrackingSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    userId: this.userId,
    subscriptionId: this.subscriptionId,
    purchaseId: this.purchaseId,
    paymentType: this.paymentType,
    amount: this.amount,
    currency: this.currency,
    razorpayPaymentId: this.razorpayPaymentId,
    razorpayOrderId: this.razorpayOrderId,
    paymentMethod: this.paymentMethod,
    status: this.status,
    planMonths: this.planMonths,
    expiryDate: this.expiryDate,
    paymentDetails: this.paymentDetails,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('PaymentTracking', paymentTrackingSchema);

