const mongoose = require('mongoose');

const adminActionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actionType: {
    type: String,
    enum: [
      'remove', 'hide', 'feature', 'ban_user', 'warn', 'restore',
      'manual_score_adjust', 'unfeature', 'unhide', 'unban_user'
    ],
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: true
  },
  extra: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Store additional context like remove_type, duration, etc.
  }
}, {
  timestamps: true
});

// Indexes
adminActionSchema.index({ adminId: 1, createdAt: -1 });
adminActionSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminActionSchema.index({ actionType: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAction', adminActionSchema);

