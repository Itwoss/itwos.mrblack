const mongoose = require('mongoose');

/**
 * Trending Settings Model
 * Stores admin-configurable settings for the trending system
 */
const trendingSettingsSchema = new mongoose.Schema({
  // Trending delay (hours before a post can become trending)
  trendingDelayHours: {
    type: Number,
    default: 2, // Default: 2 hours (between 1-3 hours)
    min: 1,
    max: 3,
    required: true
  },
  // Minimum engagement score threshold for trending
  minTrendingScore: {
    type: Number,
    default: 2.0, // Lowered from 5.0 to allow more posts to trend
    min: 0,
    required: true
  },
  // Minimum engagement metrics (alternative threshold) - Lowered for more posts to qualify
  minEngagementThreshold: {
    views: { type: Number, default: 20 }, // Lowered from 50
    likes: { type: Number, default: 5 }, // Lowered from 10
    comments: { type: Number, default: 1 }, // Lowered from 3
    saves: { type: Number, default: 2 }, // Lowered from 5
    shares: { type: Number, default: 1 } // Lowered from 2
  },
  // Algorithm weights (admin can adjust)
  weights: {
    views: { type: Number, default: 1.2 },
    likes: { type: Number, default: 1.0 },
    comments: { type: Number, default: 1.5 },
    saves: { type: Number, default: 1.8 },
    shares: { type: Number, default: 1.6 },
    followerNorm: { type: Number, default: 0.4 }
  },
  // Time decay constant (hours)
  decayConstant: {
    type: Number,
    default: 12,
    min: 1,
    required: true
  },
  // Trending window (top X% or top N posts)
  trendingTopPercent: {
    type: Number,
    default: 5.0, // Increased from 0.5% to 5% to allow more posts
    min: 0.1,
    max: 50 // Increased max to 50%
  },
  trendingTopCount: {
    type: Number,
    default: 500, // Increased from 100 to 500 posts
    min: 10,
    max: 5000 // Increased max to 5000
  },
  // Last updated by admin
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
trendingSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const TrendingSettings = mongoose.model('TrendingSettings', trendingSettingsSchema);

module.exports = TrendingSettings;

