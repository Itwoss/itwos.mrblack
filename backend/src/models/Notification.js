const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'product_published',
      'product_updated',
      'product_deleted',
      'user_registered',
      'admin_action',
      'system_announcement',
      'general',
      'prebook_payment',
      'payment_success',
      'prebook_confirmed',
      'prebook_rejected',
      'prebook_status_update',
      'subscription_purchase',
      'like',
      'comment',
      'comment_like',
      'comment',
      'like',
      'follow'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
})

// Indexes for better query performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 })
notificationSchema.index({ createdAt: -1 })

// Virtual for formatted date
notificationSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true
  this.readAt = new Date()
  return this.save()
}

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, read: false })
}

// Static method to get recent notifications
notificationSchema.statics.getRecent = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email')
}

// Pre-save middleware to set expiration for certain types
notificationSchema.pre('save', function(next) {
  // Set expiration for low priority notifications (30 days)
  if (this.priority === 'low' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
  
  // Set expiration for normal priority notifications (60 days)
  if (this.priority === 'normal' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
  }
  
  next()
})

// Transform to JSON
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id
    delete ret.__v
    return ret
  }
})

module.exports = mongoose.model('Notification', notificationSchema)








