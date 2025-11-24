const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  reporterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for automated flags
  },
  flagType: {
    type: String,
    enum: ['spam', 'nsfw', 'copyright', 'abuse', 'violence', 'hate', 'other'],
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Store automated model scores, screenshots, pHash matches, etc.
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin who resolved
  }
}, {
  timestamps: true
});

// Indexes
flagSchema.index({ postId: 1, resolved: 1, createdAt: -1 });
flagSchema.index({ flagType: 1, severity: 1, resolved: 1 });

module.exports = mongoose.model('Flag', flagSchema);

