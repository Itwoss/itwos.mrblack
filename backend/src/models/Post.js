const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  tags: {
    type: [String],
    default: []
  },
  imageUrl: {
    type: String,
    required: false // Made optional to support audio-only posts
  },
  audioUrl: {
    type: String,
    required: false // Audio file URL
  },
  instagramRedirectUrl: {
    type: String,
    required: false // Made optional for new flow
  },
  phashValueUploaded: {
    type: String,
    required: false // Made optional for new flow
  },
  phashValueInstagram: {
    type: String,
    required: false // Made optional for new flow
  },
  // New Instagram-like fields
  privacy: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public',
    index: true
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'published', 'hidden', 'removed', 'blocked', 'moderation_pending'],
    default: 'published',
    index: true
  },
  // Media keys for S3/storage (array to support multiple images)
  mediaKeys: [{
    type: String
  }],
  // CDN URLs for processed variants
  cdnUrls: {
    thumb: String,
    feed: String,
    detail: String,
    original: String
  },
  // Engagement metrics (total)
  likes: {
    type: Number,
    default: 0
  },
  likedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  views: {
    type: Number,
    default: 0
  },
  viewedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  comments: {
    type: Number,
    default: 0
  },
  commentsArray: [{ // Embedded comments
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] }
  }],
  saves: {
    type: Number,
    default: 0
  },
  savedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  shares: {
    type: Number,
    default: 0
  },
  // 24-hour engagement stats for trending calculation
  stats: {
    views_24h: {
      type: Number,
      default: 0
    },
    likes_24h: {
      type: Number,
      default: 0
    },
    comments_24h: {
      type: Number,
      default: 0
    },
    saves_24h: {
      type: Number,
      default: 0
    },
    shares_24h: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Follower count at time of post (for normalization)
  followerCountAtPost: {
    type: Number,
    default: 0
  },
  // Engagement and trending scores
  engagementScore: {
    type: Number,
    default: 0,
    index: true
  },
  trendingScore: {
    type: Number,
    default: 0,
    index: true
  },
  // Trending status
  trendingStatus: {
    type: Boolean,
    default: false,
    index: true
  },
  trendingSince: {
    type: Date,
    default: null
  },
  trendingRank: {
    type: Number,
    default: null
  },
  // Trending eligibility (1-3 hours after creation)
  trendingEligibleAt: {
    type: Date,
    default: null,
    index: true
  },
  // Moderation fields
  flaggedCount: {
    type: Number,
    default: 0
  },
  flaggedReasons: [{
    type: String
  }],
  // Feature/promotion fields
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  featureStart: {
    type: Date
  },
  featureEnd: {
    type: Date
  },
  featureScope: {
    type: String,
    enum: ['explore', 'home', 'category'],
    default: 'explore'
  },
  // Processing timestamps
  processedAt: {
    type: Date
  },
  // Legacy field for backward compatibility
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for feed queries and performance
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ isActive: 1, createdAt: -1 });
postSchema.index({ status: 1, privacy: 1, createdAt: -1 });
postSchema.index({ featured: 1, featureStart: 1, featureEnd: 1 });
postSchema.index({ engagementScore: -1, createdAt: -1 });
postSchema.index({ trendingScore: -1, createdAt: -1 });
postSchema.index({ flaggedCount: -1, status: 1 });
postSchema.index({ privacy: 1, status: 1, createdAt: -1 });

// Method to get public post data
postSchema.methods.getPublicData = function(userId = null) {
  const data = {
    _id: this._id,
    userId: this.userId,
    title: this.title,
    bio: this.bio,
    tags: this.tags,
    imageUrl: this.imageUrl,
    audioUrl: this.audioUrl, // Include audioUrl
    instagramRedirectUrl: this.instagramRedirectUrl,
    // New fields
    privacy: this.privacy,
    status: this.status,
    mediaKeys: this.mediaKeys,
    cdnUrls: this.cdnUrls,
    // Engagement metrics
    likes: this.likes,
    views: this.views,
    comments: this.comments,
    commentsArray: this.commentsArray, // Include commentsArray
    saves: this.saves,
    shares: this.shares,
    // 24h stats
    stats: this.stats || {},
    followerCountAtPost: this.followerCountAtPost,
    // Scores
    engagementScore: this.engagementScore,
    trendingScore: this.trendingScore,
    trendingStatus: this.trendingStatus || false,
    trendingSince: this.trendingSince,
    trendingRank: this.trendingRank,
    featured: this.featured,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    processedAt: this.processedAt
  };
  
  // Include whether current user liked/saved the post
  if (userId) {
    data.isLiked = this.likedBy.some(id => id.toString() === userId.toString());
    data.isSaved = this.savedBy.some(id => id.toString() === userId.toString());
  }
  
  return data;
};

module.exports = mongoose.model('Post', postSchema);
