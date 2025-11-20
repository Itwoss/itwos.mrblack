const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Follower ID is required'],
    index: true
  },
  followeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Followee ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'accepted' // For public accounts, default to accepted
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique follower-followee pairs
followSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ followeeId: 1, status: 1 });
followSchema.index({ followerId: 1, status: 1 });

// Static method to check if user A follows user B
followSchema.statics.isFollowing = async function(followerId, followeeId) {
  const follow = await this.findOne({
    followerId,
    followeeId,
    status: 'accepted'
  });
  return !!follow;
};

// Static method to get followers count
followSchema.statics.getFollowersCount = async function(userId) {
  return this.countDocuments({
    followeeId: userId,
    status: 'accepted'
  });
};

// Static method to get following count
followSchema.statics.getFollowingCount = async function(userId) {
  return this.countDocuments({
    followerId: userId,
    status: 'accepted'
  });
};

// Static method to get followers list
followSchema.statics.getFollowers = async function(userId, limit = 50, skip = 0) {
  return this.find({
    followeeId: userId,
    status: 'accepted'
  })
  .populate('followerId', 'name username email avatarUrl profilePic bio')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get following list
followSchema.statics.getFollowing = async function(userId, limit = 50, skip = 0) {
  return this.find({
    followerId: userId,
    status: 'accepted'
  })
  .populate('followeeId', 'name username email avatarUrl profilePic bio')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get follow statuses for multiple users
followSchema.statics.getFollowStatuses = async function(viewerId, userIds) {
  const follows = await this.find({
    followerId: viewerId,
    followeeId: { $in: userIds },
    status: 'accepted'
  });
  
  const statusMap = {};
  follows.forEach(follow => {
    statusMap[follow.followeeId.toString()] = true;
  });
  
  return statusMap;
};

module.exports = mongoose.model('Follow', followSchema);

