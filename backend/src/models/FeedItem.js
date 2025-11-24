const mongoose = require('mongoose');

const feedItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  postOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Denormalized fields for faster queries
  postCreatedAt: {
    type: Date,
    required: true,
    index: true
  },
  postEngagementScore: {
    type: Number,
    default: 0
  },
  // Source of feed item (for analytics)
  source: {
    type: String,
    enum: ['following', 'explore', 'trending', 'featured'],
    default: 'following'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient feed queries
feedItemSchema.index({ userId: 1, postCreatedAt: -1 });
feedItemSchema.index({ userId: 1, postEngagementScore: -1, postCreatedAt: -1 });
feedItemSchema.index({ postId: 1, userId: 1 }); // Unique constraint
feedItemSchema.index({ postOwnerId: 1, postCreatedAt: -1 });

// Prevent duplicate feed items
feedItemSchema.index({ userId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model('FeedItem', feedItemSchema);

