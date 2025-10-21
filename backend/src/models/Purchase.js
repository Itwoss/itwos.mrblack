const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay Order ID is required'],
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true // Allows multiple null values for failed payments
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['INR', 'USD', 'EUR'],
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'created'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi'],
    default: 'card'
  },
  razorpaySignature: {
    type: String,
    required: function() {
      return this.status === 'paid';
    }
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
  refundId: {
    type: String
  },
  billingAddress: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better performance
purchaseSchema.index({ buyer: 1 });
purchaseSchema.index({ product: 1 });
// razorpayOrderId and razorpayPaymentId indexes are already defined by unique: true in schema
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ buyer: 1, status: 1 });

// Virtual for formatted amount
purchaseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Virtual for payment status display
purchaseSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'created': 'Payment Pending',
    'paid': 'Payment Successful',
    'failed': 'Payment Failed',
    'refunded': 'Refunded',
    'cancelled': 'Cancelled'
  };
  return statusMap[this.status] || this.status;
});

// Instance method to get public data
purchaseSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    product: this.product,
    amount: this.amount,
    currency: this.currency,
    formattedAmount: this.formattedAmount,
    status: this.status,
    statusDisplay: this.statusDisplay,
    paymentMethod: this.paymentMethod,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Instance method to get full data (for buyer or admin)
purchaseSchema.methods.getFullData = function() {
  return {
    _id: this._id,
    buyer: this.buyer,
    product: this.product,
    razorpayOrderId: this.razorpayOrderId,
    razorpayPaymentId: this.razorpayPaymentId,
    amount: this.amount,
    currency: this.currency,
    formattedAmount: this.formattedAmount,
    status: this.status,
    statusDisplay: this.statusDisplay,
    paymentMethod: this.paymentMethod,
    billingAddress: this.billingAddress,
    notes: this.notes,
    refundAmount: this.refundAmount,
    refundReason: this.refundReason,
    refundedAt: this.refundedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find by buyer
purchaseSchema.statics.findByBuyer = function(buyerId) {
  return this.find({ buyer: buyerId }).populate('product');
};

// Static method to find by status
purchaseSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('buyer product');
};

// Static method to get sales summary
purchaseSchema.statics.getSalesSummary = function(startDate, endDate) {
  const matchStage = { status: 'paid' };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get sales by product
purchaseSchema.statics.getSalesByProduct = function(startDate, endDate) {
  const matchStage = { status: 'paid' };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$product',
        totalSales: { $sum: '$amount' },
        totalOrders: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    { $sort: { totalSales: -1 } }
  ]);
};

module.exports = mongoose.model('Purchase', purchaseSchema);
